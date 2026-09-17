# Trading Tabs Architecture – No Reload on Tab Switch

This document describes the architecture for **Spot**, **Futures**, and **Order Book** so that WebView charts and order book data **do not reload** when the user switches tabs (e.g. Spot → Wallet → Spot or Spot → Futures → Spot). The goal is instant, smooth tab switching like professional trading apps.

---

## 1. Architecture Overview

| Concern | Approach |
|--------|----------|
| **Screen lifecycle** | Spot and Futures tabs use **`unmountOnBlur: false`** so the screen component stays mounted when the user leaves the tab. |
| **When tab not focused** | Each trading screen renders a **minimal transparent view** (no chart, no order book). The WebView and state remain in memory. |
| **WebView** | Two WebViews total (Spot chart, Futures chart). They are **not unmounted** on tab switch, so they do not reload. |
| **Order Book state** | **Spot:** Redux (`buyOrders` / `sellOrders`) + socket; on blur we unsubscribe from socket but **do not clear** Redux, so data is restored when returning. **Futures:** Local state (`BuyOrders` / `SellOrders`) is preserved because the screen is not unmounted. |
| **Re-renders** | `freezeOnBlur: true` on Spot/Futures reduces re-renders when the tab is in the background. |

---

## 2. React Navigation Configuration

**File:** `src/navigation/Navigator.tsx`

For **Spot** and **Futures** tab screens:

- **`unmountOnBlur: false`** – The screen component is **not unmounted** when the user switches to another tab. This keeps WebView instances and all component state (including order book) in memory.
- **`freezeOnBlur: true`** – When the tab is not focused, React Navigation can freeze updates to reduce work.

Other tabs (Home, Market, Wallet, Account, etc.) can keep default behavior; only the two trading screens that host WebViews need `unmountOnBlur: false`.

```tsx
// Spot tab (WALLET_SCREEN – displays Spot trading)
<Tab.Screen
  name={routes.WALLET_SCREEN}
  options={{
    freezeOnBlur: true,
    unmountOnBlur: false,
    // ...
  }}
  component={FadeTabScreen(Spot)}
/>

// Futures tab
<Tab.Screen
  name={routes.FUTURES_SCREEN}
  options={{
    freezeOnBlur: true,
    unmountOnBlur: false,
    // ...
  }}
  component={FadeTabScreen(Futures)}
/>
```

---

## 3. WebView Setup (Spot & Futures)

- **Single instance per screen** – One WebView for Spot chart, one for Futures chart. They are children of the Spot/Futures screen component, so as long as the screen is not unmounted, the WebView is not unmounted.
- **No reload on tab switch** – Because `unmountOnBlur: false`, when the user goes to Wallet and back to Spot, the Spot component (and its WebView) is still mounted; the chart does not reload.
- **Theme / URL** – Chart URL is derived from theme and selected pair (e.g. `chartBaseUrl + pair`). When the user changes pair, the screen updates `chartUri` and may reset `webViewReady` so the skeleton shows until the new chart loads; the WebView itself can be reused or recreated only on pair change, not on tab switch.
- **Background** – Use `backgroundColor={colors.newThemeColor}` (or `CHART_BG_FALLBACK`) so the chart area never flashes black.

---

## 4. Order Book State Strategy

### Spot

- **Source of truth:** Redux (`state.home.buyOrders`, `state.home.sellOrders`) plus optional local cache for the current pair.
- **Socket:** On **focus** we subscribe to the exchange (e.g. `subscribeToExchange(base_currency_id, quote_currency_id)`). On **blur** we **unsubscribe** but **do not clear** Redux `buyOrders`/`sellOrders`.
- **Result:** When the user returns to Spot, the last order book data is still in Redux and can be shown immediately; we re-subscribe to the socket for live updates.

### Futures

- **Source of truth:** Local state (`BuyOrders`, `SellOrders`) updated from `useFuturesSocket()` (e.g. `futuresData.buy_order` / `futuresData.sell_order`).
- **Socket:** Subscription is tied to focus (`if (!isFocused) return` in the subscribe effect). When the user leaves the tab, the component stays mounted, so `BuyOrders`/`SellOrders` are **not** reset.
- **Result:** When the user returns to Futures, the same component instance is visible again and still holds the last order book; socket can continue or resubscribe per your hook design.

### Summary

- **Do not unmount** trading screens → Order book state (Redux for Spot, local for Futures) is preserved.
- **Do not clear** order book data on blur; only unsubscribe from socket if needed for resource/back-end reasons.
- **Re-subscribe** on focus so live updates resume without needing a full “reload” of the order book.

---

## 5. Blur View (Minimal UI When Tab Not Focused)

