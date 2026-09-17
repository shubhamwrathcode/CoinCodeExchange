# Where the "Blue Overlay" and "Stuck UI" Issue Comes From

## 1. Blue overlay – source

### Global loading overlay (main cause)
- **Component:** `SpinnerSecond` (`src/common/SpinnerSecond.tsx`)
- **When it shows:** When `state.auth.isLoading === true` (or when a screen passes `loading={true}`) and `loadingFor !== 'otp'`.
- **Style:** Full-screen, `position: 'absolute'`, `zIndex: 9999`, `backgroundColor: '#00000099'` (dark semi-transparent). On some devices/settings this can look dark blue/grey.
- **Who sets loading:** Many places call `dispatch(setLoading(true))`:
  - `src/actions/walletActions.ts` (wallet APIs)
  - `src/actions/homeActions.ts` (home/spot-related APIs)
  - `src/actions/authActions.ts`, `accountActions.ts`
  - Screens: Login, WalletNew, Futures, OpenOrder, DepositCoin, etc.
- **Why it appears when leaving Spot (kisi bhi tab pe):**  
  Overlay **sirf Wallet pe nahi**, **Spot se bahar kisi bhi tab pe** jaate hi aa sakta hai. Kyunki jo tab focus pe aata hai, us screen ke **useFocusEffect / useEffect** mein jo API actions chalte hain, woh **`setLoading(true)`** karte hain. Us hisaab se **kaun‑kaun si screens** trigger karti hain:

  | Tab (Spot se jaa kar) | Screen | Focus/mount pe kaun‑kaun actions (setLoading true) |
  |-----------------------|--------|----------------------------------------------------|
  | **Wallet** | WalletNew.js | `getUserPortfolio`, `getUserPortfolioMain`, `getUserPortfolioSpot`, … (sab walletActions) |
  | **Home** | Home.js | Mount pe `getCoinList`, `getWalletType`, `getFavoriteArray`, `getNotificationList` (homeActions – getCoinList setLoading true) |
  | **Staking (Earning)** | Earning.js | `getPackageList`, `getUserPayList`, `getEarningPortfolio`, `getEarningPortfolioSummary`, `getSubscribedPackageList` (walletActions – sab setLoading true) |
  | **Futures** | Futures/index.js | Various flows mein setLoading(true) |
  | **Market** | – | Check karna padega agar focus pe koi such action hai |

  Inme se **koi bhi** chalte hi global loader dikh jata hai, isliye **issue kisi bhi tab pe** aa sakta hai.

### Fix applied (abhi)
- **Spot blur:** Spot ke **useFocusEffect** cleanup mein **`dispatch(setLoading(false))`** – lekin naya tab pe focus aate hi us tab ke actions **pehle** setLoading(true) kar chuke hote hain, isliye overlay tab pe phir bhi dikh sakta hai.
- **Navigator:** Spot tab **unmountOnBlur: false** – chart/order book persist; FadeTabScreen mein inactive tab ko **position: absolute + zIndex: -1** diya so overlay block na kare.
- **Spot se switch pe stuck:** Jab Spot pe ho kar kisi aur tab (Wallet/Market/Staking) pe jate ho to stuck na ho, iske liye: (1) **Preload effect** ab sirf **isSpotFocused** true hone pe subscribe karta hai – blur pe dobara subscribe nahi hota; (2) Spot ka **minimal view** (jab !isSpotFocused) ab **position: absolute, zIndex: -1**, taaki bilkul peeche rahe aur koi bhi tap block na kare.

---

## 2. Stuck / freeze UI – sources

