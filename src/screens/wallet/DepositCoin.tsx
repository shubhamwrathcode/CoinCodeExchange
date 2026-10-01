import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    FlatList,
    SectionList,
    TextInput,
    ActivityIndicator,
    Modal,
    Dimensions,
    PanResponder,
    Platform,
    Vibration,
    RefreshControl,
    Share,
    Linking,
    Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RBSheet from 'react-native-raw-bottom-sheet';
import {
    AppSafeAreaView,
    AppText,
    Button,
    SEMI_BOLD,
    SIXTEEN,
    FOURTEEN,
    FIFTEEN,
    THIRTEEN,
    TWELVE,
    TEN,
    YELLOW,
    GREEN,
    RED,
    BLACK,
    WHITE,
    Toolbar,
    ELEVEN,
    EIGHT,
    MEDIUM,
    BOLD,
    EIGHTEEN,
    NINE,
    TWENTY_TWO,
} from '../../shared';
import KeyBoardAware from '../../shared/components/KeyboardAware';
import FastImage from 'react-native-fast-image';
import LinearGradient from 'react-native-linear-gradient';
import {
    Search,
    X,
    ChevronRight,
    ChevronDown,
    ChevronUp,
    ArrowDownToLine,
    ArrowUpToLine,
    Star,
    Share2,
    RefreshCw,
    Copy,
    AlertTriangle,
} from 'lucide-react-native';
import MiniSparklineBase from '../../shared/components/MiniSparkline';
import { SocketContext } from '../../SocketProvider';

const MiniSparkline = MiniSparklineBase as React.ComponentType<{
    chartData?: number[];
    isPositive: boolean;
    width?: number;
    height?: number;
    chartId?: string;
    fallbackPrice?: number;
    glow?: boolean;
}>;
import QRCode from 'react-native-qrcode-svg';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import NavigationService from '../../navigation/NavigationService';
import { DEPOSIT_FIAT_SCREEN } from '../../navigation/routes';
import { buildCoinImageUri } from '../../helper/coinIconUrl';
import { buildMarketIconIndex, withMarketCoinIcon } from '../../helper/walletCoinIcon';
import DepositCoinIcon, { buildDepositCoinIconUri } from './DepositCoinIcon';
import { colors, darkTheme, lightTheme } from '../../theme/colors';
import { useTheme } from '../../hooks/useTheme';
import {
    getDepositActiveCoins,
    verifyDeposit,
} from '../../actions/walletActions';
import { getNotificationList, getFavoriteArray, addToFavorites } from '../../actions/homeActions';
import { copyText, shortenAddress, dateFormatter } from '../../helper/utility';
import { BACK_ICON, copyIcon, historyIcon, upIcon, downIcon, INFO, back_ic, externalLinkIcon, barcodeFrame } from '../../helper/ImageAssets';
import { setLoading } from '../../slices/authSlice';
// setWalletAddress removed: deposit address handled locally for web parity (address + memo)
import { showError } from '../../helper/logger';
import moment from 'moment';
import { appOperation } from '../../appOperation';
import ShimmerBone from '../../shared/components/ShimmerBone';
import { BlurSheetBackground, blurSheetRbCustomStyles, blurSheetTheme } from './sheets/BlurSheetChrome';

const SHEET_HEIGHT = Math.round(Dimensions.get('window').height * 0.72);

/** Row height + gap under each coin row (compact select list). */
const COIN_LIST_ROW_GAP = 0;
const COIN_LIST_ROW_INNER = 56;

const ACCENT_CYAN = colors.cyanTheme;

/** Brand tint for coin / chain badges, recent chips and network logos. */
const BRAND_ACCENTS: Record<string, string> = {
    BTC: '#F7931A',
    ETH: '#627EEA',
    ERC20: '#627EEA',
    USDT: '#26A17B',
    USDC: '#2775CA',
    BNB: '#F3BA2F',
    BSC: '#F3BA2F',
    BEP20: '#F3BA2F',
    TRX: '#FF0013',
    TRC20: '#FF0013',
    SOL: '#9945FF',
    DOGE: '#C2A633',
    ADA: '#0033AD',
    MATIC: '#8247E5',
    POL: '#8247E5',
    POLYGON: '#8247E5',
    DOT: '#E6007A',
    LTC: '#345D9D',
    SHIB: '#E42C21',
    AVAX: '#E84142',
    ARB: '#28A0F0',
    OP: '#FF0420',
    TON: '#0098EA',
};
const FALLBACK_ACCENTS = ['#0AA8C5', '#8247E5', '#26A17B', '#F7931A', '#E6007A', '#2775CA'];

/** Native coin symbols tried (in order) for a network's icon; unknown chains try their own code. */
const CHAIN_NATIVE_SYMBOLS: Record<string, string[]> = {
    BSC: ['BNB'],
    BEP20: ['BNB'],
    BEP2: ['BNB'],
    ETH: ['ETH'],
    ERC20: ['ETH'],
    ETHEREUM: ['ETH'],
    TRX: ['TRX'],
    TRC20: ['TRX'],
    TRON: ['TRX'],
    SOL: ['SOL'],
    SPL: ['SOL'],
    SOLANA: ['SOL'],
    MATIC: ['POL', 'MATIC'],
    POL: ['POL', 'MATIC'],
    POLYGON: ['POL', 'MATIC'],
    ARB: ['ARB'],
    ARBITRUM: ['ARB'],
    OP: ['OP'],
    OPTIMISM: ['OP'],
    AVAX: ['AVAX'],
    AVAXC: ['AVAX'],
    TON: ['TON'],
    BTC: ['BTC'],
    LTC: ['LTC'],
    DOGE: ['DOGE'],
    XRP: ['XRP'],
    ADA: ['ADA'],
    DOT: ['DOT'],
};

const accentForSymbol = (symbol: any): string => {
    const key = String(symbol || '').trim().toUpperCase();
    if (BRAND_ACCENTS[key]) return BRAND_ACCENTS[key];
    let hash = 0;
    for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
    return FALLBACK_ACCENTS[hash % FALLBACK_ACCENTS.length];
};

const hexToRgba = (hex: string, alpha: number): string => {
    let h = String(hex || '').replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h, 16);
    if (Number.isNaN(n)) return `rgba(10, 168, 197, ${alpha})`;
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
};

const MARKET_QUOTE = 'USDT';

const formatUsdPrice = (value: any): string => {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return '—';
    if (n >= 1) {
        return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    const decimals = Math.min(10, Math.max(4, -Math.floor(Math.log10(n)) + 1));
    return `$${n.toFixed(decimals).replace(/0+$/, '').replace(/\.$/, '')}`;
};

const LETTER_KEYS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
/** Figma index rail: # then A–Z */
const RAIL_KEYS = ['#', ...LETTER_KEYS];

const DEPOSIT_RECENT_SHORT_NAMES_KEY = 'deposit_recent_short_names_v1';

const triggerRailHaptic = () => {
    if (Platform.OS === 'android') {
        try {
            Vibration.vibrate(1);
        } catch {
            /* ignore */
        }
    }
};

/** Section key: A–Z from first letter of `short_name`, else "#" (Figma). */
const sectionLetterFromCoin = (item: any): string => {
    const sn = String(item?.short_name || '');
    const ch = sn.charAt(0);
    return /[A-Za-z]/.test(ch) ? ch.toUpperCase() : '#';
};

const buildDepositCoinSections = (sorted: any[]): { title: string; data: any[] }[] => {
    const byLetter: Record<string, any[]> = {};
    (sorted || []).forEach((item) => {
        const title = sectionLetterFromCoin(item);
        if (!byLetter[title]) byLetter[title] = [];
        byLetter[title].push(item);
    });
    const order: string[] = [];
    if (byLetter['#']?.length) order.push('#');
    for (const L of LETTER_KEYS) {
        if (byLetter[L]?.length) order.push(L);
    }
    return order.map((title) => ({ title, data: byLetter[title] }));
};

/** Jump to section: exact rail key, else next with rows, else previous. */
const resolveScrollSectionIndex = (
    letter: string,
    sections: { title: string; data: any[] }[]
): number => {
    let idx = sections.findIndex((s) => s.title === letter);
    if (idx >= 0) return idx;
    const start = RAIL_KEYS.indexOf(letter);
    if (start < 0) return -1;
    for (let i = Math.max(0, start); i < RAIL_KEYS.length; i++) {
        const L = RAIL_KEYS[i];
        const j = sections.findIndex((s) => s.title === L);
        if (j >= 0) return j;
    }
    for (let i = start - 1; i >= 0; i--) {
        const L = RAIL_KEYS[i];
        const j = sections.findIndex((s) => s.title === L);
        if (j >= 0) return j;
    }
    return -1;
};

/** Curated majors for "Trending" (deposit list); order matches common market priority. */
const TRENDING_SHORT_ORDER = [
    'BTC',
    'ETH',
    'USDT',
    'USDC',
    'SOL',
    'BNB',
    'XRP',
    'DOGE',
    'MATIC',
    'SHIB',
];

const yToRailLetter = (locationY: number, railHeight: number): string => {
    const h = Math.max(1, railHeight);
    const y = Math.max(0, Math.min(locationY, h));
    const ratio = y / h;
    const idx = Math.min(
        RAIL_KEYS.length - 1,
        Math.floor(ratio * RAIL_KEYS.length)
    );
    return RAIL_KEYS[idx];
};

/**
 * Network keys from `chain` (web + mobile API):
 * - string[] e.g. ["BEP20","ERC20"]
 * - object e.g. { BEP20: {...} }
 * - array of single-key objects (edge case)
 */
const networkKeysFromChain = (chain: any): string[] => {
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
};

/** Same as web DepositPage: chains where deposit_status[chain] === "ACTIVE". */
const getActiveNetworkKeys = (item: any): string[] => {
    if (!item) return [];
    const keys = networkKeysFromChain(item.chain);
    const ds = item.deposit_status;
    if (typeof ds === 'string') {
        if (ds === 'SUSPENDED') return [];
        return keys;
    }
    if (ds && typeof ds === 'object' && !Array.isArray(ds)) {
        return keys.filter((k) => ds[k] === 'ACTIVE');
    }
    return keys;
};

// (kept intentionally empty placeholder removed)

const limitForChain = (limits: any, chainKey: string): string | number | null | undefined => {
    if (limits == null) return null;
    if (typeof limits === 'object' && !Array.isArray(limits) && chainKey in limits) {
        return limits[chainKey];
    }
    if (typeof limits === 'string' || typeof limits === 'number') {
        return limits;
    }
    return null;
};

const isCoinDepositDisabled = (item: any) => {
    if (!item) return true;
    if (typeof item.deposit_status === 'string' && item.deposit_status === 'SUSPENDED') {
        return true;
    }
    return getActiveNetworkKeys(item).length === 0;
};

const sortCoinsByShortName = (arr: any[]) =>
    [...arr].sort((a, b) =>
        String(a?.short_name || '').localeCompare(String(b?.short_name || ''), undefined, {
            sensitivity: 'base',
            numeric: true,
        })
    );

const extractDepositHistoryList = (res: any): any[] => {
    if (!res || res?.success === false) return [];
    const d = (res as any).data;
    if (Array.isArray(d)) return d;
    if (d && Array.isArray(d.deposits)) return d.deposits;
    if (d && Array.isArray(d.data)) return d.data;
    if (d && Array.isArray(d.rows)) return d.rows;
    if (d && Array.isArray(d.transactions)) return d.transactions;
    if (d && Array.isArray(d.list)) return d.list;
    return [];
};

const truncateMid = (s: any, headLen = 10, tailLen = 6) => {
    if (s == null || s === '' || s === '—') return '—';
    const str = String(s);
    if (str.length <= headLen + tailLen + 1) return str;
    return `${str.slice(0, headLen)}…${str.slice(-tailLen)}`;
};

const pickExplorerHref = (raw: any): string | null => {
    if (raw == null) return null;
    const s = typeof raw === 'string' ? raw.trim() : String(raw).trim();
    return s || null;
};

const resolveExplorerUrl = (explorer: any, kind: 'address' | 'tx', value: string) => {
    const ex = explorer && typeof explorer === 'object' ? explorer : {};
    const tpl =
        kind === 'address'
            ? pickExplorerHref(ex.address) || pickExplorerHref(ex.address_url) || pickExplorerHref(ex.account)
            : pickExplorerHref(ex.tx) ||
            pickExplorerHref(ex.transaction) ||
            pickExplorerHref(ex.tx_hash_url) ||
            pickExplorerHref(ex.txUrl);
    if (!tpl || !value || value === '—') return null;
    if (/\{address\}/i.test(tpl) && kind === 'address') return tpl.replace(/\{address\}/gi, encodeURIComponent(value));
    if ((/\{txid\}/i.test(tpl) || /\{txhash\}/i.test(tpl)) && kind === 'tx') {
        return tpl
            .replace(/\{txid\}/gi, encodeURIComponent(value))
            .replace(/\{txhash\}/gi, encodeURIComponent(value));
    }
    return tpl;
};

const historyStatusLabel = (raw: any) => {
    const t = raw == null ? '' : String(raw).trim();
    if (!t) return '—';
    if (/success|completed|credited|confirm/i.test(t)) return 'COMPLETED';
    if (/pending|processing|in progress|confirming|queued|wait/i.test(t)) return 'PENDING';
    if (/fail|failed|reject|rejected|cancel|error/i.test(t)) return 'FAILED';
    return t.toUpperCase();
};

const mapDepositHistoryRow = (r: any, i: number) => {
    const tx = r?.transaction_hash || r?.txid || r?.txId || r?.tx_id || r?.hash;
    const addr = r?.address || r?.to_address || r?.destAddress || r?.destinationAddress;
    const chainFullName =
        r?.chain_full_name ||
        r?.chainFullName ||
        r?.chain_full ||
        r?.chainName ||
        r?.network_full_name ||
        (r?.metadata && (r.metadata.chain_full_name || r.metadata.chainFullName || r.metadata.network_full_name)) ||
        null;
    const short =
        r?.short_name ||
        r?.shortName ||
        r?.currency_short_name ||
        r?.currency ||
        r?.coin ||
        r?.token ||
        (r?.currency_id && (r.currency_id.short_name || r.currency_id.symbol)) ||
        '—';
    const amount =
        r?.net_amount ??
        r?.netAmount ??
        r?.amount ??
        r?.deposit_amount ??
        r?.depositAmount ??
        (r?.metadata && (r.metadata.net_amount ?? r.metadata.amount)) ??
        '—';
    const status = r?.status || r?.transaction_status || r?.action || '—';
    const explorer = r?.explorer || r?.explorerLink || r?.explorer_link || (r?.metadata && r.metadata.explorer) || {};
    return {
        _id: r?._id || r?.id || tx || `row-${i}`,
        createdAt: r?.createdAt || r?.created_at || r?.time || r?.date,
        updatedAt: r?.updatedAt || r?.updated_at || r?.createdAt,
        chain: r?.chain || r?.network || (r?.metadata && r.metadata.chain) || '—',
        chain_full_name: chainFullName != null && String(chainFullName).trim() ? String(chainFullName) : '—',
        short_name: short != null && String(short).trim() ? String(short).toUpperCase() : '—',
        currency: r?.currency || r?.coin || r?.token || r?.asset || r?.name || short || '—',
        amount: amount != null && amount !== '' ? String(amount) : '—',
        status: status != null && String(status).trim() ? String(status) : '—',
        statusLabel: historyStatusLabel(status),
        explorer,
        from_address: addr != null && addr !== '' ? addr : '—',
        transaction_hash: tx != null && tx !== '' ? String(tx) : '—',
        shortAddress: addr != null && addr !== '' ? truncateMid(addr) : '—',
        shortTxHash: tx != null && tx !== '' ? truncateMid(tx) : '—',
    };
};

const DepositCoinSelectListSkeleton = () => (
    <View style={styles.selectCoinPhase}>
        <View style={styles.searchSection}>
            <ShimmerBone width="100%" height={48} borderRadius={24} />
        </View>
        <View style={styles.selectCoinListRow}>
            <View style={[styles.sectionListFlex, { paddingTop: 4 }]}>
                <View style={[styles.sectionHeaderRow, { marginBottom: 10 }]}>
                    <ShimmerBone width={70} height={16} borderRadius={4} />
                    <ShimmerBone width={50} height={12} borderRadius={4} />
                </View>
                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
                    <ShimmerBone width={120} height={50} borderRadius={12} />
                    <ShimmerBone width={120} height={50} borderRadius={12} />
                </View>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
                    <View
                        key={i}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            marginBottom: COIN_LIST_ROW_GAP,
                            minHeight: COIN_LIST_ROW_INNER,
                        }}
                    >
                        <ShimmerBone width={36} height={36} borderRadius={18} />
                        <View style={{ marginLeft: 10, flex: 1 }}>
                            <ShimmerBone width={72} height={14} borderRadius={4} style={{ marginBottom: 6 }} />
                            <ShimmerBone width={36} height={11} borderRadius={4} />
                        </View>
                        <ShimmerBone width={72} height={18} borderRadius={6} style={{ marginRight: 16 }} />
                        <ShimmerBone width={70} height={14} borderRadius={4} style={{ marginRight: 10 }} />
                        <ShimmerBone width={16} height={16} borderRadius={8} />
                    </View>
                ))}
            </View>
        </View>
    </View>
);

