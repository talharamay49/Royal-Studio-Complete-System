export type ChatbotPersonaTone =
  | "Luxury Editorial"
  | "Warm & Personal"
  | "Executive Concierge"
  | "Custom";

export type ChatbotKnowledgeCategory =
  | "Packages & Pricing"
  | "Custom Add-ons & Rates"
  | "Studio Logistics & FAQ";

export interface ChatbotKnowledgeEntry {
  id: string;
  category: ChatbotKnowledgeCategory;
  title: string;
  keywords: string[];
  content: string;
  ratePKR?: number;
  metaBadge?: string;
}

export interface ChatbotEventTypeOption {
  id: string;
  label: string;
  baseRatePKR: number;
  defaultDays: number;
  isMultiDay: boolean;
  recommendedSetup: string;
}

export interface ChatbotCoverageTierOption {
  id: string;
  label: string;
  hoursLabel: string;
  teamLabel: string;
  additionalRatePKR: number;
}

export interface ChatbotAddonOption {
  id: string;
  label: string;
  ratePKR: number;
  description: string;
}

export interface ChatbotConfig {
  enabled: boolean;
  botName: string;
  statusLabel: string;
  welcomeGreeting: string;
  personaTone: ChatbotPersonaTone;
  systemInstructions: string;
  dynamicPromptRules: string;
  knowledgeBase: ChatbotKnowledgeEntry[];
  decisionTree: {
    guidedFlowEnabled: boolean;
    autoCalculatorEnabled: boolean;
    step1Prompt: string;
    step2Prompt: string;
    step3Prompt: string;
    step4Prompt: string;
    popularCities: string[];
    multiDayDiscountPercent: number;
    bookingDepositPercent: number;
    outOfCityTravelSurchargePKR: number;
    homeBaseCities: string[];
    eventTypes: ChatbotEventTypeOption[];
    coverageTiers: ChatbotCoverageTierOption[];
    addons: ChatbotAddonOption[];
  };
  leadHandshake: {
    autoConvertCompletedToCrmLead: boolean;
    whatsappDirectHandoffEnabled: boolean;
    defaultLeadStatus: "New" | "Contacted";
  };
  engineSettings: {
    mode: "LOCAL_ENGINE" | "HYBRID_GEMINI_FREE";
    optionalGeminiModel: string;
  };
  updatedAt?: string;
}

export interface ChatbotInquiryDraft {
  eventTypeId?: string;
  eventTypeLabel?: string;
  eventDate?: string;
  city?: string;
  venue?: string;
  coverageTierId?: string;
  coverageTierLabel?: string;
  selectedAddonIds: string[];
  clientName?: string;
  clientPhone?: string;
  clientNotes?: string;
}

export interface ChatbotEstimateBreakdown {
  eventTypeLabel: string;
  baseRatePKR: number;
  coverageTierLabel: string;
  hoursLabel: string;
  teamLabel: string;
  coverageUpgradePKR: number;
  selectedAddons: { id: string; label: string; ratePKR: number }[];
  addonsTotalPKR: number;
  city: string;
  eventDate: string;
  travelSurchargePKR: number;
  subtotalPKR: number;
  isMultiDayDiscountApplied: boolean;
  multiDayDiscountPercent: number;
  discountAmountPKR: number;
  estimatedTotalPKR: number;
  depositPercent: number;
  depositAmountPKR: number;
  recommendedLensNote: string;
}

export interface ChatbotMessage {
  id: string;
  sender: "bot" | "user";
  text: string;
  timestamp: string;
  stepTag?: "STEP_1_EVENT" | "STEP_2_DATE_CITY" | "STEP_3_COVERAGE" | "STEP_4_ADDONS" | "SUMMARY";
  showEstimateCard?: boolean;
  matchedKnowledgeTitle?: string;
}

export const CHATBOT_STORAGE_KEY = "royal_studio_chatbot_config_v1";
export const CHATBOT_SYNC_CHANNEL = "royal_studio_chatbot_sync_v1";

