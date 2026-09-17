import React from "react";
import GenericWalletTab from "./GenericWalletTab";

const MainWalletTab = (props) => {
  return (
    <GenericWalletTab
      {...props}
      title="Main Wallet Balance"
      hideZeroDefault={false}
    />
  );
};

export default MainWalletTab;

