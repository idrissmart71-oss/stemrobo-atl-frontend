
import React from 'react';

export const ATL_FUNDING_LIMITS = {
  GROSS: {
    TOTAL: 2000000,
    TRANCHE_1: 1200000,
    TRANCHE_2: 400000,
    TRANCHE_3: 400000,
    T1_RECURRING: 200000,
    T1_NON_RECURRING: 1000000,
  },
  NET_WITH_TDS: {
    TOTAL: 1960000,
    TRANCHE_1: 1176000,
    TRANCHE_2: 392000,
    TRANCHE_3: 392000,
    T1_RECURRING: 200000,
    T1_NON_RECURRING: 976000,
  }
};

export const BRAND_HEADER = "Prepared with STEMROBO Technologies – ATL Compliance Assistant";
export const BRAND_FOOTER = "STEMROBO Technologies | ATL PFMS Audit Support";

export const StemroboLogo = () => (
  <div className="text-right italic text-xs text-slate-400 font-medium">
    [STEMROBO Technologies Logo]
  </div>
);

export const formatINR = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};
