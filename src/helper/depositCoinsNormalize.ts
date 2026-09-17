/**
 * Normalize deposit coin list responses to match web `DepositPage` + mobile `DepositCoin` expectations:
 * `chain: string[]`, `min_deposit` / `max_deposit` / `deposit_status` keyed by chain.
 * Ported from `arab_global_exchange/src/ui/Pages/DepositPage/index.js`.
 */



export function extractDepositCoinsList(res: any): any[] {
  if (!res || typeof res !== "object") return [];
  const d = res.data;
  if (Array.isArray(d)) return d;
  if (d && Array.isArray(d.data)) return d.data;
  return [];
}

function normalizeWalletDepositCoins(list: any[]): any[] {
  if (!Array.isArray(list) || list.length === 0) return [];
  const looksLikeWalletDepositCoins = list.some((x) => Array.isArray(x?.chains));
  if (!looksLikeWalletDepositCoins) return list;

  return list
    .map((coin) => {
      if (!coin || typeof coin !== "object") return null;
      const chains = Array.isArray(coin.chains) ? coin.chains : [];
      const out: any = {
        ...coin,
        chain: [] as string[],
        min_deposit: {} as Record<string, any>,
        max_deposit: {} as Record<string, any>,
        deposit_status: {} as Record<string, string>,
        _chain_full_name: {} as Record<string, string>,
        _chain_api_code: {} as Record<string, string>,
        _chain_eta: {} as Record<string, string>,
        _deposit_asset_id: {} as Record<string, string>,
      };

      for (const ch of chains) {
        if (!ch || typeof ch !== "object") continue;
        const rawCode = String(ch.chain || "").trim().toUpperCase();
        if (!rawCode) continue;
        const code = rawCode;
        if (!code) continue;

        if (!out.chain.includes(code)) out.chain.push(code);
        if (ch.min_deposit != null && ch.min_deposit !== "") out.min_deposit[code] = ch.min_deposit;
        if (ch.max_deposit != null && ch.max_deposit !== "") out.max_deposit[code] = ch.max_deposit;

        const dep = ch.chain_deposit_status ?? ch.deposit_status ?? ch.status ?? coin.deposit_status;
        if (dep != null && String(dep).trim() !== "") out.deposit_status[code] = String(dep).toUpperCase();

        const full = ch.chain_full_name || ch.network_full_name || ch.chainFullName;
        if (full != null && String(full).trim()) out._chain_full_name[code] = String(full);
        out._chain_api_code[code] = rawCode;
        const etaRaw =
          ch.estimated_arrival ??
          ch.estimated_arrival_time ??
          ch.expected_arrival ??
          ch.expected_unlock ??
          ch.eta ??
          ch.confirmations_hint;
        if (etaRaw != null && String(etaRaw).trim() !== "") out._chain_eta[code] = String(etaRaw).trim();
        const assetKey =
          ch.tokenAssetId ??
          ch.token_asset_id ??
          ch.asset_id ??
          ch.assetId ??
          ch.currency_asset_id ??
          ch.deposit_asset_id;
        if (assetKey != null && String(assetKey).trim() !== "") {
          out._deposit_asset_id[code] = String(assetKey).trim();
        }
      }

      for (const code of out.chain) {
        if (!out.deposit_status[code]) out.deposit_status[code] = "ACTIVE";
      }

      return out;
    })
    .filter(Boolean);
}

function normalizeFireblocksDepositCoins(list: any[]): any[] {
  if (!Array.isArray(list) || list.length === 0) return [];
  const maybeWallet = normalizeWalletDepositCoins(list);
  if (maybeWallet !== list) return maybeWallet;
  const looksLikePerChain = list.some(
    (x) => x && typeof x === "object" && typeof x.chain === "string" && x.currency_id
  );
  if (!looksLikePerChain) return list;

  const byId = new Map<any, any>();
  for (const row of list) {
    if (!row || typeof row !== "object") continue;
    const id = row.currency_id || row._id || row.id;
    const chain = String(row.chain || "").trim().toUpperCase();
    if (!id || !chain) continue;

    const prev =
      byId.get(id) ||
      ({
        _id: id,
        currency_id: id,
        name: row.name,
        short_name: row.short_name,
        icon_path: row.icon_path,
        icon_url: row.icon_url,
        chain: [] as string[],
        min_deposit: {} as Record<string, any>,
        max_deposit: {} as Record<string, any>,
        deposit_status: {} as Record<string, string>,
        _deposit_asset_id: {} as Record<string, string>,
        _chain_api_code: {} as Record<string, string>,
        _chain_full_name: {} as Record<string, string>,
        _chain_eta: {} as Record<string, string>,
      } as any);

    prev.name = prev.name || row.name;
    prev.short_name = prev.short_name || row.short_name;
    prev.icon_url = prev.icon_url || row.icon_url;
    prev.icon_path = prev.icon_path || row.icon_path;

    if (!prev.chain.includes(chain)) prev.chain.push(chain);

    prev._chain_api_code = prev._chain_api_code || {};
    prev._chain_api_code[chain] = chain;
    prev._chain_full_name = prev._chain_full_name || {};
    prev._chain_eta = prev._chain_eta || {};

    const lim = row.limits || {};
    if (lim.min_deposit != null) prev.min_deposit[chain] = lim.min_deposit;
    if (lim.max_deposit != null) prev.max_deposit[chain] = lim.max_deposit;

    const st = row.status || {};
    const depStatus = st.deposit || row.deposit || row.deposit_status?.[chain] || row.status?.[chain];
    if (depStatus != null && String(depStatus).trim() !== "") {
      prev.deposit_status[chain] = String(depStatus).toUpperCase();
    } else {
      prev.deposit_status[chain] = "ACTIVE";
    }

    const rowAsset =
      row.tokenAssetId ??
      row.token_asset_id ??
      row.asset_id ??
      row.assetId ??
      row.currency_asset_id ??
      row.deposit_asset_id;
    if (rowAsset != null && String(rowAsset).trim() !== "") {
      prev._deposit_asset_id = prev._deposit_asset_id || {};
      prev._deposit_asset_id[chain] = String(rowAsset).trim();
    }

    byId.set(id, prev);
  }

  return Array.from(byId.values());
}

/** Apply web-normalization so mobile `getActiveNetworkKeys` / deposit UI work. */
export function normalizeDepositCoinsResponse(list: any[]): any[] {
  return normalizeFireblocksDepositCoins(list);
}
