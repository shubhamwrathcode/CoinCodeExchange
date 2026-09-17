/**
 * Shared parsing for coin `chain` + per-network status/limits (deposit & withdraw APIs).
 * Aligns with web: DepositPage (deposit_status), WithdrawPage (withdrawal_status).
 */

export const CHAIN_FULL_NAMES = {
    ERC20: "Ethereum (ERC20)",
    BEP20: "BNB Smart Chain (BEP20)",
    TRC20: "Tron (TRC20)",
    POLYGON: "Polygon",
    SOLANA: "Solana",
    BTC: "Bitcoin",
};

export const WITHDRAW_NETWORK_LABELS = {
    BSC: "BNB Smart Chain (bsc)",
    ETH: "Ethereum (ETH)",
    TRX: "Tron (TRC20)",
    POLYGON: "Polygon (MATIC)",
    BTC: "Bitcoin (BTC)",
    SOL: "Solana (SOL)",
    ARBITRUM: "Arbitrum One",
    BASE: "Base",
    TON: "TON (The Open Network)",
    CELO: "Celo",
};


export function networkKeysFromChain(chain) {
    if (chain == null) return [];
    if (Array.isArray(chain)) {
        return chain
            .map((c) => {
                if (typeof c === 'string' && c.trim()) return c.trim();
                if (c != null && typeof c === 'object' && !Array.isArray(c)) {
                    const k = Object.keys(c)[0];
                    return k || '';
                }
                return '';
            })
            .filter(Boolean);
    }
    if (typeof chain === 'object') {
        return Object.keys(chain);
    }
    return [];
}



/** When `item.chain` is missing but API sends `chains: [{ chain, network, ... }]`. */
export function networkKeysFromWalletChainsArray(chains) {
    if (!Array.isArray(chains) || chains.length === 0) return [];
    const out = [];
    for (const ch of chains) {
        if (!ch || typeof ch !== 'object') continue;
        const raw = String(ch.chain || ch.network || '').trim().toUpperCase();
        if (!raw) continue;
        const code = raw;
        if (code && !out.includes(code)) out.push(code);
    }
    return out;
}

/** Web DepositPage: deposit_status[chain] === "ACTIVE" */
export function getActiveDepositChainKeys(item) {
    if (!item) return [];
    const keys = networkKeysFromChain(item.chain);
    const ds = item.deposit_status;
    if (typeof ds === 'string') {
        if (ds === 'SUSPENDED') return [];
        return keys;
    }
    if (ds && typeof ds === 'object' && !Array.isArray(ds) && Object.keys(ds).length > 0) {
        return keys.filter((k) => ds[k] === 'ACTIVE');
    }
    return keys;
}

/** Web WithdrawPage: withdrawal_status[chain] === "ACTIVE" */
export function getActiveWithdrawChainKeys(item) {
    if (!item) return [];
    let keys = networkKeysFromChain(item.chain);
    if (keys.length === 0 && Array.isArray(item.chains)) {
        keys = networkKeysFromWalletChainsArray(item.chains);
    }
    const ws = item.withdrawal_status;
    if (typeof ws === 'string') {
        if (ws === 'SUSPENDED') return [];
        return keys;
    }
    // Empty `{}` must not filter out every network (catalog often omits per-chain flags).
    if (ws && typeof ws === 'object' && !Array.isArray(ws) && Object.keys(ws).length > 0) {
        return keys.filter((k) => ws[k] === 'ACTIVE');
    }
    return keys;
}

/** Per-chain field or scalar (matches web getChainValue). */
export function valueForChain(coin, field, chainKey) {
    if (!coin) return undefined;
    const raw = coin[field];
    if (raw == null) return undefined;
    if (typeof raw === 'object' && !Array.isArray(raw) && chainKey && chainKey in raw) {
        return raw[chainKey];
    }
    if (typeof raw === 'string' || typeof raw === 'number') {
        return raw;
    }
    return undefined;
}

export function isDepositCoinDisabled(item) {
    if (!item) return true;
    if (typeof item.deposit_status === 'string' && item.deposit_status === 'SUSPENDED') {
        return true;
    }
    return getActiveDepositChainKeys(item).length === 0;
}

export function isWithdrawCoinDisabled(item) {
    if (!item) return true;
    if (typeof item.withdrawal_status === 'string' && item.withdrawal_status === 'SUSPENDED') {
        return true;
    }
    return getActiveWithdrawChainKeys(item).length === 0;
}