When the user is on another tab (e.g. Wallet), the Spot or Futures screen should **not** render the full UI (chart, order book, form). That would waste CPU/GPU and could cause jank. Instead, each trading screen returns a **minimal view** when it is not focused:

- **Spot:** `isSpotFocused === false` → return a single transparent `View` (e.g. `opacity: 0`, `pointerEvents: "none"`, `backgroundColor: "transparent"`, and on Android `elevation: 0`, `zIndex: -1`).
- **Futures:** `isFocused === false` → same: single transparent, non-interactive view.

The component tree (including WebView and order book state) remains mounted; only the **rendered output** is replaced by this minimal view. When the user switches back, the same component is focused again and renders the full UI with existing state.

---

## 6. Example Implementation Summary

| Part | Spot | Futures |
|------|------|---------|
| **Tab options** | `unmountOnBlur: false`, `freezeOnBlur: true` | Same |
| **Focus/blur** | `useFocusEffect`: on focus set `isSpotFocused = true`, on blur set `false` and run cleanup (timers, unsubscribe). | `useIsFocused()`; when `!isFocused` return minimal view. |
| **Blur view** | Single transparent `View` (no chart, no order book). | Single transparent `View`. |
| **Chart** | `SpotChartSection` with WebView; skeleton until `webViewReady` + delay; background `newThemeColor`. | `FuturesChartSection` with WebView; same pattern. |
| **Order book** | Redux + socket; restore from Redux on mount; re-subscribe on focus. | Local state from socket; preserved because screen is not unmounted. |

---

## 7. Optional: Preload Chart After Login

If you want the Spot (or Futures) chart to appear **instantly** when the user first opens that tab:

- **Option A – Pre-mount in background:** After login, mount a hidden or off-screen instance of the Spot screen (or a minimal wrapper that only holds the chart WebView) so the WebView starts loading. When the user opens the Spot tab, you can either show that preloaded WebView or reuse its content. This can be done with a separate “preload” stack or a condition in the tab navigator.
- **Option B – Keep default pair and cache:** Ensure the default pair (e.g. BTC/USDT) is set and the chart URL is set as soon as the user is authenticated. With `unmountOnBlur: false`, the first time the user opens Spot the chart loads; every subsequent visit reuses the same mounted screen and WebView, so no extra preload is strictly necessary for tab switching.

Preloading adds some complexity (where to mount, when to show). The current architecture already gives instant switching **after** the user has opened Spot/Futures at least once.

---

## 8. Constraints and Memory

- **Only two WebViews** – One in Spot, one in Futures. Both are kept mounted when their tab is not focused (minimal view only). This avoids creating extra WebViews.
- **Real-time order book** – Handled by socket subscription; we unsubscribe on blur and re-subscribe on focus, without clearing displayed data, so updates resume without a full reload.
- **Good memory management** – Unsubscribe from sockets and clear any timers/listeners in the blur cleanup so that no work runs in the background for the inactive tab. The WebView and React state stay in memory; only active subscriptions and timers are cleaned up.

---

## 9. Avoiding the “transparent overlay blocks taps” issue

With `unmountOnBlur: false`, inactive tab screens stay mounted. If their root view stays in the normal layout with the same z-index as the active tab, it can sit on top and block touches (transparent overlay).

**Fix in `FadeTabScreen` (Navigator.tsx):**

- **Focused tab:** `flex: 1`, `zIndex: 1`, Android `elevation: 1`, `pointerEvents: "auto"`. Stays in layout and receives touches.
- **Inactive tab:** `position: "absolute"`, `left/right/top/bottom: 0`, `zIndex: -1`, Android `elevation: 0`, `pointerEvents: "none"`. Taken out of layout and drawn behind the active tab so it never blocks.

Result: the active tab is always on top and the only one that receives touches; no transparent overlay blocking buttons.

---

## 10. Files to Touch

| File | Role |
|------|------|
| `src/navigation/Navigator.tsx` | Set `unmountOnBlur: false` and `freezeOnBlur: true` for Spot and Futures; in `FadeTabScreen`, style inactive tab with `position: absolute` and `zIndex: -1` so it doesn’t block the active tab. |
| `src/screens/spotScreen/Spot.jsx` | Already uses `isSpotFocused` and minimal blur view; useFocusEffect cleanup clears timers and unsubscribes socket. |
| `src/screens/Futures/index.js` | When `!isFocused`, return minimal transparent view; socket subscribe only when `isFocused`. |

With this, tab switching keeps Spot and Futures mounted, preserves WebView and order book state, avoids unnecessary reloads, and the transparent overlay no longer blocks taps.
