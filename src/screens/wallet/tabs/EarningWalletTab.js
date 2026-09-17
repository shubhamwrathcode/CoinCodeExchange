import React from "react";
import GenericWalletTab from "./GenericWalletTab";

const EarningWalletTab = (props) => {
  return (
    <GenericWalletTab
      {...props}
      title="Earning Wallet Balance"
      hideZeroDefault={true}
    />
  );
};

export default EarningWalletTab;

