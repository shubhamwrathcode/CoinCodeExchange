import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import {
  AppText,
  GREEN,
  NINE,
  RED,
  SEMI_BOLD,
  SIXTEEN,
  ELEVEN,
} from "../../shared";
import FastImage from "react-native-fast-image";
import { discoverIcon } from "../../helper/ImageAssets";
import { useEffect, useState } from "react";
import { getMemeList } from "../../actions/homeActions";
import { useDispatch } from "react-redux";
import { useAppSelector } from "../../store/hooks";
import { BASE_URL } from "../../helper/Constants";
import { toFixedFive, toFixedThree } from "../../helper/utility";
import NavigationService from "../../navigation/NavigationService";
import MemexSkeleton from "./MemexSkeleton";
import { WALLET_SCREEN } from "../../navigation/routes";
import { setMemeList } from "../../slices/homeSlice";
import { useTheme } from "../../hooks/useTheme";

const Memex = () => {
  const { colors: themeColors } = useTheme();
  const dispatch = useDispatch();
  const memeList = useAppSelector((state) => state.home.memeList);
  const [contentLoading, setContentLoading] = useState(true);

  useEffect(() => {
    setContentLoading(true);
    dispatch(setMemeList([]));
    dispatch(getMemeList()).finally(() => {
      setContentLoading(false);
    });
  }, [dispatch]);

  const handleNavigate = (item) => {
    NavigationService.navigate(WALLET_SCREEN, { coinDetail: item });
  };

  return (
    <View style={{ flex: 1 }}>
      {contentLoading ? (
        <MemexSkeleton />
      ) : (
        <>
          <View
            style={{
              marginVertical: 20,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              paddingHorizontal: 16
            }}
          >
            <FastImage
              source={discoverIcon}
              resizeMode="contain"
              style={{ width: 22, height: 22 }}
              tintColor={themeColors.text}
            />
            <AppText style={{ color: themeColors.text }} type={SIXTEEN} weight={SEMI_BOLD}>
              MemeX
            </AppText>
          </View>
          <AppText style={{ color: themeColors.secondaryText, textAlign: 'left', marginHorizontal: 20 }} type={ELEVEN}>
            Your easiest way to early on-chain investment opportunities!
          </AppText>

          <View style={{ marginVertical: 10, marginHorizontal: 16 }}>
            <FlatList
              data={memeList}
              keyExtractor={(item, index) => index.toString()}
              numColumns={3}
              columnWrapperStyle={{ flexDirection: "row", marginTop: 10, gap: 6 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.card,
                    {
                      backgroundColor: themeColors.card,
                      borderColor: themeColors.border,
                      borderWidth: 0.5
                    }
                  ]}
                  onPress={() => handleNavigate(item)}
                >
                  <View style={styles.imageWrap}>
                    <FastImage
                      source={{ uri: BASE_URL + item?.icon_path }}
                      resizeMode="cover"
                      style={styles.memeImage}
                    />
                  </View>

                  <View style={styles.titleRow}>
                    <Text style={[styles.cell, { color: themeColors.text }]}>
                      {item?.base_currency}
                      <Text style={{ fontWeight: "400", color: themeColors.secondaryText }}>
                        /{item?.quote_currency}
                      </Text>
                    </Text>
                  </View>

                  <View style={styles.infoRow}>
                    <AppText style={{ color: themeColors.secondaryText }} type={NINE}>
                      Price
                    </AppText>
                    <AppText style={{ color: themeColors.text }} type={NINE}>
                      {toFixedFive(item?.buy_price)}
                    </AppText>
                  </View>

                  <View style={styles.infoRow}>
                    <AppText style={{ color: themeColors.secondaryText }} type={NINE}>
                      Change
                    </AppText>
                    <AppText color={item?.change_percentage < 0 ? RED : GREEN} type={NINE}>
                      {item?.change_percentage > 0 && '+'}{toFixedThree(item?.change_percentage)}%
                    </AppText>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: "32%",
    paddingVertical: 6,
    borderRadius: 8,
    paddingHorizontal: 6,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  imageWrap: {
    borderRadius: 10,
    overflow: "hidden",
  },
  memeImage: {
    width: '100%',
    height: 110,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    marginTop: 5,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    marginTop: 5,
  },
  cell: {
    fontSize: 11,
    fontWeight: "700",
  },
});

export default Memex;
