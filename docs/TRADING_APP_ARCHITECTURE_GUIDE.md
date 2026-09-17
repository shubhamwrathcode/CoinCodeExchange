# React Native Trading App – Architecture Guide

**Goal:** Smooth, professional trading-app-like experience where the **Future trading chart**, **Spot chart**, and **Order Book** do **not** reload when switching tabs (e.g. Spot → Future → Spot or Spot → Wallet → Spot), and the **selected trading pair (e.g. ETH/USDT) stays the same** when the user returns.

This guide documents the **architecture already in use** in this project and answers the five implementation areas below. **No changes to your existing Future Screen, Spot Screen, or Order Book code are required**; the patterns describe how the current setup achieves the goal.

---

## Problem → Solution (Quick Reference)

| Problem | Solution in This App |
|--------|----------------------|
| Screen unmounts when switching tabs | **§1 below:** `unmountOnBlur: false` for Spot and Futures tabs so screens stay mounted. |
| WebView trading chart reloads again | **§3 below:** Screens don’t unmount → WebView stays in memory; when tab not focused we render only a minimal view, so the chart does not reload. |
| Order Book reconnects and reloads | **§4 below:** Unsubscribe socket on blur but **do not clear** order book data; re-subscribe on focus so state is preserved and live updates resume without full reload. |
| Selected trading pair resets (e.g. ETH/USDT) | **§2 below:** Selected pair stored in **Redux** (`spotSelectedPair`, `futuresSelectedPair`); restored when user returns to the tab. |
| Tab switching not instant/smooth | **§1 below:** `FadeTabScreen` keeps inactive tab behind active tab (`zIndex: -1`, `pointerEvents: "none"`) so no overlay blocks; screens stay mounted so no remount jank. |

---

## 1. React Navigation Configuration (Prevent Unmounting)

**Goal:** Screens should **NOT unmount** when switching between Spot, Future, Wallet, etc.

**File:** `src/navigation/Navigator.tsx`

### 1.1 Bottom tab options for Spot and Future

Set these options **only** on the **Spot** and **Futures** tab screens (other tabs can use defaults):

```tsx
// Spot tab (e.g. name={routes.WALLET_SCREEN})
<Tab.Screen
  name={routes.WALLET_SCREEN}
  options={{
    freezeOnBlur: true,
    unmountOnBlur: false,
    // ... tabBarIcon, tabBarLabel, etc.
  }}
  component={FadeTabScreen(Spot)}
/>

// Futures tab
<Tab.Screen
  name={routes.FUTURES_SCREEN}
  options={{
    freezeOnBlur: true,
    unmountOnBlur: false,
    // ... tabBarIcon, tabBarLabel, etc.
  }}
  component={FadeTabScreen(Futures)}
/>
```

- **`unmountOnBlur: false`** – The screen component is **not unmounted** when the user leaves the tab. This keeps the WebView and all state (order book, selected pair) in memory.
- **`freezeOnBlur: true`** – Reduces re-renders when the tab is in the background.

### 1.2 FadeTabScreen wrapper (avoid overlay blocking)

Wrap each tab screen with a wrapper that:

- **When focused:** `flex: 1`, `zIndex: 1`, `elevation: 1` (Android), `pointerEvents: "auto"`.
- **When inactive:** `position: "absolute"`, `left: 0`, `right: 0`, `top: 0`, `bottom: 0`, `zIndex: -1`, `elevation: 0` (Android), `pointerEvents: "none"`.

So the **active** tab is always on top and receives touches; the inactive tab is drawn behind and does not block. Tab switching stays instant and smooth.

```tsx
const FadeTabScreen = (ScreenComponent: any) => {
  return (props: any) => {
    const isFocused = useIsFocused();
    const wrapperStyle = isFocused
      ? { flex: 1, zIndex: 1, ...(Platform.OS === "android" && { elevation: 1 }) }
      : {
          position: "absolute" as const,
          left: 0, right: 0, top: 0, bottom: 0,
          zIndex: -1,
          ...(Platform.OS === "android" && { elevation: 0 }),
        };
    return (
      <Animated.View style={wrapperStyle} pointerEvents={isFocused ? "auto" : "none"}>
        <ScreenComponent {...props} />
      </Animated.View>
    );
  };
};
```

