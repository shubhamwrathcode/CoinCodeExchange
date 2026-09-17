import { ScrollView, StyleSheet, Text, View } from "react-native";
import React from "react";
import FastImage from "react-native-fast-image";
import { folder, NO_NOTIFICATION_ICON, NO_NOTIFICATION_ICON_LIGHT } from "../../helper/ImageAssets";
import { colors } from "../../theme/colors";
import { AppText } from "../../shared";

const TransactionHistory = ({ botTrades, theme }) => {
  return (
    <View style={[{ marginVertical: 20, borderRadius: 10 }]}>
      <Text
        style={{
          fontWeight: "bold",
          fontSize: 16,
          marginBottom: 10,
          color: theme !== "Dark" ? "#222"  : '#fff',
        }}
      >
        Transaction History
      </Text>
      <ScrollView
  horizontal
  showsHorizontalScrollIndicator={false}
  style={{
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    backgroundColor: theme !== "Dark" ? "#fff" : "transparent",
    borderRadius: 10,
    paddingHorizontal: 10,
  }}
>
  <View style={{ flexDirection: "column" }}>
    {/* Table Header */}
    <View
      style={{
        flexDirection: "row",
        paddingVertical: 13,
        borderBottomWidth: 0.6,
        borderColor: theme !== "Dark" ? "#D4D4D4" : colors.grey,
        backgroundColor: theme !== "Dark" ? "#f5f5f5" : colors.darkGrey,
      }}
    >
      <AppText style={{ flex: 1, fontWeight: "bold", fontSize: 12, color: theme !== "Dark" ? "#222": '#fff', width: 80 }}>S.no</AppText>
      <AppText style={{ flex: 1, fontWeight: "bold", fontSize: 12, color: theme !== "Dark" ? "#222": '#fff', width: 100 }}>Pair</AppText>
      <AppText style={{ flex: 1, fontWeight: "bold", fontSize: 12, color: theme !== "Dark" ? "#222": '#fff', width: 100 }}>Type</AppText>
      <AppText style={{ flex: 1, fontWeight: "bold", fontSize: 12, color: theme !== "Dark" ? "#222": '#fff', width: 100 }}>Quantity</AppText>
      <AppText style={{ flex: 1, fontWeight: "bold", fontSize: 12, color: theme !== "Dark" ? "#222": '#fff', width: 100 }}>Profit</AppText>
      <AppText style={{ flex: 1, fontWeight: "bold", fontSize: 12, color: theme !== "Dark" ? "#222": '#fff', width: 100 }}>Remark</AppText>
    </View>

    {/* Table Rows */}
    {!botTrades || botTrades.length === 0 ? (
      <View
        style={{
          alignItems: "center",
          paddingVertical: 70,
          justifyContent: "center",
        }}
      >
        <FastImage
          source={theme === "Dark" ? NO_NOTIFICATION_ICON : NO_NOTIFICATION_ICON_LIGHT}
          style={{ width: 80, height: 80, marginBottom: 10 }}
        />
      </View>
    ) : (
      botTrades.map((item, index) => (
        <View
          key={index}
          style={{
            flexDirection: "row",
            paddingVertical: 13,
            borderBottomWidth: 0.4,
            borderColor: "#D4D4D4",
          }}
        >
          <AppText style={{ flex: 1, fontSize: 12, color: theme !== "Dark" ? "#222": '#fff', width: 80 }}>{index + 1}</AppText>
          <AppText style={{ flex: 1, fontSize: 12, color: theme !== "Dark" ? "#222": '#fff', width: 100 }}>{item?.pair}</AppText>
          <AppText style={{ flex: 1, fontSize: 12, color: theme !== "Dark" ? "#222": '#fff', width: 100 }}>{item?.tradeType}</AppText>
          <AppText style={{ flex: 1, fontSize: 12, color: theme !== "Dark" ? "#222": '#fff', width: 100 }}>
            {parseFloat(item?.quanity)} $
          </AppText>
          <AppText style={{ flex: 1, fontSize: 12, color: theme !== "Dark" ? "#222": '#fff', width: 100 }}>
            {parseFloat(item?.profit)} $
          </AppText>
          <AppText style={{ flex: 1, fontSize: 12, color: theme !== "Dark" ? "#222": '#fff', width: 100 }}>
            {item?.remark || "-"}
          </AppText>
        </View>
      ))
    )}
  </View>
</ScrollView>

    </View>
  );
};

export default TransactionHistory;

const styles = StyleSheet.create({});
