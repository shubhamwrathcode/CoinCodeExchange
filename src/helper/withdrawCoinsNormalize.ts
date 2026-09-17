/**
 * Normalize `GET v1/wallet/withdrawal-coins` (web WithdrawPage catalog) for mobile
 * `walletChainHelpers` + `WithdrawWallet` / `WithdrawCoinPickerPanel`.
 */



/**
 * Same shape coverage as web `extractList` + mobile `extractDepositCoinsList`
 * so one backend can serve deposit-coins / withdrawal-coins interchangeably.
 */
export function extractWithdrawCoinsList(res: any): any[] {
  if (!res || typeof res !== "object") return [];
  if (res.success === false && res.data == null) return [];
  const d = res.data;
  if (Array.isArray(d)) return d;
  if (d && typeof d === "object") {
    if (Array.isArray(d.coins)) return d.coins;
    if (Array.isArray(d.data)) return d.data;
    if (Array.isArray(d.list)) return d.list;
    if (Array.isArray(d.items)) return d.items;
    if (Array.isArray(d.records)) return d.records;
  }
  if (Array.isArray(res)) return res;
  return [];
}

/**
 * When `wallet/withdrawal-coins` is empty/unavailable but `wallet/deposit-coins` works
 * (same as DepositCoin), build withdraw UI rows from normalized deposit catalog.
 */
export function mapDepositCoinsToWithdrawCatalog(depositCoins: any[]): any[] {
  if (!Array.isArray(depositCoins) || depositCoins.length === 0) return [];

  return depositCoins
    .map((c) => {
      if (!c || typeof c !== "object") return null;

      const feeMap: Record<string, any> = {};
      if (c.withdrawal_fee && typeof c.withdrawal_fee === "object" && !Array.isArray(c.withdrawal_fee)) {
        Object.assign(feeMap, c.withdrawal_fee);
      }
      const chains = Array.isArray(c.chains) ? c.chains : [];
      for (const ch of chains) {
        if (!ch || typeof ch !== "object") continue;
        const rawCode = String(ch.chain || ch.network || "").trim().toUpperCase();
        if (!rawCode) continue;
        const code = rawCode;
        if (!code) continue;
        if (ch.withdrawal_fee != null && ch.withdrawal_fee !== "") feeMap[code] = ch.withdrawal_fee;
      }

      const minW =
        c.min_withdrawal && typeof c.min_withdrawal === "object" && !Array.isArray(c.min_withdrawal) && Object.keys(c.min_withdrawal).length
          ? c.min_withdrawal
          : c.min_deposit || {};
      const maxW =
        c.max_withdrawal && typeof c.max_withdrawal === "object" && !Array.isArray(c.max_withdrawal) && Object.keys(c.max_withdrawal).length
          ? c.max_withdrawal
          : c.max_deposit || {};
      const ws =
        c.withdrawal_status && typeof c.withdrawal_status === "object" && !Array.isArray(c.withdrawal_status) && Object.keys(c.withdrawal_status).length
          ? c.withdrawal_status
          : c.deposit_status || {};

      return {
        ...c,
        min_withdrawal: minW,
        max_withdrawal: maxW,
        withdrawal_fee: feeMap,
        withdrawal_status: ws,
      };
    })
    .filter(Boolean);
}

function normalizeWalletWithdrawalCoins(list: any[]): any[] {
  if (!Array.isArray(list) || list.length === 0) return [];
  const looksLikeWallet = list.some((x) => Array.isArray(x?.chains));
  if (!looksLikeWallet) return list;

  return list
    .map((coin) => {
      if (!coin || typeof coin !== "object") return null;
      const chains = Array.isArray(coin.chains) ? coin.chains : [];
      const out: any = {
        ...coin,
        chain: [] as string[],
        min_withdrawal: {} as Record<string, any>,
        max_withdrawal: {} as Record<string, any>,
        withdrawal_fee: {} as Record<string, any>,
        withdrawal_status: {} as Record<string, string>,
        chain_full_names: {} as Record<string, string>,
        token_asset_ids: {} as Record<string, string>,
      };

      for (const ch of chains) {
        if (!ch || typeof ch !== "object") continue;
        const rawCode = String(ch.chain || ch.network || "").trim().toUpperCase();
        if (!rawCode) continue;
        const code = rawCode;
        if (!code) continue;

        if (!out.chain.includes(code)) out.chain.push(code);
        if (ch.min_withdrawal != null && ch.min_withdrawal !== "") out.min_withdrawal[code] = ch.min_withdrawal;
        if (ch.max_withdrawal != null && ch.max_withdrawal !== "") out.max_withdrawal[code] = ch.max_withdrawal;
        if (ch.withdrawal_fee != null && ch.withdrawal_fee !== "") out.withdrawal_fee[code] = ch.withdrawal_fee;

        const ws = ch.withdrawal_status ?? ch.status;
        if (ws != null && String(ws).trim() !== "") {
          out.withdrawal_status[code] = String(ws).toUpperCase();
        }

        const full = ch.chain_full_name || ch.network_full_name || ch.chainFullName;
        if (full != null && String(full).trim()) out.chain_full_names[code] = String(full).trim();

        const assetKey = ch.tokenAssetId ?? ch.token_asset_id;
        if (assetKey != null && String(assetKey).trim()) {
          out.token_asset_ids[code] = String(assetKey).trim();
        } else if (coin.token_asset_ids && coin.token_asset_ids[rawCode]) {
          out.token_asset_ids[code] = coin.token_asset_ids[rawCode];
        }
      }

      for (const code of out.chain) {
        // Do not force missing withdrawal_status to ACTIVE here. 
        // We want the filter to exclude networks that don't explicitly have ACTIVE status.
      }

      return out;
    })
    .filter(Boolean);
}

export function normalizeWithdrawCoinsResponse(list: any[]): any[] {
  return normalizeWalletWithdrawalCoins(list);
}
