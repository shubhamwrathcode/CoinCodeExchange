import React, { useMemo } from "react";
import { View } from "react-native";
import MarketList from "./MarketList";
import NavigationService from "../../navigation/NavigationService";
import { TRADE_SCREEN, WALLET_SCREEN } from "../../navigation/routes";

// Web "Cryptos" tab is a coins view (not strictly pairs).
// We approximate it on mobile by collapsing spot pairs into one row per base currency,
// preferring the USDT pair (else highest-volume pair).
const CryptosMarket = ({ coinPairs, search = "", subCategory = "All", hideStar = true, favoriteArray, onToggleFavorite }) => {
  const rows = useMemo(() => {
    const list = Array.isArray(coinPairs) ? coinPairs : [];
    if (list.length === 0) return [];

    const s = (search || "").trim().toLowerCase();
    const byBase = new Map();

    for (const p of list) {
      // apply sub-category filter (same as web pills)
      if (subCategory && subCategory !== "All") {
        if (String(p?.sub_category ?? "").trim() !== String(subCategory).trim()) continue;
      }
      const base = (p?.base_currency || "").toUpperCase();
      if (!base) continue;

      if (s) {
        const quote = (p?.quote_currency || "").toLowerCase();
        const baseL = (p?.base_currency || "").toLowerCase();
        const full = (p?.base_currency_fullname || "").toLowerCase();
        if (!baseL.includes(s) && !quote.includes(s) && !full.includes(s)) continue;
      }

      const existing = byBase.get(base);
      const isUsdt = (p?.quote_currency || "").toUpperCase() === "USDT";
      const vol = Number(p?.volume ?? 0);

      if (!existing) {
        byBase.set(base, { pick: p, isUsdtPick: isUsdt, volPick: vol });
        continue;
      }

      // Prefer USDT; otherwise prefer higher volume
      if (isUsdt && !existing.isUsdtPick) {
        byBase.set(base, { pick: p, isUsdtPick: true, volPick: vol });
      } else if (existing.isUsdtPick === isUsdt && vol > existing.volPick) {
        byBase.set(base, { pick: p, isUsdtPick: isUsdt, volPick: vol });
      }
    }

    // Keep insertion order to match web (no extra sorting by volume).
    // Map preserves insertion order even when values are replaced.
    return Array.from(byBase.values()).map((x) => x.pick);
  }, [coinPairs, search, subCategory]);

  const handleNavigate = (item) => {
    NavigationService.navigate(TRADE_SCREEN, { coinDetail: item });
  };

  return (
    <View style={{ flex: 1, minHeight: 0, marginTop: 4, paddingBottom: 12 }}>
      <MarketList
        filterData={rows}
        onPress={handleNavigate}
        hideStar={hideStar}
        favoriteArray={favoriteArray}
        onToggleFavorite={onToggleFavorite}
        isCryptos={true}
      />
    </View>
  );
};

export default CryptosMarket;
