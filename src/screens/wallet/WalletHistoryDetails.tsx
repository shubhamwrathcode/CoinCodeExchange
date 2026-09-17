import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { AppText } from '../../shared';
import { useAppSelector } from '../../store/hooks';
import FastImage from 'react-native-fast-image';
import {
  back_ic,
  cancelcheck,
  pendingCheck,
  copyIcon,
  successcheck,
} from '../../helper/ImageAssets';
import NavigationService from '../../navigation/NavigationService';
import { colors } from '../../theme/colors';
import { useTheme } from '../../hooks/useTheme';
import {
  dateFormatter,
  depositWithdrawColor,
  toFixedThree,
  twoFixedTwo,
  copyText,
} from '../../helper/utility';
import moment from 'moment';
import { fontFamilySemiBold } from '../../theme/typography';

const formatDateTime = (dateString: string | undefined) => {
  if (!dateString) return '---';
  return moment(dateString).format('YYYY-MM-DD HH:mm:ss');
};

const WalletHistoryDetails = () => {
  const route = useRoute();
  const { colors: themeColors, isDark } = useTheme();
  const selectedWalletHistory = useAppSelector(
    state => state.wallet.selectedWalletHistory,
  );
  const item = (route?.params as { item?: Record<string, unknown> })?.item ?? selectedWalletHistory ?? {};
  const row = (key: string) => (item as Record<string, unknown>)?.[key];

  const status = String(row('status') ?? '');
  const amount = row('amount');
  const createdAt = row('createdAt');
  const currency = row('currency') ?? row('short_name');
  const currency_id = row('currency_id');
  const fee = row('fee');
  const chain = row('chain');
  const from_address = row('from_address');
  const to_address = row('to_address');
  const transaction_number = row('transaction_number') ?? row('transaction_hash');
  const short_name = row('short_name');
  const transaction_type = row('transaction_type');
  const description = row('description');

  const isSuccess = status === 'SUCCESS' || status === 'COMPLETED';
  const isFailed = status === 'FAILED' || status === 'CANCELLED' || status === 'CANCELED' || status === 'REJECTED';
  const isPending = !isSuccess && !isFailed;

  const textColor = themeColors.text;
  const labelColor = themeColors.secondaryText;
  const title = String(transaction_type || 'Transaction') || 'Wallet History';

  const truncateHash = (str: string | undefined | null) => {
    if (!str) return undefined;
    const s = String(str);
    if (s.length <= 8) return s;
    return `${s.substring(0, 5)}...${s.substring(s.length - 3)}`;
  };

  const Row = ({
    label,
    value,
    valueColor,
    numberOfValueLines = 1,
    copyable = false,
    originalValueForCopy = '',
  }: {
    label: string;
    value: string | number | undefined;
    valueColor?: string;
    numberOfValueLines?: number;
    copyable?: boolean;
    originalValueForCopy?: string;
  }) => (
    <View style={[styles.row, numberOfValueLines > 1 && styles.rowMultiline]}>
      <AppText
        style={StyleSheet.flatten([styles.label, { color: labelColor }])}
      >
        {label}
      </AppText>
      {copyable ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', flex: 1 }}>
          <TouchableOpacity onPress={() => copyText(originalValueForCopy)} style={{ marginRight: 8, padding: 4 }}>
            <FastImage source={copyIcon} style={{ width: 14, height: 14 }} tintColor={labelColor} resizeMode="contain" />
          </TouchableOpacity>
          <AppText
            style={StyleSheet.flatten([
              styles.value,
              { flex: 0, color: valueColor ?? textColor },
              numberOfValueLines > 1 && styles.valueMultiline,
            ])}
            numberOfLines={numberOfValueLines}>
            {value != null && value !== '' ? String(value) : '---'}
          </AppText>
        </View>
      ) : (
        <AppText
          style={StyleSheet.flatten([
            styles.value,
            { color: valueColor ?? textColor },
            numberOfValueLines > 1 && styles.valueMultiline,
          ])}
          numberOfLines={numberOfValueLines}>
          {value != null && value !== '' ? String(value) : '---'}
        </AppText>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View
        style={[
          styles.header,
          { borderBottomColor: themeColors.border },
        ]}>
        <TouchableOpacity
          onPress={() => NavigationService.goBack()}
          style={styles.headerBtn}>
          <FastImage
            source={back_ic}
            style={styles.backIcon}
            resizeMode="contain"
            tintColor={themeColors.text}
          />
        </TouchableOpacity>
        <AppText style={[styles.headerTitle, { color: themeColors.text }]} numberOfLines={1}>
          {title}
        </AppText>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.statusBlock}>
          <View
            style={[
              styles.statusCircle,
              {
                borderWidth: 1,
                borderColor: isSuccess
                  ? colors.green
                  : isFailed
                    ? colors.red
                    : colors.lightYellow,
              },
            ]}>
            {isSuccess && (
              <FastImage
                source={successcheck}
                style={{ width: 40, height: 40 }}
                resizeMode="contain"
              />
            )}
            {isFailed && (
              <FastImage
                source={cancelcheck}
                style={styles.statusCircleIcon}
                resizeMode="contain"
              />
            )}
            {isPending && (
              <FastImage
                source={pendingCheck}
                style={{ width: 30, height: 30 }}
                resizeMode="contain"
              />
            )}
          </View>
          <AppText
            style={StyleSheet.flatten([
              styles.statusText,
              {
                color: isSuccess
                  ? colors.green
                  : isFailed
                    ? colors.red
                    : colors.lightYellow,
              },
            ])}>
            {isSuccess ? 'Success' : isFailed ? 'Failed' : status || 'Pending'}
          </AppText>
        </View>

        <View style={styles.block}>
          <Row
            label="Status"
            value={status}
            valueColor={
              status && (status.toUpperCase() === 'SUCCESS' || status.toUpperCase() === 'COMPLETED')
                ? colors.green
                : status && status.toUpperCase() === 'REJECTED'
                  ? colors.red
                  : depositWithdrawColor(status)
            }
          />
          <Row
            label="Amount"
            value={amount != null ? twoFixedTwo(Number(amount)) : undefined}
          />
          <Row label="Date & Time" value={createdAt ? dateFormatter(String(createdAt)) : undefined} />
          <Row label="Currency" value={String(currency ?? '')} />
          {currency_id != null && String(currency_id) !== '' && (
            <Row label="Currency ID" value={String(currency_id)} />
          )}
          <Row
            label="Transaction Fee"
            value={fee != null ? toFixedThree(Number(fee)) : undefined}
          />
          <Row label="Chain" value={String(chain ?? '')} />
          <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
          {from_address != null && String(from_address) !== '' && (
            <Row
              label="From Address"
              value={String(from_address)}
              numberOfValueLines={2}
            />
          )}
          <Row label="Short Name" value={String(short_name ?? '')} />

          {to_address != null && String(to_address) !== '' && (
            <Row
              label="To Address"
              value={String(to_address)}
              numberOfValueLines={2}
            />
          )}
          <Row
            label="Transaction No. / Tx Hash"
            value={truncateHash(transaction_number as string)}
            copyable={transaction_number != null && String(transaction_number) !== ''}
            originalValueForCopy={String(transaction_number)}
            numberOfValueLines={1}
          />
          <Row
            label="Transaction Type"
            value={String(transaction_type ?? '')}
            valueColor={textColor}
          />
          {/* {(description != null && String(description) !== '') && (
            <Row
              label="Remarks"
              value={String(description)}
              numberOfValueLines={3}
            />
          )} */}
        </View>
        <AppText style={StyleSheet.flatten([styles.noMoreData, { color: labelColor }])}>
          No more data
        </AppText>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerBtn: {
    padding: 8,
    minWidth: 40,
  },
  backIcon: {
    width: 20,
    height: 20,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: fontFamilySemiBold,
    flex: 1,
    textAlign: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 21,
    paddingTop: 16,
    paddingBottom: 32,
  },
  statusBlock: {
    alignItems: 'center',
    marginBottom: 24,
  },
  statusCircle: {
    width: 50,
    height: 50,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statusCircleIcon: {
    width: 40,
    height: 40,
  },
  statusText: {
    fontSize: 15,
    fontFamily: fontFamilySemiBold,
  },
  block: {
    borderRadius: 12,
    padding: 5,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  rowMultiline: {
    alignItems: 'flex-start',
  },
  label: {
    fontSize: 12,
    flex: 1,
  },
  value: {
    fontSize: 12,
    flex: 1,
    textAlign: 'right',
  },
  valueMultiline: {
    textAlign: 'right',
    flexShrink: 1,
    maxWidth: '70%',
  },
  divider: {
    height: 1,
    opacity: 0.3,
    marginVertical: 12,
  },
  noMoreData: {
    textAlign: 'center',
    fontSize: 12,
  },
});

export default WalletHistoryDetails;