export const defaultChatbotConfig: ChatbotConfig = {
  enabled: true,
  botName: "Royal Assistant",
  statusLabel: "Online — Royal Assistant",
  welcomeGreeting:
    "Assalam-o-Alaikum! Welcome to Royal Studio. I am your automated wedding coverage & sales concierge. Use the guided planner below for an instant package estimate, or ask me anything about our rates, drone setups, and dates.",
  personaTone: "Luxury Editorial",
  systemInstructions:
    "You are the official Royal Assistant for Royal Studio (founded in 2018 by Muhammad Ramzan & Talha Ramay in Burewala, Punjab, serving weddings across all of Pakistan). Speak with a refined, editorial, warm, and luxury tone. Provide transparent PKR pricing, highlight our 3,000+ documented weddings, and guide couples toward locking their wedding dates with confidence.",
  dynamicPromptRules:
    "• Always emphasize our 10% Multi-Day Wedding Discount when couples inquire about full weddings (Mehndi, Barat & Walima).\n• Suggest Sony A7R V + 85mm f/1.4 GM prime portrait setups for outdoor, bridal, and golden-hour events.\n• Remind couples that a 50% booking deposit locks their dates and dedicated cinema crew, with guaranteed 20-day delivery.",
  knowledgeBase: [
    {
      id: "kb-pkg-essential",
      category: "Packages & Pricing",
      title: "Essential Single-Event Package",
      keywords: ["essential", "basic", "50000", "50,000", "single day", "nikah", "engagement", "intimate", "cheap", "starting", "minimum"],
      content:
        "Our Essential Package starts at PKR 50,000 for single-day intimate celebrations (Nikah, Engagement, or Single Function). It includes 6 hours of coverage, 1 Senior Photographer + 1 Cinematographer, 300+ signature color-graded photos, a cinematic highlight film, and online digital delivery within 20 days.",
      ratePKR: 50000,
      metaBadge: "PKR 50,000 · 6 Hours · 2 Crew",
    },
    {
      id: "kb-pkg-premium",
      category: "Packages & Pricing",
      title: "Premium Full-Day Wedding Package",
      keywords: ["premium", "popular", "150000", "150,000", "barat", "baraat", "walima", "full day", "package", "packages", "price", "pricing", "rate", "rates", "cost"],
      content:
        "Our most popular Premium Package starts at PKR 150,000 for full wedding coverage. It includes up to 10 hours of photo + 4K film coverage, 2 Senior Photographers + 1 Sony FX3 Cinematographer, 600+ edited editorial photos, a 5–8 minute cinematic highlight film, Drone 4K aerial coverage (venue permitting), custom luxury album design, and social media reels.",
      ratePKR: 150000,
      metaBadge: "PKR 150,000 · 10 Hours · 3–4 Crew",
    },
    {
      id: "kb-pkg-signature",
      category: "Packages & Pricing",
      title: "Royal Signature Multi-Day Experience",
      keywords: ["signature", "royal", "300000", "300,000", "multi-day", "multiday", "3 day", "complete wedding", "mehndi barat walima", "luxury", "vip"],
      content:
        "The Royal Signature Package (up to PKR 300,000) is our flagship multi-day luxury production covering Nikah, Mehndi, Baraat, and Walima. It deploys a 10–15 member creative crew, multi-camera 4K Sony FX3/FX6 cinema rigs, 85mm f/1.4 GM bridal portrait lighting, Drone + 3-Axis Gimbal coverage, 1,000+ edited portraits, a feature-length film, handcrafted Italian leather heirloom album, and priority 15-day delivery.",
      ratePKR: 300000,
      metaBadge: "PKR 300,000 · Multi-Day · 10–15 Crew",
    },
    {
      id: "kb-addon-drone",
      category: "Custom Add-ons & Rates",
      title: "4K Drone Aerial Coverage",
      keywords: ["drone", "aerial", "mavic", "flying", "baraat entry", "venue aerial"],
      content:
        "4K Drone Aerial Cinematography is available as a custom add-on at PKR 15,000 per event day (and included in our Royal Signature tier). Ideal for grand Baraat arrivals, colored smoke entries, and sweeping outdoor marquee reveals.",
      ratePKR: 15000,
      metaBadge: "PKR 15,000 / Event",
    },
    {
      id: "kb-addon-album",
      category: "Custom Add-ons & Rates",
      title: "Handcrafted Luxury Heirloom Album",
      keywords: ["album", "albums", "photobook", "book", "print", "leather", "spreads", "hardcover"],
      content:
        "Our museum-grade Handcrafted Luxury Wedding Albums are PKR 25,000 per book (40 lay-flat archival spreads with bespoke velvet or Italian leather casing and Acrylic cameo cover). Every spread is custom-designed and approved by you before printing.",
      ratePKR: 25000,
      metaBadge: "PKR 25,000 / Album",
    },
    {
      id: "kb-addon-sde",
      category: "Custom Add-ons & Rates",
      title: "Same-Day Edit (SDE) & Instant Instagram Reels",
      keywords: ["same day", "sde", "reel", "reels", "instagram", "tiktok", "fast edit", "highlight"],
      content:
        "Our Same-Day Edit (SDE) & Viral Social Reel add-on is PKR 20,000. An on-site editor cuts a high-energy 60–90 second 4K vertical reel for screening at the reception or sharing on Instagram within 24 hours.",
      ratePKR: 20000,
      metaBadge: "PKR 20,000 / Event",
    },
    {
      id: "kb-addon-gimbal",
      category: "Custom Add-ons & Rates",
      title: "3-Axis Cinema Gimbal & 85mm Portrait Lighting Setup",
      keywords: ["gimbal", "stabilizer", "85mm", "lens", "outdoor", "portrait", "lighting", "strobe", "sony", "equipment", "camera"],
      content:
        "Our dedicated 3-Axis Cinema Gimbal & 85mm f/1.4 GM Outdoor Portrait Lighting Rig add-on is PKR 12,000. For outdoor and garden events, we strongly recommend our Sony A7R V paired with the 85mm f/1.4 GM prime lens and Profoto softbox modifiers for magazine-grade bokeh.",
      ratePKR: 12000,
      metaBadge: "PKR 12,000 / Setup",
    },
    {
      id: "kb-logistics-location",
      category: "Studio Logistics & FAQ",
      title: "Studio Location & Nationwide Travel Policy",
      keywords: ["location", "address", "where", "burewala", "lahore", "islamabad", "multan", "vehari", "sahiwal", "travel", "destination", "out of city", "office"],
      content:
        "Royal Studio is headquartered at Al Jannat Town Entrance, Canal Bungalow Road, Opposite Habib Mall, Burewala (Punjab). We cover weddings across all of Pakistan including Lahore, Islamabad, Multan, Faisalabad, Sahiwal, and Bahawalpur. Events in Burewala & Vehari have zero travel fee; out-of-city productions carry a flat PKR 15,000 crew travel & logistics allowance.",
      ratePKR: 15000,
      metaBadge: "Burewala HQ · Nationwide",
    },
    {
      id: "kb-logistics-deposit",
      category: "Studio Logistics & FAQ",
      title: "Booking Deposit Percentage & Payment Schedule",
      keywords: ["deposit", "advance", "payment", "pay", "installment", "booking", "confirm", "lock", "bank", "cancel", "refund"],
      content:
        "To officially lock your wedding dates and reserve our senior camera crew, a 50% advance booking deposit is required upon contract approval. The remaining balance is split 30% on the main event day and 20% upon final deliverable handover. Deposits are transferable to a new date within 12 months.",
      metaBadge: "50% Advance Deposit",
    },
    {
      id: "kb-logistics-delivery",
      category: "Studio Logistics & FAQ",
      title: "Delivery Timelines & Express Turnaround",
      keywords: ["delivery", "timeline", "how long", "days", "turnaround", "when", "photos", "video", "urgent", "fast"],
      content:
        "Our standard delivery timeline is a fast 20 working days for your color-graded online photo gallery and 4K cinematic highlight film. Couples who select our Express Priority add-on receive full digital delivery within 10 working days.",
      metaBadge: "20-Day Standard · 10-Day Express",
    },
  ],
  decisionTree: {
    guidedFlowEnabled: true,
    autoCalculatorEnabled: true,
    step1Prompt: "Step 1 of 4 · Which wedding celebration or event are we planning coverage for?",
    step2Prompt: "Step 2 of 4 · What is your preferred event date and city/venue?",
    step3Prompt: "Step 3 of 4 · How many coverage hours and what crew size do you require?",
    step4Prompt: "Step 4 of 4 · Select any custom add-ons (Drone, Luxury Album, Fast Delivery) to finalize your instant package estimate:",
    popularCities: ["Burewala", "Lahore", "Multan", "Islamabad", "Faisalabad", "Sahiwal"],
    multiDayDiscountPercent: 10,
    bookingDepositPercent: 50,
    outOfCityTravelSurchargePKR: 15000,
    homeBaseCities: ["burewala", "vehari"],
    eventTypes: [
      {
        id: "evt-wedding-full",
        label: "Wedding (Multi-Day: Mehndi, Baraat & Walima)",
        baseRatePKR: 165000,
        defaultDays: 3,
        isMultiDay: true,
        recommendedSetup: "Sony A7R V 85mm f/1.4 GM Bridal Portrait Rig + Dual FX3 4K Cinema Crew",
      },
      {
        id: "evt-baraat",
        label: "Baraat",
        baseRatePKR: 65000,
        defaultDays: 1,
        isMultiDay: false,
        recommendedSetup: "Sony A7R V + 85mm f/1.4 GM Prime + FX3 Gimbal Procession Setup",
      },
      {
        id: "evt-walima",
        label: "Walima",
        baseRatePKR: 60000,
        defaultDays: 1,
        isMultiDay: false,
        recommendedSetup: "Editorial Stage Lighting + 85mm f/1.4 GM Couple Portrait Setup",
      },
      {
        id: "evt-engagement",
        label: "Engagement",
        baseRatePKR: 45000,
        defaultDays: 1,
        isMultiDay: false,
        recommendedSetup: "Intimate Documentary Photo + 4K Highlight Reel Setup",
      },
      {
        id: "evt-prewedding",
        label: "Pre-wedding",
        baseRatePKR: 40000,
        defaultDays: 1,
        isMultiDay: false,
        recommendedSetup: "Outdoor Golden-Hour 85mm f/1.4 GM Editorial Portrait Session",
      },
    ],
    coverageTiers: [
      {
        id: "cov-6h-essential",
        label: "6 Hours · 2-Member Core Crew",
        hoursLabel: "6 Hours Coverage",
        teamLabel: "1 Senior Photographer + 1 Cinematographer",
        additionalRatePKR: 0,
      },
      {
        id: "cov-10h-premium",
        label: "Full Day (10 Hours) · 4-Member Editorial Team",
        hoursLabel: "10 Hours Coverage",
        teamLabel: "2 Photographers + 1 Cinematographer + 1 Lighting Asst",
        additionalRatePKR: 35000,
      },
      {
        id: "cov-multiday-royal",
        label: "Royal Signature Crew (12+ Hours / Multi-Cam)",
        hoursLabel: "12+ Hours / Full Event Window",
        teamLabel: "3 Photographers + 2 Cinematographers + Director (6–10 Crew)",
        additionalRatePKR: 75000,
      },
    ],
    addons: [
      {
        id: "addon-drone",
        label: "4K Drone Aerial Coverage",
        ratePKR: 15000,
        description: "Aerial venue reveals, Baraat procession & couple overhead shots",
      },
      {
        id: "addon-album",
        label: "Handcrafted Luxury Album",
        ratePKR: 25000,
        description: "40 lay-flat archival spreads with Italian leather cover",
      },
      {
        id: "addon-fast-delivery",
        label: "Fast 10-Day Priority Delivery",
        ratePKR: 18000,
        description: "Express editing & delivery in 10 working days (vs 20-day standard)",
      },
      {
        id: "addon-sde",
        label: "Same-Day Edit (SDE) Reel",
        ratePKR: 20000,
        description: "60-second 4K vertical reel delivered within 24 hours",
      },
      {
        id: "addon-gimbal-85mm",
        label: "3-Axis Gimbal & 85mm Outdoor Setup",
        ratePKR: 12000,
        description: "Dedicated stabilizer + Profoto outdoor 85mm portrait lighting",
      },
    ],
  },
  leadHandshake: {
    autoConvertCompletedToCrmLead: true,
    whatsappDirectHandoffEnabled: true,
    defaultLeadStatus: "New",
  },
  engineSettings: {
    mode: "HYBRID_GEMINI_FREE",
    optionalGeminiModel: "gemini-2.5-flash",
  },
};

