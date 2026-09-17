import React from "react";
import GenericWalletTab from "./GenericWalletTab";

const P2PWalletTab = (props) => {
  return (
    <GenericWalletTab
      {...props}
      title="P2P Wallet Balance"
      hideZeroDefault={true}
    />
  );
};

export default P2PWalletTab;

