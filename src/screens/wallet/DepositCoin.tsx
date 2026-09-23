import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
    TWENTY,
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
} from '../../shared';
import KeyBoardAware from '../../shared/components/KeyboardAware';
import FastImage from 'react-native-fast-image';
import QRCode from 'react-native-qrcode-svg';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import NavigationService from '../../navigation/NavigationService';
import { DEPOSIT_FIAT_SCREEN } from '../../navigation/routes';
import { buildCoinImageUri } from '../../helper/coinIconUrl';
import { colors, darkTheme, lightTheme } from '../../theme/colors';
import { useTheme } from '../../hooks/useTheme';
import {
    getDepositActiveCoins,
    verifyDeposit,
} from '../../actions/walletActions';
import { getNotificationList } from '../../actions/homeActions';
import { copyText, shortenAddress, dateFormatter } from '../../helper/utility';
import { BACK_ICON, searchIcon, copyIcon, printIcon, upIcon, downIcon, INFO, NO_NOTIFICATION_ICON, NO_NOTIFICATION_ICON_LIGHT, back_ic, binIcon, swapNetwork, externalLinkIcon } from '../../helper/ImageAssets';
import { setLoading } from '../../slices/authSlice';
// setWalletAddress removed: deposit address handled locally for web parity (address + memo)
import { showError } from '../../helper/logger';
import moment from 'moment';
import { appOperation } from '../../appOperation';
import ShimmerBone from '../../shared/components/ShimmerBone';

const SHEET_HEIGHT = Math.round(Dimensions.get('window').height * 0.72);