export function sanitizeChatbotConfig(raw?: Partial<ChatbotConfig> | null): ChatbotConfig {
  if (!raw || typeof raw !== "object") {
    return JSON.parse(JSON.stringify(defaultChatbotConfig));
  }
  return {
    ...defaultChatbotConfig,
    ...raw,
    knowledgeBase:
      Array.isArray(raw.knowledgeBase) && raw.knowledgeBase.length > 0
        ? raw.knowledgeBase
        : defaultChatbotConfig.knowledgeBase,
    decisionTree: {
      ...defaultChatbotConfig.decisionTree,
      ...(raw.decisionTree || {}),
      eventTypes:
        Array.isArray(raw.decisionTree?.eventTypes) && raw.decisionTree!.eventTypes.length > 0
          ? raw.decisionTree!.eventTypes
          : defaultChatbotConfig.decisionTree.eventTypes,
      coverageTiers:
        Array.isArray(raw.decisionTree?.coverageTiers) && raw.decisionTree!.coverageTiers.length > 0
          ? raw.decisionTree!.coverageTiers
          : defaultChatbotConfig.decisionTree.coverageTiers,
      addons:
        Array.isArray(raw.decisionTree?.addons) && raw.decisionTree!.addons.length > 0
          ? raw.decisionTree!.addons
          : defaultChatbotConfig.decisionTree.addons,
      popularCities:
        Array.isArray(raw.decisionTree?.popularCities) && raw.decisionTree!.popularCities.length > 0
          ? raw.decisionTree!.popularCities
          : defaultChatbotConfig.decisionTree.popularCities,
      homeBaseCities:
        Array.isArray(raw.decisionTree?.homeBaseCities) && raw.decisionTree!.homeBaseCities.length > 0
          ? raw.decisionTree!.homeBaseCities
          : defaultChatbotConfig.decisionTree.homeBaseCities,
    },
    leadHandshake: {
      ...defaultChatbotConfig.leadHandshake,
      ...(raw.leadHandshake || {}),
    },
    engineSettings: {
      ...defaultChatbotConfig.engineSettings,
      ...(raw.engineSettings || {}),
    },
  };
}

