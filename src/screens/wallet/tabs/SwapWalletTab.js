import React from "react";
import GenericWalletTab from "./GenericWalletTab";
import { overviewWalletImg } from "../../../helper/ImageAssets";

const SwapWalletTab = (props) => {
  return (
    <GenericWalletTab
      {...props}
      title="Swap Wallet Balance"
      hideZeroDefault={true}
      imageSource={overviewWalletImg}
    />
  );
};

export default SwapWalletTab;