### A. Timers and refs still running after blur
- **Where:** `src/screens/spotScreen/Spot.jsx` – `useFocusEffect` cleanup.
- **What:** If timers or async work keep running after the screen loses focus, they can call `setState` or `dispatch` and cause re-renders or jank on the next screen.
- **Timers used on Spot:**
  - `focusSettlingTimeoutRef` (550 ms)
  - `webViewReadyFallbackRef` (3 s chart fallback)
  - `chartReadyDelayRef` (500 ms after chart load)
  - `chartSymbolChangeTimeoutRef`
  - `reconnectIntervalRef` (WebSocket reconnect)
  - `socketThrottleTimerRef`, `binanceThrottleTimerRef`
  - `stopLoaderTimer` (2 s)
- **Fix applied:** Cleanup clears **all** of these timers when Spot loses focus so no callback runs after you’ve left the screen.

### B. Socket / WebSocket still updating state when blurred
- **Where:** Spot’s socket listener and Binance WebSocket handlers.
- **What:** If they keep running when the screen is not focused, they can dispatch Redux or call setState and keep the Spot (or even the app) busy.
- **Fix applied:** Handlers check `isSpotFocusedRef.current` and `appStateRef.current` and return early when Spot is not focused, so no state updates happen after you leave.

### C. Spot still rendering heavy content when not focused
- **Where:** Spot’s main return: when `isSpotFocused === false` we used to still have the full tree in mind; with `unmountOnBlur: false` the component stays mounted.
- **What:** If we kept rendering the full Spot UI (chart, order book, form) while the tab was blurred, it could cause unnecessary work and jank.
- **Fix applied:** When **`!isSpotFocused`**, Spot returns **only a minimal transparent view** (no chart, no order book, no form). So when you’re on Wallet, Spot’s rendered output is minimal and non-blocking.

### D. Tab config – Spot not unmounting
- **Where:** `src/navigation/Navigator.tsx` – Spot tab uses `unmountOnBlur: false`.
- **What:** Spot screen stays mounted when you switch to Wallet. That’s for caching (pair + data). Without proper cleanup, that same choice could contribute to “stuck” feeling if Spot kept doing work or rendering a lot.
- **Fix applied:** Cleanup (timers + loader + unsubscribe) and the “minimal view when not focused” make sure that even when Spot stays mounted, it does almost no work and shows nothing when you’re on another tab.

---

## 3. Summary table

| Issue            | Source / cause                                                                 | Fix |
|-----------------|---------------------------------------------------------------------------------|-----|
| Blue overlay    | Global loader `SpinnerSecond` (auth.loading) left true when leaving Spot        | `dispatch(setLoading(false))` in Spot’s `useFocusEffect` cleanup |
| Stuck UI        | Timers (chart, focus, socket, etc.) still running after blur                    | Clear all timer refs in same cleanup |
| Stuck UI        | Socket/WebSocket still updating state when Spot not focused                    | Early return in handlers using `isSpotFocusedRef` |
| Stuck UI        | Spot still rendering full UI when tab is blurred                               | When `!isSpotFocused`, return only minimal transparent view |
| Overlay / block | Spot’s empty view possibly on top of Wallet                                    | Transparent background + on Android `elevation: 0`, `zIndex: -1` |

---

## 4. Files to look at

- **Overlay:** `src/common/SpinnerSecond.tsx`, `src/slices/authSlice.ts` (setLoading), Spot’s `useFocusEffect` cleanup.
- **Lifecycle / cleanup:** `src/screens/spotScreen/Spot.jsx` – `useFocusEffect` (around lines 875–965).
- **Tab config:** `src/navigation/Navigator.tsx` – Spot tab options and `FadeTabScreen` wrapper.

---

## 5. Solution – kaise solve kiya (checklist)

### Spot.jsx mein jo fixes lage hain

1. **Global loader clear (blue overlay)**  
   - **Spot pe aate hi:** `useFocusEffect` ke andar sabse pehle `dispatch(setLoading(false))`.  
   - **Spot chhodte hi:** cleanup ke andar sabse pehle `dispatch(setLoading(false))`.

