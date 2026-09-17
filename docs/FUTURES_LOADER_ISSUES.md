# Futures Tab – Loader Kab True Reh Sakta Hai (Aur Kaise Resolve Karein)

## Ab kya fix ho chuka hai

1. **Focus pe loader false:** Jab Futures tab focus hota hai, `useFocusEffect` mein `dispatch(setLoading(false))` chal raha hai, isliye dusre screen se aate waqt Redux ka `auth.loading` clear ho jata hai aur screen use ho sakti hai.
2. **SpinnerSecond sirf API loading:** Bottom wala `SpinnerSecond` ab sirf `loading={isLoading}` use karta hai. Socket/pair wait state ab isse control nahi hoti – wo `isScreenLoading` (full-screen spinner) aur order book skeleton se handle hoti hai.

---

## Loader kab true reh sakta tha / ho sakta hai (debug checklist)

### 1. **`isLoading` (Redux) hamesha true**

- **Kaun set karta hai:** `dispatch(setLoading(true))` – Futures ke andar `placeFutureOrder`, `closePosition`, `placeReverseOrder` wagaira, ya koi API jo `finally` mein `setLoading(false)` na chala de.
- **Kaun clear karta hai:** `dispatch(setLoading(false))` – ab Futures ke **focus** pe bhi chal raha hai, isliye tab open karte hi loader utar jana chahiye agar sirf yehi reason ho.
- **Check:** Redux state `auth.loading` – agar true reh raha ho to koi action `setLoading(false)` miss kar raha hai.
- **Resolve:** Har API call ke `finally` mein `dispatch(setLoading(false))` confirm karo; aur Futures `useFocusEffect` pe jo `setLoading(false)` hai wo already focus pe clear kar raha hai.

### 2. **`selectedCoin?.short_name` empty (full-screen “load” na utre)**

- **Kya dikhega:** Poora screen spinner (jo `isScreenLoading` se dikh raha hai), kyunki condition hai: `isLoading || !selectedCoin?.short_name`.
- **Reason:** `selectedCoin` tab set hota hai jab `pairData` aata hai; `pairData` socket se `futuresData.pairs` se aata hai. Agar socket connect nahi hua, ya backend ne pairs nahi bheja, to `pairData` empty rehta hai aur `selectedCoin` set nahi hota.
- **Check:**  
  - Socket connected? (`isConnected` from `useFuturesSocket`).  
  - `subscribeToFutures()` call ho raha hai? (Futures **focus** pe `isFocused && isConnected && !pairData?.length` wala effect).  
  - Backend se `futuresData.pairs` aa raha hai?
- **Resolve:**  
  - Socket connect + `subscribeToFutures()` focus pe (already in place).  
  - Backend / network se pairs response verify karo.

### 3. **`futureSocketDataReceived` kab use hota tha**

- **Pehle:** Bottom SpinnerSecond `(!futureSocketDataReceived && isConnected) || !selectedCoin?.short_name` se bhi true ho jata tha – isliye socket data aane tak poora screen block ho sakta tha.
- **Ab:** SpinnerSecond sirf `isLoading` use karta hai. `futureSocketDataReceived` ab sirf order book skeleton ke liye use hota hai (`showOrderBookSkeleton`), jo screen block nahi karta.
- **Agar kabhi phir global loader socket pe lagana ho:** Alag prop/condition use karo; ab intentionally Futures pe SpinnerSecond sirf API loading ke liye hai taaki screen kaam kare.

### 4. **Dusre screen se aate waqt loader**

- **Pehle:** Wallet/Home wagaira pe `setLoading(true)` chalne se `auth.loading` true ho jata tha; Futures open karte hi SpinnerSecond dikh jata tha aur utarta nahi tha.
- **Ab:** Futures ke **focus** pe `dispatch(setLoading(false))` chal raha hai, isliye Futures tab kholte hi global loader false ho jata hai (agar koi Futures API khud `setLoading(true)` na kiye to).

---

## Short summary

| Issue | Ab kya hai | Resolve |
|-------|------------|--------|
| Loader focus pe na utre | Focus pe `setLoading(false)` | Done in `useFocusEffect` |
| SpinnerSecond hamesha dikhe | SpinnerSecond = sirf `isLoading` | Done |
| Full-screen spinner (selectedCoin empty) | `isScreenLoading` = `isLoading \|\| !selectedCoin?.short_name` | Pairs/socket check karo (subscribe on focus already hai) |
| Redux loading kabhi false na ho | Koi API `setLoading(false)` miss | Har API `finally` mein `setLoading(false)` |

Isse Futures tab pe focus aate hi loader clear ho jata hai aur screen use ho sakti hai; agar phir bhi koi case mein loader atak jaye to upar wali list se reason narrow down kar sakte ho.
