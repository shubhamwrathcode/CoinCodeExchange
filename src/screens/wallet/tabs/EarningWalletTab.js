import React from "react";
import GenericWalletTab from "./GenericWalletTab";
import { earningWalletImg } from "../../../helper/ImageAssets";

const EarningWalletTab = (props) => {
  return (
    <GenericWalletTab
      {...props}
      title="Earning Wallet Balance"
      hideZeroDefault={true}
      imageSource={earningWalletImg}
    />
  );
};

export default EarningWalletTab;