export function parseNum(v, fallback = 0) {
    if (v == null || v === '') return fallback;
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : fallback;
}

/**
 * Map UI/catalog chain code to canonical `chain` for `POST wallet/validate-address`
 * (same mapping as web `canonicalWithdrawalChainFromUiCode`).
 */
export function canonicalWithdrawalChainForValidateAddress(uiCode) {
    if (uiCode == null || uiCode === '') return '';
    const u = String(uiCode).trim().toUpperCase();
    const map = {
        BSC: 'BEP20',
        BNB: 'BEP20',
        'BNB SMART CHAIN': 'BEP20',
        BEP20: 'BEP20',
        ETH: 'ERC20',
        ETHEREUM: 'ERC20',
        ERC20: 'ERC20',
        TRX: 'TRC20',
        TRON: 'TRC20',
        TRC20: 'TRC20',
        POLYGON: 'MATIC',
        MATIC: 'MATIC',
        SOL: 'SOL',
        SOLANA: 'SOL',
    };
    return map[u] || u;
}

function firstFiniteNum(...candidates) {
    for (const v of candidates) {
        if (v == null || v === '') continue;
        const n = Number(v);
        if (Number.isFinite(n)) return n;
    }
    return null;
}

/** Web `withdrawPageHelpers.formatWithdrawAmountDisplay` — limits / fee rows. */
export function formatWithdrawAmountDisplay(n) {
    if (n == null || !Number.isFinite(Number(n))) return '—';
    const num = Number(n);
    const a = Math.abs(num);
    if (a === 0) return '0';
    if (a >= 1) return num.toLocaleString(undefined, { maximumFractionDigits: 6 });
    return num.toLocaleString(undefined, { maximumFractionDigits: 8 });
}

/**
 * Web `get24hWithdrawLimitDisplay` — "remaining / cap" from wallet row + coin + per-chain max.
 */
export function get24hWithdrawLimitDisplay(coin, chainCode, fundRow) {
    if (!coin || !chainCode) return '— / —';
    const maxByChain =
        coin.max_withdrawal && chainCode && coin.max_withdrawal[chainCode] != null
            ? Number(coin.max_withdrawal[chainCode])
            : null;

    const cap = firstFiniteNum(
        fundRow?.daily_withdraw_limit,
        fundRow?.limit_24h,
        fundRow?.withdraw_24h_limit,
        coin?.daily_withdraw_limit,
        coin?.limit_24h,
        maxByChain,
    );
    const rem = firstFiniteNum(
        fundRow?.remaining_24h_withdraw,
        fundRow?.remaining_24h,
        fundRow?.daily_withdraw_remaining,
        fundRow?.withdraw_24h_remaining,
        coin?.remaining_24h_withdraw,
        coin?.remaining_24h,
        coin?.daily_withdraw_remaining,
        chainCode && coin?.remaining_24h_by_chain && coin.remaining_24h_by_chain[chainCode],
        cap,
        maxByChain,
    );

    const right = cap ?? maxByChain;
    const left = rem ?? right;

    if (right == null && left == null) return '— / —';
    if (right == null) return `${formatWithdrawAmountDisplay(left)} / —`;
    if (left == null) return `— / ${formatWithdrawAmountDisplay(right)}`;
    return `${formatWithdrawAmountDisplay(left)} / ${formatWithdrawAmountDisplay(right)}`;
}

/** Web `formatFundAvailable` — main wallet row: balance + locked for display / MAX. */
export function formatFundAvailableFromRow(row) {
    if (!row) return '0.00';
    const bal = parseFloat(String(row.balance ?? '').replace(/,/g, '')) || 0;
    const locked = parseFloat(String(row.locked_balance ?? '').replace(/,/g, '')) || 0;
    const b = bal + locked;
    if (!Number.isFinite(b)) return '0.00';
    if (b === 0) return '0.00';
    return b >= 1 ? b.toFixed(2) : b.toFixed(6);
}

export function totalSpendableFromFundRow(row) {
    if (!row) return 0;
    const bal = parseFloat(String(row.balance ?? '').replace(/,/g, '')) || 0;
    const locked = parseFloat(String(row.locked_balance ?? '').replace(/,/g, '')) || 0;
    const b = bal + locked;
    return Number.isFinite(b) ? b : 0;
}