/** Row height + gap under each coin row (compact select list). */
const COIN_LIST_ROW_GAP = 6;
const COIN_LIST_ROW_INNER = 52;

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
        <View style={[styles.selectCoinSearchWrap, { borderWidth: 0 }]}>
            <ShimmerBone width="100%" height={40} borderRadius={10} />
        </View>
        <View style={styles.selectCoinListRow}>
            <View style={[styles.sectionListFlex, { paddingTop: 4 }]}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                    <View
                        key={i}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            marginBottom: COIN_LIST_ROW_GAP,
                            minHeight: COIN_LIST_ROW_INNER,
                        }}
                    >
                        <ShimmerBone width={28} height={28} borderRadius={14} />
                        <View style={{ marginLeft: 10, flex: 1 }}>
                            <ShimmerBone width={88} height={14} borderRadius={4} style={{ marginBottom: 6 }} />
                            <ShimmerBone width="55%" height={11} borderRadius={4} />
                        </View>
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

    const [availableCurrency, setAvailableCurrency] = useState<any[]>([]);
    const [allData, setAllData] = useState<any[]>([]);
    const [searchPair, setSearchPair] = useState('');
    const [selectedCurrency, setSelectedCurrency] = useState<any>({});
    const [selectedNetwork, setSelectedNetwork] = useState('');
    const [depositAddress, setDepositAddress] = useState('');
    const [depositMemo, setDepositMemo] = useState('');
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
    }, []);

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
        const coinIconUri = buildCoinImageUri(item);
        return (
            <TouchableOpacity
                style={[
                    styles.coinItem,
                    styles.coinFlatListRow,
                    disabled && styles.coinItemDisabled,
                ]}
                onPress={() => openNetworkSheetForCoin(item)}
                activeOpacity={disabled ? 1 : 0.7}
            >
                {coinIconUri ? (
                    <FastImage
                        source={{ uri: coinIconUri }}
                        style={styles.coinIcon}
                        resizeMode="cover"
                    />
                ) : (
                    <View style={[styles.coinIcon, { backgroundColor: colors.textGray, opacity: 0.25 }]} />
                )}
                <View style={styles.coinInfo}>
                    <AppText weight={SEMI_BOLD} type={FIFTEEN} style={{ color: themeColors.text }}>
                        {item?.short_name || item?.name}
                    </AppText>
                    {item?.short_name && item?.name ? (
                        <AppText type={THIRTEEN} color={colors.textGray}>
                            {item.name}
                        </AppText>
                    ) : null}
                </View>
                {suspended && (
                    <AppText type={TEN} color={RED} weight={SEMI_BOLD}>
                        Suspended
                    </AppText>
                )}
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

    const renderDepositSectionHeader = useCallback(
        (info: any) => (
            <View
                style={[
                    styles.depositSectionHeader,
                    { backgroundColor: themeColors.background },
                ]}
            >
                <AppText weight={SEMI_BOLD} type={THIRTEEN} style={{ color: themeColors.text }}>
                    {String(info?.section?.title ?? '')}
                </AppText>
            </View>
        ),
        [themeColors.background, themeColors.text]
    );

    const renderSelectCoinListHeader = () => {
        if (String(searchPair || '').trim()) return null;
        return (
            <View>
                {recentDepositCoinsForList.length > 0 && (
                    <View style={styles.depositHistoryChipsSection}>
                        <View style={styles.depositHistoryChipsTitleRow}>
                            <AppText
                                weight={SEMI_BOLD}
                                type={THIRTEEN}
                                style={{ color: themeColors.text }}
                            >
                                History
                            </AppText>
                            <TouchableOpacity onPress={clearRecentDepositCoins} hitSlop={12}>
                                <FastImage
                                    source={binIcon}
                                    style={styles.depositHistoryClearIcon}
                                    resizeMode="contain"
                                />
                            </TouchableOpacity>
                        </View>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.depositRecentChipsScroll}
                            keyboardShouldPersistTaps="handled"
                        >
                            {recentDepositCoinsForList.map((item: any) => {
                                const chipIconUri = buildCoinImageUri(item);
                                return (
                                    <TouchableOpacity
                                        key={String(item._id)}
                                        style={[
                                            styles.depositRecentChip,
                                            {
                                                backgroundColor: isDark
                                                    ? themeColors.border
                                                    : '#F0F0F0',
                                                borderColor: isDark ? themeColors.border : '#EEE',
                                            },
                                        ]}
                                        onPress={() => openNetworkSheetForCoin(item)}
                                        activeOpacity={0.7}
                                    >
                                        {chipIconUri ? (
                                            <FastImage
                                                source={{ uri: chipIconUri }}
                                                style={styles.depositRecentChipIcon}
                                                resizeMode="cover"
                                            />
                                        ) : (
                                            <View
                                                style={[
                                                    styles.depositRecentChipIcon,
                                                    { backgroundColor: colors.textGray, opacity: 0.25 },
                                                ]}
                                            />
                                        )}
                                        <AppText
                                            type={THIRTEEN}
                                            weight={SEMI_BOLD}
                                            style={{ color: themeColors.text }}
                                        >
                                            {item.short_name}
                                        </AppText>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>
                )}
                {trendingDepositCoins.length > 0 && (
                    <View style={styles.trendingBlock}>
                        <AppText
                            weight={SEMI_BOLD}
                            type={THIRTEEN}
                            style={[styles.trendingTitle, { color: themeColors.text }]}
                        >
                            Trending Coins
                        </AppText>
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

    return (
        <AppSafeAreaView style={{ flex: 1, backgroundColor: themeColors.background }}>
            <View style={styles.headerView}>
                <TouchableOpacity onPress={handleHeaderBack}>
                    <FastImage
                        source={back_ic}
                        resizeMode="contain"
                        style={{ width: 35, height: 35 }}
                    />
                </TouchableOpacity>
                <AppText
                    color={themeColors.text}
                    weight={SEMI_BOLD}
                    type={EIGHTEEN}
                >
                    {headerTitle}
                </AppText>
                {depositFlowPhase === 'selectCoin' ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <TouchableOpacity
                            onPress={() => {
                                setFaqActiveIndex(null);
                                selectCoinFaqSheetRef.current?.open();
                            }}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
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
                        >
                            <FastImage
                                source={printIcon}
                                resizeMode="contain"
                                style={{ width: 20, height: 17 }}
                                tintColor={themeColors.text}
                            />
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <TouchableOpacity
                            onPress={() => {
                                setFaqActiveIndex(null);
                                selectCoinFaqSheetRef.current?.open();
                            }}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
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
                        >
                            <FastImage
                                source={printIcon}
                                resizeMode="contain"
                                style={{ width: 20, height: 17 }}
                                tintColor={themeColors.text}
                            />
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {depositFlowPhase === 'selectCoin' ? (
                selectCoinListLoading ? (
                    <DepositCoinSelectListSkeleton />
                ) : (
                    <View style={styles.selectCoinPhase}>
                        <View style={[styles.selectCoinSearchWrap, { backgroundColor: isDark ? darkTheme.darkThemeInputColor : lightTheme.input }]}>
                            <FastImage
                                source={searchIcon}
                                style={styles.selectCoinSearchIcon}
                                resizeMode="contain"
                                tintColor={themeColors.secondaryText}
                            />
                            <TextInput
                                style={[
                                    styles.selectCoinSearchInput,
                                    {
                                        backgroundColor: 'transparent',
                                        color: themeColors.text,
                                    },
                                ]}
                                placeholder="Search Coins"
                                placeholderTextColor={themeColors.secondaryText}
                                cursorColor={isDark ? colors.white : colors.black}
                                value={searchPair}
                                onChangeText={setSearchPair}
                            />
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
                                ListHeaderComponent={renderSelectCoinListHeader}
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
                                extraData={isDark}
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
                                                const selectedColor = themeColors.text;
                                                return (
                                                    <View
                                                        key={label}
                                                        style={styles.alphabetIndexLetterCell}
                                                    >
                                                        <AppText
                                                            type={EIGHT}
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
                            ) : depositAddress ? (
                                <>
                                    <View style={styles.depositQrCenter}>
                                        <View style={[styles.depositQrCard, { borderColor: isDark ? themeColors.border : '#EEE' }]}>
                                            <QRCode
                                                value={depositAddress}
                                                size={140}
                                                backgroundColor="#FFFFFF"
                                                color="#000000"
                                                quietZone={4}
                                            />
                                        </View>
                                        <AppText type={FOURTEEN} style={[styles.depositQrHint, { color: themeColors.secondaryText }]}>
                                            Scan to Deposit
                                        </AppText>
                                    </View>

                                    <View style={[styles.depositInfoCard, { borderColor: isDark ? themeColors.border : '#EEE' }]}>
                                        <View style={styles.depositInfoRowHead}>
                                            <AppText type={FOURTEEN} style={{ color: themeColors.secondaryText }}>
                                                Network
                                            </AppText>
                                        </View>
                                        <View style={styles.depositNetworkRow}>
                                            <View style={{ flex: 1 }}>
                                                <AppText weight={SEMI_BOLD} type={SIXTEEN} style={{ color: themeColors.text }}>
                                                    {String(selectedNetwork || '').toUpperCase()}
                                                </AppText>
                                                <AppText type={TWELVE} style={{ color: themeColors.secondaryText, marginTop: 4 }}>
                                                    {depositNetworkDisplay || '—'}
                                                </AppText>
                                            </View>
                                            <TouchableOpacity
                                                onPress={() => {
                                                    if (!selectedCurrency) return;
                                                    setCoinForNetworkSheet(selectedCurrency);
                                                    // Ensure state is set before opening
                                                    setTimeout(() => {
                                                        networkSheetRef.current?.open();
                                                    }, 0);
                                                }}
                                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                            >
                                                <FastImage
                                                    source={swapNetwork}
                                                    resizeMode="contain"
                                                    style={{ width: 30, height: 30, bottom: 5 }}
                                                />
                                            </TouchableOpacity>
                                        </View>
                                    </View>

                                    <View style={[styles.depositInfoCard, { borderColor: isDark ? themeColors.border : '#EEE' }]}>
                                        <TouchableOpacity
                                            disabled={true}
                                            style={styles.depositAddressHeadRow}
                                            onPress={() => moreDetailsSheetRef.current?.open()}
                                            activeOpacity={0.7}
                                        >
                                            <AppText type={FOURTEEN} style={{ color: themeColors.secondaryText }}>
                                                Deposit Address
                                            </AppText>

                                        </TouchableOpacity>
                                        <View style={styles.depositAddressRow}>
                                            <AppText
                                                weight={MEDIUM}
                                                type={FOURTEEN}
                                                numberOfLines={2}
                                                style={{ flex: 1, color: isDark ? colors.white : colors.buttonBg }}
                                            >
                                                {depositAddress}
                                            </AppText>
                                            <TouchableOpacity
                                                onPress={() => copyText(depositAddress)}
                                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                                style={styles.depositCopyBtn}
                                            >
                                                <FastImage
                                                    source={copyIcon}
                                                    style={{ width: 15, height: 15 }}
                                                    resizeMode="contain"
                                                    tintColor={themeColors.secondaryText}
                                                />
                                            </TouchableOpacity>
                                        </View>
                                    </View>

                                    <View style={[styles.depositInfoCard, { borderColor: isDark ? themeColors.border : '#EEE' }]}>
                                        <View style={styles.depositAddressHeadRow}>
                                            <AppText type={FOURTEEN} style={{ color: themeColors.secondaryText }}>
                                                Memo (Tag)
                                            </AppText>
                                        </View>
                                        <View style={styles.depositAddressRow}>
                                            <AppText
                                                weight={SEMI_BOLD}
                                                type={FOURTEEN}
                                                numberOfLines={1}
                                                style={{
                                                    flex: 1,
                                                    color:
                                                        depositMemo && String(depositMemo).trim()
                                                            ? themeColors.text
                                                            : themeColors.secondaryText,
                                                }}
                                            >
                                                {depositMemo && String(depositMemo).trim() ? depositMemo : '—'}
                                            </AppText>
                                            <TouchableOpacity
                                                onPress={() => {
                                                    if (!depositMemo || !String(depositMemo).trim()) return;
                                                    copyText(depositMemo);
                                                }}
                                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                                style={styles.depositCopyBtn}
                                                activeOpacity={depositMemo && String(depositMemo).trim() ? 0.7 : 1}
                                            >
                                                <FastImage
                                                    source={copyIcon}
                                                    style={{
                                                        width: 15,
                                                        height: 15,
                                                        opacity: depositMemo && String(depositMemo).trim() ? 1 : 1.35,
                                                        bottom: 5
                                                    }}
                                                    resizeMode="contain"
                                                    tintColor={themeColors.secondaryText}
                                                />
                                            </TouchableOpacity>
                                        </View>
                                    </View>

                                    <TouchableOpacity
                                        onPress={() => moreDetailsSheetRef.current?.open()}
                                        style={styles.depositMoreDetailsCenter}
                                        activeOpacity={0.7}
                                    >
                                        <AppText type={SIXTEEN} style={{ color: themeColors.secondaryText }}>
                                            More Details {'>'}
                                        </AppText>
                                    </TouchableOpacity>
                                </>
                            ) : (
                                <View style={styles.depositEmptyWrap}>
                                    <View style={[styles.depositInfoCard, { borderColor: isDark ? themeColors.border : '#EEE' }]}>
                                        <View style={styles.depositEmptyCardTopRow}>
                                            <View style={styles.depositEmptyCoinRow}>
                                                {buildCoinImageUri(selectedCurrency) ? (
                                                    <FastImage
                                                        source={{ uri: buildCoinImageUri(selectedCurrency)! }}
                                                        style={styles.depositEmptyCoinIcon}
                                                        resizeMode="cover"
                                                    />
                                                ) : (
                                                    <View style={styles.depositEmptyCoinIconPlaceholder} />
                                                )}
                                                <View style={{ flex: 1 }}>
                                                    <AppText weight={SEMI_BOLD} type={SIXTEEN} style={{ color: themeColors.text }}>
                                                        {selectedCurrency?.short_name || '—'}
                                                    </AppText>
                                                    <AppText type={TWELVE} style={{ color: themeColors.secondaryText, marginTop: 2 }}>
                                                        {selectedCurrency?.name || '—'}
                                                    </AppText>
                                                </View>
                                            </View>

                                        </View>

                                        <View style={styles.depositEmptyDivider} />

                                        <View style={styles.depositEmptyNetworkBlock}>
                                            <View style={{}}>
                                                <AppText type={FOURTEEN} style={{ color: themeColors.secondaryText }}>
                                                    Network
                                                </AppText>
                                                <AppText weight={SEMI_BOLD} type={SIXTEEN} style={{ color: themeColors.text, marginTop: 6 }}>
                                                    {String(selectedNetwork || '').toUpperCase() || '—'}
                                                </AppText>
                                                <AppText type={TWELVE} style={{ color: themeColors.secondaryText, marginTop: 2 }}>
                                                    {depositNetworkDisplay || '—'}
                                                </AppText>
                                            </View>

                                            <TouchableOpacity
                                                onPress={() => {
                                                    if (!selectedCurrency) return;
                                                    setCoinForNetworkSheet(selectedCurrency);
                                                    setTimeout(() => networkSheetRef.current?.open(), 0);
                                                }}
                                                style={{ right: 10 }}
                                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                            >
                                                <FastImage
                                                    source={swapNetwork}
                                                    resizeMode="contain"
                                                    style={{ width: 26, height: 26 }}
                                                />
                                            </TouchableOpacity>

                                        </View>
                                    </View>

                                    <AppText
                                        weight={SEMI_BOLD}
                                        type={FOURTEEN}
                                        style={[styles.depositEmptyTitle, { color: themeColors.text, marginLeft: 5 }]}
                                    >
                                        Deposit Address
                                    </AppText>
                                    <Button
                                        children="Generate deposit address"
                                        onPress={() => getDepositAddress(true, selectedNetwork, selectedCurrency)}
                                        containerStyle={styles.depositEmptyBtn}
                                        loading={generatingDepositAddress}
                                    />
                                </View>
                            )}

                            {/* FAQ moved to header help icon (modal) */}

                            {!resolvingDepositAddress && announcements?.length > 0 && (
                                <View style={styles.announcementsSection}>
                                    <View style={styles.announcementsHeader}>
                                        <AppText weight={SEMI_BOLD} type={FIFTEEN} style={styles.sectionTitle}>
                                            Announcements
                                        </AppText>
                                        <TouchableOpacity
                                            onPress={() => {
                                            }}
                                        >
                                            <AppText type={FOURTEEN} color={YELLOW}>
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
                                                { backgroundColor: themeColors.background, borderColor: isDark ? themeColors.border : '#EEE', borderWidth: 1 }
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
                                                    color={colors.textGray}
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
                customStyles={{
                    container: {
                        borderTopLeftRadius: 20,
                        borderTopRightRadius: 20,
                        backgroundColor: themeColors.background,
                    },
                    wrapper: { backgroundColor: 'rgba(0,0,0,0.6)' },
                    draggableIcon: { backgroundColor: colors.textGray },
                }}
            >
                <View style={styles.networkSheetInner}>
                    <AppText
                        weight={SEMI_BOLD}
                        type={EIGHTEEN}
                        style={{
                            ...styles.networkSheetTitle,
                            color: themeColors.text,
                        }}
                    >
                        Choose Network
                    </AppText>
                    <ScrollView
                        style={styles.networkSheetScroll}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {getActiveNetworkKeys(coinForNetworkSheet).map((chainKey: string, idx: number) => {
                            const minDep = limitForChain(coinForNetworkSheet?.min_deposit, chainKey);
                            const maxDep = limitForChain(coinForNetworkSheet?.max_deposit, chainKey);
                            const hasRange = minDep != null || maxDep != null;
                            return (
                                <TouchableOpacity
                                    key={`${chainKey}-${idx}`}
                                    style={[styles.networkCard, { borderColor: isDark ? themeColors.border : '#EEE' }]}
                                    onPress={() => handleNetworkChosenFromSheet(chainKey)}
                                    activeOpacity={0.75}
                                >
                                    <View style={styles.networkCardTitleRow}>
                                        <AppText
                                            weight={SEMI_BOLD}
                                            type={EIGHTEEN}
                                            style={{ color: themeColors.text }}
                                        >
                                            {chainKey}
                                        </AppText>
                                        <AppText
                                            type={FOURTEEN}
                                            color={colors.textGray}
                                            style={{ flex: 1, marginLeft: 8 }}
                                        >
                                            {coinForNetworkSheet?.name || coinForNetworkSheet?.short_name} ·{' '}
                                            {chainKey}
                                        </AppText>
                                    </View>
                                    <AppText type={TWELVE} color={colors.textGray} style={styles.networkCardLine}>
                                        1 block confirmation/s
                                    </AppText>
                                    <AppText type={TWELVE} color={colors.textGray} style={styles.networkCardLine}>
                                        {hasRange ? (
                                            <>
                                                Min. / max deposit: {minDep ?? '—'} - {maxDep ?? '—'}{' '}
                                                {coinForNetworkSheet?.short_name}
                                            </>
                                        ) : (
                                            <>
                                                Min. deposit &gt;0 {coinForNetworkSheet?.short_name}
                                            </>
                                        )}
                                    </AppText>
                                    <AppText type={TWELVE} color={colors.textGray} style={styles.networkCardLine}>
                                        Est. arrival ≈ 2 mins
                                    </AppText>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                    <View style={[styles.networkSheetNotice, {
                        backgroundColor: isDark ? colors.themeElevationColor : '#fff5ea',
                    }]}>
                        <FastImage source={INFO} style={styles.networkSheetNoticeIcon} resizeMode="contain" tintColor={isDark ? colors.white : colors.textGray} />
                        <AppText type={TWELVE} color={colors.textGray} style={{ flex: 1, lineHeight: 18 }}>
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
                customStyles={{
                    container: {
                        borderTopLeftRadius: 20,
                        borderTopRightRadius: 20,
                        backgroundColor: themeColors.background,
                    },
                    wrapper: { backgroundColor: 'rgba(0,0,0,0.6)' },
                    draggableIcon: { backgroundColor: colors.textGray },
                }}
            >
                <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20 }}>
                    <View style={styles.modalHeader}>
                        <AppText weight={SEMI_BOLD} type={SIXTEEN} style={{ color: themeColors.text }}>
                            Deposit help
                        </AppText>
                        <TouchableOpacity
                            onPress={() => selectCoinFaqSheetRef.current?.close()}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <AppText type={TWENTY} style={{ color: themeColors.text }}>
                                ×
                            </AppText>
                        </TouchableOpacity>
                    </View>
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
                                    { borderColor: colors.inputBorder },
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
                                        style={[styles.faqQuestion, { color: themeColors.secondaryText }] as any}
                                    >
                                        {item.title}
                                    </AppText>
                                    <FastImage
                                        source={faqActiveIndex === index ? upIcon : downIcon}
                                        resizeMode="contain"
                                        style={styles.faqArrow}
                                        tintColor={themeColors.secondaryText}
                                    />
                                </TouchableOpacity>
                                {faqActiveIndex === index && (
                                    <View style={styles.faqAnswer}>
                                        {item.content.split('\n').map((line: string, lineIndex: number) => (
                                            <AppText
                                                key={lineIndex}
                                                type={TWELVE}
                                                style={{ color: themeColors.secondaryText, lineHeight: 18 }}
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
                    <View style={{ borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0', paddingTop: 14, marginTop: 10 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', flexWrap: 'wrap' }}>
                            <AppText type={TWELVE} style={{ color: themeColors.secondaryText }}>
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
                customStyles={{
                    container: {
                        borderTopLeftRadius: 20,
                        borderTopRightRadius: 20,
                        backgroundColor: themeColors.background,
                    },
                    wrapper: { backgroundColor: 'rgba(0,0,0,0.6)' },
                    draggableIcon: { backgroundColor: colors.textGray },
                }}
            >
                <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20 }}>
                    <View style={styles.modalHeader}>
                        <AppText weight={SEMI_BOLD} type={FIFTEEN} style={{ color: themeColors.text }}>
                            More Info
                        </AppText>
                        <TouchableOpacity onPress={() => moreDetailsSheetRef.current?.close()}>
                            <AppText type={TWENTY} style={{ color: themeColors.text }}>×</AppText>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.detailsContainer}>
                        <View style={[styles.detailRow, {
                            borderBottomColor: isDark ? colors.secondaryText : lightTheme.inputBorder
                        }]}>
                            <AppText type={TWELVE} style={styles.modalLabel} color={themeColors.text}>
                                Minimum deposit
                            </AppText>
                            <AppText type={TWELVE} weight={SEMI_BOLD} style={styles.modalValueText} color={themeColors.text}>
                                {limitForChain(selectedCurrency?.min_deposit, selectedNetwork) ??
                                    '—'}{' '}
                                {selectedCurrency?.short_name}
                            </AppText>
                        </View>
                        <View style={[styles.detailRow, {
                            borderBottomColor: isDark ? colors.secondaryText : lightTheme.inputBorder
                        }]}>
                            <AppText type={TWELVE} style={styles.modalLabel} color={themeColors.text}>
                                Maximum deposit
                            </AppText>
                            <AppText type={TWELVE} weight={SEMI_BOLD} style={styles.modalValueText} color={themeColors.text}>
                                {limitForChain(selectedCurrency?.max_deposit, selectedNetwork) ??
                                    '—'}{' '}
                                {selectedCurrency?.short_name}
                            </AppText>
                        </View>
                        <View style={[styles.detailRow, {
                            borderBottomColor: isDark ? colors.secondaryText : lightTheme.inputBorder
                        }]}>
                            <AppText type={TWELVE} style={styles.modalLabel} color={themeColors.text}>
                                Wallet
                            </AppText>
                            <AppText type={TWELVE} weight={SEMI_BOLD} style={styles.modalValueText} color={themeColors.text}>
                                Spot Wallet
                            </AppText>
                        </View>
                        <View style={[styles.detailRow, {
                            borderBottomColor: isDark ? colors.secondaryText : lightTheme.inputBorder
                        }]}>
                            <AppText type={TWELVE} style={styles.modalLabel} color={themeColors.text}>
                                Credited (Trading enabled)
                            </AppText>
                            <AppText type={TWELVE} weight={SEMI_BOLD} style={styles.modalValueText} color={themeColors.text}>
                                After 2 network confirmations
                            </AppText>
                        </View>
                        <AppText type={TEN} color={colors.textGray} style={styles.warningText}>
                            • Do not send NFTs to this address{'\n'}• Do not transact with
                            Sanctioned Entities{'\n'}• This is {selectedNetwork} deposit address
                            type. Transferring to an unsupported network could result in loss of
                            deposit.
                        </AppText>
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
                customStyles={{
                    container: {
                        borderTopLeftRadius: 20,
                        borderTopRightRadius: 20,
                        backgroundColor: themeColors.background,
                    },
                    wrapper: { backgroundColor: 'rgba(0,0,0,0.6)' },
                    draggableIcon: { backgroundColor: colors.textGray },
                }}
            >
                <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20 }}>
                    <View style={styles.modalHeader}>
                        <AppText weight={SEMI_BOLD} type={SIXTEEN}>
                            Deposit Details
                        </AppText>
                        <TouchableOpacity onPress={() => depositDetailsSheetRef.current?.close()}>
                            <AppText type={TWENTY}>×</AppText>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.detailsContainer}>
                        <View style={[styles.detailRow, {
                            borderBottomColor: isDark ? colors.secondaryText : lightTheme.inputBorder
                        }]}>
                            <AppText type={FOURTEEN} color={themeColors.text} style={styles.modalLabel}>
                                Status
                            </AppText>
                            <AppText
                                type={FOURTEEN}
                                weight={SEMI_BOLD}
                                color={modalData?.status === 'SUCCESS' ? GREEN : themeColors.text}
                                style={styles.modalValue}
                            >
                                {modalData?.status === 'SUCCESS' ? 'Completed' : 'Pending'}
                            </AppText>
                        </View>
                        <View style={[styles.detailRow, {
                            borderBottomColor: isDark ? colors.secondaryText : lightTheme.inputBorder
                        }]}>
                            <AppText type={FOURTEEN} color={themeColors.text} style={styles.modalLabel}>
                                Date
                            </AppText>
                            <AppText
                                type={FOURTEEN}
                                weight={SEMI_BOLD}
                                color={themeColors.text}
                                style={styles.modalValue}
                            >
                                {moment(modalData?.updatedAt).format('DD-MM-YYYY hh:mm A')}
                            </AppText>
                        </View>
                        <View style={[styles.detailRow, {
                            borderBottomColor: isDark ? colors.secondaryText : lightTheme.inputBorder
                        }]}>
                            <AppText type={FOURTEEN} color={themeColors.text} style={styles.modalLabel}>
                                Coin
                            </AppText>
                            <AppText
                                type={FOURTEEN}
                                weight={SEMI_BOLD}
                                color={themeColors.text}
                                style={styles.modalValue}
                            >
                                {modalData?.short_name}
                            </AppText>
                        </View>
                        <View style={[styles.detailRow, {
                            borderBottomColor: isDark ? colors.secondaryText : lightTheme.inputBorder
                        }]}>
                            <AppText type={FOURTEEN} color={themeColors.text} style={styles.modalLabel}>
                                Deposit amount
                            </AppText>
                            <AppText
                                type={FOURTEEN}
                                weight={SEMI_BOLD}
                                color={themeColors.text}
                                style={styles.modalValue}
                            >
                                {modalData?.amount} {modalData?.short_name}
                            </AppText>
                        </View>
                        <View style={[styles.detailRow, {
                            borderBottomColor: isDark ? colors.secondaryText : lightTheme.inputBorder
                        }]}>
                            <AppText type={FOURTEEN} color={themeColors.text} style={styles.modalLabel}>
                                Network
                            </AppText>
                            <AppText
                                type={FOURTEEN}
                                weight={SEMI_BOLD}
                                color={themeColors.text}
                                style={styles.modalValue}
                            >
                                {modalData?.chain || 'Internal Transaction'}
                            </AppText>
                        </View>
                        <View style={[styles.detailRow, {
                            borderBottomColor: isDark ? colors.secondaryText : lightTheme.inputBorder
                        }]}>
                            <AppText type={FOURTEEN} color={themeColors.text} style={styles.modalLabel}>
                                From Address
                            </AppText>
                            <View style={[styles.addressRow, styles.modalValue]}>
                                <AppText
                                    type={FOURTEEN}
                                    weight={SEMI_BOLD}
                                    color={themeColors.text}
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
                                            tintColor={colors.textGray}
                                        />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                        <View style={[styles.detailRow, {
                            borderBottomColor: isDark ? colors.secondaryText : lightTheme.inputBorder
                        }]}>
                            <AppText type={FOURTEEN} color={themeColors.text} style={styles.modalLabel}>
                                Deposit Address
                            </AppText>
                            <View style={[styles.addressRow, styles.modalValue]}>
                                <AppText
                                    type={FOURTEEN}
                                    weight={SEMI_BOLD}
                                    color={themeColors.text}
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
                                            tintColor={colors.textGray}
                                        />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                        <View style={[styles.detailRow, {
                            borderBottomColor: isDark ? colors.secondaryText : lightTheme.inputBorder
                        }]}>
                            <AppText type={FOURTEEN} color={themeColors.text} style={styles.modalLabel}>
                                TxID
                            </AppText>
                            <View style={[styles.addressRow, styles.modalValue]}>
                                <AppText
                                    type={FOURTEEN}
                                    weight={SEMI_BOLD}
                                    color={themeColors.text}
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
                                            tintColor={colors.textGray}
                                        />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                        <View style={[styles.detailRow, {
                            borderBottomColor: isDark ? colors.secondaryText : lightTheme.inputBorder
                        }]}>
                            <AppText type={FOURTEEN} color={themeColors.text} style={styles.modalLabel}>
                                Deposit wallet
                            </AppText>
                            <AppText
                                type={FOURTEEN}
                                weight={SEMI_BOLD}
                                color={themeColors.text}
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
                customStyles={{
                    container: {
                        borderTopLeftRadius: 20,
                        borderTopRightRadius: 20,
                        backgroundColor: themeColors.background,
                    },
                    wrapper: { backgroundColor: 'rgba(0,0,0,0.6)' },
                    draggableIcon: { backgroundColor: colors.textGray },
                }}
            >
                <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20 }}>
                    <View style={styles.modalHeader}>
                        <View style={styles.confirmedHeader}>
                            <AppText weight={SEMI_BOLD} type={SIXTEEN}>
                                Deposit Processing
                            </AppText>
                            <AppText type={TWENTY} color={GREEN}>
                                ✓
                            </AppText>
                        </View>
                        <TouchableOpacity onPress={() => depositConfirmedSheetRef.current?.close()}>
                            <AppText type={TWENTY}>×</AppText>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.detailsContainer}>
                        <View style={styles.stepContainer}>
                            <AppText weight={SEMI_BOLD} type={FOURTEEN}>
                                Deposit order submitted
                            </AppText>
                            <AppText type={TEN} color={colors.textGray}>
                                {moment(modalData.createdAt).format('DD-MM-YYYY hh:mm A')}
                            </AppText>
                        </View>
                        <View style={styles.stepContainer}>
                            <AppText weight={SEMI_BOLD} type={FOURTEEN}>
                                System processing
                            </AppText>
                            <AppText type={TEN} color={colors.textGray}>
                                {moment(modalData.createdAt).format('DD-MM-YYYY hh:mm A')}
                            </AppText>
                        </View>
                        <View style={styles.stepContainer}>
                            <AppText weight={SEMI_BOLD} type={FOURTEEN}>
                                Deposit completed
                            </AppText>
                            <AppText type={TEN} color={colors.textGray}>
                                ----
                            </AppText>
                        </View>
                        <View style={[styles.detailRow, {
                            borderBottomColor: isDark ? colors.secondaryText : lightTheme.inputBorder
                        }]}>
                            <AppText type={FOURTEEN}>Status</AppText>
                            <AppText type={FOURTEEN} weight={SEMI_BOLD} color={YELLOW}>
                                Pending
                            </AppText>
                        </View>
                        <View style={[styles.detailRow, {
                            borderBottomColor: isDark ? colors.secondaryText : lightTheme.inputBorder
                        }]}>
                            <AppText type={FOURTEEN}>Coin</AppText>
                            <AppText type={FOURTEEN} weight={SEMI_BOLD}>
                                {modalData?.short_name}
                            </AppText>
                        </View>
                        <View style={[styles.detailRow, {
                            borderBottomColor: isDark ? colors.secondaryText : lightTheme.inputBorder
                        }]}>
                            <AppText type={FOURTEEN}>Deposited amount</AppText>
                            <AppText type={FOURTEEN} weight={SEMI_BOLD}>
                                {modalData?.amount}
                            </AppText>
                        </View>
                        <View style={[styles.detailRow, {
                            borderBottomColor: isDark ? colors.secondaryText : lightTheme.inputBorder
                        }]}>
                            <AppText type={FOURTEEN}>Network</AppText>
                            <AppText type={FOURTEEN} weight={SEMI_BOLD}>
                                {modalData?.chain}
                            </AppText>
                        </View>
                        <View style={[styles.detailRow, {
                            borderBottomColor: isDark ? colors.secondaryText : lightTheme.inputBorder
                        }]}>
                            <AppText type={FOURTEEN}>TxID</AppText>
                            <AppText type={FOURTEEN} weight={SEMI_BOLD}>
                                {modalData?.shortTxHash?.trim() || '----'}
                            </AppText>
                        </View>
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
        paddingBottom: 110,
    },
    depositQrCenter: {
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 10,
    },
    depositQrCard: {
        backgroundColor: '#FFFFFF',
        padding: 10,
        borderRadius: 0,
        // borderWidth: 1,
    },
    depositQrHint: {
        marginTop: 10,
    },
    depositEmptyWrap: {
        paddingTop: 6,
        paddingBottom: 10,
        alignItems: 'center',
    },
    depositEmptyTitle: {
        alignSelf: 'flex-start',
        marginBottom: 10,
        marginTop: 10
    },
    depositEmptyBtn: {
        width: '100%',
        borderRadius: 24,
        height: 44,
        maxWidth: 320,
        alignSelf: 'center',
        marginTop: 10
    },
    depositEmptyCardTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    depositEmptyCoinRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
        minWidth: 0,
    },
    depositEmptyCoinIcon: {
        width: 28,
        height: 28,
        borderRadius: 14,
    },
    depositEmptyCoinIconPlaceholder: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.textGray,
        opacity: 0.25,
    },
    depositEmptyDivider: {
        height: 1,
        backgroundColor: lightTheme.input,
        opacity: 0.5,
        marginTop: 10,
        marginBottom: 10,
    },
    depositEmptyNetworkBlock: {
        width: '100%',
        flexDirection: "row",
        justifyContent: "space-between", alignItems: "center"
    },
    depositInfoCard: {
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 5,
        marginBottom: 8,
        width: "100%",
        marginTop: 8,
        backgroundColor: 'transparent'
    },
    depositInfoRowHead: {
        marginBottom: 6,
    },
    depositNetworkRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    depositAddressHeadRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    depositAddressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    depositCopyBtn: {
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
        bottom: 5
    },
    depositMoreDetailsCenter: {
        alignItems: 'center',
        marginTop: 8,
        marginBottom: 6,
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
    sectionTitle: {
        marginBottom: 6,
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
        padding: 10,
        marginBottom: 10,
        borderRadius: 8,
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
        paddingVertical: 6,
        paddingHorizontal: 2,
        gap: 8,
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
        marginTop: 10,
        lineHeight: 16,
    },
    stepContainer: {
        paddingVertical: 10,
        borderBottomWidth: 1,
    },
    headerView: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 8,
        paddingHorizontal: 16,
        paddingBottom: 4,
    },
    selectCoinPhase: {
        flex: 1,

        paddingHorizontal: 16,
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
        paddingVertical: 8,
        fontSize: 15,
    },
    sectionListContent: {
        paddingTop: 2,
        paddingBottom: 24,
    },
    sectionListContentWithIndex: {
        paddingRight: 22,
    },
    depositSectionHeader: {
        paddingTop: 8,
        paddingBottom: 2,
    },
    depositHistoryChipsSection: {
        marginBottom: 12,
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
        gap: 10,
        paddingRight: 8,
    },
    depositRecentChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 16,
        gap: 6,
        borderWidth: 1,
    },
    depositRecentChipIcon: {
        width: 24,
        height: 24,
        borderRadius: 12,
    },
    trendingBlock: {
        marginBottom: 2,
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
        backgroundColor: 'rgba(0,0,0,0.38)',
    },
    alphabetBubbleDark: {
        backgroundColor: 'rgba(255,255,255,0.12)',
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
        lineHeight: 10,
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
        marginBottom: 12,
    },
    networkSheetScroll: {
        maxHeight: SHEET_HEIGHT - 168,
    },
    networkCard: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
    },
    networkCardTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        marginBottom: 8,
    },
    networkCardLine: {
        marginTop: 4,
    },
    networkSheetNotice: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: 12,
        borderRadius: 10,
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