2. **Timers cleanup (stuck UI)**  
   - Cleanup mein saare timers clear (focusSettling, webViewReadyFallback, chartReadyDelay, chartSymbolChange, reconnectInterval, socketThrottle, binanceThrottle, stopLoader).  
   - `pendingSocketFlushRef`, `pendingBinanceRef` null.

3. **Blur pe minimal view**  
   - `!isSpotFocused` pe sirf transparent View (no chart, no order book).  
   - Android: `elevation: 0`, `zIndex: -1`.

4. **Exchange unsubscribe**  
   - Blur pe `unsubscribeFromExchange` call.

5. **Navigator**  
   - Spot tab: `unmountOnBlur: false`.

### Agar ab bhi issue aaye

- Kisi aur screen ke API/useEffect mein `setLoading(true)` ke baad error/cancel pe `setLoading(false)` missing ho sakta hai.  
- Console mein `auth.loading` / `loadingFor` log karke dekho kis action ke baad true reh raha hai.

---

## 6. Agar screen unmount **nahi** karna (cache + wapas aate hi loaded data, skeleton na chale)

**Goal:** Spot tab se bahar jao → kisi aur tab pe jao → wapas Spot pe aao → **skeleton na chale, pehle wala loaded data turant dikhe** (chart + order book). Iske liye Spot screen ko **unmount nahi** karna padega.

**Problem:** Abhi Navigator mein Spot tab **`unmountOnBlur: true`** hai, isliye Spot **unmount** ho jata hai → wapas aate hi poora screen fresh load, skeleton + refetch. Agar tum **`unmountOnBlur: false`** kar doge taaki Spot **unmount na ho** aur cache dikhe, to **blue overlay / stuck UI wala issue phir aa sakta hai**, kyunki:

1. **Blue overlay:** Jab Spot → Wallet jao ge, Wallet ke **useFocusEffect** mein `getUserPortfolio("")` etc. chalenge, jo **`setLoading(true)`** karte hain → full-screen SpinnerSecond (blue/dark overlay) dikh jata hai.
2. **Stuck UI:** Spot unmount nahi hua to uske timers/socket blur pe bhi run ho sakte hain agar cleanup sahi na ho.

**Isliye dono cheezein saath mein karni padengi:**

| # | Kya karna hai | Kahan | Kyun |
|---|----------------|-------|------|
| 1 | **Spot tab: `unmountOnBlur: false`** | `src/navigation/Navigator.tsx` – Spot (WALLET_SCREEN) tab options | Spot unmount nahi hoga → wapas aate hi cached pair + data dikhe, skeleton na chale. |
| 2 | **Har us tab/screen pe focus-time global loader band karo jahan se overlay aata hai** | Multiple files | **Issue kisi bhi tab pe aata hai** (Wallet, Home, Staking, Futures, etc.), kyunki in screens ke focus/mount pe jo APIs chalti hain woh **setLoading(true)** karti hain. Isliye **sirf Wallet fix karna kaafi nahi** – jitne bhi tabs pe ye overlay dikhe, un sab ke liye ye karna padega: |
|   | | | • **Wallet:** `walletActions.ts` – `getUserPortfolio*` etc. mein **`useGlobalLoader: false`** option; **WalletNew.js** useFocusEffect mein **`{ useGlobalLoader: false }`** pass. |
|   | | | • **Home:** `homeActions.ts` – `getCoinList` (aur jo bhi mount pe chale) mein **option** add karke useFocusEffect / initial load pe **global loader na chale**. |
|   | | | • **Staking (Earning):** `walletActions.ts` – `getPackageList`, `getEarningPortfolio`, `getSubscribedPackageList`, `getUserPayList` etc. mein **option**; **Earning.js** useFocusEffect mein **useGlobalLoader: false** pass. |
|   | | | • **Futures:** jahan focus/mount pe setLoading(true) chalta ho, wahan bhi local loader ya option use karna padega. |
| 3 | **Spot blur pe cleanup + loader clear** (ye pehle se Spot mein hai) | `src/screens/spotScreen/Spot.jsx` – useFocusEffect cleanup | Cleanup mein **sabse pehle `dispatch(setLoading(false))`**, phir saare timers clear, **unsubscribeFromExchange**. Blur pe **minimal transparent view** return (full UI na render). |

