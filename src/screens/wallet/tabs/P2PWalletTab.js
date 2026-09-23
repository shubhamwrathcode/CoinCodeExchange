import React from "react";
import GenericWalletTab from "./GenericWalletTab";
import { overviewWalletImg } from "../../../helper/ImageAssets";

const P2PWalletTab = (props) => {
  return (
    <GenericWalletTab
      {...props}
      title="P2P Wallet Balance"
      hideZeroDefault={true}
      imageSource={overviewWalletImg}
    />
  );
};

export default P2PWalletTab;

