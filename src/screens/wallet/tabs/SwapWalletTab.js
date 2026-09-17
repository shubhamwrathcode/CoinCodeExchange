import React from "react";
import GenericWalletTab from "./GenericWalletTab";

const SwapWalletTab = (props) => {
  return (
    <GenericWalletTab
      {...props}
      title="Swap Wallet Balance"
      hideZeroDefault={true}
    />
  );
};

export default SwapWalletTab;