---

## 2. State Management – Preserve Selected Trading Pair

**Goal:** When the user was viewing **ETH/USDT on Spot** (or any pair on Future), then switches to Future or Wallet and comes back, the **same pair** should still be selected.

**Strategy:** Store the selected pair in **global state (Redux)** so it survives tab switches and is restored when the screen is focused again.

### 2.1 Redux state (already in use)

- **Spot:** `state.home.spotSelectedPair` – set when user selects a pair on Spot; used to restore pair and drive chart/order book.
- **Futures:** `state.home.futuresSelectedPair` – set when user selects a pair on Futures; used to restore pair and drive chart/order book.

### 2.2 When to read and write

- **On pair selection:** When the user picks a pair (e.g. ETH/USDT), dispatch `setSpotSelectedPair(pair)` or `setFuturesSelectedPair(pair)` so the choice is persisted.
- **On load / when pair list is ready:** If the screen has no selected pair yet, first try to restore from Redux (`spotSelectedPair` / `futuresSelectedPair`). If that pair exists in the pair list, use it; otherwise fall back to route params or default (e.g. BTC/USDT).
- **When syncing live data:** When you update the selected pair object with latest price/order book from the socket, you can also update Redux with the same object so the persisted pair stays in sync.

This way, switching tabs does not reset the selected pair; it remains the same when the user returns.

---

## 3. WebView Implementation (No Reload on Tab Switch)

**Goal:** The WebView trading chart should **remain loaded** and **not reload** when the user switches away and back.

**Strategy:**

1. **Keep the screen mounted** – With `unmountOnBlur: false`, the Spot and Futures screen components (and their children, including the WebView) are **not unmounted** when changing tabs. So the WebView instance stays in memory and does not reload.
2. **Render a minimal view when tab is not focused** – When the user is on another tab, the trading screen should **return early** with a single transparent `View` (e.g. `flex: 1`, `opacity: 0`, `pointerEvents: "none"`, `backgroundColor: "transparent"`). The rest of the component tree (including the WebView) is still mounted; only the **visible output** is the minimal view. When the user returns, the same WebView is shown again with no reload.
3. **One WebView per screen** – One chart WebView in Spot, one in Futures. No extra WebViews; good for performance and memory.
4. **Memoize chart section (optional)** – Wrap the chart section in `React.memo` so parent re-renders don’t remount the WebView unnecessarily.

**Pattern:**

```tsx
// Inside Spot or Future screen
const isFocused = useIsFocused();

if (!isFocused) {
  return (
    <View style={{
      flex: 1,
      opacity: 0,
      pointerEvents: "none",
      backgroundColor: "transparent",
      ...(Platform.OS === "android" && { elevation: 0, zIndex: -1 }),
    }} />
  );
}

return (
  <View style={{ flex: 1 }}>
    <ChartSection chartUri={chartUri} onChartLoaded={onChartLoaded} />
    {/* Order Book, form, etc. */}
  </View>
);
```

---

## 4. Order Book – Prevent Unnecessary Reconnect and Reload

**Goal:** Order Book should **keep its existing state** and **not** reconnect or reload unnecessarily when switching tabs.

**Strategy:**

1. **Do not unmount the screen** – So the Order Book’s data (in Redux for Spot, local state for Futures) is **not** cleared by unmounting.
2. **Do not clear order book data on blur** – When the user leaves the tab, **unsubscribe** from the socket (to stop live updates and avoid work in background) but **do not** clear `buyOrders`/`sellOrders` (Spot) or `BuyOrders`/`SellOrders` (Futures). When the user returns, the last data is still there and is shown immediately.
3. **Re-subscribe on focus** – When the tab is focused again, subscribe to the exchange/futures socket for the **current selected pair** (from Redux). Live updates resume without a full “reload” of the order book.
4. **Clean up on blur** – In the blur cleanup (e.g. `useFocusEffect` return or effect cleanup), clear any timers and throttle refs so no callbacks run after the user has left the tab.

