import React from "react";
import GenericWalletTab from "./GenericWalletTab";
import { overviewWalletImg } from "../../../helper/ImageAssets";

const MainWalletTab = (props) => {
  return (
    <GenericWalletTab
      {...props}
      title="Main Wallet Balance"
      hideZeroDefault={false}
      imageSource={overviewWalletImg}
    />
  );
};

export default MainWalletTab;

