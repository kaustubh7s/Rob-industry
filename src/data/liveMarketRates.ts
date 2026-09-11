// Live World Stainless Steel (SS) Market Rates & Metal Intelligence Dataset
// Sources: London Metal Exchange (LME), Shanghai Futures Exchange (SHFE), Mumbai Mandi (Kalamboli), Ahmedabad GIDC

export interface MarketRateItem {
  id: string;
  grade: string;
  form: 'Sheet / Plate' | 'Pipe / Tube' | 'Round Bar' | 'Flat Bar' | 'Scrap' | 'Base Metal';
  category: 'Austenitic' | 'Marine Grade' | 'Ferritic' | 'Duplex' | 'Raw Commodity';
  mumbaiRateINR: number; // ₹ per KG
  ahmedabadRateINR: number; // ₹ per KG
  delhiRateINR: number; // ₹ per KG
  globalRateUSD: number; // $ per Metric Tonne
  change24h: number; // percentage change in 24h
  sentiment: 'Bullish' | 'Bearish' | 'Stable';
  density: number; // g/cm3
  applications: string;
  lastUpdated: string;
  sparkline: number[]; // 7-day trend values in ₹/kg
}

export interface MetalIndexSummary {
  nickelLME: {
    priceUSD: number;
    changeUSD: number;
    changePct: number;
    status: 'Rising' | 'Falling' | 'Neutral';
  };
  mumbaiScrapSS304: {
    priceINR: number;
    changeINR: number;
    status: 'Up' | 'Down' | 'Steady';
  };
  usdinrRate: number;
  globalMarketStatus: 'Open - Live London Trading' | 'Closed - Settlement Active';
  lastSyncTimestamp: string;
}

export const METAL_INDEX_SUMMARY: MetalIndexSummary = {
  nickelLME: {
    priceUSD: 16420,
    changeUSD: +145,
    changePct: +0.89,
    status: 'Rising',
  },
  mumbaiScrapSS304: {
    priceINR: 148,
    changeINR: +2.5,
    status: 'Up',
  },
  usdinrRate: 83.74,
  globalMarketStatus: 'Open - Live London Trading',
  lastSyncTimestamp: 'Today, 20:45 IST',
};

export const LIVE_SS_RATES: MarketRateItem[] = [
  {
    id: 'ss304-flat',
    grade: 'SS 304',
    form: 'Flat Bar',
    category: 'Austenitic',
    mumbaiRateINR: 312,
    ahmedabadRateINR: 310,
    delhiRateINR: 314,
    globalRateUSD: 2840,
    change24h: +1.2,
    sentiment: 'Bullish',
    density: 7.93,
    applications: 'Mono Conveyors, Inlet Pattis, Machine Framing, Brackets',
    lastUpdated: '10 mins ago',
    sparkline: [305, 306, 308, 307, 310, 311, 312],
  },
  {
    id: 'ss304-sheet',
    grade: 'SS 304',
    form: 'Sheet / Plate',
    category: 'Austenitic',
    mumbaiRateINR: 298,
    ahmedabadRateINR: 295,
    delhiRateINR: 300,
    globalRateUSD: 2720,
    change24h: +0.8,
    sentiment: 'Bullish',
    density: 7.93,
    applications: 'Rotor Base Plates, Outer Covers, Washing Tanks, Baffles',
    lastUpdated: '12 mins ago',
    sparkline: [292, 294, 293, 296, 295, 297, 298],
  },
  {
    id: 'ss304-pipe',
    grade: 'SS 304',
    form: 'Pipe / Tube',
    category: 'Austenitic',
    mumbaiRateINR: 325,
    ahmedabadRateINR: 322,
    delhiRateINR: 328,
    globalRateUSD: 2950,
    change24h: +1.5,
    sentiment: 'Bullish',
    density: 7.93,
    applications: 'CIP Header Lines, Spray Manifolds, Structural Columns',
    lastUpdated: '8 mins ago',
    sparkline: [318, 320, 319, 322, 323, 324, 325],
  },
  {
    id: 'ss304-bar',
    grade: 'SS 304',
    form: 'Round Bar',
    category: 'Austenitic',
    mumbaiRateINR: 318,
    ahmedabadRateINR: 315,
    delhiRateINR: 320,
    globalRateUSD: 2890,
    change24h: -0.4,
    sentiment: 'Stable',
    density: 7.93,
    applications: 'Drive Shafts, Spindles, Star Wheel Pins, Rollers',
    lastUpdated: '15 mins ago',
    sparkline: [320, 321, 319, 318, 319, 318, 318],
  },
  {
    id: 'ss316-sheet',
    grade: 'SS 316',
    form: 'Sheet / Plate',
    category: 'Marine Grade',
    mumbaiRateINR: 428,
    ahmedabadRateINR: 425,
    delhiRateINR: 432,
    globalRateUSD: 3880,
    change24h: +2.1,
    sentiment: 'Bullish',
    density: 8.00,
    applications: 'Pharma Injectable Tanks, Acid Contact Chambers, Agitators',
    lastUpdated: '5 mins ago',
    sparkline: [415, 418, 420, 422, 424, 426, 428],
  },
  {
    id: 'ss316l-pipe',
    grade: 'SS 316L',
    form: 'Pipe / Tube',
    category: 'Marine Grade',
    mumbaiRateINR: 465,
    ahmedabadRateINR: 460,
    delhiRateINR: 470,
    globalRateUSD: 4210,
    change24h: +1.8,
    sentiment: 'Bullish',
    density: 8.00,
    applications: 'High-Purity WFI Water Lines, Bio-Reactor Headers, CIP Skids',
    lastUpdated: '7 mins ago',
    sparkline: [450, 452, 455, 458, 460, 462, 465],
  },
  {
    id: 'ss316l-bar',
    grade: 'SS 316L',
    form: 'Round Bar',
    category: 'Marine Grade',
    mumbaiRateINR: 448,
    ahmedabadRateINR: 442,
    delhiRateINR: 452,
    globalRateUSD: 4050,
    change24h: +0.6,
    sentiment: 'Stable',
    density: 8.00,
    applications: 'Sanitary Valve Plungers, Impeller Shafts, Precision Screws',
    lastUpdated: '20 mins ago',
    sparkline: [442, 444, 445, 446, 445, 447, 448],
  },
  {
    id: 'ss202-flat',
    grade: 'SS 202',
    form: 'Flat Bar',
    category: 'Ferritic',
    mumbaiRateINR: 162,
    ahmedabadRateINR: 158,
    delhiRateINR: 165,
    globalRateUSD: 1480,
    change24h: -1.1,
    sentiment: 'Bearish',
    density: 7.86,
    applications: 'Outer Guards, Non-Contact Supports, Foot Pedals',
    lastUpdated: '25 mins ago',
    sparkline: [168, 166, 165, 164, 163, 162, 162],
  },
  {
    id: 'ss-scrap-304',
    grade: 'SS 304 Scrap',
    form: 'Scrap',
    category: 'Raw Commodity',
    mumbaiRateINR: 148,
    ahmedabadRateINR: 146,
    delhiRateINR: 150,
    globalRateUSD: 1340,
    change24h: +1.7,
    sentiment: 'Bullish',
    density: 7.93,
    applications: 'Factory off-cuts, Turning scrap recovery value',
    lastUpdated: '10 mins ago',
    sparkline: [142, 143, 144, 145, 146, 147, 148],
  },
];
