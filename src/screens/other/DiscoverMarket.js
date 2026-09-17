import FastImage from "react-native-fast-image";
import { AppText, ELEVEN, SIXTEEN, SEMI_BOLD } from "../../shared";
import { discoverIcon } from "../../helper/ImageAssets";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useEffect, useState } from "react";
import MarketList from "./MarketList";
import NavigationService from "../../navigation/NavigationService";
import { WALLET_SCREEN } from "../../navigation/routes";
import { useTheme } from "../../hooks/useTheme";

const DiscoverMarket = ({ coinPairs }) => {
  const { colors: themeColors } = useTheme();
  const [activeTab, setActiveTab] = useState("Gainer");
  const [filterData, setFilterData] = useState([]);

  const tabTextColor = (selected) => (selected ? themeColors.text : themeColors.secondaryText);
  const tabBg = (selected) => (selected ? themeColors.card : "transparent");
  const tabBorder = (selected) => (selected ? themeColors.border : "transparent");

  useEffect(() => {
    handleFilterData(activeTab);
  }, [coinPairs, activeTab]);

  const handleFilterData = (tab = "Gainer") => {
    setActiveTab(tab);

    if (!coinPairs || coinPairs.length === 0) {
      setFilterData([]);
      return;
    }

    if (tab === "Gainer") {
      let data = [...coinPairs].sort(
        (a, b) => b.change_percentage - a.change_percentage
      );
      setFilterData(data);
    } else if (tab === "Loser") {
      let data = [...coinPairs].sort(
        (a, b) => a.change_percentage - b.change_percentage
      );
      setFilterData(data);
    } else if (tab === "Listing") {
      let data = [...coinPairs].reverse();
      setFilterData(data);
    }
  };

  const handleNavigate = (item) => {
    NavigationService.navigate(WALLET_SCREEN, { coinDetail: item });
  };

  return (
    <>
      <View
        style={{
          marginVertical: 20,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          paddingLeft: 16,
        }}
      >
        <FastImage
          source={discoverIcon}
          resizeMode="contain"
          style={{ width: 22, height: 22 }}
          tintColor={themeColors.text}
        />
        <AppText style={{ color: themeColors.text }} type={SIXTEEN} weight={SEMI_BOLD}>
          Discover
        </AppText>
      </View>

      <View>
        <View style={styles.mainTabView}>
          {["Gainer", "Loser", "Listing"].map((tab) => {
            const label = tab === "Gainer" ? "Top Gainer" : tab === "Loser" ? "Top Loser" : "New Listing";
            const isActive = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.tabView, 
                  { 
                    backgroundColor: tabBg(isActive),
                    borderColor: tabBorder(isActive),
                    borderWidth: 1
                  }
                ]}
                onPress={() => handleFilterData(tab)}
              >
                <AppText style={{ color: tabTextColor(isActive) }} weight={SEMI_BOLD} type={ELEVEN}>
                  {label}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </View>

        <MarketList filterData={filterData} onPress={handleNavigate} />
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  mainTabView: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    marginBottom: 20,
    gap: 12,
    marginHorizontal: 11,
  },
  tabView: {
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
});

export default DiscoverMarket;