**Short summary:**  
- **Sirf `unmountOnBlur: false`** karenge to **kisi bhi tab** pe jaate hi us tab ke APIs ki wajah se overlay aa sakti hai (Wallet, Home, Staking, Futures – jahan bhi focus pe setLoading(true) chalti hai).  
- **`unmountOnBlur: false` + har us tab ke focus-time APIs ko global loader band karna** (useGlobalLoader: false ya equivalent) karenge to: Spot unmount nahi hoga, wapas aate hi loaded data dikhe gi, **aur kisi bhi tab pe blue overlay nahi aayegi**.  
- Spot wala blur cleanup (setLoading false + timers + minimal view) **rehna chahiye** dono cases mein.

---

## 7. Focus pe loader zaroori hai – isko kaise manage karein (global vs screen-level)

**Conflict:**  
- Nahi chahte ki tab switch pe **full-screen blue overlay** (SpinnerSecond) dikhe.  
- Lekin **focus pe loader dikhana zaroori** hai – user ko pata hona chahiye ki data load ho raha hai.

**Rule:**  
- **Global loader (setLoading / SpinnerSecond)** = poore app pe full-screen, tab switch pe dikhna problem hai.  
- **Screen-level loader** = sirf usi screen ke andar (skeleton, inline spinner, “Loading…”). Ye focus pe bilkul theek hai.

**Kaise manage karein:**

| Use case | Kaun sa loader | Kaise |
|----------|----------------|--------|
| **Screen focus → data fetch** (Wallet portfolio, Home coin list, Earning package list, etc.) | **Screen-level only** | API ko **useGlobalLoader: false** se chalao (ya action mein setLoading mat karo). Screen apna **local state** use kare: `contentLoading` / `loading`. Aur **us screen ke andar** hi loading dikhao: skeleton, ya content area ke beech `ActivityIndicator`, ya “Loading…” – **SpinnerSecond (global) mat dikhao** is flow ke liye. |
| **Critical / blocking actions** (login, place order, withdraw, KYC submit, etc.) | **Global loader theek hai** | Jahan user ek hi action complete hone ka wait kar raha ho, wahan `setLoading(true)` / SpinnerSecond chalana theek hai. |

**Implementation pattern (focus-time fetch ke liye):**

1. **Action:** Option add karo `useGlobalLoader?: boolean`. Jab `false` ho to `setLoading(true/false)` mat chalao.
2. **Screen (e.g. Wallet, Home, Earning):**
   - Focus pe: `setContentLoading(true)` (local state), phir `dispatch(getUserPortfolio("", { useGlobalLoader: false }))` (ya jo API ho).
   - API complete: `.then(() => setContentLoading(false))` / `.finally(() => setContentLoading(false))`.
   - UI: **Sirf us screen ke andar** loading dikhao – e.g. `{contentLoading && <View style={...}><ActivityIndicator /></View>}` ya skeleton, **SpinnerSecond** nahi (ya SpinnerSecond ko `loading={contentLoading}` de kar bhi use kar sakte ho **agar** tum SpinnerSecond ko screen-specific wrapper mein daal kar use karo, lekin full-screen overlay tab switch pe na aaye isliye better hai in screens pe alag se chhota loader/skeleton).

**Summary:**  
- Focus pe loader **chalana chahiye** – but **screen ke andar** (skeleton / inline spinner).  
- Focus pe **global full-screen loader (setLoading)** **na chalao** – isse tab switch pe blue overlay nahi aayegi, aur har screen apne hisaab se loading dikha sakti hai.