**Spot:** Use Redux for `buyOrders`/`sellOrders`. In `useFocusEffect`: on focus call `subscribeToExchange(base_currency_id, quote_currency_id)`; on blur call `unsubscribeFromExchange(...)` and clear timers; do **not** dispatch clear of order book data.

**Futures:** Use local state for `BuyOrders`/`SellOrders` (e.g. from `useFuturesSocket()`). Subscribe to the futures socket only when `isFocused`; on blur the component stays mounted so state remains; on focus you can resubscribe for the selected pair if your socket API requires it.

---

## 5. Example Implementation – Spot Screen and Future Screen

**Goal:** One place to see the full pattern for both screens (mounting, focus, pair, chart, order book).

### 5.1 Spot Screen (conceptual)

```tsx
function SpotScreen() {
  const isSpotFocused = useIsFocused();
  const dispatch = useDispatch();
  const spotSelectedPair = useAppSelector((state) => state.home.spotSelectedPair);
  const buyOrders = useAppSelector((state) => state.home.buyOrders);
  const sellOrders = useAppSelector((state) => state.home.sellOrders);
  // ... chartUri, subscribeToExchange, unsubscribeFromExchange

  useFocusEffect(
    useCallback(() => {
      if (spotSelectedPair?.base_currency_id && spotSelectedPair?.quote_currency_id) {
        subscribeToExchange(spotSelectedPair.base_currency_id, spotSelectedPair.quote_currency_id);
      }
      return () => {
        unsubscribeFromExchange(/* current pair */);
        // clear timers
      };
    }, [spotSelectedPair?.base_currency_id, spotSelectedPair?.quote_currency_id])
  );

  if (!isSpotFocused) {
    return <View style={{ flex: 1, opacity: 0, pointerEvents: "none", backgroundColor: "transparent" }} />;
  }

  return (
    <ScrollView>
      <SpotHeader
        pair={spotSelectedPair}
        onSelectPair={(pair) => dispatch(setSpotSelectedPair(pair))}
      />
      <SpotChartSection chartUri={chartUri} onChartLoaded={onChartLoaded} />
      <OrderBookPanel sellData={sellOrders} buyData={buyOrders} />
      {/* order form */}
    </ScrollView>
  );
}
```

### 5.2 Future Screen (conceptual)

```tsx
function FuturesScreen() {
  const isFocused = useIsFocused();
  const dispatch = useDispatch();
  const futuresSelectedPair = useAppSelector((state) => state.home.futuresSelectedPair);
  const [selectedCoin, setSelectedCoin] = useState(futuresSelectedPair || {});
  const [BuyOrders, setBuyOrders] = useState([]);
  const [SellOrders, setSellOrders] = useState([]);
  // ... pairData, subscribeToFutures, unsubscribeFromFutures

  useEffect(() => {
    if (!pairData?.length) return;
    if (futuresSelectedPair?.short_name && futuresSelectedPair?.margin_asset) {
      const restored = pairData.find(
        (p) => p.short_name === futuresSelectedPair.short_name && p.margin_asset === futuresSelectedPair.margin_asset
      );
      if (restored) setSelectedCoin(restored);
      return;
    }
    setSelectedCoin(pairData[0]); // or BTC/USDT default
  }, [pairData, futuresSelectedPair]);

  useEffect(() => {
    if (!isFocused || !selectedCoin?.base_currency_id) return;
    subscribeToFutures(selectedCoin.base_currency_id, selectedCoin.quote_currency_id);
    return () => unsubscribeFromFutures(selectedCoin.base_currency_id, selectedCoin.quote_currency_id);
  }, [isFocused, selectedCoin?.base_currency_id, selectedCoin?.quote_currency_id]);

  if (!isFocused) {
    return <View style={{ flex: 1, opacity: 0, pointerEvents: "none", backgroundColor: "transparent" }} />;
  }

  return (
    <ScrollView>
      <Header
        pair={selectedCoin}
        onSelectPair={(pair) => {
          setSelectedCoin(pair);
          dispatch(setFuturesSelectedPair(pair));
        }}
      />
      <FuturesChartSection chartUri={chartUri} onChartLoaded={onChartLoaded} />
      <OrderBookSection sellOrders={SellOrders} buyOrders={BuyOrders} />
      {/* order form */}
    </ScrollView>
  );
}
```

