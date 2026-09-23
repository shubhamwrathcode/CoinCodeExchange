# Tasks — 23 Sep 2026

CoinCodeExchange wallet / transfer / swap UI work (CoinCode as design reference).

## Wallet — Total Assets card

- [x] CoinCode `TotalAssetsCard` design CoinCodeExchange `WalletNew` pe port (Overview, Spot, Main, etc. sab tabs)
- [x] Banner/card border hatao; reference screenshot jaisa UI
- [x] Card color + alignment reference ke saath match
- [x] Card center / corner / content alignment fix
- [x] User size styles ke baad content layout sahi karo
- [x] Content colors reference jaisi
- [x] Linear gradient colors set (2nd screenshot style)
- [x] Card images thodi badi
- [x] SpotWalletTab: Analysis button cyan; Today PnL ke niche move
- [x] SpotWalletTab: Buy Crypto button comment out

## Wallet — Action icons & tabs

- [x] Overview Deposit / Withdraw / Transfer / History icons CoinCode se (buttons same, icons swap)
- [x] Crypto / Account selected underline → cyan (wallet tabs + sab jagah same)
- [x] Options tab comment out (hide)

## Wallet — Sheets (TradingDataModal style)

- [x] WalletNew tabs ki saari sheets: blur + colors `TradingDataModal` jaisi

## Wallet — Asset cards list

- [x] Niche cards ko card format UI (reference 2nd screenshot); buttons + dynamic data same
- [x] Card colors + spacing tighten
- [x] Overview Account details sheet se History / Transfer buttons hatao (sirf details)
- [x] Isolated (aur sab tabs): coin images dynamic / sahi path (TradingDataModal jaisa)
- [x] Missing coin image → `activities_icon.png` fallback (letter badge / person icon nahi)

## Cross / Futures / Earning tabs

- [x] Cross: Borrow/Repay + Transfer button backgrounds theme ke hisaab se
- [x] Futures: Trade + Transfer same theme treatment
- [x] Futures: Trade / Transfer equal width
- [x] Earning: Earn icon → CoinCode `earnWallet.png` (asset add + use)

## Margin Transfer screen

- [x] From/To cards naya design (`MarginTransfer.jsx`; Transfer.js se hatao)
- [x] Inputs Login-screen theme jaisi (amount + coin field)
- [x] Coin sheet: empty AED icon + search input theme fix
- [x] Wallet-type sheet: background + content coin sheet / TradingDataModal blur chrome jaisi
- [x] Distinct Lucide icons per wallet type (Spot / Main / Cross / etc.)
- [x] Coins list missing fix (sheet open pe coins dikhen)
- [x] Missing coin image → `activities_icon` (badge / person nahi)

## Home Swap → BuyCryptoScreen

- [x] Home Swap: bottom tab se hatao → dedicated `BuyCryptoScreen` navigate
- [x] TradeScreen (Spot) se Buy Crypto / swap flow remove
- [x] BuyCryptoScreen sheet: search/input theme compatible
- [x] `NavigationService` GO_BACK fix (`canGoBack`)
- [x] Swap screen containers / inputs app theme (`#08090B` / `#151619` / theme tokens)
- [x] Selected Buy/Sell tab background elevated (`#151619`) taaki select clear dikhe

## Profile drawer (evening)

- [x] `ProfileDrawer.jsx` redesign to match CoinCode `MyProfileScreen` (header, user row, referral banner, 8-action grid, list rows); keep existing nav / KYC / deposit-withdraw sheets
- [x] Profile More → new `MoreServicesScreen` (CoinCode UI same-to-same) + route registration
- [x] App-wide back glyph: `back_ic` → `profileBackButtonImg`; chevrons use `backChevronIcon`; shared `BackButton` component

## Notes / key files

- Wallet: `WalletNew.js`, wallet tabs (`SpotWalletTab`, Overview, Cross, Futures, Earning, Isolated…)
- Shared: `TradingDataModal.jsx`, `BlurSheetChrome`, `CoinIcon`, `WalletAssetCard`
- Transfer: `MarginTransfer.jsx`
- Swap: `HomeMenuBar.tsx`, `BuyCryptoScreen.jsx`, `Spot.jsx`, `NavigationService.ts`
- Reference: CoinCode `AssetsScreen` / `TotalAssetsCard` / `OverviewTab` / `earnWallet.png`