export function loadChatbotConfigFromLocal(): ChatbotConfig {
  if (typeof window === "undefined") {
    return defaultChatbotConfig;
  }
  try {
    const raw = window.localStorage.getItem(CHATBOT_STORAGE_KEY);
    if (!raw) return defaultChatbotConfig;
    const parsed = JSON.parse(raw);
    return sanitizeChatbotConfig(parsed);
  } catch {
    return defaultChatbotConfig;
  }
}

export function saveChatbotConfigToLocal(config: ChatbotConfig): void {
  if (typeof window === "undefined") return;
  try {
    const clean = sanitizeChatbotConfig({
      ...config,
      updatedAt: new Date().toISOString(),
    });
    window.localStorage.setItem(CHATBOT_STORAGE_KEY, JSON.stringify(clean));
    window.dispatchEvent(new CustomEvent("royalstudio:chatbot-updated", { detail: clean }));
    if ("BroadcastChannel" in window) {
      const ch = new BroadcastChannel(CHATBOT_SYNC_CHANNEL);
      ch.postMessage({ type: "CHATBOT_CONFIG_UPDATED", config: clean });
      ch.close();
    }
  } catch {
    // Ignore storage quota errors
  }
}

export function calculateChatbotEstimate(
  config: ChatbotConfig,
  draft: ChatbotInquiryDraft
): ChatbotEstimateBreakdown {
  const dt = config.decisionTree;
  const eventObj =
    dt.eventTypes.find((e) => e.id === draft.eventTypeId) ||
    dt.eventTypes.find(
      (e) => e.label.toLowerCase() === (draft.eventTypeLabel || "").toLowerCase()
    ) ||
    dt.eventTypes[0];

  const coverageObj =
    dt.coverageTiers.find((c) => c.id === draft.coverageTierId) ||
    dt.coverageTiers[0];

  const selectedAddons = (draft.selectedAddonIds || [])
    .map((id) => dt.addons.find((a) => a.id === id))
    .filter((a): a is ChatbotAddonOption => Boolean(a))
    .map((a) => ({ id: a.id, label: a.label, ratePKR: a.ratePKR }));

  const baseRatePKR = Number(eventObj?.baseRatePKR || 50000);
  const coverageUpgradePKR = Number(coverageObj?.additionalRatePKR || 0);
  const addonsTotalPKR = selectedAddons.reduce((sum, a) => sum + Number(a.ratePKR || 0), 0);

  const cityClean = (draft.city || "Burewala").trim();
  const isHomeBase = dt.homeBaseCities.some((hb) =>
    cityClean.toLowerCase().includes(hb.toLowerCase())
  );
  const travelSurchargePKR =
    cityClean && !isHomeBase ? Number(dt.outOfCityTravelSurchargePKR || 0) : 0;

  const subtotalPKR = baseRatePKR + coverageUpgradePKR + addonsTotalPKR + travelSurchargePKR;

  const isMultiDayDiscountApplied =
    Boolean(eventObj?.isMultiDay) && Number(dt.multiDayDiscountPercent || 0) > 0;
  const multiDayDiscountPercent = isMultiDayDiscountApplied
    ? Number(dt.multiDayDiscountPercent || 0)
    : 0;
  const discountAmountPKR = isMultiDayDiscountApplied
    ? Math.round((subtotalPKR * multiDayDiscountPercent) / 100)
    : 0;

  const estimatedTotalPKR = Math.max(0, subtotalPKR - discountAmountPKR);
  const depositPercent = Number(dt.bookingDepositPercent || 50);
  const depositAmountPKR = Math.round((estimatedTotalPKR * depositPercent) / 100);

  return {
    eventTypeLabel: eventObj?.label || "Wedding Coverage",
    baseRatePKR,
    coverageTierLabel: coverageObj?.label || "Standard Coverage",
    hoursLabel: coverageObj?.hoursLabel || "6 Hours",
    teamLabel: coverageObj?.teamLabel || "1 Photographer + 1 Cinematographer",
    coverageUpgradePKR,
    selectedAddons,
    addonsTotalPKR,
    city: cityClean || "Burewala",
    eventDate: draft.eventDate || "Flexible 2026–2027 Date",
    travelSurchargePKR,
    subtotalPKR,
    isMultiDayDiscountApplied,
    multiDayDiscountPercent,
    discountAmountPKR,
    estimatedTotalPKR,
    depositPercent,
    depositAmountPKR,
    recommendedLensNote:
      eventObj?.recommendedSetup ||
      "Sony A7R V + 85mm f/1.4 GM Portrait Setup & 4K FX3 Cinema Rig",
  };
}

