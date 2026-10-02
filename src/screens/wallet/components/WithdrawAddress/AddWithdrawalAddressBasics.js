import React, { useMemo } from "react";
import { View, TextInput, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { Check, ChevronDown, FileCheck, FileText, FingerprintPattern, Globe, House, Landmark, LockKeyhole, Mail, ShieldCheck, Smartphone, User, UserKey, Wallet } from "lucide-react-native";
import { AppText, FOURTEEN, TWELVE, MEDIUM, SIXTEEN, SEMI_BOLD, THIRTEEN, BOLD, TEN, ELEVEN, Input, FIFTEEN } from "../../../../shared";
import { colors } from "../../../../theme/colors";
import FastImage from "react-native-fast-image";
import { buildMarketIconIndex, CHAIN_NATIVE_SYMBOLS, withMarketCoinIcon } from "../../../../helper/walletCoinIcon";
import { useAppSelector } from "../../../../store/hooks";
import DepositCoinIcon, { buildDepositCoinIconUri } from "../../DepositCoinIcon";
import { blurSheetTheme } from "../../sheets/BlurSheetChrome";

const getSheetFormUi = (isDark) => {
  const sheet = blurSheetTheme(isDark);
  return {
    accent: colors.cyanTheme,
    accentBg: isDark ? "rgba(10, 168, 197, 0.10)" : "rgba(10, 168, 197, 0.08)",
    inputBg: sheet.cardBg,
    dropdownBg: sheet.cardBg,
    border: sheet.borderColor,
    rowBorder: sheet.rowBorderColor,
    accentIconBg: isDark ? "rgba(10, 168, 197, 0.15)" : "rgba(10, 168, 197, 0.12)",
    neutralIconBg: isDark ? "rgba(255, 255, 255, 0.08)" : "#ECEEF1",
    radioDot: isDark ? "#0B0E11" : "#FFFFFF",
    danger: "#EF4444",
    success: "#22C55E",
    fieldBg: isDark ? "rgba(0, 0, 0, 0.22)" : "#FFFFFF",
  };
};

const SheetNotice = ({ ui, themeColors, title, tone = "danger", children }) => {
  const toneColor = tone === "success" ? ui.success : ui.danger;
  return (
    <View style={[styles.noticeCard, { backgroundColor: ui.inputBg, borderLeftColor: toneColor }]}>
      <View style={[styles.noticeIcon, tone === "success" && styles.noticeIconSuccess]}>
        {tone === "success" ? (
          <ShieldCheck size={12} strokeWidth={2.2} color={toneColor} />
        ) : (
          <AppText weight={BOLD} style={{ color: toneColor, fontSize: 11, lineHeight: 13 }}>!</AppText>
        )}
      </View>
      <View style={{ flex: 1 }}>
        {!!title && (
          <AppText type={THIRTEEN} weight={SEMI_BOLD} style={{ color: toneColor, marginBottom: 2 }}>{title}</AppText>
        )}
        <AppText type={TWELVE} style={{ color: themeColors.secondaryText, lineHeight: 20 }}>
          {children}
        </AppText>
      </View>
    </View>
  );
};

const SheetFieldLabel = ({ ui, themeColors, Icon, label }) => (
  <View style={styles.fieldLabelRow}>
    <Icon size={15} strokeWidth={2} color={ui.accent} />
    <AppText type={THIRTEEN} weight={MEDIUM} style={{ color: themeColors.text }}>{label}</AppText>
  </View>
);

const SheetOptionCard = ({ ui, themeColors, Icon, label, sub, isSelected, onPress, indicator = "radio", disabled }) => (
  <TouchableOpacity
    activeOpacity={0.8}
    onPress={onPress}
    disabled={disabled}
    style={[
      styles.optionCard,
      {
        backgroundColor: isSelected ? ui.accentBg : ui.inputBg,
        borderColor: isSelected ? ui.accent : ui.border,
      }
    ]}
  >
    <View style={[styles.optionIcon, { backgroundColor: isSelected ? ui.accentIconBg : ui.neutralIconBg }]}>
      <Icon size={20} strokeWidth={1.8} color={isSelected ? ui.accent : themeColors.secondaryText} />
    </View>
    <View style={{ flex: 1, marginRight: 12 }}>
      <AppText type={SIXTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text }}>{label}</AppText>
      {!!sub && <AppText type={THIRTEEN} style={{ color: themeColors.secondaryText, marginTop: 4, lineHeight: 18 }}>{sub}</AppText>}
    </View>
    {indicator === "checkbox" ? (
      <View style={[
        styles.checkboxOuter,
        isSelected
          ? { backgroundColor: ui.accent, borderColor: ui.accent }
          : { borderColor: themeColors.secondaryText }
      ]}>
        {isSelected && <Check size={14} strokeWidth={3} color={colors.white} />}
      </View>
    ) : (
      <View style={[
        styles.radioOuter,
        isSelected
          ? { backgroundColor: ui.accent, borderColor: ui.accent }
          : { borderColor: themeColors.secondaryText }
      ]}>
        {isSelected && <View style={[styles.radioInner, { backgroundColor: ui.radioDot }]} />}
      </View>
    )}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  noticeCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#EF4444",
    marginBottom: 20,
  },
  noticeIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    marginTop: 1,
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  checkboxOuter: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  noticeIconSuccess: {
    backgroundColor: "rgba(34, 197, 94, 0.18)",
  },
  fieldGroup: {
    marginBottom: 18,
  },
  fieldLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  fieldBox: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  fieldBoxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  fieldBoxMultiline: {
    height: undefined,
    minHeight: 130,
    justifyContent: "flex-start",
    paddingTop: 14,
    paddingBottom: 14,
  },
  fieldInput: {
    fontSize: 14,
    padding: 0,
  },
  fieldInputMultiline: {
    minHeight: 100,
  },
});

