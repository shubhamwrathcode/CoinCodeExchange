import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type PasskeyDeviceInfo = {
  browser: string;
  os: string;
};

const LOCAL_PASSKEY_DEVICE_INFO_KEY = 'passkey_local_device_info_v1';

export type LocalPasskeyDeviceInfoMap = Record<string, PasskeyDeviceInfo>;

const logPasskey = (...args: unknown[]) => {
  console.log('[Passkey]', ...args);
};

export const getLocalPasskeyDeviceInfoMap = async (): Promise<LocalPasskeyDeviceInfoMap> => {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_PASSKEY_DEVICE_INFO_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

export const saveLocalPasskeyDeviceInfo = async (
  passkeyId: string,
  deviceInfo: PasskeyDeviceInfo,
): Promise<void> => {
  if (!passkeyId) return;
  try {
    const map = await getLocalPasskeyDeviceInfoMap();
    map[String(passkeyId)] = deviceInfo;
    await AsyncStorage.setItem(LOCAL_PASSKEY_DEVICE_INFO_KEY, JSON.stringify(map));
    logPasskey('[LocalCache] saved deviceInfo for passkey', passkeyId, deviceInfo);
  } catch (error) {
    logPasskey('[LocalCache] save failed', error);
  }
};

export const isWeakBackendDeviceInfo = (deviceInfo?: Partial<PasskeyDeviceInfo> | null): boolean => {
  const browser = String(deviceInfo?.browser || '').trim().toLowerCase();
  const os = String(deviceInfo?.os || '').trim().toLowerCase();
  if (!browser && !os) return true;
  if (browser === 'unknown' && os === 'unknown') return true;
  if (browser === 'chrome' && os.includes('linux')) return true;
  return false;
};

export const resolvePasskeyDeviceInfo = (
  passkey: { _id?: string; id?: string; deviceInfo?: Partial<PasskeyDeviceInfo> | null },
  localMap: LocalPasskeyDeviceInfoMap = {},
): Partial<PasskeyDeviceInfo> | null | undefined => {
  const passkeyId = String(passkey._id || passkey.id || '');
  const localInfo = passkeyId ? localMap[passkeyId] : undefined;
  if (localInfo && isWeakBackendDeviceInfo(passkey.deviceInfo)) {
    return localInfo;
  }
  return passkey.deviceInfo;
};

/** Prefer locally cached mobile deviceInfo when backend UA parsing is wrong/missing. */
export const mergePasskeyListWithLocalDeviceInfo = async <T extends { _id?: string; id?: string; deviceInfo?: Partial<PasskeyDeviceInfo> | null }>(
  passkeys: T[],
): Promise<T[]> => {
  const localMap = await getLocalPasskeyDeviceInfoMap();
  if (!Object.keys(localMap).length) return passkeys;

  return passkeys.map((pk) => {
    const passkeyId = String(pk._id || pk.id || '');
    const localInfo = localMap[passkeyId];
    if (!localInfo) return pk;
    if (!isWeakBackendDeviceInfo(pk.deviceInfo)) return pk;
    logPasskey('[LocalCache] using cached deviceInfo for passkey', passkeyId, localInfo);
    return { ...pk, deviceInfo: localInfo };
  });
};

/** Device metadata for passkey registration — backend parses browser User-Agent on web; mobile must send this explicitly. */
export const getMobilePasskeyDeviceInfo = (): PasskeyDeviceInfo => {
  try {
    const appName = DeviceInfo.getApplicationName() || 'AGCE';
    const systemName = DeviceInfo.getSystemName();
    const systemVersion = DeviceInfo.getSystemVersion();
    const model = DeviceInfo.getModel();
    const brand = DeviceInfo.getBrand();

    const browser = `${appName} App`;
    let os = `${systemName} ${systemVersion}`.trim();

    if (Platform.OS === 'android' && brand && model) {
      os = `${brand} ${model} • Android ${systemVersion}`;
    } else if (Platform.OS === 'ios' && model) {
      os = `${model} • iOS ${systemVersion}`;
    }

    const deviceInfo = { browser, os };

    logPasskey('[DeviceInfo] built from react-native-device-info', {
      platform: Platform.OS,
      appName,
      brand,
      model,
      systemName,
      systemVersion,
      deviceInfo,
    });

    return deviceInfo;
  } catch (error) {
    const fallback = {
      browser: 'Mobile App',
      os: Platform.OS === 'ios' ? 'iOS' : 'Android',
    };
    logPasskey('[DeviceInfo] fallback used', { error, fallback });
    return fallback;
  }
};

/**
 * App-specific User-Agent — do NOT mimic Chrome/Linux strings or backend UA parser shows "Chrome • Linux".
 */
export const getMobilePasskeyUserAgent = (): string => {
  try {
    const appName = DeviceInfo.getApplicationName() || 'AGCE';
    const version = DeviceInfo.getVersion();
    const systemName = DeviceInfo.getSystemName();
    const systemVersion = DeviceInfo.getSystemVersion();
    const model = DeviceInfo.getModel();
    const brand = DeviceInfo.getBrand();
    const ua = `${appName}/${version} (${Platform.OS}; ${brand} ${model}; ${systemName} ${systemVersion})`;

    logPasskey('[User-Agent] built', ua);
    return ua;
  } catch (error) {
    const fallback = `AGCE/${Platform.OS}`;
    logPasskey('[User-Agent] fallback used', { error, fallback });
    return fallback;
  }
};

export const formatPasskeyDeviceLabel = (deviceInfo?: Partial<PasskeyDeviceInfo> | null): string => {
  const browser = deviceInfo?.browser?.trim();
  const os = deviceInfo?.os?.trim();
  const hasBrowser = !!browser && browser.toLowerCase() !== 'unknown';
  const hasOs = !!os && os.toLowerCase() !== 'unknown';

  if (hasBrowser && hasOs) return `${browser} • ${os}`;
  if (hasBrowser) return browser!;
  if (hasOs) return os!;
  return 'Unknown • Unknown';
};

export const isVerifyPasskeyRegistrationSuccess = (verifyResult: unknown): boolean => {
  if (verifyResult === true) return true;
  if (verifyResult && typeof verifyResult === 'object' && (verifyResult as { success?: boolean }).success === true) {
    return true;
  }
  return false;
};

export const extractPasskeyIdFromVerifyResult = (verifyResult: unknown): string | null => {
  if (!verifyResult || typeof verifyResult !== 'object') return null;
  const result = verifyResult as { passkeyId?: string; data?: { id?: string; _id?: string } };
  const id = result.passkeyId || result.data?.id || result.data?._id;
  return id ? String(id) : null;
};

export const findNewestPasskeyId = (
  passkeys: Array<{ _id?: string; id?: string; createdAt?: string }> = [],
): string | null => {
  if (!passkeys.length) return null;
  const sorted = [...passkeys].sort((a, b) => {
    const ta = new Date(a.createdAt || 0).getTime();
    const tb = new Date(b.createdAt || 0).getTime();
    return tb - ta;
  });
  const id = sorted[0]?._id || sorted[0]?.id;
  return id ? String(id) : null;
};

/** Fix passkeys saved with bad backend UA (Chrome/Linux, Unknown) by caching this phone's info locally. */
export const repairUncachedWeakPasskeys = async <
  T extends { _id?: string; id?: string; deviceInfo?: Partial<PasskeyDeviceInfo> | null },
>(
  passkeys: T[] = [],
): Promise<LocalPasskeyDeviceInfoMap> => {
  const map = await getLocalPasskeyDeviceInfoMap();
  const deviceInfo = getMobilePasskeyDeviceInfo();
  let changed = false;

  passkeys.forEach((pk) => {
    const passkeyId = String(pk._id || pk.id || '');
    if (!passkeyId || map[passkeyId]) return;
    if (!isWeakBackendDeviceInfo(pk.deviceInfo)) return;
    map[passkeyId] = deviceInfo;
    changed = true;
    logPasskey('[LocalCache] repaired weak backend deviceInfo for', passkeyId, deviceInfo);
  });

  if (changed) {
    await AsyncStorage.setItem(LOCAL_PASSKEY_DEVICE_INFO_KEY, JSON.stringify(map));
  }

  return map;
};
