export const METROS = [
  {
    id: "tpa",
    name: "Tampa Bay",
    region: "West Central Florida",
    rateLow: 2.75,
    rateHigh: 4.7,
  },
  {
    id: "dfw",
    name: "Dallas–Fort Worth",
    region: "North Texas",
    rateLow: 2.8,
    rateHigh: 4.6,
  },
  {
    id: "atl",
    name: "Atlanta",
    region: "Metro Atlanta",
    rateLow: 2.6,
    rateHigh: 4.4,
  },
  {
    id: "phx",
    name: "Phoenix",
    region: "Valley of the Sun",
    rateLow: 2.5,
    rateHigh: 4.2,
  },
  {
    id: "clt",
    name: "Charlotte",
    region: "Carolinas",
    rateLow: 2.7,
    rateHigh: 4.5,
  },
];

export const CONDITIONS = [
  {
    id: "good",
    label: "Good",
    hint: "Holding up. Mostly a color change or refresh.",
    multiplier: 0.9,
  },
  {
    id: "fair",
    label: "Fair",
    hint: "Faded, chalky, or patchy. A typical repaint.",
    multiplier: 1,
  },
  {
    id: "poor",
    label: "Poor",
    hint: "Peeling, cracking, or bare wood. Extra prep.",
    multiplier: 1.28,
  },
];

export const TIMELINES = [
  { id: "asap", label: "As soon as we can" },
  { id: "season", label: "This season" },
  { id: "research", label: "Just getting a number" },
];

const DEFAULT_SQFT = { 1: 1800, 2: 2400 };
const STORY_MULT = { 1: 1, 2: 1.12 };
const TRIM_MULT = 1.18;

export function getMetro(id) {
  return METROS.find((metro) => metro.id === id) ?? null;
}

function roundHundred(value) {
  return Math.round(value / 100) * 100;
}

export function calculateEstimate({
  metroId,
  stories,
  sqft,
  sqftUnknown,
  condition,
  trim,
}) {
  const metro = getMetro(metroId);
  if (!metro) return null;

  const storyCount = stories === 2 ? 2 : 1;
  const assumed = sqftUnknown || !sqft;
  const baseSqft = assumed ? DEFAULT_SQFT[storyCount] : Number(sqft);
  const conditionMult =
    CONDITIONS.find((item) => item.id === condition)?.multiplier ?? 1;
  const storyMult = STORY_MULT[storyCount];
  const trimMult = trim ? TRIM_MULT : 1;

  const low = roundHundred(
    baseSqft * metro.rateLow * conditionMult * storyMult * trimMult,
  );
  const high = roundHundred(
    baseSqft * metro.rateHigh * conditionMult * storyMult * trimMult,
  );

  return {
    low: Math.max(low, 1500),
    high: Math.max(high, low + 800),
    baseSqft,
    assumed,
    rateLow: metro.rateLow,
    rateHigh: metro.rateHigh,
    metro,
  };
}

export function formatMoney(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}