const AddWithdrawalAddressBasics = ({
  isDark,
  themeColors,
  userData,
  saveAddrStep,
  saveAddrLabel,
  setSaveAddrLabel,
  saveAddrCoin,
  setSaveAddrCoin,
  withdrawCoins,
  saveAddrCoinOpen,
  setSaveAddrCoinOpen,
  saveAddrAddress,
  setSaveAddrAddress,
  saveAddrAddressTouched,
  setSaveAddrAddressTouched,
  saveAddrAddressValidating,
  saveAddrAddressValidError,
  saveAddrAddressInlineError,
  validateSaveAddrAddressApiRef,
  saveAddrNetwork,
  setSaveAddrNetwork,
  saveAddrNetworkOpen,
  setSaveAddrNetworkOpen,
  CHAIN_FULL_NAMES,
  saveAddrMemo,
  setSaveAddrMemo,
  saveAddrProofMethod,
  setSaveAddrProofMethod,
  saveAddrBenFullName,
  setSaveAddrBenFullName,
  saveAddrBenPan,
  setSaveAddrBenPan,
  saveAddrBenCountry,
  setSaveAddrBenCountry,
  saveAddrBenPin,
  setSaveAddrBenPin,
  saveAddrBenAddress,
  saveAddrCountrySheetRef,
  setSaveAddrBenAddress,
  saveAddrVerifyOptions,
  selectedSaveAddrVerifyMethod,
  setSelectedSaveAddrVerifyMethod,
  getWithdrawNetworksOrStaticFallback,
  saveAddrOwnership,
  setSaveAddrOwnership,
  saveAddrWalletType,
  setSaveAddrWalletType,
  saveAddrExchange,
  setSaveAddrExchange,
  saveAddrExchangeSearch,
  setSaveAddrExchangeSearch,
  saveAddrExchangeOpen,
  setSaveAddrExchangeOpen,
  ADDRESS_BOOK_TOP_EXCHANGES,
  ADDRESS_BOOK_EXCHANGE_OTHER,
  saveAddrExchangeManual,
  setSaveAddrExchangeManual,
  saveAddrDeclarationAccepted,
  setSaveAddrDeclarationAccepted,
  ADDRESS_BOOK_DECLARATION_TEXT,
  upIcon,
  downIcon,
  checkIc,
  SECURITY_SHEIELD,
  EMAIL_VERIFY,
  PHONE_VERIFY,
  GOOGLE_VERIFY,
  PASSKEY_VERIFY,
}) => {
  const coinData = useAppSelector((state) => state.home.coinData);
  const marketIconBySymbol = useMemo(() => buildMarketIconIndex(coinData), [coinData]);
  const coinIconUri = (coin) => buildDepositCoinIconUri(withMarketCoinIcon(coin, marketIconBySymbol));
  const chainIconUri = (chainKey) => {
    const code = String(chainKey || "").trim().toUpperCase();
    const candidates = CHAIN_NATIVE_SYMBOLS[code] || [code];
    for (const sym of candidates) {
      const listed = (withdrawCoins || []).find((c) => String(c?.short_name || "").trim().toUpperCase() === sym);
      const uri = coinIconUri(listed || { short_name: sym });
      if (uri) return uri;
    }
    return null;
  };

  if (saveAddrStep !== "form" && saveAddrStep !== "owner" && saveAddrStep !== "other_identity" && saveAddrStep !== "wallet_type" && saveAddrStep !== "proof_select" && saveAddrStep !== "exchange" && saveAddrStep !== "verify_method") return null;

  const ui = getSheetFormUi(isDark);

  // Web parity: compute display name from the actual networks list
  const saveAddrNetworkDisplay = (() => {
    if (!saveAddrNetwork) return "";
    const coin = (withdrawCoins || []).find(c => (c.short_name || c.coin || "").toUpperCase() === String(saveAddrCoin || "").toUpperCase());
    if (coin) {
      const nets = getWithdrawNetworksOrStaticFallback(coin);
      const match = nets.find(n => n.code === saveAddrNetwork);
      if (match?.label) return match.label;
    }
    return CHAIN_FULL_NAMES[saveAddrNetwork] || saveAddrNetwork;
  })();

  return (
    <View style={{ flex: 1 }}>
      {saveAddrStep === "form" && (
        <View>
          <View style={{ marginBottom: 16 }}>
            <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text, marginBottom: 8 }}>Label</AppText>
            <View style={{
              backgroundColor: ui.inputBg,
              borderRadius: 9,
              paddingHorizontal: 16,
              height: 48,
              justifyContent: "center",
              borderWidth: isDark ? 0 : 0,
              borderColor: isDark ? themeColors.border : "transparent"
            }}>
              <TextInput
                placeholder="4-20 characters"
                placeholderTextColor="#84888C"
                selectionColor={ui.accent + "40"}
                cursorColor={ui.accent}
                style={{ color: themeColors.text, fontSize: 14, padding: 0 }}
                value={saveAddrLabel}
                onChangeText={setSaveAddrLabel}
              />
            </View>
          </View>

          <View style={{ marginBottom: 16 }}>
            <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text, marginBottom: 8 }}>Coin</AppText>
            <TouchableOpacity
              onPress={() => {
                setSaveAddrNetworkOpen(false);
                setSaveAddrCoinOpen(!saveAddrCoinOpen);
              }}
              style={{
                backgroundColor: ui.inputBg,
                borderRadius: 9,
                paddingHorizontal: 16,
                height: 48,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                borderWidth: 0,
                borderColor: isDark ? themeColors.border : "transparent"
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                {!!saveAddrCoin && (
                  <View style={{ marginRight: 8 }}>
                    <DepositCoinIcon
                      uri={coinIconUri(withdrawCoins.find(c => c.short_name === saveAddrCoin) || { short_name: saveAddrCoin })}
                      size={20}
                    />
                  </View>
                )}
                <AppText type={FOURTEEN} style={{ color: saveAddrCoin ? themeColors.text : "#84888C" }}>
                  {saveAddrCoin ? saveAddrCoin : "Select Coin"}
                </AppText>
              </View>
              <FastImage
                source={saveAddrCoinOpen ? upIcon : downIcon}
                style={{ width: 12, height: 12 }}
                tintColor={themeColors.secondaryText}
                resizeMode="contain"
              />
            </TouchableOpacity>
            {saveAddrCoinOpen && (
              <View style={{
                marginTop: 8,
                backgroundColor: ui.dropdownBg,
                borderRadius: 9,
                overflow: "hidden",
                borderWidth: 1,
                borderColor: ui.border,
                maxHeight: 180,
                minHeight: 100
              }}>
                <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
                  {withdrawCoins.map((item) => (
                    <TouchableOpacity
                      key={item.short_name}
                      style={{
                        paddingVertical: 12,
                        paddingHorizontal: 16,
                        borderBottomWidth: 1,
                        borderBottomColor: ui.rowBorder,
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        backgroundColor: saveAddrCoin === item.short_name ? ui.accentBg : "transparent"
                      }}
                      onPress={() => {
                        setSaveAddrCoin(item.short_name);
                        setSaveAddrCoinOpen(false);
                        const nets = getWithdrawNetworksOrStaticFallback(item);
                        if (nets.length === 1) setSaveAddrNetwork(nets[0].code);
                        else setSaveAddrNetwork("");
                      }}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <View style={{ marginRight: 10 }}>
                          <DepositCoinIcon uri={coinIconUri(item)} size={22} />
                        </View>
                        <AppText type={FOURTEEN} style={{ color: themeColors.text }}>{item.short_name}</AppText>
                      </View>
                      {saveAddrCoin === item.short_name && (
                        <FastImage source={checkIc} style={{ width: 12, height: 12 }} tintColor={ui.accent} />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          <View style={{ marginBottom: 16 }}>
            <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text, marginBottom: 8 }}>Network</AppText>
            <TouchableOpacity
              onPress={() => {
                setSaveAddrCoinOpen(false);
                setSaveAddrNetworkOpen(!saveAddrNetworkOpen);
              }}
              style={{
                backgroundColor: ui.inputBg,
                borderRadius: 9,
                paddingHorizontal: 16,
                height: 48,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                borderWidth: 0,
                borderColor: isDark ? themeColors.border : "transparent"
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                {!!saveAddrNetwork && (
                  <View style={{ marginRight: 8 }}>
                    <DepositCoinIcon uri={chainIconUri(saveAddrNetwork)} size={20} />
                  </View>
                )}
                <AppText type={FOURTEEN} numberOfLines={1} style={{ color: saveAddrNetwork ? themeColors.text : "#84888C", flexShrink: 1 }}>
                  {saveAddrNetworkDisplay || "Select Network"}
                </AppText>
              </View>
              <FastImage
                source={saveAddrNetworkOpen ? upIcon : downIcon}
                style={{ width: 12, height: 12 }}
                tintColor={themeColors.secondaryText}
                resizeMode="contain"
              />
            </TouchableOpacity>
            {saveAddrNetworkOpen && (
              <View style={{
                marginTop: 8,
                backgroundColor: ui.dropdownBg,
                borderRadius: 12,
                overflow: "hidden",
                borderWidth: 1,
                borderColor: ui.border,
                maxHeight: 240
              }}>
                <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
                  {(() => {
                    const coin = withdrawCoins.find(c => c.short_name === saveAddrCoin);
                    const nets = coin ? getWithdrawNetworksOrStaticFallback(coin) : [];
                    return nets.map((net) => {
                      const isSelected = saveAddrNetwork === net.code;
                      const fee = net.withdrawal_fee || "0";
                      const arrival = net.arrival_time || "10 mins";

                      return (
                        <TouchableOpacity
                          key={net.code}
                          style={{
                            paddingVertical: 8,
                            paddingHorizontal: 16,
                            borderBottomWidth: 1,
                            borderBottomColor: ui.rowBorder,
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                            backgroundColor: isSelected ? ui.accentBg : "transparent"
                          }}
                          onPress={() => {
                            setSaveAddrNetwork(net.code);
                            setSaveAddrNetworkOpen(false);
                          }}
                        >
                          <View style={{ marginRight: 10 }}>
                            <DepositCoinIcon uri={chainIconUri(net.code)} size={26} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <AppText weight={MEDIUM} type={FOURTEEN} style={{ color: themeColors.text }}>
                              {net.label || CHAIN_FULL_NAMES[net.code] || net.code}
                            </AppText>
                            <View style={{ flexDirection: "row", marginTop: 4 }}>
                              <AppText type={TWELVE} style={{ color: themeColors.secondaryText }}>Fee: </AppText>
                              <AppText type={TWELVE} style={{ color: themeColors.text }}>{fee} {saveAddrCoin}</AppText>
                              <AppText type={TWELVE} style={{ color: themeColors.secondaryText, marginLeft: 12 }}>Arrival: </AppText>
                              <AppText type={TWELVE} style={{ color: themeColors.text }}>{arrival}</AppText>
                            </View>
                          </View>
                          {isSelected && (
                            <View style={{ justifyContent: "center", alignItems: "center" }}>
                              <FastImage source={checkIc} style={{ width: 12, height: 12 }} tintColor={ui.accent} />
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    });
                  })()}
                </ScrollView>
              </View>
            )}
          </View>

          <View style={{ marginBottom: 16 }}>
            <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text, marginBottom: 8 }}>Address</AppText>
            <View style={{
              backgroundColor: ui.inputBg,
              borderRadius: 9,
              paddingHorizontal: 16,
              height: 48,
              justifyContent: "center",
              borderWidth: (saveAddrAddressInlineError || saveAddrAddressValidError) ? 1 : 0,
              borderColor: saveAddrAddressInlineError || saveAddrAddressValidError ? colors.red : "transparent"
            }}>
              <TextInput
                placeholder="Enter wallet address"
                placeholderTextColor="#84888C"
                selectionColor={ui.accent + "40"}
                cursorColor={ui.accent}
                style={{ color: themeColors.text, fontSize: 14, padding: 0 }}
                value={saveAddrAddress}
                onChangeText={(value) => {
                  setSaveAddrAddress(value);
                  if (!saveAddrAddressTouched) setSaveAddrAddressTouched(true);
                }}
                onBlur={() => {
                  setSaveAddrAddressTouched(true);
                  validateSaveAddrAddressApiRef.current?.();
                }}
              />
            </View>
            {!!saveAddrAddressInlineError && !saveAddrAddressValidating && !saveAddrAddressValidError && (
              <AppText type={ELEVEN} style={{ color: "#EF4444", marginTop: 4 }}>{saveAddrAddressInlineError}</AppText>
            )}
            {saveAddrAddressValidating && (
              <AppText type={ELEVEN} style={{ color: ui.accent, marginTop: 4 }}>Validating address...</AppText>
            )}
            {!!saveAddrAddressValidError && !saveAddrAddressValidating && (
              <AppText type={ELEVEN} style={{ color: "#EF4444", marginTop: 4 }}>{saveAddrAddressValidError}</AppText>
            )}
          </View>

          <View style={{ marginBottom: 16 }}>
            <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text, marginBottom: 8 }}>Memo (Optional)</AppText>
            <View style={{
              backgroundColor: ui.inputBg,
              borderRadius: 9,
              paddingHorizontal: 16,
              height: 48,
              justifyContent: "center",
              borderWidth: 0,
              borderColor: "transparent"
            }}>
              <TextInput
                placeholder="e.g. XRP destination tag"
                placeholderTextColor="#84888C"
                selectionColor={ui.accent + "40"}
                cursorColor={ui.accent}
                style={{ color: themeColors.text, fontSize: 14, padding: 0 }}
                value={saveAddrMemo}
                onChangeText={setSaveAddrMemo}
              />
            </View>
          </View>
        </View>
      )}

      {saveAddrStep === "owner" && (
        <View>
          <SheetNotice ui={ui} themeColors={themeColors}>
            Please provide the details of the address owner (the person you are transacting with). These details will be used to comply with regulatory requirements when transacting with this address.
          </SheetNotice>

          <AppText type={SIXTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text, marginBottom: 16 }}>
            Who does this address belong to?
          </AppText>

          {[
            { id: "SELF", label: "Myself", sub: "I own this address" },
            { id: "OTHER", label: "Someone else", sub: "This address belongs to someone else" }
          ].map((o) => (
            <SheetOptionCard
              key={o.id}
              ui={ui}
              themeColors={themeColors}
              Icon={User}
              label={o.label}
              sub={o.sub}
              isSelected={saveAddrOwnership === o.id}
              onPress={() => setSaveAddrOwnership(o.id)}
            />
          ))}
        </View>
      )}

      {saveAddrStep === "other_identity" && (
        <View>
          <View style={styles.fieldGroup}>
            <SheetFieldLabel ui={ui} themeColors={themeColors} Icon={User} label="Full legal name" />
            <View style={[styles.fieldBox, { backgroundColor: ui.fieldBg, borderColor: ui.border }]}>
              <TextInput
                placeholder="Enter full legal name"
                placeholderTextColor="#84888C"
                selectionColor={ui.accent + "40"}
                cursorColor={ui.accent}
                style={[styles.fieldInput, { color: themeColors.text }]}
                value={saveAddrBenFullName}
                onChangeText={setSaveAddrBenFullName}
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <SheetFieldLabel ui={ui} themeColors={themeColors} Icon={FileText} label="PAN or National ID" />
            <View style={[styles.fieldBox, { backgroundColor: ui.fieldBg, borderColor: ui.border }]}>
              <TextInput
                placeholder="Enter PAN or National ID"
                placeholderTextColor="#84888C"
                selectionColor={ui.accent + "40"}
                cursorColor={ui.accent}
                style={[styles.fieldInput, { color: themeColors.text }]}
                value={saveAddrBenPan}
                onChangeText={setSaveAddrBenPan}
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <SheetFieldLabel ui={ui} themeColors={themeColors} Icon={Globe} label="Country of residence" />
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => saveAddrCountrySheetRef.current?.open()}
              style={[styles.fieldBox, styles.fieldBoxRow, { backgroundColor: ui.fieldBg, borderColor: ui.border }]}
            >
              <AppText type={FOURTEEN} numberOfLines={1} style={{ color: saveAddrBenCountry ? themeColors.text : "#84888C", flex: 1 }}>
                {saveAddrBenCountry || "Select country"}
              </AppText>
              <ChevronDown size={18} strokeWidth={2} color={themeColors.secondaryText} />
            </TouchableOpacity>
          </View>

          <View style={styles.fieldGroup}>
            <SheetFieldLabel ui={ui} themeColors={themeColors} Icon={Mail} label="PIN / Postal code" />
            <View style={[styles.fieldBox, { backgroundColor: ui.fieldBg, borderColor: ui.border }]}>
              <TextInput
                placeholder="Enter PIN or Postal code"
                placeholderTextColor="#84888C"
                selectionColor={ui.accent + "40"}
                cursorColor={ui.accent}
                style={[styles.fieldInput, { color: themeColors.text }]}
                value={saveAddrBenPin}
                onChangeText={setSaveAddrBenPin}
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <SheetFieldLabel ui={ui} themeColors={themeColors} Icon={House} label="Full residential address" />
            <View style={[styles.fieldBox, styles.fieldBoxMultiline, { backgroundColor: ui.fieldBg, borderColor: ui.border }]}>
              <TextInput
                placeholder="Enter address"
                placeholderTextColor="#84888C"
                selectionColor={ui.accent + "40"}
                cursorColor={ui.accent}
                style={[styles.fieldInput, styles.fieldInputMultiline, { color: themeColors.text }]}
                value={saveAddrBenAddress}
                onChangeText={setSaveAddrBenAddress}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>
        </View>
      )}

      {saveAddrStep === "wallet_type" && (
        <View>
          <SheetNotice ui={ui} themeColors={themeColors}>
            Choose whether this withdrawal address is controlled in your own wallet or by an exchange / virtual asset service provider.
          </SheetNotice>

          <AppText type={SIXTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text, marginBottom: 16 }}>
            Address Type
          </AppText>

          {[
            { id: "SELF_HOSTED", label: "Self-Hosted Wallet", sub: "You own this wallet.", Icon: Wallet },
            { id: "EXCHANGE", label: "Exchange / Custodial Wallet", sub: "Managed by an exchange.", Icon: Landmark }
          ].map((w) => (
            <SheetOptionCard
              key={w.id}
              ui={ui}
              themeColors={themeColors}
              Icon={w.Icon}
              label={w.label}
              sub={w.sub}
              isSelected={saveAddrWalletType === w.id}
              onPress={() => setSaveAddrWalletType(w.id)}
            />
          ))}
        </View>
      )}

      {saveAddrStep === "proof_select" && (
        <View>
          <SheetNotice ui={ui} themeColors={themeColors} title="Verify Your Wallet Address">
            To protect your account and comply with security standards, please verify that you own the wallet address you entered. Choose one of the secure verification methods below.
          </SheetNotice>

          <AppText type={SIXTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text, marginBottom: 16 }}>
            Verification Method
          </AppText>

          {[
            { id: "satoshi", label: "Satoshi Test", sub: "Send a small transaction to verify your wallet.", Icon: FingerprintPattern },
            { id: "metamask", label: "Wallet Signature", sub: "Verify ownership with a secure wallet signature.", Icon: FileCheck }
          ].map((p) => (
            <SheetOptionCard
              key={p.id}
              ui={ui}
              themeColors={themeColors}
              Icon={p.Icon}
              label={p.label}
              sub={p.sub}
              isSelected={saveAddrProofMethod === p.id}
              onPress={() => setSaveAddrProofMethod(p.id)}
            />
          ))}
        </View>
      )}
      {saveAddrStep === "exchange" && (
        <View style={{ gap: 10 }}>
          <View style={{ gap: 0 }}>
            <AppText type={TWELVE} style={{ color: themeColors.secondaryText }}>Select the exchange hosting this address, or choose Other to enter the institution name manually.</AppText>
          </View>
          <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text, top: 10, left: 3 }}>Exchange name</AppText>
          <TouchableOpacity
            onPress={() => setSaveAddrExchangeOpen(!saveAddrExchangeOpen)}
            style={{
              borderRadius: 9,
              borderWidth: 0,
              borderColor: "transparent",
              backgroundColor: ui.inputBg,
              paddingHorizontal: 16,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 5,
              height: 48
            }}
          >
            <AppText type={FOURTEEN} style={{ color: saveAddrExchange ? themeColors.text : "#84888C" }}>
              {saveAddrExchange === ADDRESS_BOOK_EXCHANGE_OTHER ? "Other" : (ADDRESS_BOOK_TOP_EXCHANGES.find(e => e.value === saveAddrExchange)?.label || "Select Exchange")}
            </AppText>
            <FastImage source={saveAddrExchangeOpen ? upIcon : downIcon} style={{ width: 12, height: 12 }} resizeMode="contain" tintColor={themeColors.secondaryText} />
          </TouchableOpacity>

          {saveAddrExchangeOpen && (
            <View style={{
              backgroundColor: ui.dropdownBg,
              borderRadius: 9,
              borderWidth: 1,
              borderColor: ui.border,
              marginTop: 4,
              overflow: "hidden",
              zIndex: 10
            }}>
              <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false} nestedScrollEnabled>
                {[...ADDRESS_BOOK_TOP_EXCHANGES, { value: ADDRESS_BOOK_EXCHANGE_OTHER, label: "Other" }].map((e) => (
                  <TouchableOpacity
                    key={e.value}
                    onPress={() => {
                      setSaveAddrExchange(e.value);
                      setSaveAddrExchangeOpen(false);
                    }}
                    style={{
                      padding: 14,
                      paddingHorizontal: 16,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      borderBottomWidth: 1,
                      borderBottomColor: ui.rowBorder,
                      backgroundColor: saveAddrExchange === e.value ? ui.accentBg : "transparent"
                    }}
                  >
                    <AppText type={THIRTEEN} style={{ color: themeColors.text }}>{e.label}</AppText>
                    {saveAddrExchange === e.value && <FastImage source={checkIc} style={{ width: 14, height: 14 }} tintColor={ui.accent} />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {saveAddrExchange === ADDRESS_BOOK_EXCHANGE_OTHER && (
            <View style={{ gap: 8, marginTop: 6 }}>
              <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text, top: 3 }}>Enter name manually</AppText>
              <Input
                placeholder="Exchange or VASP name"
                value={saveAddrExchangeManual}
                onChangeText={setSaveAddrExchangeManual}
                autoCapitalize="words"
                mainContainer={{ marginBottom: 0 }}
                containerStyle={{
                  backgroundColor: ui.inputBg,
                  borderWidth: 0,
                  borderRadius: 9,
                  height: 48,
                  paddingHorizontal: 16,
                }}
                inputStyle={{ fontSize: 14 }}
              />
            </View>
          )}

          <TouchableOpacity
            onPress={() => setSaveAddrDeclarationAccepted(!saveAddrDeclarationAccepted)}
            activeOpacity={0.8}
            style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, marginTop: 12 }}
          >
            <View style={{
              width: 18,
              height: 18,
              borderRadius: 4,
              borderWidth: 1.5,
              borderColor: saveAddrDeclarationAccepted ? ui.accent : (isDark ? ui.border : "#D1D5DB"),
              backgroundColor: saveAddrDeclarationAccepted ? ui.accent : "transparent",
              justifyContent: "center",
              alignItems: "center",
              marginTop: 2
            }}>
              {saveAddrDeclarationAccepted && <FastImage source={checkIc} style={{ width: 11, height: 11 }} tintColor={colors.white} />}
            </View>
            <AppText type={TWELVE} style={{ color: themeColors.secondaryText, flex: 1, lineHeight: 18 }}>
              {ADDRESS_BOOK_DECLARATION_TEXT}
            </AppText>
          </TouchableOpacity>
        </View>
      )}

      {saveAddrStep === "verify_method" && (
        <View>
          {(() => {
            const methods = saveAddrVerifyOptions || [];
            const isSingle = methods.length === 1;

            return (
              <>
                <SheetNotice ui={ui} themeColors={themeColors} tone="success" title="Secure Verification">
                  {isSingle
                    ? "Your account has a single verification option for this step. Tap Continue to open the secure prompt and finish saving this withdrawal address."
                    : "Select one option, then tap Continue. The next step is your code or passkey prompt—no second method picker."}
                </SheetNotice>

                {methods.map((method) => {
                  const isSelected = isSingle ? true : (selectedSaveAddrVerifyMethod === method);
                  let Icon = Mail;
                  let title = "Email";
                  let sub = "";

                  if (method === "email") {
                    const email = userData?.emailId || "";
                    const [local, domain] = email.split("@");
                    sub = email ? `${local.slice(0, 2)}***@${domain}` : "";
                  } else if (method === "mobile") {
                    Icon = Smartphone;
                    title = "Phone Number";
                    const phone = userData?.mobileNumber || "";
                    sub = phone ? `${phone.slice(0, 2)}*****${phone.slice(-2)}` : "";
                  } else if (method === "google_authenticator") {
                    Icon = LockKeyhole;
                    title = "Authenticator App";
                    sub = "Use an authenticator app to verify your identity.";
                  } else if (method === "passkey") {
                    Icon = UserKey;
                    title = "Passkeys";
                    sub = "Use your device passkey to verify quickly and securely.";
                  }

                  return (
                    <SheetOptionCard
                      key={method}
                      ui={ui}
                      themeColors={themeColors}
                      Icon={Icon}
                      label={title}
                      sub={sub}
                      indicator="checkbox"
                      isSelected={isSelected}
                      disabled={isSingle}
                      onPress={() => setSelectedSaveAddrVerifyMethod(method)}
                    />
                  );
                })}
              </>
            );
          })()}
        </View>
      )}
    </View>
  );
};

export default AddWithdrawalAddressBasics;