const DepositAddressSkeleton = () => (
    <View style={{ paddingTop: 6 }}>
        {/* QR card */}
        <View style={{ alignItems: 'center', marginTop: 18, marginBottom: 18 }}>
            <View
                style={{
                    backgroundColor: '#FFFFFF',
                    padding: 10,
                    borderRadius: 0,
                    borderWidth: 1,
                    borderColor: '#EEE',
                }}
            >
                <ShimmerBone width={140} height={140} borderRadius={0} />
            </View>
            <View style={{ height: 10 }} />
            <ShimmerBone width={105} height={12} borderRadius={6} />
        </View>

        {/* Network card */}
        <View style={{ marginBottom: 10 }}>
            <View
                style={{
                    borderWidth: 1,
                    borderRadius: 12,
                    borderColor: '#EEE',
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                }}
            >
                <ShimmerBone width={64} height={12} borderRadius={6} style={{ marginBottom: 8 }} />
                <ShimmerBone width={72} height={14} borderRadius={6} style={{ marginBottom: 6 }} />
                <ShimmerBone width="70%" height={10} borderRadius={6} />
            </View>
        </View>

        {/* Address card */}
        <View style={{ marginBottom: 10 }}>
            <View
                style={{
                    borderWidth: 1,
                    borderRadius: 12,
                    borderColor: '#EEE',
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                }}
            >
                <ShimmerBone width={96} height={12} borderRadius={6} style={{ marginBottom: 10 }} />
                <ShimmerBone width="100%" height={14} borderRadius={6} style={{ marginBottom: 6 }} />
                <ShimmerBone width="86%" height={14} borderRadius={6} />
            </View>
        </View>

        {/* Memo card */}
        <View style={{ marginBottom: 10 }}>
            <View
                style={{
                    borderWidth: 1,
                    borderRadius: 12,
                    borderColor: '#EEE',
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                }}
            >
                <ShimmerBone width={84} height={12} borderRadius={6} style={{ marginBottom: 10 }} />
                <ShimmerBone width="55%" height={14} borderRadius={6} />
            </View>
        </View>

        <View style={{ marginTop: 10, alignItems: 'center' }}>
            <ShimmerBone width={140} height={14} borderRadius={7} />
        </View>

        {/* Bottom button */}
        <View style={{ height: 22 }} />
        <ShimmerBone width="100%" height={52} borderRadius={26} />
    </View>
);

