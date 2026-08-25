import { getMetro } from "./estimate.js";

const LOOKUPS = [
  {
    url: "https://ipwho.is/",
    parse: (data) => {
      if (!data || data.success === false) return null;
      return {
        city: data.city,
        region: data.region,
        regionCode: data.region_code,
        postal: data.postal,
        latitude: data.latitude,
        longitude: data.longitude,
        org: data.connection?.isp || data.connection?.org || "",
      };
    },
  },
  {
    url: "https://ipapi.co/json/",
    parse: (data) => {
      if (!data || data.error) return null;
      return {
        city: data.city,
        region: data.region,
        regionCode: data.region_code,
        postal: data.postal,
        latitude: data.latitude,
        longitude: data.longitude,
        org: data.org || "",
      };
    },
  },
];

const CITY_TO_METRO = {
  dfw: [
    "dallas",
    "fort worth",
    "arlington",
    "plano",
    "garland",
    "irving",
    "grand prairie",
    "mckinney",
    "frisco",
    "mesquite",
    "carrollton",
    "denton",
    "richardson",
    "lewisville",
    "allen",
    "flower mound",
    "mansfield",
    "euless",
    "grapevine",
    "bedford",
    "cedar hill",
    "the colony",
    "coppell",
    "southlake",
    "rowlett",
    "wylie",
    "keller",
    "little elm",
    "desoto",
    "haltom city",
    "burleson",
    "rockwall",
    "north richland hills",
    "hurst",
    "addison",
    "university park",
    "highland park",
    "farmer's branch",
    "farmers branch",
    "prosper",
    "celina",
    "midlothian",
    "waxahachie",
    "weatherford",
    "cleburne",
  ],
  atl: [
    "atlanta",
    "sandy springs",
    "roswell",
    "johns creek",
    "alpharetta",
    "marietta",
    "smyrna",
    "dunwoody",
    "brookhaven",
    "decatur",
    "east point",
    "college park",
    "tucker",
    "lawrenceville",
    "duluth",
    "kennesaw",
    "woodstock",
    "douglasville",
    "stockbridge",
    "mcdonough",
    "peachtree city",
    "peachtree corners",
    "norcross",
    "snellville",
    "lithonia",
    "stone mountain",
    "vinings",
  ],
  phx: [
    "phoenix",
    "mesa",
    "chandler",
    "scottsdale",
    "glendale",
    "gilbert",
    "tempe",
    "peoria",
    "surprise",
    "avondale",
    "goodyear",
    "buckeye",
    "fountain hills",
    "el mirage",
    "queen creek",
    "sun city",
    "paradise valley",
    "litchfield park",
    "tolleson",
    "cave creek",
    "anthem",
  ],
  clt: [
    "charlotte",
    "concord",
    "gastonia",
    "rock hill",
    "huntersville",
    "kannapolis",
    "indian trail",
    "mooresville",
    "matthews",
    "monroe",
    "cornelius",
    "mint hill",
    "pineville",
    "belmont",
    "harrisburg",
    "fort mill",
    "tega cay",
    "davidson",
    "waxhaw",
    "stallings",
  ],
  tpa: [
    "tampa",
    "st. petersburg",
    "st petersburg",
    "saint petersburg",
    "clearwater",
    "brandon",
    "riverview",
    "largo",
    "palm harbor",
    "pinellas park",
    "temple terrace",
    "dunedin",
    "plant city",
    "lutz",
    "land o lakes",
    "land o' lakes",
    "wesley chapel",
    "new port richey",
    "safety harbor",
    "oldsmar",
    "town n country",
    "town 'n' country",
    "apollo beach",
    "valrico",
    "seffner",
  ],
};

const ZIP_PREFIX = {
  dfw: [/^75[0-9]/, /^76[0-2]/],
  atl: [/^300/, /^301/, /^302/, /^303/, /^305/, /^311/],
  phx: [/^850/, /^851/, /^852/, /^853/],
  clt: [/^280/, /^281/, /^282/, /^297/],
  tpa: [/^336/, /^337/, /^335/, /^346/],
};

const BOUNDS = {
  dfw: { states: ["TX"], minLat: 32.25, maxLat: 33.45, minLng: -97.7, maxLng: -96.2 },
  atl: { states: ["GA"], minLat: 33.4, maxLat: 34.3, minLng: -84.85, maxLng: -83.85 },
  phx: { states: ["AZ"], minLat: 33.15, maxLat: 33.9, minLng: -112.55, maxLng: -111.55 },
  clt: { states: ["NC", "SC"], minLat: 34.95, maxLat: 35.55, minLng: -81.2, maxLng: -80.5 },
  tpa: { states: ["FL"], minLat: 27.7, maxLat: 28.35, minLng: -82.85, maxLng: -82.05 },
};

const METRO_STATES = {
  dfw: ["TX"],
  atl: ["GA"],
  phx: ["AZ"],
  clt: ["NC", "SC"],
  tpa: ["FL"],
};

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function looksLikeVpn(org) {
  const text = normalize(org);
  return /\b(vpn|proxy|tor exit|anonymiz)\b/.test(text);
}

export function matchMetroFromGeo(geo) {
  if (!geo) return null;
  const city = normalize(geo.city);
  const regionCode = String(geo.regionCode || "").toUpperCase();
  const postal = String(geo.postal || "").replace(/\s/g, "");
  const lat = Number(geo.latitude);
  const lng = Number(geo.longitude);

  if (!city && !postal && !Number.isFinite(lat)) return null;
  if (looksLikeVpn(geo.org)) return null;

  for (const [id, cities] of Object.entries(CITY_TO_METRO)) {
    if (city && cities.includes(city)) {
      if (!regionCode || METRO_STATES[id].includes(regionCode)) return id;
    }
  }

  if (/^\d{5}/.test(postal)) {
    for (const [id, prefixes] of Object.entries(ZIP_PREFIX)) {
      if (prefixes.some((re) => re.test(postal))) return id;
    }
  }

  if (Number.isFinite(lat) && Number.isFinite(lng) && regionCode) {
    for (const [id, box] of Object.entries(BOUNDS)) {
      if (
        box.states.includes(regionCode) &&
        lat >= box.minLat &&
        lat <= box.maxLat &&
        lng >= box.minLng &&
        lng <= box.maxLng
      ) {
        return id;
      }
    }
  }

  return null;
}

async function fetchJson(url, ms = 2500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function readForcedGeo() {
  try {
    const raw = sessionStorage.getItem("curbquote.forceGeo");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function detectMetroFromIp() {
  const forced = readForcedGeo();
  if (forced) {
    return { metroId: matchMetroFromGeo(forced), geo: forced };
  }

  for (const lookup of LOOKUPS) {
    const raw = await fetchJson(lookup.url);
    const geo = lookup.parse(raw);
    const metroId = matchMetroFromGeo(geo);
    if (metroId && getMetro(metroId)) {
      return { metroId, geo };
    }
    if (geo && (geo.city || geo.postal)) {
      return { metroId: null, geo };
    }
  }
  return { metroId: null, geo: null };
}
