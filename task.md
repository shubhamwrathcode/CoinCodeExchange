# Tasks — 23 Sep 2026

CoinCodeExchange wallet / transfer / swap / profile / services UI work (CoinCode as design reference).

## Wallet — Total Assets card

- [x] Port CoinCode `TotalAssetsCard` design to CoinCodeExchange `WalletNew` (Overview, Spot, Main, and all other tabs)
- [x] Remove banner/card border; match reference screenshot UI
- [x] Match card color and alignment to reference
- [x] Fix card center / corner / content alignment
- [x] Fix content layout after user size styles
- [x] Match content colors to reference
- [x] Set linear gradient colors (2nd screenshot style)
- [x] Slightly enlarge card images
- [x] SpotWalletTab: Analysis button cyan; move below Today PnL
- [x] SpotWalletTab: Comment out Buy Crypto button

## Wallet — Action icons & tabs

- [x] Overview Deposit / Withdraw / Transfer / History icons from CoinCode (keep buttons, swap icons)
- [x] Crypto / Account selected underline → cyan (wallet tabs and everywhere else)
- [x] Comment out Options tab (hide)

## Wallet — Sheets (TradingDataModal style)

- [x] All WalletNew tab sheets: blur + colors like `TradingDataModal`

## Wallet — Asset cards list

- [x] Bottom cards in card-format UI (reference 2nd screenshot); keep buttons + dynamic data
- [x] Tighten card colors and spacing
- [x] Remove History / Transfer buttons from Overview Account details sheet (details only)
- [x] Isolated (and all tabs): dynamic coin images / correct path (like TradingDataModal)
- [x] Missing coin image → `activities_icon.png` fallback (no letter badge / person icon)

## Cross / Futures / Earning tabs

- [x] Cross: Borrow/Repay + Transfer button backgrounds per theme
- [x] Futures: Trade + Transfer same theme treatment
- [x] Futures: Trade / Transfer equal width
- [x] Earning: Earn icon → CoinCode `earnWallet.png` (add asset + use)

## Margin Transfer screen

- [x] New From/To cards design (`MarginTransfer.jsx`; remove from Transfer.js)
- [x] Inputs styled like Login screen theme (amount + coin field)
- [x] Coin sheet: empty AED icon + search input theme fix
- [x] Wallet-type sheet: background + content like coin sheet / TradingDataModal blur chrome
- [x] Distinct Lucide icons per wallet type (Spot / Main / Cross / etc.)
- [x] Fix missing coins list (coins should show when sheet opens)
- [x] Missing coin image → `activities_icon` (no badge / person)

## Home Swap → BuyCryptoScreen

- [x] Home Swap: remove from bottom tab → navigate to dedicated `BuyCryptoScreen`
- [x] Remove Buy Crypto / swap flow from TradeScreen (Spot)
- [x] BuyCryptoScreen sheet: search/input theme-compatible
- [x] `NavigationService` GO_BACK fix (`canGoBack`)
- [x] Swap screen containers / inputs to app theme (`#08090B` / `#151619` / theme tokens)
- [x] Selected Buy/Sell tab background elevated (`#151619`) so selection is clear

## Profile drawer (`ProfileDrawer.jsx` ← CoinCode `MyProfileScreen`)

- [x] Full redesign: header, user row, referral banner, action grid, list rows (keep nav / KYC / deposit-withdraw sheets)
- [x] Comment out P2P option (hide)
- [x] Comment out Copy Trading (hide)
- [x] News → `NOTIFICATION_SCREEN`
- [x] Invite Friends label → **Referral**
- [x] Add Trade + Wallet to grid
- [x] Trade icon → multicolor `profileTradeIcon` (replace bottom-tab white icon)
- [x] Trade label (Spot rename)
- [x] Wallet → multicolor `walletIcon` (replace white AssetsIcon)
- [x] Header scan icon → theme toggle (`themeIcon` + `setTheme` / AsyncStorage) — as before

## More Services screen (`MoreServicesScreen.jsx` ← CoinCode)

- [x] New screen matching CoinCode UI + `MORE_SERVICES_SCREEN` route + Navigator
- [x] Profile **More** → navigate to More Services
- [x] Remove/comment all P2P buttons
- [x] Comment out OTC Desk / Copy Trading / Bots
- [x] Move USD-M Futures into Trade section; navigate → `FUTURES_SCREEN`
- [x] Margin → Spot page with `activeTab: "Margin"`
- [x] Comment out Square section
- [x] Comment out Futures section (+ remove Futures pill from filter)
- [x] Comment out Proof of Reserves / Partners / Blogs / Affiliate Program
- [x] Announcements → Notification screen
- [x] Deposit / Withdrawal → WalletNew-style `DepositChoiceSheet` / `WithdrawChoiceSheet`
- [x] Comment out Simple Earn
- [x] Comment out Edit button in My Favourites

## App-wide back button

- [x] `profileBackButtonImg` on all project screens (`back_ic` alias)
- [x] Sort/dropdown chevrons → `backChevronIcon` (old arrow)
- [x] Shared `BackButton` component (`src/common/BackButton.jsx`)
- [x] Header back sizes ~35; remove tint where profile glyph is used

## Support — Create Ticket

- [x] Inputs Login theme (`lightBlackLatest` / `#151619`) — Subject, Description, Category, Priority, upload box
- [x] Category / Priority sheets → `AnimatedBottomSheet` + `blurSheetTheme` (TradingDataModal style)
- [x] `PictureModal` → `BlurSheetBackground` (same blur chrome as other sheets)
- [x] After upload: no cyan tint; show actual uploaded image preview (`Image` + `file://` URI)

## Notes / key files

- Wallet: `WalletNew.js`, wallet tabs (`SpotWalletTab`, Overview, Cross, Futures, Earning, Isolated…)
- Shared: `TradingDataModal.jsx`, `BlurSheetChrome`, `CoinIcon`, `WalletAssetCard`, `BackButton.jsx`, `PictureModal.tsx`
- Transfer: `MarginTransfer.jsx`
- Swap: `HomeMenuBar.tsx`, `BuyCryptoScreen.jsx`, `Spot.jsx`, `NavigationService.ts`
- Profile: `ProfileDrawer.jsx`, `MoreServicesScreen.jsx`
- Support: `CreateTicket.js`
- Reference: CoinCode `AssetsScreen` / `TotalAssetsCard` / `OverviewTab` / `MyProfileScreen` / `MoreServicesScreen` / `earnWallet.png`
