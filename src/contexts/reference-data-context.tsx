import React, { createContext, useContext, useEffect, useState } from "react";
import {
  getReferenceData,
  peekCachedReferenceData,
  ReferenceData,
} from "../lib/reference-data";

type ReferenceDataContextType = {
  data: ReferenceData | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

const ReferenceDataContext = createContext<ReferenceDataContextType>({
  data: null,
  loading: true,
  refresh: async () => {},
});

export function ReferenceDataProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [data, setData] = useState<ReferenceData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async (force = false) => {
    if (!force) {
      const cached = await peekCachedReferenceData();
      if (cached) {
        setData(cached);
        setLoading(false);
      }
    }
    try {
      const fresh = await getReferenceData({ force });
      setData(fresh);
    } catch (err) {
      console.error("Failed to load reference data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <ReferenceDataContext.Provider
      value={{ data, loading, refresh: () => load(true) }}
    >
      {children}
    </ReferenceDataContext.Provider>
  );
}

export const useReferenceData = () => useContext(ReferenceDataContext);