export function matchKnowledgeBaseAndRespond(
  userQuery: string,
  config: ChatbotConfig,
  draft: ChatbotInquiryDraft,
  preferredLang: "AUTO" | "EN" | "ROMAN_URDU" = "AUTO"
): {
  reply: string;
  matchedEntry?: ChatbotKnowledgeEntry;
  extractedDraftUpdates?: Partial<ChatbotInquiryDraft>;
  detectedLanguage: "EN" | "ROMAN_URDU";
} {
  const q = userQuery.toLowerCase().trim();
  const detectedLang =
    preferredLang === "AUTO" ? detectLanguageMode(userQuery) : preferredLang;
  const extracted: Partial<ChatbotInquiryDraft> = {};

  // 1. Check if user mentioned an event type in free text (English, Roman Urdu, or Urdu script)
  for (const evt of config.decisionTree.eventTypes) {
    const firstWord = evt.label.split(/[\s(]/)[0].toLowerCase();
    if (firstWord && q.includes(firstWord)) {
      extracted.eventTypeId = evt.id;
      extracted.eventTypeLabel = evt.label;
      break;
    }
  }
  if (!extracted.eventTypeId) {
    if (
      q.includes("barat") ||
      q.includes("baraat") ||
      q.includes("برات") ||
      q.includes("بارات")
    ) {
      const baratOpt = config.decisionTree.eventTypes.find((e) =>
        e.label.toLowerCase().includes("bara")
      );
      if (baratOpt) {
        extracted.eventTypeId = baratOpt.id;
        extracted.eventTypeLabel = baratOpt.label;
      }
    } else if (
      q.includes("walima") ||
      q.includes("valima") ||
      q.includes("ولیمہ")
    ) {
      const walimaOpt = config.decisionTree.eventTypes.find((e) =>
        e.label.toLowerCase().includes("walima")
      );
      if (walimaOpt) {
        extracted.eventTypeId = walimaOpt.id;
        extracted.eventTypeLabel = walimaOpt.label;
      }
    } else if (
      q.includes("mehndi") ||
      q.includes("full wedding") ||
      q.includes("multi") ||
      q.includes("shadi") ||
      q.includes("shaadi") ||
      q.includes("شادی") ||
      q.includes("مہندی")
    ) {
      const wedOpt = config.decisionTree.eventTypes.find((e) => e.isMultiDay);
      if (wedOpt) {
        extracted.eventTypeId = wedOpt.id;
        extracted.eventTypeLabel = wedOpt.label;
      }
    }
  }

  // 2. Check if user mentioned a city
  const knownCities = [
    ...config.decisionTree.popularCities,
    "Vehari",
    "Bahawalpur",
    "Chishtian",
    "Rawalpindi",
    "Karachi",
    "Gujranwala",
  ];
  for (const c of knownCities) {
    if (q.includes(c.toLowerCase())) {
      extracted.city = c;
      break;
    }
  }

  // Normalize Urdu/Roman Urdu synonyms for better Knowledge Base matching
  const normalizedQuery = [
    q,
    q.includes("shadi") || q.includes("shaadi") || q.includes("شادی")
      ? "wedding package price"
      : "",
    q.includes("qeemat") ||
    q.includes("kimat") ||
    q.includes("kharcha") ||
    q.includes("kitna") ||
    q.includes("kitni") ||
    q.includes("قیمت")
      ? "price rate package"
      : "",
    q.includes("drone") || q.includes("ڈرون") ? "drone aerial" : "",
    q.includes("album") || q.includes("البم") ? "album" : "",
    q.includes("advance") || q.includes("biana") || q.includes("bayana")
      ? "deposit booking"
      : "",
  ].join(" ");

  // 3. Score Knowledge Base entries
  let bestEntry: ChatbotKnowledgeEntry | undefined;
  let bestScore = 0;

  const queryTokens = normalizedQuery
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);

  for (const item of config.knowledgeBase) {
    let score = 0;
    const titleLower = item.title.toLowerCase();
    const contentLower = item.content.toLowerCase();

    for (const kw of item.keywords) {
      const kwLower = kw.toLowerCase().trim();
      if (!kwLower) continue;
      if (normalizedQuery.includes(kwLower)) {
        score += 5;
      }
    }

    for (const token of queryTokens) {
      if (titleLower.includes(token)) score += 3;
      if (contentLower.includes(token)) score += 1;
    }

    if (score > bestScore) {
      bestScore = score;
      bestEntry = item;
    }
  }

  // Build rule-aware suffix from Admin's Dynamic Prompt Rules
  const rulesLower = config.dynamicPromptRules.toLowerCase();
  const extraRuleTips: string[] = [];

  if (
    (normalizedQuery.includes("outdoor") ||
      normalizedQuery.includes("portrait") ||
      normalizedQuery.includes("bridal") ||
      normalizedQuery.includes("pre-wedding") ||
      normalizedQuery.includes("lens") ||
      normalizedQuery.includes("day")) &&
    rulesLower.includes("85mm")
  ) {
    extraRuleTips.push(
      detectedLang === "ROMAN_URDU"
        ? "Studio Tip: Outdoor aur bridal shoots ke liye hum Sony A7R V ke sath 85mm f/1.4 GM portrait lens aur Profoto lighting use karte hain."
        : "Studio Recommendation: For outdoor and bridal sessions, our creative directors pair the Sony A7R V with the 85mm f/1.4 GM prime lens and Profoto modifiers for creamy editorial depth."
    );
  }

  if (
    (normalizedQuery.includes("discount") ||
      normalizedQuery.includes("multi") ||
      normalizedQuery.includes("wedding") ||
      normalizedQuery.includes("package") ||
      normalizedQuery.includes("price") ||
      normalizedQuery.includes("rate")) &&
    rulesLower.includes("discount")
  ) {
    extraRuleTips.push(
      detectedLang === "ROMAN_URDU"
        ? `Multi-Day Offer: Complete wedding (Mehndi, Baraat & Walima) book karne par ${config.decisionTree.multiDayDiscountPercent}% Royal Multi-Day Discount milta hai.`
        : `Multi-Day Privilege: Booking a multi-day celebration (Mehndi, Baraat & Walima) automatically qualifies for our ${config.decisionTree.multiDayDiscountPercent}% Royal Multi-Day Discount.`
    );
  }

  const currentEst = calculateChatbotEstimate(config, {
    ...draft,
    ...extracted,
  });

  if (bestEntry && bestScore >= 3) {
    if (detectedLang === "ROMAN_URDU") {
      const romanIntro = bestEntry.ratePKR
        ? `Ji bilkul! Royal Studio mein **${bestEntry.title}** ka rate **PKR ${bestEntry.ratePKR.toLocaleString()}** hai. `
        : `Ji bilkul! **${bestEntry.title}** ki details yeh hain: `;
      const suffix =
        extraRuleTips.length > 0
          ? `\n\n${extraRuleTips.join(" ")}`
          : `\n\nAap ki current selection (${currentEst.eventTypeLabel}, ${currentEst.city}) ka total estimate **PKR ${currentEst.estimatedTotalPKR.toLocaleString()}** banta hai.`;
      return {
        reply: `${romanIntro}${bestEntry.content}${suffix}`,
        matchedEntry: bestEntry,
        extractedDraftUpdates: Object.keys(extracted).length > 0 ? extracted : undefined,
        detectedLanguage: detectedLang,
      };
    }

    const suffix = extraRuleTips.length > 0 ? `\n\n${extraRuleTips.join(" ")}` : "";
    return {
      reply: `${bestEntry.content}${suffix}`,
      matchedEntry: bestEntry,
      extractedDraftUpdates: Object.keys(extracted).length > 0 ? extracted : undefined,
      detectedLanguage: detectedLang,
    };
  }

  // Fallback intelligent response synthesized from Estimate + Knowledge Base + Persona
  if (detectedLang === "ROMAN_URDU") {
    const romanFallback = [
      `Assalam-o-Alaikum! Royal Studio mein khush aamdeed. Aap ki selection (${currentEst.eventTypeLabel} — ${currentEst.city}) ke mutabiq estimated package **PKR ${currentEst.estimatedTotalPKR.toLocaleString()}** se start hota hai (booking confirm karne ke liye ${currentEst.depositPercent}% advance yani **PKR ${currentEst.depositAmountPKR.toLocaleString()}** darkar hai).`,
      extraRuleTips.length > 0
        ? extraRuleTips.join(" ")
        : "Aap neechay diye gaye quick buttons se Event Type, Date, Coverage Hours aur Drone/Album add-ons select kar ke apna instant quote lock kar sakte hain.",
    ].join("\n\n");

    return {
      reply: romanFallback,
      extractedDraftUpdates: Object.keys(extracted).length > 0 ? extracted : undefined,
      detectedLanguage: detectedLang,
    };
  }

  const fallbackReply = [
    `Thank you for reaching out to Royal Studio! Based on your preferences (${currentEst.eventTypeLabel} in ${currentEst.city}), our estimated coverage starts around PKR ${currentEst.estimatedTotalPKR.toLocaleString()} (with a ${currentEst.depositPercent}% booking deposit of PKR ${currentEst.depositAmountPKR.toLocaleString()} to lock your dates).`,
    extraRuleTips.length > 0
      ? extraRuleTips.join(" ")
      : "Use the quick-select buttons below to customize your Event Type, Date & City, Coverage Hours, and Add-ons, or click 'Book This Package' to lock in your customized quote.",
  ].join("\n\n");

  return {
    reply: fallbackReply,
    extractedDraftUpdates: Object.keys(extracted).length > 0 ? extracted : undefined,
    detectedLanguage: detectedLang,
  };
}

