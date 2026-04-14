// src/contexts/CalculationContext.jsx
import { createContext, useContext, useState } from 'react';

const CalculationContext = createContext();

export function CalculationProvider({ children }) {
  const [results, setResults] = useState(null);
  const [itemRecord, setItemRecord] = useState([]);

  return (
    <CalculationContext.Provider
      value={{
        results,
        setResults,
        itemRecord,
        setItemRecord,
      }}
    >
      {children}
    </CalculationContext.Provider>
  );
}

export function useCalculation() {
  return useContext(CalculationContext);
}