---

## 6. Requirements Summary (Architecture Checklist)

| Requirement | Approach in This App |
|-------------|----------------------|
| Future chart WebView should not reload on tab switch | Future screen stays mounted; when tab is not focused it renders a minimal view; WebView stays in memory. |
| Spot chart should preserve state | Same: Spot screen stays mounted; minimal view when blurred. |
| Order Book maintains state and real-time data | State kept in Redux (Spot) / local state (Futures); socket unsubscribed on blur, re-subscribed on focus; data not cleared. |
| Screens remain mounted | `unmountOnBlur: false` for Spot and Futures tabs. |
| Instant, smooth tab switching | `FadeTabScreen` + inactive tab with `zIndex: -1`, `pointerEvents: "none"` so it never blocks the active tab. |
| Only two WebViews (Future + Spot) | One WebView per screen; no extra instances. |
| Optional: preload Future chart after login | Documented in §6; optional and not required for tab-switch behavior. |

---

## 2. Best React Native Architecture (Current Approach)

```
┌─────────────────────────────────────────────────────────────────┐
│  Bottom Tab Navigator                                            │
│  (Tab.Navigator – Home, Market, Spot, Futures, Staking, Wallet)   │
└─────────────────────────────────────────────────────────────────┘
         │
         ├── Each tab screen wrapped in FadeTabScreen
         │   • Focused tab: flex:1, zIndex:1, pointerEvents:auto
         │   • Inactive tab: position:absolute, full screen, zIndex:-1, pointerEvents:none
         │
         ├── Spot (WALLET_SCREEN)
         │   • options: unmountOnBlur: false, freezeOnBlur: true
         │   • When focused → full UI (chart WebView + order book + form)
         │   • When not focused → single transparent View (chart + state kept in memory)
         │
         └── Futures (FUTURES_SCREEN)
             • options: unmountOnBlur: false, freezeOnBlur: true
             • When focused → full UI (chart WebView + order book + form)
             • When not focused → single transparent View (chart + state kept in memory)
```

**Principles:**

1. **Keep trading screens mounted** – Spot and Futures are never unmounted on tab switch, so their WebViews and React state (including order book) stay in memory.
2. **Minimal view when blurred** – When the user is on another tab, each trading screen renders only a transparent, non-interactive view. No chart or order book is drawn; the component tree (and WebView) is still there.
3. **No overlay blocking** – Inactive tab is positioned behind the active tab (`zIndex: -1`) with `pointerEvents: "none"`, so it never blocks touches.
4. **Socket lifecycle** – Subscribe to exchange/futures socket when the trading tab is focused; unsubscribe on blur. Do **not** clear order book data on blur so that when the user returns, last data is still visible and live updates resume.

---

## 3. React Navigation Configuration

**File:** `src/navigation/Navigator.tsx`

### 3.1 Tab options for trading screens (already applied)

Only **Spot** and **Futures** need these options; other tabs can use defaults.

```tsx
// Spot tab
<Tab.Screen
  name={routes.WALLET_SCREEN}
  options={{
    freezeOnBlur: true,
    unmountOnBlur: false,
    // ... tabBarIcon, tabBarLabel, etc.
  }}
  component={FadeTabScreen(Spot)}
/>

// Futures tab
<Tab.Screen
  name={routes.FUTURES_SCREEN}
  options={{
    freezeOnBlur: true,
    unmountOnBlur: false,
    // ... tabBarIcon, tabBarLabel, etc.
  }}
  component={FadeTabScreen(Futures)}
/>
```