// ============================================================================
// MULTILINGUAL DETECTION & WEB SPEECH SYNTHESIS (TTS) HELPERS
// ============================================================================

const ROMAN_URDU_MARKERS = new Set([
  "aaj",
  "kal",
  "kitni",
  "kitna",
  "kitne",
  "kya",
  "hai",
  "hain",
  "mein",
  "aur",
  "karo",
  "karen",
  "karein",
  "kar",
  "do",
  "dein",
  "batao",
  "batayein",
  "dikhao",
  "shadi",
  "shaadi",
  "mahine",
  "maheene",
  "is",
  "iss",
  "ki",
  "ka",
  "ke",
  "ko",
  "se",
  "par",
  "pe",
  "nai",
  "nayi",
  "naya",
  "barha",
  "barhaye",
  "kam",
  "zyada",
  "walima",
  "baraat",
  "barat",
  "mehndi",
  "qeemat",
  "kharcha",
  "paisay",
  "paise",
  "hazar",
  "lakh",
]);

export function detectLanguageMode(text: string): "EN" | "ROMAN_URDU" {
  if (!text) return "EN";
  // Check for Standard Urdu / Arabic script characters
  if (/[\u0600-\u06FF]/.test(text)) {
    return "ROMAN_URDU";
  }
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  let hits = 0;
  for (const t of tokens) {
    if (ROMAN_URDU_MARKERS.has(t)) {
      hits += 1;
    }
  }
  return hits >= 1 ? "ROMAN_URDU" : "EN";
}