const DepositCoin = () => {
    const route = useRoute();
    const dispatch = useAppDispatch();
    const { colors: themeColors, isDark } = useTheme();
    const depositActiveCoins = useAppSelector((state) => state.wallet.depositActiveCoins);
    const notificationList = useAppSelector((state) => state.home.notificationList);

    const depositHistoryRedux = useAppSelector((state) => state.wallet.depositHistory);
    const coinPairs = useAppSelector((state) => state.home.coinPairs);
    const coinData = useAppSelector((state) => state.home.coinData);
    const marketIconBySymbol = useMemo(() => buildMarketIconIndex(coinData), [coinData]);
    const hotPairsChart = useAppSelector((state) => state.home.hotPairsChart);
    const favoriteArray = useAppSelector((state) => state.home.favoriteArray);
    const { subscribeToMarket, unsubscribeFromMarket } = (useContext(SocketContext) || {}) as any;

    const [availableCurrency, setAvailableCurrency] = useState<any[]>([]);
    const [allData, setAllData] = useState<any[]>([]);
    const [searchPair, setSearchPair] = useState('');
    const [selectedCurrency, setSelectedCurrency] = useState<any>({});
    const [selectedNetwork, setSelectedNetwork] = useState('');
    const [depositAddress, setDepositAddress] = useState('');
    const [depositMemo, setDepositMemo] = useState('');
    const [depositDetailsExpanded, setDepositDetailsExpanded] = useState(false);
    const [generatingDepositAddress, setGeneratingDepositAddress] = useState(false);
    const [resolvingDepositAddress, setResolvingDepositAddress] = useState(false);
    const [recentDepositHistory, setRecentDepositHistory] = useState<any[]>([]);
    const [modalData, setModalData] = useState<any>({});
    const [loadingDeposit, setLoadingDeposit] = useState(false);
    const [checkDepositStatus, setCheckDepositStatus] = useState(false);
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [faqActiveIndex, setFaqActiveIndex] = useState<number | null>(null);
    const selectCoinFaqSheetRef = useRef<any>(null);
    const [recentShortNames, setRecentShortNames] = useState<string[]>([]);
    // NOTE: We no longer hide networks based on legacy `wallet/generate-address` errors.
    // Web parity uses `wallet/get-and-generate-address` with tokenAssetId; if backend supports it,
    // deposits like ADA→ADA work as on web.

    const faqData = [
        {
            title: "How do I deposit crypto on Coincode?",
            content:
                "Select a coin and network, generate your Fireblocks deposit address, then send funds to that address from your external wallet. The network you select on Coincode must match the network you use to send—wrong network can result in loss of funds."
        },
        {
            title: "Deposit crypto — step by step",
            content:
                "• Open Deposit — Go to Wallet → Deposit.\n• Select coin — From the list of active deposit assets.\n• Select network — e.g. BEP20, ERC20, TRC20, matching your withdrawal wallet.\n• Generate address — Creates your unique receiving address.\n• Send & wait — Funds credit after the chain confirms; refresh balance or check history."
        },
        {
            title: "My deposit hasn't arrived — what should I do?",
            content:
                "• Check Tx — On a block explorer, confirm the transaction is successful.\n• Match network — The sending network must be the one you selected on Coincode.\n• Correct address — Re-check the full deposit address.\n• Wait — Congestion can delay confirmations."
        }
    ];

    const networkSheetRef = useRef<any>(null);
    const coinSectionListRef = useRef<SectionList<any>>(null);
    const depositSectionsRef = useRef<{ title: string; data: any[] }[]>([]);
    const railLayoutHeightRef = useRef(1);
    const railDragActiveRef = useRef(false);
    const lastRailHapticLetterRef = useRef<string | null>(null);
    const bubbleHideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const scrollToLetterRef = useRef<(letter: string, animated: boolean) => void>(() => { });

    /** selectCoin = full-screen list; deposit = address + history (after coin + network chosen) */
    const [depositFlowPhase, setDepositFlowPhase] = useState<'selectCoin' | 'deposit'>('selectCoin');
    const [coinForNetworkSheet, setCoinForNetworkSheet] = useState<any>(null);
    /** A–Z highlight from list scroll */
    const [railScrollLetter, setRailScrollLetter] = useState<string | null>(null);
    /** Large floating letter while using the index rail */
    const [bubbleLetter, setBubbleLetter] = useState<string | null>(null);

    // Modal states
    const moreDetailsSheetRef = useRef<any>(null);
    const depositDetailsSheetRef = useRef<any>(null);
    const depositConfirmedSheetRef = useRef<any>(null);
    const [selectCoinListLoading, setSelectCoinListLoading] = useState(() => {
        return !(depositActiveCoins && depositActiveCoins.length > 0);
    });

    const isFirstLoad = useRef(true);
    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = useCallback(async () => {
        console.log("Pull to refresh triggered! Fetching latest Deposit data...");
        setRefreshing(true);
        if (depositFlowPhase === 'selectCoin') {
            await dispatch(getDepositActiveCoins(null));
        } else {
            await Promise.all([
                dispatch(getDepositActiveCoins(null)),
                fetchDepositHistory()
            ]);
        }
        setRefreshing(false);
        console.log("Refresh Complete.");
    }, [dispatch, depositFlowPhase]);

    useFocusEffect(
        useCallback(() => {
            let cancelled = false;
            if (depositFlowPhase !== 'selectCoin') {
                return () => {
                    cancelled = true;
                };
            }

            if (isFirstLoad.current) {
                if (!depositActiveCoins || depositActiveCoins.length === 0) {
                    setSelectCoinListLoading(true);
                }
            }

            (async () => {
                await dispatch(getDepositActiveCoins(null));
                if (!cancelled) {
                    setSelectCoinListLoading(false);
                    isFirstLoad.current = false;
                }
            })();
            return () => {
                cancelled = true;
            };
        }, [dispatch, depositFlowPhase])
    );

    useEffect(() => {
        handleNotifications();
        fetchDepositHistory();
        dispatch(getFavoriteArray());
    }, []);

    useFocusEffect(
        useCallback(() => {
            subscribeToMarket?.('depositCoin');
            return () => {
                unsubscribeFromMarket?.('depositCoin');
            };
        }, [subscribeToMarket, unsubscribeFromMarket])
    );

    /** Live USDT pair per coin symbol → price, 24h change, sparkline, favourite pair id. */
    const marketBySymbol = useMemo(() => {
        const map = new Map<string, { pairId: string | null; price: number; change: number; chart: number[] }>();
        const charts: Record<string, number[]> = (hotPairsChart as any) || {};
        (Array.isArray(coinPairs) ? coinPairs : []).forEach((p: any) => {
            const base = String(p?.base_currency || '').toUpperCase();
            const quote = String(p?.quote_currency || '').toUpperCase();
            if (!base || quote !== MARKET_QUOTE) return;
            map.set(base, {
                pairId: p?._id ? String(p._id) : null,
                price: Number(p?.last_price ?? p?.buy_price ?? p?.price) || 0,
                change: Number(p?.change_percentage ?? p?.changePercentage ?? p?.change) || 0,
                chart: Array.isArray(charts[base]) ? charts[base] : [],
            });
        });
        if (!map.has(MARKET_QUOTE)) {
            map.set(MARKET_QUOTE, { pairId: null, price: 1, change: 0, chart: charts[MARKET_QUOTE] || [] });
        }
        return map;
    }, [coinPairs, hotPairsChart]);

    const favoriteSet = useMemo(
        () => new Set((Array.isArray(favoriteArray) ? favoriteArray : []).map((id: any) => String(id))),
        [favoriteArray]
    );

    const handleToggleFavorite = useCallback(
        (pairId: string | null) => {
            if (!pairId) return;
            dispatch(addToFavorites({ pair_id: pairId }));
        },
        [dispatch]
    );

    const listExtraData = useMemo(
        () => ({ isDark, marketBySymbol, favoriteSet, marketIconBySymbol }),
        [isDark, marketBySymbol, favoriteSet, marketIconBySymbol]
    );

    useEffect(() => {
        return () => {
            if (bubbleHideTimeoutRef.current) {
                clearTimeout(bubbleHideTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (searchPair) {
            const filteredPair = allData?.filter((item) =>
                item?.short_name?.toLowerCase()?.includes(searchPair?.toLowerCase()) ||
                item?.name?.toLowerCase()?.includes(searchPair?.toLowerCase())
            );
            setAvailableCurrency(filteredPair);
        } else {
            setAvailableCurrency(allData);
        }
    }, [searchPair, allData]);

    useEffect(() => {
        (async () => {
            try {
                const raw = await AsyncStorage.getItem(DEPOSIT_RECENT_SHORT_NAMES_KEY);
                if (raw) setRecentShortNames(JSON.parse(raw));
            } catch {
                /* ignore */
            }
        })();
    }, []);

    /** All visible coins sorted by `short_name` (search uses filtered `availableCurrency`). */
    const sortedSelectCoins = useMemo(
        () => sortCoinsByShortName(availableCurrency || []),
        [availableCurrency]
    );

    const trendingDepositCoins = useMemo(() => {
        if (String(searchPair || '').trim()) return [];
        const sorted = sortCoinsByShortName(allData || []);
        const byShort = new Map(
            sorted.map((c) => [String(c?.short_name || '').toUpperCase(), c])
        );
        const out: any[] = [];
        for (const sym of TRENDING_SHORT_ORDER) {
            const c = byShort.get(sym);
            if (c != null && c._id != null) out.push(c);
            if (out.length >= 8) break;
        }
        return out;
    }, [allData, searchPair]);

    const mainListCoins = useMemo(() => {
        if (String(searchPair || '').trim()) return sortedSelectCoins;
        const ex = new Set(trendingDepositCoins.map((c) => String(c?._id ?? '')));
        return sortedSelectCoins.filter((c) => !ex.has(String(c?._id ?? '')));
    }, [sortedSelectCoins, trendingDepositCoins, searchPair]);

    const depositSections = useMemo(
        () => buildDepositCoinSections(mainListCoins),
        [mainListCoins]
    );

    useEffect(() => {
        depositSectionsRef.current = depositSections;
    }, [depositSections]);

    const recentDepositCoinsForList = useMemo(() => {
        const list = allData || [];
        return recentShortNames
            .map((sn) => list.find((c) => String(c?.short_name) === String(sn)))
            .filter(Boolean) as any[];
    }, [recentShortNames, allData]);

    useEffect(() => {
        if (depositFlowPhase !== 'selectCoin') {
            setRailScrollLetter(null);
            setBubbleLetter(null);
        }
    }, [depositFlowPhase]);

    scrollToLetterRef.current = (letter: string, animated: boolean) => {
        const sections = depositSectionsRef.current;
        if (!sections.length) return;
        const sectionIndex = resolveScrollSectionIndex(letter, sections);
        if (sectionIndex < 0) return;
        try {
            coinSectionListRef.current?.scrollToLocation({
                sectionIndex,
                itemIndex: 0,
                animated,
                viewPosition: 0,
                viewOffset: 0,
            });
        } catch {
            /* scrollToLocation can throw if layout not ready */
        }
    };

    const viewabilityConfig = useMemo(
        () => ({
            itemVisiblePercentThreshold: 18,
            minimumViewTime: 48,
        }),
        []
    );

    const onViewableItemsChangedRef = useRef<
        ((info: { viewableItems: any[]; changed: any[] }) => void) | null
    >(null);
    onViewableItemsChangedRef.current = ({ viewableItems }) => {
        if (railDragActiveRef.current) return;
        const top = viewableItems.find(
            (v: any) => v?.isViewable && v?.item != null && v?.item?.short_name != null
        );
        if (!top?.item) return;
        setRailScrollLetter(sectionLetterFromCoin(top.item));
    };

    const onViewableItemsChanged = useCallback((info: { viewableItems: any[]; changed: any[] }) => {
        onViewableItemsChangedRef.current?.(info);
    }, []);

    const highlightedRailLetter = bubbleLetter ?? railScrollLetter;

    const alphabetPanResponder = useMemo(
        () =>
            PanResponder.create({
                onStartShouldSetPanResponder: () => true,
                onMoveShouldSetPanResponder: () => true,
                onStartShouldSetPanResponderCapture: () => true,
                onMoveShouldSetPanResponderCapture: () => true,
                onPanResponderTerminationRequest: () => false,
                onShouldBlockNativeResponder: () => true,
                onPanResponderGrant: (evt) => {
                    if (bubbleHideTimeoutRef.current) {
                        clearTimeout(bubbleHideTimeoutRef.current);
                        bubbleHideTimeoutRef.current = null;
                    }
                    railDragActiveRef.current = true;
                    const letter = yToRailLetter(evt.nativeEvent.locationY, railLayoutHeightRef.current);
                    setBubbleLetter(letter);
                    setRailScrollLetter(letter);
                    lastRailHapticLetterRef.current = letter;
                    scrollToLetterRef.current(letter, false);
                    triggerRailHaptic();
                },
                onPanResponderMove: (evt) => {
                    const letter = yToRailLetter(evt.nativeEvent.locationY, railLayoutHeightRef.current);
                    setBubbleLetter(letter);
                    setRailScrollLetter(letter);
                    if (lastRailHapticLetterRef.current !== letter) {
                        lastRailHapticLetterRef.current = letter;
                        scrollToLetterRef.current(letter, false);
                        triggerRailHaptic();
                    }
                },
                onPanResponderRelease: () => {
                    railDragActiveRef.current = false;
                    lastRailHapticLetterRef.current = null;
                    bubbleHideTimeoutRef.current = setTimeout(() => setBubbleLetter(null), 160);
                },
                onPanResponderTerminate: () => {
                    railDragActiveRef.current = false;
                    lastRailHapticLetterRef.current = null;
                    setBubbleLetter(null);
                },
            }),
        []
    );

    const clearRecentDepositCoins = useCallback(async () => {
        try {
            await AsyncStorage.removeItem(DEPOSIT_RECENT_SHORT_NAMES_KEY);
            setRecentShortNames([]);
        } catch {
            /* ignore */
        }
    }, []);

    const removeRecentDepositCoin = useCallback(async (shortName: string) => {
        const next = recentShortNames.filter((s) => String(s) !== String(shortName));
        setRecentShortNames(next);
        try {
            await AsyncStorage.setItem(DEPOSIT_RECENT_SHORT_NAMES_KEY, JSON.stringify(next));
        } catch {
            /* ignore */
        }
    }, [recentShortNames]);

    const ui = useMemo(
        () => ({
            cardBg: isDark ? 'rgba(255, 255, 255, 0.03)' : '#F8F9FA',
            border: isDark ? 'rgba(255, 255, 255, 0.1)' : '#ECECEC',
            softBorder: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F0F0F0',
            subtleBg: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F1F3F5',
        }),
        [isDark]
    );

    const sheetTheme = useMemo(
        () => ({
            ...blurSheetTheme(isDark),
            accentBg: isDark ? 'rgba(10, 168, 197, 0.10)' : 'rgba(10, 168, 197, 0.08)',
            accentBorder: isDark ? 'rgba(10, 168, 197, 0.35)' : 'rgba(10, 168, 197, 0.25)',
        }),
        [isDark]
    );
    const sheetStyles = useMemo(() => {
        const buildSheetStyles = blurSheetRbCustomStyles as (opts: {
            isDark: boolean;
            height?: number;
            borderRadius?: number;
        }) => any;
        return {
            full: buildSheetStyles({ isDark, height: SHEET_HEIGHT, borderRadius: 24 }),
            faq: buildSheetStyles({ isDark, height: SHEET_HEIGHT - 200, borderRadius: 24 }),
        };
    }, [isDark]);

    const renderSheetHeader = (title: string, onClose: () => void, trailing?: React.ReactNode) => (
        <View style={styles.modalHeader}>
            <View style={styles.confirmedHeader}>
                <AppText weight={BOLD} type={EIGHTEEN} style={{ color: sheetTheme.textColor, letterSpacing: -0.2 }}>
                    {title}
                </AppText>
                {trailing}
            </View>
            <TouchableOpacity
                onPress={onClose}
                style={[styles.sheetCloseCircle, { backgroundColor: sheetTheme.closeCircleBg }]}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                activeOpacity={0.75}
            >
                <X color={sheetTheme.iconTint} size={14} strokeWidth={2.4} />
            </TouchableOpacity>
        </View>
    );

    const renderCoinLogo = (item: any, size = 32) => (
        <View style={{ borderRadius: 999, overflow: 'hidden' }}>
            <DepositCoinIcon
                uri={buildDepositCoinIconUri(withMarketCoinIcon(item, marketIconBySymbol))}
                size={size}
            />
        </View>
    );

    const chainIconUri = (chainKey: string): string | null => {
        const code = String(chainKey || '').trim().toUpperCase();
        const candidates = CHAIN_NATIVE_SYMBOLS[code] || [code];
        for (const sym of candidates) {
            const listed = allData.find((c: any) => String(c?.short_name || '').trim().toUpperCase() === sym);
            const uri = buildDepositCoinIconUri(withMarketCoinIcon(listed || { short_name: sym }, marketIconBySymbol));
            if (uri) return uri;
        }
        return null;
    };

    useEffect(() => {
        if (depositActiveCoins && Array.isArray(depositActiveCoins) && depositActiveCoins.length > 0) {
            setAvailableCurrency(depositActiveCoins);
            setAllData(depositActiveCoins);
        }
    }, [depositActiveCoins]);

    const fetchDepositHistory = async () => {
        try {
            const res: any = await appOperation.customer.verify_deposit({ skip: 0, limit: 5 });
            const raw = extractDepositHistoryList(res);
            const list = (raw || []).map((r: any, i: number) => mapDepositHistoryRow(r, i));
            if (list.length > 0) {
                setRecentDepositHistory(list.slice(0, 5));
            } else {
                setRecentDepositHistory([]);
            }
        } catch (e) {
            setRecentDepositHistory([]);
        }
    };

    useEffect(() => {
        if (depositHistoryRedux && Array.isArray(depositHistoryRedux) && depositHistoryRedux.length > 0) {
            const recentData = depositHistoryRedux.slice(0, 5);
            setRecentDepositHistory(recentData);
        } else {
            setRecentDepositHistory([]);
        }
    }, [depositHistoryRedux]);

    const handleNotifications = async () => {
        try {
            await dispatch(getNotificationList());
        } catch (e) {
            console.error("Notification error:", e);
        }
    };

    useEffect(() => {
        if (notificationList && notificationList.length > 0) {
            let announcement = notificationList.filter((item: any) => item?.type === 'announcement');
            if (announcement?.length === 1) {
                setAnnouncements([...announcement, ...announcement]);
            } else if (announcement?.length > 1) {
                setAnnouncements(announcement?.reverse());
            } else {
                setAnnouncements([]);
            }
        } else {
            setAnnouncements([]);
        }
    }, [notificationList]);

    const openNetworkSheetForCoin = (item: any) => {
        const activeKeys = getActiveNetworkKeys(item);
        if (!item || activeKeys.length === 0) {
            if (networkKeysFromChain(item?.chain).length === 0) {
                showError('No deposit network available for this coin');
            } else {
                showError('No active deposit network for this coin');
            }
            return;
        }
        setCoinForNetworkSheet(item);
        networkSheetRef.current?.open();
    };

    const handleNetworkChosenFromSheet = (chain: string) => {
        const coin = coinForNetworkSheet;
        if (!coin || !chain) return;
        setSelectedCurrency(coin);
        setSelectedNetwork(chain);
        setDepositAddress('');
        setDepositMemo('');
        networkSheetRef.current?.close();
        setCoinForNetworkSheet(null);
        setDepositFlowPhase('deposit');
        getDepositAddress(false, chain, coin);
        const sn = coin?.short_name;
        if (sn) {
            void (async () => {
                try {
                    const raw = await AsyncStorage.getItem(DEPOSIT_RECENT_SHORT_NAMES_KEY);
                    let arr: string[] = raw ? JSON.parse(raw) : [];
                    arr = [String(sn), ...arr.filter((s) => s !== sn)].slice(0, 12);
                    await AsyncStorage.setItem(DEPOSIT_RECENT_SHORT_NAMES_KEY, JSON.stringify(arr));
                    setRecentShortNames(arr);
                } catch {
                    /* ignore */
                }
            })();
        }
    };

    const handleHeaderBack = () => {
        if (depositFlowPhase === 'deposit') {
            setDepositFlowPhase('selectCoin');
            setSelectedCurrency({});
            setSelectedNetwork('');
            setDepositAddress('');
            setDepositMemo('');
            setCoinForNetworkSheet(null);
            setSearchPair('');
        } else {
            NavigationService.goBack();
        }
    };

    const getDepositAddress = async (generate: boolean, selectedNetwork: string, coinOverride?: any) => {
        setDepositAddress('');
        setDepositMemo('');
        if (generate) setGeneratingDepositAddress(true);
        else setResolvingDepositAddress(true);
        dispatch(setLoading(true));
        try {
            const coin = coinOverride ?? selectedCurrency;
            const sym = String(coin?.short_name || '').trim().toUpperCase();
            const code = String(selectedNetwork || '').trim().toUpperCase();
            const apiChain = String(coin?._chain_api_code?.[code] || code).trim().toUpperCase();
            const tokenAssetId =
                String(coin?._deposit_asset_id?.[code] || '').trim() ||
                (sym && apiChain ? `${sym}_${apiChain}` : '');

            // Web parity: POST `wallet/get-and-generate-address` with tokenAssetId + generate flag.
            // If it fails (older backend), fallback to legacy PUT `wallet/generate-address`.
            const res: any = tokenAssetId
                ? await appOperation.customer.get_and_generate_address({
                    assetId: tokenAssetId,
                    tokenAssetId,
                    short_name: sym,
                    generate: !!generate,
                })
                : null;

            if (res?.success) {
                const d = res?.data;
                if (typeof d === 'string') {
                    setDepositAddress(String(d));
                } else if (d && typeof d === 'object') {
                    const addr = d.address ?? d.depositAddress ?? d.walletAddress ?? d.data ?? d.deposit_address;
                    const memo = d.memo ?? d.tag ?? d.memoTag ?? d.destinationTag;
                    if (addr != null) setDepositAddress(String(addr));
                    if (memo != null) setDepositMemo(String(memo));
                }
            } else if (res?.message) {
                showError(res.message);
            }
        } catch (e: any) {
            showError(e?.message);
        }
        dispatch(setLoading(false));
        if (generate) setGeneratingDepositAddress(false);
        else setResolvingDepositAddress(false);
    };

    const completeDeposit = async () => {
        setCheckDepositStatus(true);
        await new Promise<void>((resolve) => {
            setTimeout(() => {
                handleVerifyDeposit('checkPayment');
                resolve();
            }, 10000);
        });
    };

    const handleVerifyDeposit = async (status?: string) => {
        if (!selectedNetwork || !selectedCurrency?._id) return;

        setLoadingDeposit(true);
        const data = {
            status: status || '',
            chain: selectedNetwork,
            currency_id: selectedCurrency?._id,
        };

        try {
            const result: any = await dispatch(verifyDeposit(data));

            // Match web version logic exactly
            if (result?.success) {
                if (result?.message === "New deposit detected. Processing transfer to main wallet.") {
                    // Show modal when deposit is detected (equivalent to depositHistory("showModal"))
                    await fetchDepositHistory();
                    if (recentDepositHistory && recentDepositHistory.length > 0) {
                        const filteredData = recentDepositHistory?.slice(0, 1)[0];
                        if (filteredData) {
                            const shortTxHash = shortenAddress(filteredData?.transaction_hash);
                            setModalData({ ...filteredData, shortTxHash });
                            depositConfirmedSheetRef.current?.open();
                        }
                    }
                } else {
                    if (status === "checkPayment") {
                        showError("New deposit not found. Please check after some time.");
                    }
                }
            }

            // Call transfer_funds after promise resolves, only if status is checkPayment
            // This happens regardless of success, matching web version
            if (status === "checkPayment") {
                setCheckDepositStatus(false);
                // Pass data and currency as object to match web version's intent
                if (result?.data) {
                    appOperation.customer.transfer_funds({
                        data: result?.data,
                        currency: result?.currency
                    });
                }
            }
        } catch (e) {
            console.error("Verify deposit error:", e);
            if (status === "checkPayment") {
                setCheckDepositStatus(false);
            }
        }

        setLoadingDeposit(false);
    };

    const handleDepositModal = (item: any) => {
        const shortAddress = shortenAddress(item?.from_address);
        const shortToAddress = shortenAddress(item?.to_address);
        const shortTxHash = shortenAddress(item?.transaction_hash);
        setModalData({ ...item, shortAddress, shortTxHash, shortToAddress });
        depositDetailsSheetRef.current?.open();
    };

    const renderCoinListItem = ({ item }: { item: any }) => {
        const disabled = isCoinDepositDisabled(item);
        const suspended =
            item?.deposit_status === 'SUSPENDED' ||
            (typeof item?.deposit_status === 'object' &&
                item?.deposit_status != null &&
                !Array.isArray(item.deposit_status) &&
                networkKeysFromChain(item.chain).length > 0 &&
                getActiveNetworkKeys(item).length === 0);
        const symbol = String(item?.short_name || '').toUpperCase();
        const market = marketBySymbol.get(symbol);
        const isUp = (market?.change ?? 0) >= 0;
        const isFavorite = !!market?.pairId && favoriteSet.has(market.pairId);
        return (
            <TouchableOpacity
                style={[
                    styles.coinItem,
                    styles.coinFlatListRow,
                    { borderBottomColor: ui.border },
                    disabled && styles.coinItemDisabled,
                ]}
                onPress={() => openNetworkSheetForCoin(item)}
                activeOpacity={disabled ? 1 : 0.7}
            >
                <View style={styles.coinLeft}>
                    {renderCoinLogo(item, 36)}
                    <View style={styles.coinInfo}>
                        <AppText
                            weight={SEMI_BOLD}
                            type={FOURTEEN}
                            numberOfLines={1}
                            style={{ color: themeColors.text }}
                        >
                            {item?.name || item?.short_name}
                        </AppText>
                        {suspended ? (
                            <AppText type={TEN} color={RED} weight={SEMI_BOLD} style={{ marginTop: 2 }}>
                                {symbol ? `${symbol} · ` : ''}Suspended
                            </AppText>
                        ) : (
                            <AppText
                                type={ELEVEN}
                                numberOfLines={1}
                                style={{ color: themeColors.secondaryText, marginTop: 2 }}
                            >
                                {symbol}
                            </AppText>
                        )}
                    </View>
                </View>

                <View style={styles.coinSpark}>
                    <MiniSparkline
                        chartData={market?.chart}
                        isPositive={isUp}
                        width={84}
                        height={30}
                        chartId={`deposit-spark-${symbol}`}
                        fallbackPrice={market?.price || 100}
                        glow
                    />
                </View>

                <View style={styles.coinRight}>
                    <AppText
                        weight={SEMI_BOLD}
                        type={FOURTEEN}
                        numberOfLines={1}
                        style={{ color: themeColors.text, flexShrink: 1, textAlign: 'right' }}
                    >
                        {formatUsdPrice(market?.price)}
                    </AppText>
                    <TouchableOpacity
                        onPress={() => handleToggleFavorite(market?.pairId ?? null)}
                        disabled={!market?.pairId}
                        hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
                        style={[styles.starBtn, !market?.pairId && { opacity: 0.35 }]}
                    >
                        <Star
                            color={isFavorite ? colors.starColor : themeColors.secondaryText}
                            fill={isFavorite ? colors.starColor : 'transparent'}
                            size={16}
                            strokeWidth={1.6}
                        />
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        );
    };

    const renderDepositHistoryItem = ({ item }: { item: any }) => {
        if (!item) return null;

        const statusLabel = item?.statusLabel || historyStatusLabel(item?.status);
        const statusTone =
            statusLabel === 'COMPLETED'
                ? 'success'
                : statusLabel === 'FAILED'
                    ? 'danger'
                    : statusLabel === 'PENDING'
                        ? 'pending'
                        : 'neutral';

        const dateStr = moment(item?.createdAt || item?.updatedAt).isValid()
            ? moment(item?.createdAt || item?.updatedAt).format('DD/MM/YYYY, HH:mm:ss')
            : '—';

        const networkText =
            item?.chain_full_name && item?.chain_full_name !== '—'
                ? item.chain_full_name
                : item?.chain || '—';

        const addrFull = item?.from_address && item?.from_address !== '—' ? String(item.from_address) : '';
        const txFull = item?.transaction_hash && item?.transaction_hash !== '—' ? String(item.transaction_hash) : '';
        const addrShort = item?.shortAddress || truncateMid(addrFull);
        const txShort = item?.shortTxHash || truncateMid(txFull);

        const addressUrl = resolveExplorerUrl(item?.explorer, 'address', addrFull);
        const txUrl = resolveExplorerUrl(item?.explorer, 'tx', txFull);

        const pillBg =
            statusTone === 'success'
                ? 'rgba(20, 184, 166, 0.12)'
                : statusTone === 'danger'
                    ? 'rgba(239, 68, 68, 0.10)'
                    : statusTone === 'pending'
                        ? 'rgba(245, 158, 11, 0.12)'
                        : 'rgba(148, 163, 184, 0.12)';

        const pillText =
            statusTone === 'success'
                ? '#16A34A'
                : statusTone === 'danger'
                    ? '#DC2626'
                    : statusTone === 'pending'
                        ? '#B45309'
                        : themeColors.secondaryText;

        const openUrl = async (url: string | null) => {
            if (!url) return;
            try {
                await Linking.openURL(url);
            } catch {
                /* ignore */
            }
        };

        const Row = ({
            label,
            value,
            right,
        }: {
            label: string;
            value: React.ReactNode;
            right?: React.ReactNode;
        }) => (
            <View style={styles.depHistRow}>
                <AppText type={TWELVE} style={[styles.depHistLabel, { color: themeColors.secondaryText }]}>
                    {label}
                </AppText>
                <View style={styles.depHistValueWrap}>
                    {typeof value === 'string' ? (
                        <AppText type={TWELVE} style={[styles.depHistValue, { color: themeColors.text }]}>
                            {value}
                        </AppText>
                    ) : (
                        value
                    )}
                </View>
                {right ? <View style={styles.depHistRight}>{right}</View> : null}
            </View>
        );

        return (
            <View
                style={[
                    styles.depHistCard,
                    { backgroundColor: themeColors.background, borderColor: isDark ? themeColors.border : '#EEE' },
                ]}
            >
                <View style={styles.depHistTop}>
                    <AppText type={TWELVE} style={{ color: themeColors.text }}>
                        {dateStr}
                    </AppText>
                    <View style={[styles.depHistPill, { backgroundColor: pillBg }]}>
                        <AppText type={TEN} weight={SEMI_BOLD} style={{ color: pillText }}>
                            {statusLabel}
                        </AppText>
                    </View>
                </View>

                <View style={styles.depHistRows}>
                    <Row label="Network" value={networkText} />
                    <Row label="Amount" value={`${item?.amount ?? '—'} ${item?.short_name ?? item?.currency ?? ''}`.trim()} />
                    <Row label="Deposit Wallet" value={item?.depositWallet || 'Main Wallet'} />
                    <Row
                        label="Address"
                        value={
                            <AppText type={THIRTEEN} style={[styles.depHistValue, { color: themeColors.text }]} numberOfLines={1}>
                                {addrShort || '—'}
                            </AppText>
                        }
                        right={
                            <View style={styles.depHistIconRow}>
                                <TouchableOpacity
                                    onPress={() => (addrFull ? copyText(addrFull) : undefined)}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                    disabled={!addrFull}
                                    style={styles.depHistIconBtn}
                                >
                                    <FastImage source={copyIcon} style={styles.depHistIcon} resizeMode="contain" />
                                </TouchableOpacity>
                                {addressUrl ? (
                                    <TouchableOpacity
                                        onPress={() => openUrl(addressUrl)}
                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                        style={styles.depHistIconBtn}
                                    >
                                        <FastImage
                                            source={externalLinkIcon}
                                            style={styles.depHistIcon}
                                            resizeMode="contain"
                                        />
                                    </TouchableOpacity>
                                ) : null}
                            </View>
                        }
                    />
                    <Row
                        label="TxID"
                        value={
                            <AppText type={THIRTEEN} style={[styles.depHistValue, { color: themeColors.text }]} numberOfLines={1}>
                                {txShort || '—'}
                            </AppText>
                        }
                        right={
                            <View style={styles.depHistIconRow}>
                                <TouchableOpacity
                                    onPress={() => (txFull ? copyText(txFull) : undefined)}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                    disabled={!txFull}
                                    style={styles.depHistIconBtn}
                                >
                                    <FastImage source={copyIcon} style={styles.depHistIcon} resizeMode="contain" />
                                </TouchableOpacity>
                                {txUrl ? (
                                    <TouchableOpacity
                                        onPress={() => openUrl(txUrl)}
                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                        style={styles.depHistIconBtn}
                                    >
                                        <FastImage
                                            source={externalLinkIcon}
                                            style={styles.depHistIcon}
                                            resizeMode="contain"
                                        />
                                    </TouchableOpacity>
                                ) : null}
                            </View>
                        }
                    />
                </View>
            </View>
        );
    };

    const headerTitle =
        depositFlowPhase === 'selectCoin'
            ? 'Select Coins'
            : `Deposit ${selectedCurrency?.short_name || ''}`;

    const headerSubtitle =
        depositFlowPhase === 'selectCoin'
            ? 'Choose from your favourite coins'
            : selectedNetwork
                ? `Only send ${selectedCurrency?.short_name || 'funds'} via ${String(selectedNetwork).toUpperCase()} network`
                : 'Send funds to your deposit address';

    const renderDepositSectionHeader = useCallback(
        (info: any) => (
            <View
                style={[
                    styles.depositSectionHeader,
                    { backgroundColor: themeColors.background },
                ]}
            >
                <AppText weight={SEMI_BOLD} type={TWELVE} style={{ color: ACCENT_CYAN }}>
                    {String(info?.section?.title ?? '')}
                </AppText>
            </View>
        ),
        [themeColors.background]
    );

    const renderSelectCoinListHeader = () => {
        if (String(searchPair || '').trim()) return null;
        return (
            <View style={{ paddingBottom: 4 }}>
                {recentDepositCoinsForList.length > 0 && (
                    <View style={styles.depositHistoryChipsSection}>
                        <View style={styles.sectionHeaderRow}>
                            <AppText
                                weight={SEMI_BOLD}
                                type={SIXTEEN}
                                style={{ color: themeColors.text }}
                            >
                                Recent
                            </AppText>
                            <TouchableOpacity onPress={clearRecentDepositCoins} hitSlop={12}>
                                <AppText weight={MEDIUM} type={TWELVE} style={{ color: ACCENT_CYAN }}>
                                    Clear All
                                </AppText>
                            </TouchableOpacity>
                        </View>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.depositRecentChipsScroll}
                            keyboardShouldPersistTaps="handled"
                        >
                            {recentDepositCoinsForList.map((item: any) => {
                                const accent = accentForSymbol(item?.short_name);
                                return (
                                    <TouchableOpacity
                                        key={String(item._id)}
                                        style={[
                                            styles.depositRecentChip,
                                            {
                                                backgroundColor: ui.cardBg,
                                                borderColor: hexToRgba(accent, 0.4),
                                            },
                                        ]}
                                        onPress={() => openNetworkSheetForCoin(item)}
                                        activeOpacity={0.7}
                                    >
                                        <LinearGradient
                                            colors={[hexToRgba(accent, 0.15), hexToRgba(accent, 0)]}
                                            start={{ x: 0, y: 0.5 }}
                                            end={{ x: 1, y: 0.5 }}
                                            style={StyleSheet.absoluteFill}
                                        />
                                        {renderCoinLogo(item, 32)}
                                        <View style={styles.recentTextWrapper}>
                                            <AppText
                                                type={FOURTEEN}
                                                weight={SEMI_BOLD}
                                                style={{ color: themeColors.text }}
                                            >
                                                {item.short_name}
                                            </AppText>
                                            {item?.name ? (
                                                <AppText
                                                    type={TEN}
                                                    numberOfLines={1}
                                                    style={{ color: themeColors.secondaryText, maxWidth: 90 }}
                                                >
                                                    {item.name}
                                                </AppText>
                                            ) : null}
                                        </View>
                                        <TouchableOpacity
                                            onPress={() => removeRecentDepositCoin(item.short_name)}
                                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                            style={styles.recentRemoveBtn}
                                        >
                                            <X color={themeColors.secondaryText} size={14} />
                                        </TouchableOpacity>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>
                )}
                {trendingDepositCoins.length > 0 && (
                    <View style={styles.trendingBlock}>
                        <View style={styles.sectionHeaderRow}>
                            <AppText
                                weight={SEMI_BOLD}
                                type={SIXTEEN}
                                style={{ color: themeColors.text }}
                            >
                                Trending Coins
                            </AppText>
                        </View>
                        {trendingDepositCoins.map((item: any) => (
                            <View key={String(item._id)}>{renderCoinListItem({ item })}</View>
                        ))}
                    </View>
                )}
            </View>
        );
    };

    const depositSummaryIconUri = buildCoinImageUri(selectedCurrency);
    const depositNetworkDisplay = useMemo(() => {
        if (!selectedNetwork) return '';
        const api =
            (selectedCurrency?._chain_api_code?.[selectedNetwork] || '').toString().trim();
        const full =
            (selectedCurrency?._chain_full_name?.[selectedNetwork] || '').toString().trim();
        if (api && full) return `${api} — ${full}`;
        if (full) return full;
        if (api) return api;
        return selectedNetwork;
    }, [selectedCurrency, selectedNetwork]);

    const depositSymbol = String(selectedCurrency?.short_name || '').toUpperCase();
    const depositNetworkCode = String(selectedNetwork || '').toUpperCase();
    const depositMemoText = depositMemo ? String(depositMemo).trim() : '';
    const depositMinLimit = limitForChain(selectedCurrency?.min_deposit, selectedNetwork);
    const depositMaxLimit = limitForChain(selectedCurrency?.max_deposit, selectedNetwork);

    const openNetworkSheetForSelected = () => {
        if (!selectedCurrency) return;
        setCoinForNetworkSheet(selectedCurrency);
        setTimeout(() => networkSheetRef.current?.open(), 0);
    };

    const shareDepositAddress = async () => {
        if (!depositAddress) return;
        const lines = [
            `${depositSymbol} deposit address${depositNetworkCode ? ` (${depositNetworkCode})` : ''}:`,
            depositAddress,
        ];
        if (depositMemoText) lines.push(`Memo (Tag): ${depositMemoText}`);
        try {
            await Share.share({ message: lines.join('\n') });
        } catch {
            /* user dismissed */
        }
    };

    return (
        <AppSafeAreaView style={{ flex: 1, backgroundColor: themeColors.background }}>
            <View style={styles.headerView}>
                <TouchableOpacity
                    onPress={handleHeaderBack}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <FastImage
                        source={back_ic}
                        resizeMode="contain"
                        style={{ width: 35, height: 35 }}
                    />
                </TouchableOpacity>
                <View style={styles.headerRight}>
                    <TouchableOpacity
                        onPress={() => {
                            setFaqActiveIndex(null);
                            selectCoinFaqSheetRef.current?.open();
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={styles.headerIconBtn}
                    >
                        <FastImage
                            source={INFO}
                            resizeMode="contain"
                            style={{ width: 18, height: 18 }}
                            tintColor={themeColors.text}
                        />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => NavigationService.navigate('Wallet_History')}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={styles.headerIconBtn}
                    >
                        <FastImage
                            source={historyIcon}
                            resizeMode="contain"
                            style={{ width: 22, height: 22 }}
                            tintColor={themeColors.text}
                        />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.titleSection}>
                <AppText weight={SEMI_BOLD} type={TWENTY_TWO} style={{ color: themeColors.text }}>
                    {headerTitle}
                </AppText>
                <AppText type={THIRTEEN} style={{ color: themeColors.secondaryText, marginTop: 4 }}>
                    {headerSubtitle}
                </AppText>
            </View>

            {depositFlowPhase === 'selectCoin' ? (
                selectCoinListLoading ? (
                    <DepositCoinSelectListSkeleton />
                ) : (
                    <View style={styles.selectCoinPhase}>
                        <View style={styles.searchSection}>
                            <View
                                style={[
                                    styles.searchInputWrapper,
                                    { backgroundColor: ui.cardBg, borderColor: ui.border },
                                ]}
                            >
                                <Search
                                    color={themeColors.secondaryText}
                                    size={18}
                                    style={styles.searchInputIcon}
                                />
                                <TextInput
                                    style={[styles.selectCoinSearchInput, { color: themeColors.text }]}
                                    placeholder="Search coins"
                                    placeholderTextColor={themeColors.secondaryText}
                                    cursorColor={isDark ? colors.white : colors.black}
                                    value={searchPair}
                                    onChangeText={setSearchPair}
                                />
                                {searchPair ? (
                                    <TouchableOpacity
                                        onPress={() => setSearchPair('')}
                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                        style={styles.searchClearBtn}
                                    >
                                        <X color={themeColors.secondaryText} size={16} />
                                    </TouchableOpacity>
                                ) : null}
                            </View>
                        </View>
                        <View style={styles.selectCoinListRow}>
                            <SectionList
                                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColors.text} />}
                                ref={coinSectionListRef}
                                sections={depositSections}
                                keyExtractor={(item, index) =>
                                    item?._id ? String(item._id) : `row-${index}`
                                }
                                renderItem={renderCoinListItem}
                                renderSectionHeader={renderDepositSectionHeader}
                                stickySectionHeadersEnabled={false}
                                ListHeaderComponent={renderSelectCoinListHeader()}
                                showsVerticalScrollIndicator={false}
                                style={styles.sectionListFlex}
                                contentContainerStyle={[
                                    styles.sectionListContent,
                                    styles.sectionListContentWithIndex,
                                ]}
                                keyboardShouldPersistTaps="handled"
                                initialNumToRender={24}
                                maxToRenderPerBatch={20}
                                windowSize={9}
                                updateCellsBatchingPeriod={50}
                                removeClippedSubviews={Platform.OS === 'android'}
                                viewabilityConfig={viewabilityConfig}
                                onViewableItemsChanged={onViewableItemsChanged}
                                extraData={listExtraData}
                                ListEmptyComponent={
                                    mainListCoins.length === 0 &&
                                        trendingDepositCoins.length === 0 ? (
                                        <View style={styles.emptyContainer}>
                                            <AppText type={THIRTEEN} color={colors.textGray}>
                                                No coins found
                                            </AppText>
                                        </View>
                                    ) : null
                                }
                            />
                            {depositSections.length > 0 && (
                                <>
                                    {bubbleLetter != null && (
                                        <View
                                            style={[styles.alphabetBubbleWrap, styles.alphabetBubbleZ]}
                                            pointerEvents="none"
                                        >
                                            <View
                                                style={[
                                                    styles.alphabetBubble,
                                                    isDark
                                                        ? styles.alphabetBubbleDark
                                                        : styles.alphabetBubbleLight,
                                                ]}
                                            >
                                                <AppText
                                                    weight={SEMI_BOLD}
                                                    type={SIXTEEN}
                                                    style={styles.alphabetBubbleText}
                                                >
                                                    {bubbleLetter}
                                                </AppText>
                                            </View>
                                        </View>
                                    )}
                                    <View
                                        style={[styles.alphabetIndexRail, styles.alphabetIndexRailZ]}
                                        onLayout={(e) => {
                                            railLayoutHeightRef.current = e.nativeEvent.layout.height;
                                        }}
                                        collapsable={false}
                                    >
                                        <View
                                            style={styles.alphabetIndexLettersColumn}
                                            pointerEvents="none"
                                        >
                                            {RAIL_KEYS.map((label) => {
                                                const isHighlighted = highlightedRailLetter === label;
                                                const mutedColor = themeColors.secondaryText;
                                                const selectedColor = ACCENT_CYAN;
                                                return (
                                                    <View
                                                        key={label}
                                                        style={styles.alphabetIndexLetterCell}
                                                    >
                                                        <AppText
                                                            type={NINE}
                                                            style={{
                                                                ...styles.alphabetIndexLetter,
                                                                color: isHighlighted
                                                                    ? selectedColor
                                                                    : mutedColor,
                                                            }}
                                                        >
                                                            {label}
                                                        </AppText>
                                                    </View>
                                                );
                                            })}
                                        </View>
                                        <View
                                            style={StyleSheet.absoluteFill}
                                            {...alphabetPanResponder.panHandlers}
                                        />
                                    </View>
                                </>
                            )}
                        </View>
                    </View>
                )
            ) : (
                <KeyBoardAware refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColors.text} />}>
                    <View style={styles.depositWrap}>
                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.depositScrollContent}>
                            {resolvingDepositAddress && !depositAddress ? (
                                <DepositAddressSkeleton />
                            ) : (
                                <>
                                    {/* QR / coin card */}
                                    <View style={[styles.dqCard, styles.dqQrCard, { backgroundColor: ui.cardBg, borderColor: ui.softBorder }]}>
                                        <View style={styles.dqQrCardLeft}>
                                            {selectedNetwork && chainIconUri(selectedNetwork) ? (
                                                <View style={{ borderRadius: 999, overflow: 'hidden' }}>
                                                    <DepositCoinIcon uri={chainIconUri(selectedNetwork)} size={44} />
                                                </View>
                                            ) : (
                                                renderCoinLogo(selectedCurrency, 44)
                                            )}
                                            <AppText weight={BOLD} type={FIFTEEN} style={{ color: themeColors.text, marginTop: 12 }}>
                                                {depositAddress ? 'Scan QR Code' : `Deposit ${depositSymbol || 'Crypto'}`}
                                            </AppText>
                                            <AppText type={TWELVE} style={{ color: themeColors.secondaryText, marginTop: 4, lineHeight: 16 }}>
                                                {depositAddress
                                                    ? `Scan this QR code with any wallet to deposit ${depositSymbol} to your address.`
                                                    : `Generate a ${depositNetworkCode || ''} deposit address to receive ${depositSymbol || 'funds'}.`}
                                            </AppText>
                                            {depositAddress ? (
                                                <TouchableOpacity
                                                    style={[styles.dqShareBtn, { borderColor: ACCENT_CYAN }]}
                                                    onPress={shareDepositAddress}
                                                    activeOpacity={0.75}
                                                >
                                                    <Share2 color={ACCENT_CYAN} size={12} />
                                                    <AppText type={TWELVE} weight={MEDIUM} style={{ color: ACCENT_CYAN, marginLeft: 6 }}>
                                                        Share QR
                                                    </AppText>
                                                </TouchableOpacity>
                                            ) : null}
                                        </View>
                                        {depositAddress ? (
                                            <View style={styles.dqQrFrame}>
                                                <Image source={barcodeFrame} style={styles.dqQrFrameImage} resizeMode="stretch" />
                                                <View style={styles.dqQrInner}>
                                                    <QRCode
                                                        value={depositAddress}
                                                        size={104}
                                                        backgroundColor="#FFFFFF"
                                                        color="#000000"
                                                        quietZone={4}
                                                    />
                                                </View>
                                            </View>
                                        ) : null}
                                    </View>

                                    {/* Network */}
                                    <AppText weight={MEDIUM} type={FIFTEEN} style={[styles.dqSectionTitle, { color: themeColors.text }]}>
                                        Network
                                    </AppText>
                                    <View style={[styles.dqCard, { backgroundColor: ui.cardBg, borderColor: ui.softBorder }]}>
                                        <View style={styles.dqRow}>
                                            <View style={styles.dqNetworkLogo}>
                                                <DepositCoinIcon uri={chainIconUri(selectedNetwork)} size={36} />
                                            </View>
                                            <View style={{ flex: 1, marginLeft: 12 }}>
                                                <AppText weight={SEMI_BOLD} type={FIFTEEN} style={{ color: themeColors.text }}>
                                                    {depositNetworkCode || '—'}
                                                </AppText>
                                                <AppText type={TWELVE} numberOfLines={1} style={{ color: themeColors.secondaryText, marginTop: 2 }}>
                                                    {depositNetworkDisplay || '—'}
                                                </AppText>
                                            </View>
                                            <TouchableOpacity
                                                onPress={openNetworkSheetForSelected}
                                                style={styles.dqRow}
                                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                                activeOpacity={0.75}
                                            >
                                                <AppText type={THIRTEEN} weight={MEDIUM} style={{ color: ACCENT_CYAN, marginRight: 4 }}>
                                                    Change
                                                </AppText>
                                                <RefreshCw color={ACCENT_CYAN} size={12} />
                                            </TouchableOpacity>
                                        </View>
                                    </View>

                                    {/* Deposit Address */}
                                    <AppText weight={MEDIUM} type={FIFTEEN} style={[styles.dqSectionTitle, { color: themeColors.text }]}>
                                        Deposit Address
                                    </AppText>
                                    {depositAddress ? (
                                        <View style={[styles.dqCard, styles.dqRowCard, { backgroundColor: ui.cardBg, borderColor: ui.softBorder }]}>
                                            <AppText type={TWELVE} weight={MEDIUM} style={{ color: themeColors.text, flex: 1, marginRight: 12, lineHeight: 18 }}>
                                                {depositAddress}
                                            </AppText>
                                            <TouchableOpacity
                                                onPress={() => copyText(depositAddress)}
                                                style={[styles.dqCopyBtn, { backgroundColor: ui.subtleBg }]}
                                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                                activeOpacity={0.75}
                                            >
                                                <Copy color={themeColors.secondaryText} size={14} />
                                            </TouchableOpacity>
                                        </View>
                                    ) : (
                                        <View style={[styles.dqCard, { backgroundColor: ui.cardBg, borderColor: ui.softBorder }]}>
                                            <AppText type={TWELVE} style={{ color: themeColors.secondaryText, lineHeight: 17 }}>
                                                No deposit address yet for {depositSymbol || 'this coin'}
                                                {depositNetworkCode ? ` on ${depositNetworkCode}` : ''}.
                                            </AppText>
                                            <Button
                                                children="Generate deposit address"
                                                onPress={() => getDepositAddress(true, selectedNetwork, selectedCurrency)}
                                                containerStyle={styles.dqGenerateBtn}
                                                loading={generatingDepositAddress}
                                            />
                                        </View>
                                    )}

                                    {/* Memo (only when the network returns one) */}
                                    {depositAddress && depositMemoText ? (
                                        <>
                                            <AppText weight={MEDIUM} type={FIFTEEN} style={[styles.dqSectionTitle, { color: themeColors.text }]}>
                                                Memo (Tag)
                                            </AppText>
                                            <View style={[styles.dqCard, styles.dqRowCard, { backgroundColor: ui.cardBg, borderColor: ui.softBorder }]}>
                                                <AppText type={TWELVE} weight={MEDIUM} style={{ color: themeColors.text, flex: 1, marginRight: 12 }}>
                                                    {depositMemoText}
                                                </AppText>
                                                <TouchableOpacity
                                                    onPress={() => copyText(depositMemoText)}
                                                    style={[styles.dqCopyBtn, { backgroundColor: ui.subtleBg }]}
                                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                                    activeOpacity={0.75}
                                                >
                                                    <Copy color={themeColors.secondaryText} size={14} />
                                                </TouchableOpacity>
                                            </View>
                                        </>
                                    ) : null}

                                    {depositAddress ? (
                                        <>
                                            {/* Important */}
                                            <View style={[styles.dqCard, styles.dqWarningCard, { backgroundColor: ui.cardBg, borderColor: ui.softBorder }]}>
                                                <View style={{ marginTop: 2 }}>
                                                    <AlertTriangle color="#F3BA2F" size={16} />
                                                </View>
                                                <View style={{ marginLeft: 12, flex: 1 }}>
                                                    <AppText weight={SEMI_BOLD} type={FOURTEEN} style={{ color: themeColors.text }}>
                                                        Important
                                                    </AppText>
                                                    <AppText type={TWELVE} style={{ color: themeColors.secondaryText, marginTop: 2, lineHeight: 16 }}>
                                                        Send only {depositSymbol}
                                                        {depositNetworkCode ? ` via the ${depositNetworkCode} network` : ''} to this deposit address.
                                                        {depositMemoText ? ' Both the address and memo are required.' : ''} Sending any other coin or token may result in permanent loss.
                                                    </AppText>
                                                </View>
                                            </View>

                                            {/* More Details */}
                                            <TouchableOpacity
                                                style={[styles.dqCard, styles.dqRowCard, { backgroundColor: ui.cardBg, borderColor: ui.softBorder, marginTop: 8 }]}
                                                onPress={() => setDepositDetailsExpanded((v) => !v)}
                                                activeOpacity={0.75}
                                            >
                                                <AppText weight={SEMI_BOLD} type={FOURTEEN} style={{ color: themeColors.text }}>
                                                    More Details
                                                </AppText>
                                                {depositDetailsExpanded ? (
                                                    <ChevronUp color={themeColors.secondaryText} size={16} />
                                                ) : (
                                                    <ChevronDown color={themeColors.secondaryText} size={16} />
                                                )}
                                            </TouchableOpacity>

                                            {depositDetailsExpanded ? (
                                                <>
                                                    <View style={[styles.dqCard, { backgroundColor: ui.cardBg, borderColor: ui.softBorder, padding: 0 }]}>
                                                        {[
                                                            { key: 'wallet', label: 'Deposit to', value: 'Spot Wallet' },
                                                            {
                                                                key: 'min',
                                                                label: 'Minimum Deposit',
                                                                value: depositMinLimit != null ? `${depositMinLimit} ${depositSymbol}` : `> 0 ${depositSymbol}`,
                                                            },
                                                            {
                                                                key: 'max',
                                                                label: 'Maximum Deposit',
                                                                value: depositMaxLimit != null ? `${depositMaxLimit} ${depositSymbol}` : '—',
                                                            },
                                                        ].map((row, rowIdx, rows) => (
                                                            <View
                                                                key={row.key}
                                                                style={[
                                                                    styles.dqDetailRow,
                                                                    {
                                                                        borderBottomColor: ui.softBorder,
                                                                        borderBottomWidth: rowIdx === rows.length - 1 ? 0 : 1,
                                                                    },
                                                                ]}
                                                            >
                                                                <AppText type={THIRTEEN} style={{ color: themeColors.secondaryText }}>
                                                                    {row.label}
                                                                </AppText>
                                                                <AppText type={THIRTEEN} weight={MEDIUM} style={{ color: themeColors.text }}>
                                                                    {row.value}
                                                                </AppText>
                                                            </View>
                                                        ))}
                                                    </View>

                                                    <View style={[styles.dqCard, { backgroundColor: ui.cardBg, borderColor: ui.softBorder }]}>
                                                        {[
                                                            `Do not send assets via networks other than ${depositNetworkCode || 'the selected one'}`,
                                                            'NFTs are not supported on this address',
                                                            'Do not transact with sanctioned entities',
                                                        ].map((text, tIdx) => (
                                                            <View key={text} style={[styles.dqRow, tIdx > 0 && { marginTop: 14 }]}>
                                                                <AlertTriangle color="#F3BA2F" size={14} />
                                                                <AppText type={THIRTEEN} style={{ color: themeColors.secondaryText, marginLeft: 10, flex: 1 }}>
                                                                    {text}
                                                                </AppText>
                                                            </View>
                                                        ))}
                                                    </View>
                                                </>
                                            ) : null}
                                        </>
                                    ) : null}
                                </>
                            )}

                            {/* FAQ moved to header help icon (modal) */}

                            {!resolvingDepositAddress && announcements?.length > 0 && (
                                <View style={styles.announcementsSection}>
                                    <View style={styles.announcementsHeader}>
                                        <AppText weight={MEDIUM} type={FIFTEEN} style={{ color: themeColors.text }}>
                                            Announcements
                                        </AppText>
                                        <TouchableOpacity
                                            onPress={() => {
                                            }}
                                        >
                                            <AppText type={THIRTEEN} weight={MEDIUM} color={ACCENT_CYAN}>
                                                More &gt;
                                            </AppText>
                                        </TouchableOpacity>
                                    </View>
                                    <ScrollView
                                        style={styles.announcementsScroll}
                                        showsVerticalScrollIndicator={false}
                                        nestedScrollEnabled={true}
                                    >
                                        {announcements?.map((item, index) => (
                                            <View key={index} style={[
                                                styles.announcementItem,
                                                { backgroundColor: ui.cardBg, borderColor: ui.softBorder, borderWidth: 1.5 }
                                            ]}>
                                                <AppText
                                                    weight={SEMI_BOLD}
                                                    type={FOURTEEN}
                                                    color={themeColors.text}
                                                >
                                                    {item?.title}
                                                </AppText>
                                                <AppText
                                                    type={TEN}
                                                    color={themeColors.secondaryText}
                                                    style={{ marginTop: 5 }}
                                                >
                                                    {moment(item?.updatedAt).format('DD-MM-YYYY hh:mm A')}
                                                </AppText>
                                            </View>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}

                        </ScrollView>


                    </View>
                </KeyBoardAware>
            )}

            {/* @ts-ignore */}
            <RBSheet customModalProps={{ statusBarTranslucent: true, navigationBarTranslucent: true }}
                ref={networkSheetRef}
                height={SHEET_HEIGHT}
                closeOnDragDown
                closeOnPressMask
                customStyles={sheetStyles.full}
            >
                <BlurSheetBackground isDark={isDark} tint="cyan" />
                <View style={styles.networkSheetInner}>
                    <View style={styles.networkSheetTitle}>
                        {renderSheetHeader('Choose Network', () => networkSheetRef.current?.close())}
                        <AppText type={THIRTEEN} style={{ color: sheetTheme.subTextColor, marginTop: 4 }}>
                            Select a network to continue
                        </AppText>
                    </View>
                    <ScrollView
                        style={styles.networkSheetScroll}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {getActiveNetworkKeys(coinForNetworkSheet).map((chainKey: string, idx: number) => {
                            const minDep = limitForChain(coinForNetworkSheet?.min_deposit, chainKey);
                            const maxDep = limitForChain(coinForNetworkSheet?.max_deposit, chainKey);
                            const sym = coinForNetworkSheet?.short_name || '';
                            const fullName =
                                String(coinForNetworkSheet?._chain_full_name?.[chainKey] || '').trim() ||
                                `${coinForNetworkSheet?.name || sym} · ${chainKey}`;
                            const infoItems = [
                                {
                                    key: 'min',
                                    label: 'Min. Deposit',
                                    value: minDep != null ? `${minDep} ${sym}` : `> 0 ${sym}`,
                                    Icon: ArrowDownToLine,
                                },
                                {
                                    key: 'max',
                                    label: 'Max. Deposit',
                                    value: maxDep != null ? `${maxDep} ${sym}` : '—',
                                    Icon: ArrowUpToLine,
                                },
                            ];
                            return (
                                <TouchableOpacity
                                    key={`${chainKey}-${idx}`}
                                    style={[styles.networkCard, { backgroundColor: sheetTheme.cardBg, borderColor: sheetTheme.borderColor }]}
                                    onPress={() => handleNetworkChosenFromSheet(chainKey)}
                                    activeOpacity={0.75}
                                >
                                    <View style={[styles.networkCardTop, { borderBottomColor: sheetTheme.rowBorderColor }]}>
                                        <View style={styles.networkLogo}>
                                            <DepositCoinIcon uri={chainIconUri(chainKey)} size={32} />
                                        </View>
                                        <View style={{ marginLeft: 12, flex: 1 }}>
                                            <AppText weight={SEMI_BOLD} type={SIXTEEN} style={{ color: sheetTheme.textColor }}>
                                                {chainKey}
                                            </AppText>
                                            <AppText
                                                type={TWELVE}
                                                numberOfLines={1}
                                                style={{ color: sheetTheme.subTextColor, marginTop: 2 }}
                                            >
                                                {fullName}
                                            </AppText>
                                        </View>
                                        <View style={[styles.networkChevron, { backgroundColor: sheetTheme.accentBg }]}>
                                            <ChevronRight color={ACCENT_CYAN} size={16} />
                                        </View>
                                    </View>

                                    <View style={styles.networkCardBottom}>
                                        {infoItems.map(({ key, label, value, Icon }, infoIdx) => (
                                            <React.Fragment key={key}>
                                                {infoIdx > 0 ? (
                                                    <View style={[styles.networkInfoDivider, { backgroundColor: sheetTheme.rowBorderColor }]} />
                                                ) : null}
                                                <View style={styles.networkInfoItem}>
                                                    <View style={[styles.networkInfoIcon, { backgroundColor: sheetTheme.accentBg }]}>
                                                        <Icon color={ACCENT_CYAN} size={14} />
                                                    </View>
                                                    <View style={{ marginLeft: 8, flex: 1 }}>
                                                        <AppText type={ELEVEN} style={{ color: sheetTheme.subTextColor }}>
                                                            {label}
                                                        </AppText>
                                                        <AppText
                                                            weight={SEMI_BOLD}
                                                            type={THIRTEEN}
                                                            numberOfLines={1}
                                                            adjustsFontSizeToFit
                                                            minimumFontScale={0.8}
                                                            style={{ color: sheetTheme.textColor, marginTop: 2 }}
                                                        >
                                                            {value}
                                                        </AppText>
                                                    </View>
                                                </View>
                                            </React.Fragment>
                                        ))}
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                    <View style={[styles.networkSheetNotice, {
                        backgroundColor: sheetTheme.accentBg,
                        borderColor: sheetTheme.accentBorder,
                    }]}>
                        <FastImage source={INFO} style={styles.networkSheetNoticeIcon} resizeMode="contain" tintColor={ACCENT_CYAN} />
                        <AppText type={TWELVE} color={sheetTheme.subTextColor} style={{ flex: 1, lineHeight: 18 }}>
                            Ensure that the selected deposit network is the same as the network. Otherwise, you'll not be able to withdraw later. Want help to choose a network?
                        </AppText>
                    </View>
                </View>
            </RBSheet>
            {/* @ts-ignore */}
            <RBSheet customModalProps={{ statusBarTranslucent: true }}
                ref={selectCoinFaqSheetRef}
                height={SHEET_HEIGHT - 200}
                closeOnDragDown
                closeOnPressMask
                customStyles={sheetStyles.faq}
            >
                <BlurSheetBackground isDark={isDark} tint="cyan" />
                <View style={styles.sheetBody}>
                    {renderSheetHeader('Deposit help', () => selectCoinFaqSheetRef.current?.close())}
                    <ScrollView
                        style={styles.modalList}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {faqData.map((item, index) => (
                            <View
                                key={String(index)}
                                style={[
                                    styles.faqItemInner,
                                    index === faqData.length - 1 && styles.faqItemInnerLast,
                                    { borderBottomColor: sheetTheme.rowBorderColor },
                                ]}
                            >
                                <TouchableOpacity
                                    style={styles.faqQuestionRow}
                                    onPress={() =>
                                        setFaqActiveIndex(faqActiveIndex === index ? null : index)
                                    }
                                    activeOpacity={0.7}
                                >
                                    <AppText
                                        type={THIRTEEN}
                                        weight={SEMI_BOLD}
                                        style={[styles.faqQuestion, {
                                            color: faqActiveIndex === index ? ACCENT_CYAN : sheetTheme.textColor,
                                        }] as any}
                                    >
                                        {item.title}
                                    </AppText>
                                    <FastImage
                                        source={faqActiveIndex === index ? upIcon : downIcon}
                                        resizeMode="contain"
                                        style={styles.faqArrow}
                                        tintColor={faqActiveIndex === index ? ACCENT_CYAN : sheetTheme.subTextColor}
                                    />
                                </TouchableOpacity>
                                {faqActiveIndex === index && (
                                    <View style={styles.faqAnswer}>
                                        {item.content.split('\n').map((line: string, lineIndex: number) => (
                                            <AppText
                                                key={lineIndex}
                                                type={TWELVE}
                                                style={{ color: sheetTheme.subTextColor, lineHeight: 18 }}
                                            >
                                                {line}
                                            </AppText>
                                        ))}
                                    </View>
                                )}
                            </View>
                        ))}
                    </ScrollView>

                    {/* Bottom Note & Deposit Fiat Link */}
                    <View style={{ borderTopWidth: 1, borderTopColor: sheetTheme.rowBorderColor, paddingTop: 14, marginTop: 10 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', flexWrap: 'wrap' }}>
                            <AppText type={TWELVE} style={{ color: sheetTheme.subTextColor }}>
                                Looking to deposit local currency (AED) instead?{' '}
                            </AppText>
                            <TouchableOpacity
                                onPress={() => {
                                    selectCoinFaqSheetRef.current?.close();
                                    NavigationService.navigate(DEPOSIT_FIAT_SCREEN);
                                }}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                activeOpacity={0.7}
                            >
                                <AppText type={TWELVE} weight={BOLD} color={colors.cyanTheme}>
                                    Deposit Fiat ›
                                </AppText>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </RBSheet>

            {/* More Details Modal */}
            {/* @ts-ignore */}
            <RBSheet customModalProps={{ statusBarTranslucent: true }}
                ref={moreDetailsSheetRef}
                height={SHEET_HEIGHT}
                closeOnDragDown
                closeOnPressMask
                customStyles={sheetStyles.full}
            >
                <BlurSheetBackground isDark={isDark} tint="cyan" />
                <View style={styles.sheetBody}>
                    {renderSheetHeader('More Info', () => moreDetailsSheetRef.current?.close())}
                    <View style={styles.detailsContainer}>
                        <View style={[styles.detailRow, {
                            borderBottomColor: sheetTheme.rowBorderColor
                        }]}>
                            <AppText type={TWELVE} style={styles.modalLabel} color={sheetTheme.subTextColor}>
                                Minimum deposit
                            </AppText>
                            <AppText type={TWELVE} weight={SEMI_BOLD} style={styles.modalValueText} color={sheetTheme.textColor}>
                                {limitForChain(selectedCurrency?.min_deposit, selectedNetwork) ??
                                    '—'}{' '}
                                {selectedCurrency?.short_name}
                            </AppText>
                        </View>
                        <View style={[styles.detailRow, {
                            borderBottomColor: sheetTheme.rowBorderColor
                        }]}>
                            <AppText type={TWELVE} style={styles.modalLabel} color={sheetTheme.subTextColor}>
                                Maximum deposit
                            </AppText>
                            <AppText type={TWELVE} weight={SEMI_BOLD} style={styles.modalValueText} color={sheetTheme.textColor}>
                                {limitForChain(selectedCurrency?.max_deposit, selectedNetwork) ??
                                    '—'}{' '}
                                {selectedCurrency?.short_name}
                            </AppText>
                        </View>
                        <View style={[styles.detailRow, {
                            borderBottomColor: sheetTheme.rowBorderColor
                        }]}>
                            <AppText type={TWELVE} style={styles.modalLabel} color={sheetTheme.subTextColor}>
                                Wallet
                            </AppText>
                            <AppText type={TWELVE} weight={SEMI_BOLD} style={styles.modalValueText} color={sheetTheme.textColor}>
                                Spot Wallet
                            </AppText>
                        </View>
                        <View style={[styles.detailRow, {
                            borderBottomColor: sheetTheme.rowBorderColor
                        }]}>
                            <AppText type={TWELVE} style={styles.modalLabel} color={sheetTheme.subTextColor}>
                                Credited (Trading enabled)
                            </AppText>
                            <AppText type={TWELVE} weight={SEMI_BOLD} style={styles.modalValueText} color={sheetTheme.textColor}>
                                After 2 network confirmations
                            </AppText>
                        </View>
                        <View style={[styles.sheetWarningBox, { backgroundColor: sheetTheme.accentBg, borderColor: sheetTheme.accentBorder }]}>
                            <AppText type={ELEVEN} color={sheetTheme.subTextColor} style={styles.warningText}>
                                • Do not send NFTs to this address{'\n'}• Do not transact with
                                Sanctioned Entities{'\n'}• This is {selectedNetwork} deposit address
                                type. Transferring to an unsupported network could result in loss of
                                deposit.
                            </AppText>
                        </View>
                    </View>
                </View>
            </RBSheet>

            {/* Deposit Details Modal */}
            {/* @ts-ignore */}
            <RBSheet customModalProps={{ statusBarTranslucent: true }}
                ref={depositDetailsSheetRef}
                height={SHEET_HEIGHT}
                closeOnDragDown
                closeOnPressMask
                customStyles={sheetStyles.full}
            >
                <BlurSheetBackground isDark={isDark} tint="cyan" />
                <View style={styles.sheetBody}>
                    {renderSheetHeader('Deposit Details', () => depositDetailsSheetRef.current?.close())}
                    <View style={styles.detailsContainer}>
                        <View style={[styles.detailRow, {
                            borderBottomColor: sheetTheme.rowBorderColor
                        }]}>
                            <AppText type={FOURTEEN} color={sheetTheme.subTextColor} style={styles.modalLabel}>
                                Status
                            </AppText>
                            <AppText
                                type={FOURTEEN}
                                weight={SEMI_BOLD}
                                color={modalData?.status === 'SUCCESS' ? GREEN : YELLOW}
                                style={styles.modalValue}
                            >
                                {modalData?.status === 'SUCCESS' ? 'Completed' : 'Pending'}
                            </AppText>
                        </View>
                        <View style={[styles.detailRow, {
                            borderBottomColor: sheetTheme.rowBorderColor
                        }]}>
                            <AppText type={FOURTEEN} color={sheetTheme.subTextColor} style={styles.modalLabel}>
                                Date
                            </AppText>
                            <AppText
                                type={FOURTEEN}
                                weight={SEMI_BOLD}
                                color={sheetTheme.textColor}
                                style={styles.modalValue}
                            >
                                {moment(modalData?.updatedAt).format('DD-MM-YYYY hh:mm A')}
                            </AppText>
                        </View>
                        <View style={[styles.detailRow, {
                            borderBottomColor: sheetTheme.rowBorderColor
                        }]}>
                            <AppText type={FOURTEEN} color={sheetTheme.subTextColor} style={styles.modalLabel}>
                                Coin
                            </AppText>
                            <AppText
                                type={FOURTEEN}
                                weight={SEMI_BOLD}
                                color={sheetTheme.textColor}
                                style={styles.modalValue}
                            >
                                {modalData?.short_name}
                            </AppText>
                        </View>
                        <View style={[styles.detailRow, {
                            borderBottomColor: sheetTheme.rowBorderColor
                        }]}>
                            <AppText type={FOURTEEN} color={sheetTheme.subTextColor} style={styles.modalLabel}>
                                Deposit amount
                            </AppText>
                            <AppText
                                type={FOURTEEN}
                                weight={SEMI_BOLD}
                                color={sheetTheme.textColor}
                                style={styles.modalValue}
                            >
                                {modalData?.amount} {modalData?.short_name}
                            </AppText>
                        </View>
                        <View style={[styles.detailRow, {
                            borderBottomColor: sheetTheme.rowBorderColor
                        }]}>
                            <AppText type={FOURTEEN} color={sheetTheme.subTextColor} style={styles.modalLabel}>
                                Network
                            </AppText>
                            <AppText
                                type={FOURTEEN}
                                weight={SEMI_BOLD}
                                color={sheetTheme.textColor}
                                style={styles.modalValue}
                            >
                                {modalData?.chain || 'Internal Transaction'}
                            </AppText>
                        </View>
                        <View style={[styles.detailRow, {
                            borderBottomColor: sheetTheme.rowBorderColor
                        }]}>
                            <AppText type={FOURTEEN} color={sheetTheme.subTextColor} style={styles.modalLabel}>
                                From Address
                            </AppText>
                            <View style={[styles.addressRow, styles.modalValue]}>
                                <AppText
                                    type={FOURTEEN}
                                    weight={SEMI_BOLD}
                                    color={sheetTheme.textColor}
                                    style={{ flex: 1 }}
                                    numberOfLines={1}
                                >
                                    {modalData?.shortAddress || modalData?.from_address || '----'}
                                </AppText>
                                {modalData?.from_address && (
                                    <TouchableOpacity
                                        onPress={() => copyText(modalData?.from_address)}
                                        style={styles.copyButton}
                                    >
                                        <FastImage
                                            source={copyIcon}
                                            style={styles.copyIcon}
                                            resizeMode="contain"
                                            tintColor={ACCENT_CYAN}
                                        />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                        <View style={[styles.detailRow, {
                            borderBottomColor: sheetTheme.rowBorderColor
                        }]}>
                            <AppText type={FOURTEEN} color={sheetTheme.subTextColor} style={styles.modalLabel}>
                                Deposit Address
                            </AppText>
                            <View style={[styles.addressRow, styles.modalValue]}>
                                <AppText
                                    type={FOURTEEN}
                                    weight={SEMI_BOLD}
                                    color={sheetTheme.textColor}
                                    style={{ flex: 1 }}
                                    numberOfLines={1}
                                >
                                    {modalData?.shortToAddress || modalData?.to_address || '----'}
                                </AppText>
                                {modalData?.to_address && (
                                    <TouchableOpacity
                                        onPress={() => copyText(modalData?.to_address)}
                                        style={styles.copyButton}
                                    >
                                        <FastImage
                                            source={copyIcon}
                                            style={styles.copyIcon}
                                            resizeMode="contain"
                                            tintColor={ACCENT_CYAN}
                                        />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                        <View style={[styles.detailRow, {
                            borderBottomColor: sheetTheme.rowBorderColor
                        }]}>
                            <AppText type={FOURTEEN} color={sheetTheme.subTextColor} style={styles.modalLabel}>
                                TxID
                            </AppText>
                            <View style={[styles.addressRow, styles.modalValue]}>
                                <AppText
                                    type={FOURTEEN}
                                    weight={SEMI_BOLD}
                                    color={sheetTheme.textColor}
                                    style={{ flex: 1 }}
                                    numberOfLines={1}
                                >
                                    {modalData?.shortTxHash || modalData?.transaction_hash || '----'}
                                </AppText>
                                {modalData?.transaction_hash && (
                                    <TouchableOpacity
                                        onPress={() => copyText(modalData?.transaction_hash)}
                                        style={styles.copyButton}
                                    >
                                        <FastImage
                                            source={copyIcon}
                                            style={styles.copyIcon}
                                            resizeMode="contain"
                                            tintColor={ACCENT_CYAN}
                                        />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                        <View style={[styles.detailRow, {
                            borderBottomColor: sheetTheme.rowBorderColor
                        }]}>
                            <AppText type={FOURTEEN} color={sheetTheme.subTextColor} style={styles.modalLabel}>
                                Deposit wallet
                            </AppText>
                            <AppText
                                type={FOURTEEN}
                                weight={SEMI_BOLD}
                                color={sheetTheme.textColor}
                                style={styles.modalValue}
                            >
                                {modalData?.description?.includes('bonus')
                                    ? 'Bonus Wallet'
                                    : 'Main Wallet'}
                            </AppText>
                        </View>
                    </View>
                </View>
            </RBSheet>

            {/* Deposit Confirmed Modal */}
            {/* @ts-ignore */}
            <RBSheet customModalProps={{ statusBarTranslucent: true }}
                ref={depositConfirmedSheetRef}
                height={SHEET_HEIGHT}
                closeOnDragDown
                closeOnPressMask
                customStyles={sheetStyles.full}
            >
                <BlurSheetBackground isDark={isDark} tint="cyan" />
                <View style={styles.sheetBody}>
                    {renderSheetHeader(
                        'Deposit Processing',
                        () => depositConfirmedSheetRef.current?.close(),
                        <View style={[styles.sheetStatusDot, { backgroundColor: sheetTheme.accentBg, borderColor: sheetTheme.accentBorder }]}>
                            <AppText type={TWELVE} weight={BOLD} color={ACCENT_CYAN}>
                                ✓
                            </AppText>
                        </View>
                    )}
                    <View style={styles.detailsContainer}>
                        <View style={[styles.sheetStepsCard, { backgroundColor: sheetTheme.cardBg, borderColor: sheetTheme.borderColor }]}>
                            {[
                                { key: 'submitted', title: 'Deposit order submitted', time: moment(modalData.createdAt).format('DD-MM-YYYY hh:mm A'), done: true },
                                { key: 'processing', title: 'System processing', time: moment(modalData.createdAt).format('DD-MM-YYYY hh:mm A'), done: true },
                                { key: 'completed', title: 'Deposit completed', time: '----', done: false },
                            ].map((step, idx, arr) => (
                                <View key={step.key} style={styles.sheetStepRow}>
                                    <View style={styles.sheetStepRail}>
                                        <View style={[styles.sheetStepDot, {
                                            backgroundColor: step.done ? ACCENT_CYAN : 'transparent',
                                            borderColor: step.done ? ACCENT_CYAN : sheetTheme.borderColor,
                                        }]} />
                                        {idx < arr.length - 1 ? (
                                            <View style={[styles.sheetStepLine, {
                                                backgroundColor: step.done ? sheetTheme.accentBorder : sheetTheme.rowBorderColor,
                                            }]} />
                                        ) : null}
                                    </View>
                                    <View style={{ flex: 1, paddingBottom: idx < arr.length - 1 ? 14 : 0 }}>
                                        <AppText weight={SEMI_BOLD} type={FOURTEEN} color={step.done ? sheetTheme.textColor : sheetTheme.subTextColor}>
                                            {step.title}
                                        </AppText>
                                        <AppText type={TEN} color={sheetTheme.subTextColor} style={{ marginTop: 2 }}>
                                            {step.time}
                                        </AppText>
                                    </View>
                                </View>
                            ))}
                        </View>
                        {[
                            { key: 'status', label: 'Status', value: 'Pending', color: YELLOW },
                            { key: 'coin', label: 'Coin', value: modalData?.short_name },
                            { key: 'amount', label: 'Deposited amount', value: modalData?.amount },
                            { key: 'network', label: 'Network', value: modalData?.chain },
                            { key: 'txid', label: 'TxID', value: modalData?.shortTxHash?.trim() || '----' },
                        ].map((row) => (
                            <View key={row.key} style={[styles.detailRow, { borderBottomColor: sheetTheme.rowBorderColor }]}>
                                <AppText type={FOURTEEN} color={sheetTheme.subTextColor}>{row.label}</AppText>
                                <AppText type={FOURTEEN} weight={SEMI_BOLD} color={row.color || sheetTheme.textColor}>
                                    {row.value}
                                </AppText>
                            </View>
                        ))}
                    </View>
                </View>
            </RBSheet>
        </AppSafeAreaView >
    );
};

export default DepositCoin;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 16,
    },
    depositWrap: {
        flex: 1,
        paddingHorizontal: 16,
    },
    depositScrollContent: {
        paddingTop: 10,
        paddingBottom: 110,
    },
    dqCard: {
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
        borderWidth: 1.5,
    },
    dqQrCard: {
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    dqQrCardLeft: {
        flex: 1,
        paddingRight: 16,
    },
    dqShareBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 8,
        alignSelf: 'flex-start',
        marginTop: 16,
    },
    dqQrFrame: {
        width: 140,
        height: 140,
        alignSelf: 'center',
        justifyContent: 'center',
        alignItems: 'center',
    },
    dqQrInner: {
        borderRadius: 10,
        overflow: 'hidden',
        backgroundColor: '#FFFFFF',
    },
    dqQrFrameImage: {
        ...StyleSheet.absoluteFillObject,
        width: '100%',
        height: '100%',
    },
    dqSectionTitle: {
        marginTop: 8,
        marginBottom: 8,
    },
    dqRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dqRowCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    dqNetworkLogo: {
        width: 36,
        height: 36,
        borderRadius: 18,
        overflow: 'hidden',
    },
    dqCopyBtn: {
        width: 28,
        height: 28,
        borderRadius: 6,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dqWarningCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginTop: 8,
    },
    dqDetailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 16,
    },
    dqGenerateBtn: {
        marginTop: 14,
    },
    depositBottomBar: {
        position: 'absolute',
        left: 16,
        right: 16,
        bottom: 10,
    },
    depositShareBtn: {
        borderRadius: 24,
        height: 52,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 20,
    },
    backIcon: {
        width: 35,
        height: 35,
    },
    section: {
        marginBottom: 12,
        padding: 12,
        borderRadius: 10,
        marginTop: 12,
    },
    selectedSection: {
        borderColor: YELLOW,
    },
    selectButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
        marginBottom: 10,
    },
    searchIcon: {
        width: 20,
        height: 20,
    },
    quickSelectContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 10,
        gap: 10,
    },
    quickCoinItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
        borderRadius: 8,
        gap: 5,
    },
    quickCoinItemSelected: {
        borderWidth: 1,
        borderColor: '#F3BB2B',
    },
    quickCoinIcon: {
        width: 24,
        height: 24,
        borderRadius: 12,
    },
    warningBox: {
        backgroundColor: 'rgba(30, 86, 245, 0.12)',
        padding: 10,
        borderRadius: 8,
        marginTop: 10,
    },
    generateButton: {
        marginTop: 10,
        alignSelf: 'center',
        width: '80%',
    },
    addressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 15,
        gap: 15,
    },
    qrWrapper: {
        padding: 8,
        borderRadius: 10,
    },
    addressInfo: {
        flex: 1,
    },
    addressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        // gap: 5,
        marginTop: 5,
    },
    copyIcon: {
        width: 16,
        height: 16,
    },
    depositMetaWrap: {
        marginTop: 12,
        gap: 6,
    },
    depositMetaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 10,
    },
    moreDetailsButton: {
        marginTop: 10,
    },
    transferButton: {
        marginTop: 10,
        width: '50%',
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
        gap: 10,
    },
    loadingText: {
        flex: 1,
    },
    helpText: {
        marginTop: 10,
        textAlign: "left"
    },
    faqSection: {
        marginTop: 20,
    },
    faqSectionCard: {
        borderRadius: 16,
        padding: 14,
        marginBottom: 14,
        overflow: 'hidden' as const,
    },
    faqSectionCardTitle: {
        marginBottom: 8,
    },
    faqListWrap: {},
    faqScrollContent: { paddingBottom: 8 },
    faqItemInner: {
        paddingVertical: 12,
        borderBottomWidth: 0.7,
        borderBottomColor: colors.iconBgColor
    },
    faqItemInnerLast: { borderBottomWidth: 0 },
    faqQuestionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    faqQuestion: { flex: 1 },
    faqArrow: { width: 10, height: 10, marginLeft: 8 },
    faqAnswer: {
        marginTop: 10,
        paddingTop: 10,
    },
    announcementsSection: {
        marginTop: 20,
    },
    announcementsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    announcementsScroll: {
        maxHeight: 150,
    },
    announcementItem: {
        padding: 12,
        marginBottom: 8,
        borderRadius: 12,
    },
    recentDepositsSection: {
        marginTop: 20,
        marginBottom: 30,
    },
    recentDepositsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    recentDepositsTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    loadingIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    depHistCard: {
        borderWidth: 1,
        borderRadius: 16,
        padding: 14,
        marginBottom: 12,
    },
    depHistTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    depHistPill: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
    },
    depHistRows: {
        gap: 12,
    },
    depHistRow: {
        flexDirection: 'row',
        alignItems: 'center',
        minWidth: 0,
    },
    depHistLabel: {
        width: 120,
    },
    depHistValueWrap: {
        flex: 1,
        minWidth: 0,
    },
    depHistValue: {
        textAlign: 'right',
    },
    depHistRight: {
        marginLeft: 10,
    },
    depHistIconRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    depHistIconBtn: {
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(148, 163, 184, 0.35)',
    },
    depHistIcon: {
        width: 14,
        height: 14,
    },
    copyButton: {
        padding: 4,
    },
    emptyContainer: {
        paddingVertical: 16,
        alignItems: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        paddingBottom: 20,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    confirmedHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    searchInput: {
        padding: 12,
        borderRadius: 8,
        marginBottom: 15,
    },
    modalList: {
        maxHeight: 400,
    },
    coinItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 2,
        gap: 8,
        borderBottomWidth: 1,
    },
    coinLeft: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        minWidth: 0,
    },
    coinSpark: {
        width: 84,
        alignItems: 'center',
        justifyContent: 'center',
    },
    coinRight: {
        width: 100,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
    },
    starBtn: {
        marginLeft: 10,
    },
    rowChevron: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    suspendedPill: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 999,
        backgroundColor: 'rgba(224, 57, 52, 0.12)',
    },
    coinIcon: {
        width: 38,
        height: 38,
        borderRadius: 19,
    },
    coinInfo: {
        flex: 1,
    },
    networkItem: {
        padding: 15,
        borderBottomWidth: 1,
        borderRadius: 8,
        marginBottom: 5,
    },
    selectedNetworkItem: {
        backgroundColor: colors.amber_fifty,
        borderColor: YELLOW,
        borderWidth: 1,
        marginTop: 10
    },
    detailsContainer: {
        marginTop: 10,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,

        minHeight: 44,
    },
    modalLabel: {
        flex: 1,
        paddingRight: 12,
    },
    modalValue: {
        flex: 1,
        marginLeft: 12,
        alignItems: 'flex-end',
    },
    modalValueText: {
        flex: 1,
        textAlign: 'right',
        flexWrap: 'wrap',
    },
    warningText: {
        lineHeight: 17,
    },
    sheetBody: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 20,
    },
    sheetCloseCircle: {
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sheetStatusDot: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sheetWarningBox: {
        marginTop: 14,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
    },
    sheetStepsCard: {
        borderWidth: 1,
        borderRadius: 14,
        padding: 14,
        marginBottom: 6,
    },
    sheetStepRow: {
        flexDirection: 'row',
    },
    sheetStepRail: {
        width: 18,
        alignItems: 'center',
        marginRight: 10,
    },
    sheetStepDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        borderWidth: 1.5,
        marginTop: 4,
    },
    sheetStepLine: {
        width: 1.5,
        flex: 1,
        marginTop: 4,
    },
    headerView: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 8,
        paddingHorizontal: 16,
        paddingVertical: 4,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerIconBtn: {
        padding: 4,
        marginLeft: 12,
    },
    titleSection: {
        paddingHorizontal: 16,
        marginTop: 6,
        marginBottom: 12,
    },
    selectCoinPhase: {
        flex: 1,

        paddingHorizontal: 16,
    },
    searchSection: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    searchInputWrapper: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        height: 48,
        borderRadius: 24,
        borderWidth: 1,
    },
    searchInputIcon: {
        marginLeft: 14,
        marginRight: 8,
    },
    searchClearBtn: {
        paddingHorizontal: 14,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    recentTextWrapper: {
        marginLeft: 8,
        marginRight: 4,
        justifyContent: 'center',
    },
    recentRemoveBtn: {
        padding: 4,
    },
    selectCoinListRow: {
        flex: 1,
        flexDirection: 'row',
        position: 'relative',
        minHeight: 0,
    },
    sectionListFlex: {
        flex: 1,
    },
    coinFlatListRow: {
        minHeight: COIN_LIST_ROW_INNER,
        marginBottom: COIN_LIST_ROW_GAP,
    },
    selectCoinSearchWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
        marginBottom: 6,
        paddingHorizontal: 10,
        borderRadius: 8,
        minHeight: 40,
    },
    selectCoinSearchIcon: {
        width: 20,
        height: 20,
        marginRight: 8,
    },
    selectCoinSearchInput: {
        flex: 1,
        height: '100%',
        paddingVertical: 0,
        fontSize: 14,
    },
    sectionListContent: {
        paddingTop: 2,
        paddingBottom: 24,
    },
    sectionListContentWithIndex: {
        paddingRight: 22,
    },
    depositSectionHeader: {
        paddingTop: 14,
        paddingBottom: 2,
    },
    depositHistoryChipsSection: {
        marginBottom: 20,
    },
    depositHistoryChipsTitleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    depositHistoryClearIcon: {
        width: 18,
        height: 18,
    },
    depositRecentChipsScroll: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingRight: 8,
    },
    depositRecentChip: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
        paddingRight: 4,
        borderRadius: 12,
        borderWidth: 1,
        overflow: 'hidden',
    },
    depositRecentChipIcon: {
        width: 24,
        height: 24,
        borderRadius: 12,
    },
    trendingBlock: {
        marginBottom: 6,
    },
    trendingTitle: {
        marginBottom: 6,
    },
    alphabetBubbleWrap: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    alphabetBubbleZ: {
        zIndex: 5,
    },
    alphabetIndexRailZ: {
        zIndex: 10,
    },
    alphabetBubble: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    alphabetBubbleLight: {
        backgroundColor: 'rgba(10, 168, 197, 0.85)',
    },
    alphabetBubbleDark: {
        backgroundColor: 'rgba(10, 168, 197, 0.35)',
    },
    alphabetBubbleText: {
        color: '#FFFFFF',
    },
    alphabetIndexRail: {
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: 20,
        maxHeight: '100%',
    },
    alphabetIndexLettersColumn: {
        flex: 1,
        flexDirection: 'column',
        paddingVertical: 4,
    },
    alphabetIndexLetterCell: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 0,
    },
    alphabetIndexLetter: {
        lineHeight: 11,
        fontWeight: '600',
    },
    coinItemDisabled: {
        opacity: 0.45,
    },
    networkSheetInner: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 8,
    },
    networkSheetTitle: {
        marginBottom: 16,
    },
    networkSheetScroll: {
        maxHeight: SHEET_HEIGHT - 190,
    },
    networkCard: {
        borderWidth: 1,
        borderRadius: 16,
        padding: 12,
        marginBottom: 10,
    },
    networkCardTop: {
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        paddingBottom: 12,
        marginBottom: 12,
    },
    networkLogo: {
        width: 32,
        height: 32,
        borderRadius: 16,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
    },
    networkChevron: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    networkCardBottom: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    networkInfoItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    networkInfoDivider: {
        width: 1,
        alignSelf: 'stretch',
        marginHorizontal: 12,
    },
    networkInfoIcon: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    networkCardTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        marginBottom: 8,
    },
    networkSheetNotice: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        marginTop: 4,
        marginBottom: 20,
    },
    networkSheetNoticeIcon: {
        width: 18,
        height: 18,
        marginRight: 10,
        marginTop: 2,
    },
    depositSummaryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    depositSummaryIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
});