- **`unmountOnBlur: false`** – Prevents screen unmount when user leaves the tab. WebView and order book state stay mounted.
- **`freezeOnBlur: true`** – Reduces re-renders when the tab is in the background.

### 3.2 FadeTabScreen wrapper (already in use)

Ensures the **inactive** tab does not block the active tab:

- **Focused tab:** `flex: 1`, `zIndex: 1`, `elevation: 1` (Android), `pointerEvents: "auto"`.
- **Inactive tab:** `position: "absolute"`, `left/right/top/bottom: 0`, `zIndex: -1`, `elevation: 0` (Android), `pointerEvents: "none"`.

So the active tab is always on top and the only one receiving touches; no transparent overlay issue.

---

## 4. WebView Setup (Future & Spot Charts)

- **One WebView per screen** – Future screen has one chart WebView; Spot screen has one. Only these two WebViews exist in the app.
- **No reload on tab switch** – Because the screens are not unmounted, the WebView component is not unmounted; the chart does not reload when moving to Wallet and back.
- **URL / theme** – Chart URL is built from theme and selected pair (e.g. `chartBaseUrl + pair`). When the user changes pair, the screen updates the URL and may show a skeleton until the new chart loads; the WebView itself is reused for that screen.
- **Background** – Use a stable background (e.g. `colors.newThemeColor` or `CHART_BG_FALLBACK`) for the chart container to avoid black flash.

**Pattern (conceptual – your existing screens already follow this):**

```tsx
// Inside Future / Spot screen component
const isFocused = useIsFocused(); // or isSpotFocused from useIsFocused()

if (!isFocused) {
  return (
    <View style={{ flex: 1, opacity: 0, pointerEvents: "none", backgroundColor: "transparent", ... }} />
  );
}

return (
  <View style={{ flex: 1 }}>
    <ChartSection chartUri={chartUri} onChartLoaded={onChartLoaded} />
    <OrderBookPanel ... />
    {/* rest of UI */}
  </View>
);
```

When `!isFocused`, the full tree (including the WebView) is still mounted; only the **output** is the minimal view. When the user returns, the same WebView is still there with the same state.

---

## 5. Order Book State Management (No Reload)

### 5.1 Spot Order Book

- **State:** Redux (`state.home.buyOrders`, `state.home.sellOrders`) plus any local cache for the current pair.
- **Socket:** On **focus** → `subscribeToExchange(base_currency_id, quote_currency_id)`. On **blur** → `unsubscribeFromExchange(...)` and cleanup timers; **do not** clear Redux `buyOrders`/`sellOrders`.
- **Result:** When the user returns to Spot, the last order book is still in Redux and is shown immediately; re-subscribing restores live updates.

### 5.2 Futures Order Book

- **State:** Local state (`BuyOrders`, `SellOrders`) updated from `useFuturesSocket()` (e.g. `futuresData.buy_order` / `futuresData.sell_order`).
- **Socket:** Subscription runs only when `isFocused` (e.g. `if (!isFocused) return` in the subscribe effect). On blur, the component stays mounted so `BuyOrders`/`SellOrders` are **not** reset.
- **Result:** When the user returns to Futures, the same component instance is visible again with the last order book; socket can resubscribe for the selected pair.

### 5.3 Summary

- **Do not unmount** trading screens → Order book state is preserved (Redux for Spot, local for Futures).
- **Do not clear** order book data on blur; only unsubscribe from the socket if needed.
- **Re-subscribe** on focus so live updates resume without a full reload.

---

## 6. Optional: Preload Future Chart After Login

If you want the Future chart to appear **instantly** the first time the user opens the Future tab:

- **Option A – Pre-mount in background:** After login, you could mount a hidden or off-screen Future (or a minimal wrapper that only holds the chart WebView) so the WebView starts loading. When the user opens the Future tab, show that preloaded content. This adds complexity (where to mount, when to show).
- **Option B – Rely on current behavior:** With `unmountOnBlur: false`, the **first** time the user opens Future the chart loads once; every **subsequent** visit reuses the same mounted screen and WebView, so no reload. Preloading is not strictly required for smooth tab switching after the first load.