export function speakBotText(
  text: string,
  options?: { rate?: number; pitch?: number; lang?: string; onEnd?: () => void }
): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    options?.onEnd?.();
    return;
  }
  try {
    window.speechSynthesis.cancel();
    const cleanSpeech = text
      .replace(/\*\*/g, "")
      .replace(/[#*_`~>•]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!cleanSpeech) {
      options?.onEnd?.();
      return;
    }
    const utterance = new SpeechSynthesisUtterance(cleanSpeech);
    utterance.rate = options?.rate ?? 1.02;
    utterance.pitch = options?.pitch ?? 1.0;
    utterance.lang = options?.lang || "en-US";
    if (options?.onEnd) {
      utterance.onend = () => options.onEnd?.();
      utterance.onerror = () => options.onEnd?.();
    }
    window.speechSynthesis.speak(utterance);
  } catch {
    options?.onEnd?.();
  }
}

export function stopBotSpeech(): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    // Ignore
  }
}

// ============================================================================
// ADMIN-SIDE EXECUTIVE AI VOICE & TEXT COPILOT GOVERNANCE CONFIGURATION
// ============================================================================

export interface AdminCopilotConfig {
  enabled: boolean;
  copilotName: string;
  preferredOutputLanguage: "AUTO" | "EN" | "ROMAN_URDU";
  voiceResponseEnabled: boolean;
  voiceRecognitionLang: "en-US" | "ur-PK";
  voiceRate: number;
  customSystemInstructions: string;
  scopes: {
    allowPricingModifications: boolean;
    allowDataDeletion: boolean;
    allowLeadStatusChanges: boolean;
    allowNewLeadCreation: boolean;
    allowPortfolioEdits: boolean;
    allowOperationalTimingsEdits: boolean;
  };
  guardrails: {
    requireConfirmationForDestructive: boolean;
    requireConfirmationForPricing: boolean;
  };
  updatedAt?: string;
}

