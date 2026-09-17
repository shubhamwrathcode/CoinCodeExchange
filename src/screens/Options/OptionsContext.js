import { createContext, useState } from "react";

export const OptionsContext = createContext();

export const OptionsContextProvider = ({ children }) => {
  const [orderBook, setOrderBook] = useState({ bids: [], asks: [] });
  const [selectedPair, setSelectedPair] = useState({});
  const [balance, setBalance] = useState(0);
  const [fees, setFees] = useState({});
  const [openOrder, setOpenOrder] = useState([]);
  const [openPositions, setOpenPositions] = useState([]);
  const [orderHistory, setOrderHistory] = useState([]);
  const [exerciseHistory, setExerciseHistory] = useState([]);
  const [contractList, setContractList] = useState([]);

  return (
    <OptionsContext.Provider
      value={{
        orderBook,
        setOrderBook,
        selectedPair,
        setSelectedPair,
        balance,
        setBalance,
        fees,
        setFees,
        openOrder,
        setOpenOrder,
        openPositions,
        setOpenPositions,
        orderHistory,
        setOrderHistory,
        exerciseHistory,
        setExerciseHistory,
        contractList,
        setContractList,
      }}
    >
      {children}
    </OptionsContext.Provider>
  );
};