---

## 7. Example Implementation Patterns (Reference Only)

These are **minimal patterns** that match the behavior of your existing Future Screen, Spot Screen, and Order Book. **Your current code does not need to be replaced**; these are for reference.

### 7.1 Future Screen – structure pattern

```tsx
// Conceptual structure only
function FuturesScreen() {
  const isFocused = useIsFocused();
  const [selectedCoin, setSelectedCoin] = useState({});
  // ... socket, pairData, BuyOrders, SellOrders, etc.

  if (!isFocused) {
    return <View style={{ flex: 1, opacity: 0, pointerEvents: "none", backgroundColor: "transparent" }} />;
  }

  return (
    <ScrollView>
      <Header pair={selectedCoin} />
      <FuturesChartSection chartUri={chartUri} onChartLoaded={onChartLoaded} />
      <OrderBookSection sellOrders={BuyOrders} buyOrders={SellOrders} showSkeleton={showOrderBookSkeleton} />
      {/* order form, etc. */}
    </ScrollView>
  );
}
```

### 7.2 Spot Screen – structure pattern

```tsx
// Conceptual structure only
function SpotScreen() {
  const isSpotFocused = useIsFocused();
  const spotSelectedPair = useAppSelector((state) => state.home.spotSelectedPair);
  // ... socket, buyOrders, sellOrders from Redux

  if (!isSpotFocused) {
    return <View style={{ flex: 1, opacity: 0, pointerEvents: "none", backgroundColor: "transparent" }} />;
  }

  return (
    <ScrollView>
      <SpotHeader pair={spotSelectedPair} />
      <SpotChartSection chartUri={chartUri} onChartLoaded={onChartLoaded} />
      <OrderBookPanel sellData={sellOrders} buyData={buyOrders} showOrderBookSkeleton={showOrderBookSkeleton} />
      {/* order form, etc. */}
    </ScrollView>
  );
}
```

### 7.3 Order Book – state and socket pattern

- **Spot:** Read `buyOrders` / `sellOrders` from Redux. In `useFocusEffect`: on focus call `subscribeToExchange(...)`, on blur call `unsubscribeFromExchange(...)` and clear timers; do not clear Redux.
- **Futures:** Read `BuyOrders` / `SellOrders` from local state (filled by `useFuturesSocket()`). Subscribe to the futures socket only when `isFocused`; when the user leaves the tab, the component stays mounted so state remains.

---

## 8. Constraints and Memory

- **Exactly two WebViews** – One in Spot, one in Futures. Both stay mounted when their tab is not focused (only a minimal view is rendered). No extra WebViews.
- **Real-time order book** – Socket subscription is tied to focus; unsubscribe on blur and re-subscribe on focus. Data is not cleared, so the order book does not “reload” when returning to the tab.
- **Efficient memory** – Unsubscribe from sockets and clear timers/listeners in blur cleanup. WebView and React state remain in memory; only active subscriptions and timers are cleaned up.

---

## 9. Files Reference (No Changes Required)

| File | Role |
|------|------|
| `src/navigation/Navigator.tsx` | Already uses `unmountOnBlur: false`, `freezeOnBlur: true` for Spot and Futures, and `FadeTabScreen` with correct zIndex/pointerEvents for inactive tabs. |
| `src/screens/spotScreen/Spot.jsx` | Already uses `useIsFocused()`, minimal blur view, and useFocusEffect cleanup for timers and socket unsubscribe. |
| `src/screens/Futures/index.js` | Already uses `useIsFocused()`, minimal blur view, and subscribe/unsubscribe when focused. |
| `docs/TRADING_TABS_ARCHITECTURE.md` | More detailed notes on the same architecture (blur view, overlay fix, etc.). |

With this architecture, tab switching keeps Future and Spot screens mounted, preserves both WebViews and order book state, avoids unnecessary reloads, and keeps the UI responsive without blocking touches.