export const ADMIN_COPILOT_STORAGE_KEY = "royal_studio_admin_copilot_config_v1";

export const defaultAdminCopilotConfig: AdminCopilotConfig = {
  enabled: true,
  copilotName: "Royal Executive Copilot",
  preferredOutputLanguage: "AUTO",
  voiceResponseEnabled: true,
  voiceRecognitionLang: "en-US",
  voiceRate: 1.02,
  customSystemInstructions:
    "• Always verify security scope permissions before executing CRM or pricing updates.\n• Keep voice responses concise (under 2 sentences) so administrators can work hands-free while editing photos or films.\n• Reply in natural Roman Urdu when queried in Roman Urdu or Urdu script, and Professional English otherwise.\n• Always ask for confirmation before modifying package rates if the pricing guardrail is active.",
  scopes: {
    allowPricingModifications: true,
    allowDataDeletion: false,
    allowLeadStatusChanges: true,
    allowNewLeadCreation: true,
    allowPortfolioEdits: true,
    allowOperationalTimingsEdits: true,
  },
  guardrails: {
    requireConfirmationForDestructive: true,
    requireConfirmationForPricing: false,
  },
};

export function sanitizeAdminCopilotConfig(raw: any): AdminCopilotConfig {
  if (!raw || typeof raw !== "object") return defaultAdminCopilotConfig;
  return {
    ...defaultAdminCopilotConfig,
    ...raw,
    scopes: {
      ...defaultAdminCopilotConfig.scopes,
      ...(raw.scopes || {}),
    },
    guardrails: {
      ...defaultAdminCopilotConfig.guardrails,
      ...(raw.guardrails || {}),
    },
  };
}

export function loadAdminCopilotConfig(): AdminCopilotConfig {
  if (typeof window === "undefined") return defaultAdminCopilotConfig;
  try {
    const raw = window.localStorage.getItem(ADMIN_COPILOT_STORAGE_KEY);
    if (!raw) return defaultAdminCopilotConfig;
    return sanitizeAdminCopilotConfig(JSON.parse(raw));
  } catch {
    return defaultAdminCopilotConfig;
  }
}

export function saveAdminCopilotConfig(config: AdminCopilotConfig): void {
  if (typeof window === "undefined") return;
  try {
    const clean = sanitizeAdminCopilotConfig({
      ...config,
      updatedAt: new Date().toISOString(),
    });
    window.localStorage.setItem(ADMIN_COPILOT_STORAGE_KEY, JSON.stringify(clean));
    window.dispatchEvent(
      new CustomEvent("royalstudio:admin-copilot-updated", { detail: clean })
    );
  } catch {
    // Ignore
  }
}
