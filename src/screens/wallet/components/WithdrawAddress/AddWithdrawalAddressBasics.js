import React from "react";
import { View, TextInput, TouchableOpacity, ScrollView } from "react-native";
import { AppText, FOURTEEN, TWELVE, MEDIUM, SIXTEEN, SEMI_BOLD, THIRTEEN, BOLD, TEN, ELEVEN, Input, FIFTEEN } from "../../../../shared";
import { colors, darkTheme, lightTheme } from "../../../../theme/colors";
import FastImage from "react-native-fast-image";
import { EMAIL, FINGERPRINT, KEY_ICON, PHONE, security_vector2 } from "../../../../helper/ImageAssets";
import { buildCoinImageUri } from "../../../../helper/coinIconUrl";

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
  if (saveAddrStep !== "form" && saveAddrStep !== "owner" && saveAddrStep !== "other_identity" && saveAddrStep !== "wallet_type" && saveAddrStep !== "proof_select" && saveAddrStep !== "exchange" && saveAddrStep !== "verify_method") return null;

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
              backgroundColor: isDark ? darkTheme.darkThemeInputColor : "#EDEDEE",
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
                selectionColor={themeColors.text + "40"}
                cursorColor={themeColors.text}
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
                backgroundColor: isDark ? darkTheme.darkThemeInputColor : "#EDEDEE",
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
                {(() => {
                  const coinObj = withdrawCoins.find(c => c.short_name === saveAddrCoin);
                  const uri = buildCoinImageUri(coinObj);
                  return uri ? (
                    <FastImage
                      source={{ uri }}
                      style={{ width: 20, height: 20, marginRight: 8, borderRadius: 10 }}
                    />
                  ) : null;
                })()}
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
                backgroundColor: isDark ? themeColors.background : "#EDEDEE",
                borderRadius: 9,
                overflow: "hidden",
                borderWidth: 1,
                borderColor: isDark ? themeColors.border : "#E5E7EB",
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
                        borderBottomColor: isDark ? themeColors.border : "#DDD",
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center"
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
                        <FastImage
                          source={{ uri: buildCoinImageUri(item) }}
                          style={{ width: 22, height: 22, marginRight: 10, borderRadius: 11 }}
                        />
                        <AppText type={FOURTEEN} style={{ color: themeColors.text }}>{item.short_name}</AppText>
                      </View>
                      {saveAddrCoin === item.short_name && (
                        <FastImage source={checkIc} style={{ width: 12, height: 12 }} tintColor={isDark ? themeColors.text : "black"} />
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
                backgroundColor: isDark ? darkTheme.darkThemeInputColor : "#EDEDEE",
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
              <AppText type={FOURTEEN} style={{ color: saveAddrNetwork ? themeColors.text : "#84888C" }}>
                {saveAddrNetworkDisplay || "Select Network"}
              </AppText>
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
                backgroundColor: isDark ? themeColors.background : "#EDEDEE",
                borderRadius: 12,
                overflow: "hidden",
                borderWidth: 1,
                borderColor: isDark ? themeColors.border : "#E5E7EB",
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
                            borderBottomColor: isDark ? themeColors.border : "#DDD",
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                            backgroundColor: isSelected ? (isDark ? "rgba(255,255,255,0.08)" : "#DFDFE2") : "transparent"
                          }}
                          onPress={() => {
                            setSaveAddrNetwork(net.code);
                            setSaveAddrNetworkOpen(false);
                          }}
                        >
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
                              <FastImage source={checkIc} style={{ width: 12, height: 12 }} tintColor={isDark ? themeColors.text : "black"} />
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
              backgroundColor: isDark ? darkTheme.darkThemeInputColor : "#EDEDEE",
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
                selectionColor={themeColors.text + "40"}
                cursorColor={themeColors.text}
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
              <AppText type={ELEVEN} style={{ color: "#E2B24C", marginTop: 4 }}>Validating address...</AppText>
            )}
            {!!saveAddrAddressValidError && !saveAddrAddressValidating && (
              <AppText type={ELEVEN} style={{ color: "#EF4444", marginTop: 4 }}>{saveAddrAddressValidError}</AppText>
            )}
          </View>

          <View style={{ marginBottom: 16 }}>
            <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text, marginBottom: 8 }}>Memo (Optional)</AppText>
            <View style={{
              backgroundColor: isDark ? darkTheme.darkThemeInputColor : "#EDEDEE",
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
                selectionColor={themeColors.text + "40"}
                cursorColor={themeColors.text}
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
          <AppText type={FOURTEEN} style={{ color: themeColors.secondaryText, marginBottom: 16, lineHeight: 20 }}>
            Please provide the details of the address owner (the person you are transacting with). These details will be used to comply with regulatory requirements when transacting with this address.
          </AppText>

          <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text, marginBottom: 16 }}>
            Who does this address belong to?
          </AppText>

          {[
            { id: "SELF", label: "Myself" },
            { id: "OTHER", label: "Someone else" }
          ].map((o) => {
            const isSelected = saveAddrOwnership === o.id;
            return (
              <TouchableOpacity
                key={o.id}
                onPress={() => setSaveAddrOwnership(o.id)}
                style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}
              >
                <View style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  borderWidth: isSelected ? 2 : 1,
                  borderColor: isSelected ? (isDark ? "#FFF" : colors.black) : themeColors.secondaryText,
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: 12
                }}>
                  {isSelected && <View style={{ width: 10, height: 10, borderRadius: 10, backgroundColor: isDark ? "#FFF" : colors.black }} />}
                </View>
                <AppText type={FOURTEEN} weight={MEDIUM} style={{ color: themeColors.text }}>{o.label}</AppText>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {saveAddrStep === "other_identity" && (
        <View>
          <AppText type={FOURTEEN} style={{ color: themeColors.secondaryText, marginBottom: 24, lineHeight: 20 }}>
            Identify the recipient for this withdrawal address when it belongs to someone else.
          </AppText>

          <View style={{ marginBottom: 20 }}>
            <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text, marginBottom: 8 }}>Full legal name</AppText>
            <View style={{
              backgroundColor: isDark ? darkTheme.darkThemeInputColor : "#EDEDEE",
              borderRadius: 9,
              paddingHorizontal: 16,
              height: 48,
              justifyContent: "center",
              borderWidth: 0,
              borderColor: "transparent"
            }}>
              <TextInput
                placeholder="Enter full legal name"
                placeholderTextColor="#84888C"
                selectionColor={themeColors.text + "40"}
                cursorColor={themeColors.text}
                style={{ color: themeColors.text, fontSize: 14, padding: 0 }}
                value={saveAddrBenFullName}
                onChangeText={setSaveAddrBenFullName}
              />
            </View>
          </View>

          <View style={{ marginBottom: 20 }}>
            <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text, marginBottom: 8 }}>PAN or National ID</AppText>
            <View style={{
              backgroundColor: isDark ? darkTheme.darkThemeInputColor : "#EDEDEE",
              borderRadius: 9,
              paddingHorizontal: 16,
              height: 48,
              justifyContent: "center",
              borderWidth: 0,
              borderColor: "transparent"
            }}>
              <TextInput
                placeholder="Enter PAN or National ID"
                placeholderTextColor="#84888C"
                selectionColor={themeColors.text + "40"}
                cursorColor={themeColors.text}
                style={{ color: themeColors.text, fontSize: 14, padding: 0 }}
                value={saveAddrBenPan}
                onChangeText={setSaveAddrBenPan}
              />
            </View>
          </View>

          <View style={{ marginBottom: 20 }}>
            <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text, marginBottom: 8 }}>Country of residence</AppText>
            <TouchableOpacity
              onPress={() => saveAddrCountrySheetRef.current?.open()}
              style={{
                backgroundColor: isDark ? darkTheme.darkThemeInputColor : "#EDEDEE",
                borderRadius: 9,
                paddingHorizontal: 16,
                height: 48,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                borderWidth: 0,
                borderColor: "transparent"
              }}
            >
              <AppText type={FOURTEEN} style={{ color: saveAddrBenCountry ? themeColors.text : "#84888C" }}>
                {saveAddrBenCountry || "Select country"}
              </AppText>
              <FastImage
                source={downIcon}
                style={{ width: 12, height: 12 }}
                tintColor={themeColors.secondaryText}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>

          <View style={{ marginBottom: 20 }}>
            <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text, marginBottom: 8 }}>PIN / Postal code</AppText>
            <View style={{
              backgroundColor: isDark ? darkTheme.darkThemeInputColor : "#EDEDEE",
              borderRadius: 9,
              paddingHorizontal: 16,
              height: 48,
              justifyContent: "center",
              borderWidth: 0,
              borderColor: "transparent"
            }}>
              <TextInput
                placeholder="Enter PIN or Postal code"
                placeholderTextColor="#84888C"
                selectionColor={themeColors.text + "40"}
                cursorColor={themeColors.text}
                style={{ color: themeColors.text, fontSize: 14, padding: 0 }}
                value={saveAddrBenPin}
                onChangeText={setSaveAddrBenPin}
              />
            </View>
          </View>

          <View style={{ marginBottom: 20 }}>
            <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text, marginBottom: 8 }}>Full residential address</AppText>
            <View style={{
              backgroundColor: isDark ? darkTheme.darkThemeInputColor : "#EDEDEE",
              borderRadius: 9,
              paddingHorizontal: 16,
              minHeight: 80,
              paddingTop: 12,
              borderWidth: 0,
              borderColor: "transparent"
            }}>
              <TextInput
                placeholder="Enter address"
                placeholderTextColor="#84888C"
                selectionColor={themeColors.text + "40"}
                cursorColor={themeColors.text}
                style={{ color: themeColors.text, fontSize: 14, padding: 0 }}
                value={saveAddrBenAddress}
                onChangeText={setSaveAddrBenAddress}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </View>
        </View>
      )}

      {saveAddrStep === "wallet_type" && (
        <View>
          <AppText type={FOURTEEN} style={{ color: themeColors.secondaryText, marginBottom: 24, lineHeight: 20 }}>
            Choose whether this withdrawal address is controlled in your own wallet or by an exchange / virtual asset service provider.
          </AppText>

          <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text, marginBottom: 16 }}>
            Address type
          </AppText>

          {[
            { id: "SELF_HOSTED", label: "The address owner's self-hosted wallet" },
            { id: "EXCHANGE", label: "A wallet hosted by a Virtual Asset Service Provider / Exchange" }
          ].map((w) => {
            const isSelected = saveAddrWalletType === w.id;
            return (
              <TouchableOpacity
                key={w.id}
                onPress={() => setSaveAddrWalletType(w.id)}
                style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}
              >
                <View style={{
                  width: 20,
                  height: 20,
                  borderRadius: 11,
                  borderWidth: isSelected ? 2 : 1,
                  borderColor: isSelected ? (isDark ? "#FFF" : colors.black) : themeColors.secondaryText,
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: 12
                }}>
                  {isSelected && <View style={{ width: 10, height: 10, borderRadius: 10, backgroundColor: isDark ? "#FFF" : colors.black }} />}
                </View>
                <AppText type={FOURTEEN} weight={MEDIUM} style={{ color: themeColors.text }}>{w.label}</AppText>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {saveAddrStep === "proof_select" && (
        <View>
          <AppText type={FOURTEEN} style={{ color: themeColors.secondaryText, marginBottom: 24, lineHeight: 20 }}>
            Verification method for your self-hosted wallet (same address entered above).
          </AppText>

          <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text, marginBottom: 16 }}>
            Verification method
          </AppText>

          {[
            { id: "satoshi", label: "Satoshi test" },
            { id: "metamask", label: "MetaMask signature" }
          ].map((p) => {
            const isSelected = saveAddrProofMethod === p.id;
            return (
              <TouchableOpacity
                key={p.id}
                onPress={() => setSaveAddrProofMethod(p.id)}
                style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}
              >
                <View style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  borderWidth: isSelected ? 2 : 1,
                  borderColor: isSelected ? (isDark ? "#FFF" : colors.black) : themeColors.secondaryText,
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: 12
                }}>
                  {isSelected && <View style={{ width: 10, height: 10, borderRadius: 10, backgroundColor: isDark ? "#FFF" : colors.black }} />}
                </View>
                <AppText type={FOURTEEN} weight={MEDIUM} style={{ color: themeColors.text }}>{p.label}</AppText>
              </TouchableOpacity>
            );
          })}
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
              backgroundColor: isDark ? darkTheme.darkThemeInputColor : "#EDEDEE",
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
              backgroundColor: isDark ? themeColors.background : "#EDEDEE",
              borderRadius: 9,
              borderWidth: 1,
              borderColor: isDark ? themeColors.border : "#E5E7EB",
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
                      borderBottomColor: isDark ? themeColors.border : "#DDD"
                    }}
                  >
                    <AppText type={THIRTEEN} style={{ color: themeColors.text }}>{e.label}</AppText>
                    {saveAddrExchange === e.value && <FastImage source={checkIc} style={{ width: 14, height: 14 }} tintColor={isDark ? themeColors.text : "black"} />}
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
                  backgroundColor: isDark ? darkTheme.darkThemeInputColor : "#EDEDEE",
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
              borderColor: isDark ? (saveAddrDeclarationAccepted ? "#FFF" : themeColors.border) : (saveAddrDeclarationAccepted ? "#000" : "#D1D5DB"),
              backgroundColor: saveAddrDeclarationAccepted ? (isDark ? "#FFF" : "#000") : "transparent",
              justifyContent: "center",
              alignItems: "center",
              marginTop: 2
            }}>
              {saveAddrDeclarationAccepted && <FastImage source={checkIc} style={{ width: 11, height: 11 }} tintColor={isDark ? "#000" : "#FFF"} />}
            </View>
            <AppText type={TWELVE} style={{ color: themeColors.secondaryText, flex: 1, lineHeight: 18 }}>
              {ADDRESS_BOOK_DECLARATION_TEXT}
            </AppText>
          </TouchableOpacity>
        </View>
      )}

      {saveAddrStep === "verify_method" && (
        <View style={{ alignItems: "center", }}>
          <View style={{ width: "100%", alignItems: "flex-start" }}>
            <AppText type={THIRTEEN} style={{ color: themeColors.secondaryText, marginBottom: 24, lineHeight: 20 }}>
              Select one option, then tap Continue. The next step is your code or passkey prompt—no second method picker.
            </AppText>
          </View>

          {(() => {
            const methods = saveAddrVerifyOptions || [];

            return methods.map((method) => {
              const isSelected = methods.length === 1 ? true : (selectedSaveAddrVerifyMethod === method);
              let icon = EMAIL;
              let title = "Email";
              let sub = "";

              if (method === "email") {
                const email = userData?.emailId || "";
                const [local, domain] = email.split("@");
                sub = email ? `${local.slice(0, 2)}***@${domain}` : "";
              } else if (method === "mobile") {
                icon = PHONE;
                title = "Phone Number";
                const phone = userData?.mobileNumber || "";
                sub = phone ? `${phone.slice(0, 2)}*****${phone.slice(-2)}` : "";
              } else if (method === "google_authenticator") {
                icon = KEY_ICON;
                title = "Authenticator App";
              } else if (method === "passkey") {
                icon = FINGERPRINT;
                title = "Passkeys";
              }

              return (
                <TouchableOpacity
                  key={method}
                  onPress={() => setSelectedSaveAddrVerifyMethod(method)}
                  disabled={methods.length === 1}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    padding: 16,
                    width: "100%",
                    marginBottom: 12,
                    backgroundColor: isDark ? darkTheme.darkThemeInputColor : "#EDEDEE",
                    borderRadius: 12,
                    borderWidth: isDark ? (isSelected ? 1 : 0) : 0,
                    borderColor: isDark ? (isSelected ? themeColors.text : "transparent") : "transparent",
                    opacity: methods.length === 1 ? 0.8 : 1
                  }}
                >
                  <View style={{ width: 32, height: 32, justifyContent: "center", alignItems: "center", marginRight: 16 }}>
                    <FastImage
                      source={icon}
                      style={{ width: 24, height: 24 }}
                      tintColor={isDark ? colors.white : undefined}
                      resizeMode="contain"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText type={FOURTEEN} weight={MEDIUM} style={{ color: themeColors.text }}>{title}</AppText>
                    {!!sub && <AppText type={TWELVE} style={{ color: themeColors.secondaryText, marginTop: 4 }}>{sub}</AppText>}
                  </View>
                  <View style={{
                    width: 18,
                    height: 18,
                    borderRadius: 4,
                    borderWidth: 1.5,
                    borderColor: isSelected ? (isDark ? "#FFF" : colors.black) : themeColors.secondaryText,
                    backgroundColor: isSelected ? (isDark ? "#FFF" : colors.black) : "transparent",
                    justifyContent: "center",
                    alignItems: "center"
                  }}>
                    {isSelected && <FastImage source={checkIc} style={{ width: 10, height: 10 }} tintColor={isDark ? colors.black : colors.white} />}
                  </View>
                </TouchableOpacity>
              );
            });
          })()}
        </View>
      )}
    </View>
  );
};

export default AddWithdrawalAddressBasics;
