"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Bot,
  Sparkles,
  BookOpen,
  GitBranch,
  UserCheck,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  Edit,
  CheckCircle2,
  Calculator,
  Send,
  MessageSquare,
  ExternalLink,
  Search,
  Sliders,
  ShieldCheck,
  Zap,
  Camera,
  Shield,
  Mic,
  Volume2,
  Globe,
  AlertTriangle,
} from "lucide-react";
import { apiRequest } from "../services/api";
import { useStudioData } from "../context/StudioDataContext";
import {
  defaultChatbotConfig,
  loadChatbotConfigFromLocal,
  saveChatbotConfigToLocal,
  sanitizeChatbotConfig,
  calculateChatbotEstimate,
  matchKnowledgeBaseAndRespond,
  defaultAdminCopilotConfig,
  loadAdminCopilotConfig,
  saveAdminCopilotConfig,
  sanitizeAdminCopilotConfig,
  type ChatbotConfig,
  type ChatbotKnowledgeEntry,
  type ChatbotKnowledgeCategory,
  type ChatbotPersonaTone,
  type AdminCopilotConfig,
} from "@/lib/chatbot/chatbotEngine";

interface ChatbotManagerPageProps {
  navigate?: (path: string) => void;
}

type ManagerSubTab =
  | "PERSONA"
  | "KNOWLEDGE_BASE"
  | "DECISION_TREE"
  | "LEAD_HANDSHAKE"
  | "AI_SECURITY_SCOPES";

const PERSONA_PRESETS: Record<
  Exclude<ChatbotPersonaTone, "Custom">,
  { instructions: string; rules: string; greeting: string }
> = {
  "Luxury Editorial": {
    greeting:
      "Assalam-o-Alaikum! Welcome to Royal Studio. I am your automated wedding coverage & sales concierge. Use the guided planner below for an instant package estimate, or ask me anything about our rates, drone setups, and dates.",
    instructions:
      "You are the official Royal Assistant for Royal Studio (founded in 2018 by Muhammad Ramzan & Talha Ramay in Burewala, Punjab, serving weddings across all of Pakistan). Speak with a refined, editorial, warm, and luxury tone. Provide transparent PKR pricing, highlight our 3,000+ documented weddings, and guide couples toward locking their wedding dates with confidence.",
    rules:
      "• Always emphasize our 10% Multi-Day Wedding Discount when couples inquire about full weddings (Mehndi, Barat & Walima).\n• Suggest Sony A7R V + 85mm f/1.4 GM prime portrait setups for outdoor, bridal, and golden-hour events.\n• Remind couples that a 50% booking deposit locks their dates and dedicated cinema crew, with guaranteed 20-day delivery.",
  },
  "Warm & Personal": {
    greeting:
      "Assalam-o-Alaikum & welcome to the Royal Studio family! Tell us about your upcoming wedding celebration and let's craft a custom coverage plan together.",
    instructions:
      "You are a warm, empathetic family wedding storyteller representing Royal Studio. Focus on emotional candid moments, family portraits, stress-free coordination with bridal makeup artists, and heirloom albums that last generations.",
    rules:
      "• Always emphasize our 10% Multi-Day Wedding Discount for families booking Mehndi, Baraat, and Walima together.\n• Suggest 85mm f/1.4 GM portrait setups for outdoor & daylight couple portraits.\n• Reassure couples of our 20-day delivery commitment and 50% booking deposit.",
  },
  "Executive Concierge": {
    greeting:
      "Welcome to Royal Studio Official Booking Desk. Select your event parameters below for an immediate itemized PKR quotation.",
    instructions:
      "You are a concise, executive-level production coordinator for Royal Studio. Deliver direct itemized PKR breakdowns, crew headcounts, camera specifications (Sony A7R V, FX3, DJI Mavic 4K), and clear booking milestones.",
    rules:
      "• Highlight the 10% Multi-Day Wedding Discount on 2+ day bookings.\n• Specify 85mm f/1.4 GM optical setups for outdoor portrait sessions.\n• State the 50% advance deposit requirement and 20-day turnaround clearly.",
  },
};

export const ChatbotManagerPage: React.FC<ChatbotManagerPageProps> = ({ navigate }) => {
  const { addToast, events, refreshAll } = useStudioData();
  const [config, setConfig] = useState<ChatbotConfig>(defaultChatbotConfig);
  const [adminCopilot, setAdminCopilot] = useState<AdminCopilotConfig>(
    defaultAdminCopilotConfig
  );
  const [activeSubTab, setActiveSubTab] = useState<ManagerSubTab>("PERSONA");
  const [isSaving, setIsSaving] = useState(false);

  // Knowledge Base Filter & Editor State
  const [kbCategoryFilter, setKbCategoryFilter] = useState<
    "ALL" | ChatbotKnowledgeCategory
  >("ALL");
  const [kbSearch, setKbSearch] = useState("");
  const [editingKbItem, setEditingKbItem] = useState<ChatbotKnowledgeEntry | null>(
    null
  );
  const [kbForm, setKbForm] = useState<{
    category: ChatbotKnowledgeCategory;
    title: string;
    keywordsText: string;
    content: string;
    ratePKR: string;
    metaBadge: string;
  }>({
    category: "Packages & Pricing",
    title: "",
    keywordsText: "",
    content: "",
    ratePKR: "",
    metaBadge: "",
  });

  // Decision-Tree New Item Inputs
  const [newCityInput, setNewCityInput] = useState("");

  // Live Simulator Sandbox State
  const [simInput, setSimInput] = useState("");
  const [simEventTypeId, setSimEventTypeId] = useState<string>(
    defaultChatbotConfig.decisionTree.eventTypes[0]?.id || "evt-wedding-full"
  );
  const [simCity, setSimCity] = useState("Lahore");
  const [simCoverageId, setSimCoverageId] = useState<string>(
    defaultChatbotConfig.decisionTree.coverageTiers[1]?.id || "cov-10h-premium"
  );
  const [simAddons, setSimAddons] = useState<string[]>(["addon-drone"]);
  const [simMessages, setSimMessages] = useState<
    { sender: "bot" | "user"; text: string; badge?: string }[]
  >([
    {
      sender: "bot",
      text: "Sandbox Ready! Test your trained Knowledge Base, System Persona, and Auto-Calculator right here.",
      badge: "Simulator",
    },
  ]);

  // Load config from localStorage and server API on mount
  useEffect(() => {
    const local = loadChatbotConfigFromLocal();
    setConfig(local);
    setAdminCopilot(loadAdminCopilotConfig());

    fetch("/api/chatbot", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.chatbotConfig) {
          const clean = sanitizeChatbotConfig(data.chatbotConfig);
          setConfig(clean);
          saveChatbotConfigToLocal(clean);
        }
        if (data?.adminCopilotConfig) {
          const cleanCop = sanitizeAdminCopilotConfig(data.adminCopilotConfig);
          setAdminCopilot(cleanCop);
          saveAdminCopilotConfig(cleanCop);
        }
      })
      .catch(() => {});
  }, []);

  const handleSaveConfig = async (
    nextConfigOverride?: ChatbotConfig,
    nextCopilotOverride?: AdminCopilotConfig
  ) => {
    const toSave = sanitizeChatbotConfig(nextConfigOverride || config);
    const copilotToSave = sanitizeAdminCopilotConfig(
      nextCopilotOverride || adminCopilot
    );
    setIsSaving(true);
    try {
      // 1. Save immediately to localStorage + BroadcastChannel for instant client portfolio & Admin Copilot sync
      saveChatbotConfigToLocal(toSave);
      saveAdminCopilotConfig(copilotToSave);

      // 2. Persist to server database (/api/chatbot)
      await apiRequest("/chatbot", {
        method: "PUT",
        body: JSON.stringify({
          chatbotConfig: toSave,
          adminCopilotConfig: copilotToSave,
        }),
      });

      setConfig(toSave);
      setAdminCopilot(copilotToSave);
      addToast(
        "Chatbot configuration, training data & AI Copilot security scopes synced!",
        "success"
      );
    } catch (err: any) {
      addToast(
        err?.message || "Saved locally to browser storage.",
        "info"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = async () => {
    const fresh = JSON.parse(JSON.stringify(defaultChatbotConfig));
    setConfig(fresh);
    await handleSaveConfig(fresh);
    addToast("Restored Royal Assistant factory training data & decision tree.", "info");
  };

  const filteredKb = useMemo(() => {
    return config.knowledgeBase.filter((item) => {
      const matchesCat =
        kbCategoryFilter === "ALL" || item.category === kbCategoryFilter;
      const q = kbSearch.toLowerCase().trim();
      const matchesQuery =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.content.toLowerCase().includes(q) ||
        item.keywords.some((k) => k.toLowerCase().includes(q));
      return matchesCat && matchesQuery;
    });
  }, [config.knowledgeBase, kbCategoryFilter, kbSearch]);

  const handleOpenKbEditor = (entry?: ChatbotKnowledgeEntry) => {
    if (entry) {
      setEditingKbItem(entry);
      setKbForm({
        category: entry.category,
        title: entry.title,
        keywordsText: entry.keywords.join(", "),
        content: entry.content,
        ratePKR: entry.ratePKR ? String(entry.ratePKR) : "",
        metaBadge: entry.metaBadge || "",
      });
    } else {
      setEditingKbItem({
        id: `kb-${Date.now()}`,
        category: "Packages & Pricing",
        title: "",
        keywords: [],
        content: "",
      });
      setKbForm({
        category: "Packages & Pricing",
        title: "",
        keywordsText: "",
        content: "",
        ratePKR: "",
        metaBadge: "",
      });
    }
  };

  const handleSaveKbEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!kbForm.title.trim() || !kbForm.content.trim()) {
      addToast("Please enter both a Topic Title and Training Answer.", "error");
      return;
    }

    const keywords = kbForm.keywordsText
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);
    const rateNum = Number(kbForm.ratePKR);

    const newEntry: ChatbotKnowledgeEntry = {
      id: editingKbItem?.id || `kb-${Date.now()}`,
      category: kbForm.category,
      title: kbForm.title.trim(),
      keywords:
        keywords.length > 0
          ? keywords
          : kbForm.title
              .toLowerCase()
              .split(/\s+/)
              .filter((w) => w.length > 2),
      content: kbForm.content.trim(),
      ratePKR: !isNaN(rateNum) && rateNum > 0 ? rateNum : undefined,
      metaBadge: kbForm.metaBadge.trim() || undefined,
    };

    const exists = config.knowledgeBase.some((k) => k.id === newEntry.id);
    const nextKb = exists
      ? config.knowledgeBase.map((k) => (k.id === newEntry.id ? newEntry : k))
      : [newEntry, ...config.knowledgeBase];

    const updated = { ...config, knowledgeBase: nextKb };
    setConfig(updated);
    setEditingKbItem(null);
    void handleSaveConfig(updated);
  };

  const handleDeleteKbEntry = (id: string) => {
    const nextKb = config.knowledgeBase.filter((k) => k.id !== id);
    const updated = { ...config, knowledgeBase: nextKb };
    setConfig(updated);
    void handleSaveConfig(updated);
  };

  // Simulator Estimate & Test Handler
  const simEstimate = useMemo(
    () =>
      calculateChatbotEstimate(config, {
        eventTypeId: simEventTypeId,
        city: simCity,
        coverageTierId: simCoverageId,
        selectedAddonIds: simAddons,
      }),
    [config, simEventTypeId, simCity, simCoverageId, simAddons]
  );

  const handleSimSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!simInput.trim()) return;
    const q = simInput.trim();
    setSimInput("");

    const match = matchKnowledgeBaseAndRespond(q, config, {
      eventTypeId: simEventTypeId,
      city: simCity,
      coverageTierId: simCoverageId,
      selectedAddonIds: simAddons,
    });

    setSimMessages((prev) => [
      ...prev,
      { sender: "user", text: q },
      {
        sender: "bot",
        text: match.reply,
        badge: match.matchedEntry?.title || "Persona & Estimate Engine",
      },
    ]);
  };

  // Filter CRM Events that came from Chatbot or Website Inquiry
  const chatbotCrmLeads = useMemo(() => {
    return events.filter(
      (ev) =>
        ev.createdBy === "royal-chatbot" ||
        ev.createdBy === "website-inquiry" ||
        ev.status === "Inquiry"
    );
  }, [events]);

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div className="bg-slate-950 text-white p-5 sm:p-6 rounded-2xl border border-amber-500/30 shadow-lg flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 text-amber-400 text-xs font-semibold uppercase tracking-widest">
            <Bot className="w-4 h-4" />
            <span>Zero-Cost Automated Sales Concierge · $0 Monthly Subscription</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-display font-bold tracking-wide text-white">
            Chatbot Manager &amp; AI Training Center
          </h1>
          <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
            Train your portfolio’s interactive Wedding Sales Assistant, customize the 4-step
            package estimator decision tree, manage Knowledge Base rates, and configure automatic
            CRM Lead handshakes — synced in real time with the public portfolio.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 border border-white/15 text-xs font-semibold text-white cursor-pointer">
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => {
                const updated = { ...config, enabled: e.target.checked };
                setConfig(updated);
                void handleSaveConfig(updated);
              }}
              className="rounded accent-amber-500 w-4 h-4"
            />
            <span>Widget Active on Public Site</span>
          </label>

          <button
            type="button"
            onClick={handleResetDefaults}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={() => void handleSaveConfig()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? "Syncing..." : "Save & Sync to Portfolio"}</span>
          </button>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-2xl border border-gray-200 shadow-xs">
        {[
          {
            id: "PERSONA" as ManagerSubTab,
            label: "1. System Instructions & Persona",
            icon: Sparkles,
          },
          {
            id: "KNOWLEDGE_BASE" as ManagerSubTab,
            label: `2. Knowledge Base & Rates (${config.knowledgeBase.length})`,
            icon: BookOpen,
          },
          {
            id: "DECISION_TREE" as ManagerSubTab,
            label: "3. Decision-Tree & Auto-Calculator",
            icon: GitBranch,
          },
          {
            id: "LEAD_HANDSHAKE" as ManagerSubTab,
            label: `4. Lead Handshake & Engine (${chatbotCrmLeads.length})`,
            icon: UserCheck,
          },
          {
            id: "AI_SECURITY_SCOPES" as ManagerSubTab,
            label: "5. AI Security & Scope Settings (Admin Voice Copilot)",
            icon: Shield,
          },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                active
                  ? "bg-slate-900 text-amber-400 shadow-xs"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main 2-Column Workspace: Left = Configuration Controls, Right = Live Simulator & Calculator Preview */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN (8 Cols): Active Tab Controls */}
        <div className="xl:col-span-8 space-y-6">
          {/* ================= TAB 1: SYSTEM INSTRUCTIONS & PERSONA ================= */}
          {activeSubTab === "PERSONA" && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 space-y-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-4">
                <div>
                  <h2 className="text-base font-bold text-gray-900">
                    System Instructions, Greeting Tone &amp; Brand Persona
                  </h2>
                  <p className="text-xs text-gray-500">
                    Define how the Royal Assistant greets couples, its editorial voice, and key
                    studio sales rules injected into every response.
                  </p>
                </div>

                {/* Quick Persona Preset Loader */}
                <div className="flex items-center gap-1.5">
                  {(
                    ["Luxury Editorial", "Warm & Personal", "Executive Concierge"] as const
                  ).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        const p = PERSONA_PRESETS[preset];
                        setConfig((prev) => ({
                          ...prev,
                          personaTone: preset,
                          welcomeGreeting: p.greeting,
                          systemInstructions: p.instructions,
                          dynamicPromptRules: p.rules,
                        }));
                        addToast(`Loaded "${preset}" persona template.`, "info");
                      }}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer ${
                        config.personaTone === preset
                          ? "bg-amber-500/15 border-amber-500 text-amber-900"
                          : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Assistant Display Name
                  </label>
                  <input
                    type="text"
                    value={config.botName}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, botName: e.target.value }))
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Pulsing Status Indicator Label
                  </label>
                  <input
                    type="text"
                    value={config.statusLabel}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, statusLabel: e.target.value }))
                    }
                    placeholder="Online — Royal Assistant"
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Initial Greeting Message
                </label>
                <textarea
                  rows={2}
                  value={config.welcomeGreeting}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, welcomeGreeting: e.target.value }))
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  System Instructions &amp; Brand Persona (Multi-Line)
                </label>
                <p className="text-[11px] text-gray-500 mb-2">
                  Controls the assistant’s personality, brand storytelling, and tone of voice
                  (e.g., editorial, warm, luxury, professional).
                </p>
                <textarea
                  rows={4}
                  value={config.systemInstructions}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      personaTone: "Custom",
                      systemInstructions: e.target.value,
                    }))
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs text-gray-900 leading-relaxed focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5">
                  <label className="block text-xs font-bold text-gray-700">
                    Dynamic Prompt Injection Field (Key Sales &amp; Technical Rules)
                  </label>
                  <span className="text-[11px] text-amber-700 font-medium">
                    Injected into both Local Engine &amp; Hybrid AI responses
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={config.dynamicPromptRules}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      dynamicPromptRules: e.target.value,
                    }))
                  }
                  placeholder="• Always emphasize multi-day wedding discounts&#10;• Suggest 85mm portrait setups for outdoor events"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs text-gray-900 font-mono leading-relaxed focus:outline-none focus:border-amber-500"
                />

                {/* Quick Rule Injection Chips */}
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-gray-500 mr-1">Quick-Inject Rule:</span>
                  {[
                    "• Always emphasize multi-day wedding discounts (10% off 3-day bookings).",
                    "• Suggest 85mm f/1.4 GM portrait setups for outdoor & bridal events.",
                    "• Highlight 50% booking deposit to lock dates & 20-day fast delivery.",
                    "• Recommend 4K Drone aerial coverage for grand Baraat processions.",
                  ].map((ruleStr) => (
                    <button
                      key={ruleStr}
                      type="button"
                      onClick={() => {
                        if (!config.dynamicPromptRules.includes(ruleStr)) {
                          setConfig((prev) => ({
                            ...prev,
                            dynamicPromptRules: `${prev.dynamicPromptRules.trim()}\n${ruleStr}`,
                          }));
                        }
                      }}
                      className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-[11px] text-amber-900 font-medium transition-colors cursor-pointer"
                    >
                      + {ruleStr.replace(/^•\s*/, "").slice(0, 42)}...
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 2: KNOWLEDGE BASE & FAQ TRAINING DATA ================= */}
          {activeSubTab === "KNOWLEDGE_BASE" && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 space-y-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
                <div>
                  <h2 className="text-base font-bold text-gray-900">
                    Knowledge Base &amp; FAQ Training Data
                  </h2>
                  <p className="text-xs text-gray-500">
                    Train the assistant on your Wedding Packages &amp; Pricing, Custom Add-ons
                    &amp; Rates, and Studio Logistics.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenKbEditor()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 text-xs font-bold transition-colors cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Knowledge Entry</span>
                </button>
              </div>

              {/* Filter & Search Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  {(
                    [
                      "ALL",
                      "Packages & Pricing",
                      "Custom Add-ons & Rates",
                      "Studio Logistics & FAQ",
                    ] as const
                  ).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setKbCategoryFilter(cat)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        kbCategoryFilter === cat
                          ? "bg-amber-500 text-slate-950"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {cat === "ALL" ? "All Categories" : cat}
                    </button>
                  ))}
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={kbSearch}
                    onChange={(e) => setKbSearch(e.target.value)}
                    placeholder="Filter topics or keywords..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Inline Add / Edit Knowledge Entry Form */}
              {editingKbItem && (
                <form
                  onSubmit={handleSaveKbEntry}
                  className="p-4 rounded-xl bg-amber-50/60 border border-amber-300 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900">
                      {config.knowledgeBase.some((k) => k.id === editingKbItem.id)
                        ? "Edit Knowledge Base Entry"
                        : "New Knowledge Base Entry"}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setEditingKbItem(null)}
                      className="text-xs text-gray-500 hover:text-gray-800 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">
                        Category
                      </label>
                      <select
                        value={kbForm.category}
                        onChange={(e) =>
                          setKbForm((prev) => ({
                            ...prev,
                            category: e.target.value as ChatbotKnowledgeCategory,
                          }))
                        }
                        className="w-full px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-xs text-gray-900"
                      >
                        <option value="Packages & Pricing">Packages &amp; Pricing</option>
                        <option value="Custom Add-ons & Rates">
                          Custom Add-ons &amp; Rates
                        </option>
                        <option value="Studio Logistics & FAQ">
                          Studio Logistics &amp; FAQ
                        </option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">
                        Topic / Package Title
                      </label>
                      <input
                        type="text"
                        value={kbForm.title}
                        onChange={(e) =>
                          setKbForm((prev) => ({ ...prev, title: e.target.value }))
                        }
                        placeholder="e.g. Same-Day Edit (SDE) Reel"
                        className="w-full px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-xs text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">
                        Rate (PKR) / Meta Summary
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <input
                          type="number"
                          value={kbForm.ratePKR}
                          onChange={(e) =>
                            setKbForm((prev) => ({ ...prev, ratePKR: e.target.value }))
                          }
                          placeholder="PKR 20000"
                          className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-gray-200 text-xs text-gray-900"
                        />
                        <input
                          type="text"
                          value={kbForm.metaBadge}
                          onChange={(e) =>
                            setKbForm((prev) => ({ ...prev, metaBadge: e.target.value }))
                          }
                          placeholder="PKR 20k / Event"
                          className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-gray-200 text-xs text-gray-900"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">
                      Trigger Keywords (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={kbForm.keywordsText}
                      onChange={(e) =>
                        setKbForm((prev) => ({ ...prev, keywordsText: e.target.value }))
                      }
                      placeholder="drone, aerial, baraat entry, 4k"
                      className="w-full px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-xs text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">
                      Trained Response Content
                    </label>
                    <textarea
                      rows={3}
                      value={kbForm.content}
                      onChange={(e) =>
                        setKbForm((prev) => ({ ...prev, content: e.target.value }))
                      }
                      placeholder="Detailed explanation of base rates, coverage hours, team size, or studio policy..."
                      className="w-full px-3 py-2 rounded-lg bg-white border border-gray-200 text-xs text-gray-900"
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingKbItem(null)}
                      className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-700 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-lg bg-slate-900 text-amber-400 text-xs font-bold cursor-pointer"
                    >
                      Save Entry
                    </button>
                  </div>
                </form>
              )}

              {/* Knowledge Base Entries List */}
              <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
                {filteredKb.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 hover:bg-gray-50/70 transition-colors flex flex-col sm:flex-row sm:items-start justify-between gap-3"
                  >
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-semibold text-amber-700">
                          {item.category}
                        </span>
                        <span aria-hidden="true" className="text-gray-300">
                          ·
                        </span>
                        <h4 className="font-bold text-gray-900">{item.title}</h4>
                        {item.metaBadge && (
                          <>
                            <span aria-hidden="true" className="text-gray-300">
                              ·
                            </span>
                            <span className="font-mono text-gray-600">
                              {item.metaBadge}
                            </span>
                          </>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed">
                        {item.content}
                      </p>
                      <div className="text-[11px] text-gray-400">
                        Keywords: {item.keywords.join(", ")}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenKbEditor(item)}
                        className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg cursor-pointer"
                        title="Edit Entry"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteKbEntry(item.id)}
                        className="p-1.5 text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                        title="Delete Entry"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================= TAB 3: INTERACTIVE DECISION-TREE & INQUIRY FLOW BUILDER ================= */}
          {activeSubTab === "DECISION_TREE" && (
            <div className="space-y-5">
              {/* Master Toggles & Auto-Calculator Parameters */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 space-y-4 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
                  <div>
                    <h2 className="text-base font-bold text-gray-900">
                      Interactive Decision-Tree &amp; Auto-Calculator Engine
                    </h2>
                    <p className="text-xs text-gray-500">
                      Configure the 4-step guided chat flow (Event Type → Date &amp; Location →
                      Coverage &amp; Crew → Add-ons) and instant package pricing rules.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <label className="inline-flex items-center gap-2 text-xs font-bold text-gray-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.decisionTree.guidedFlowEnabled}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            decisionTree: {
                              ...prev.decisionTree,
                              guidedFlowEnabled: e.target.checked,
                            },
                          }))
                        }
                        className="rounded accent-amber-500 w-4 h-4"
                      />
                      <span>Enable Guided 4-Step Flow</span>
                    </label>

                    <label className="inline-flex items-center gap-2 text-xs font-bold text-gray-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.decisionTree.autoCalculatorEnabled}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            decisionTree: {
                              ...prev.decisionTree,
                              autoCalculatorEnabled: e.target.checked,
                            },
                          }))
                        }
                        className="rounded accent-amber-500 w-4 h-4"
                      />
                      <span>Enable Instant Auto-Calculator</span>
                    </label>
                  </div>
                </div>

                {/* Calculator Multipliers & Logistics Rates */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Multi-Day Wedding Discount (%)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={50}
                      value={config.decisionTree.multiDayDiscountPercent}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          decisionTree: {
                            ...prev.decisionTree,
                            multiDayDiscountPercent: Number(e.target.value) || 0,
                          },
                        }))
                      }
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-mono text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Booking Deposit Percentage (%)
                    </label>
                    <input
                      type="number"
                      min={10}
                      max={100}
                      value={config.decisionTree.bookingDepositPercent}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          decisionTree: {
                            ...prev.decisionTree,
                            bookingDepositPercent: Number(e.target.value) || 50,
                          },
                        }))
                      }
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-mono text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Out-of-City Travel Allowance (PKR)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={1000}
                      value={config.decisionTree.outOfCityTravelSurchargePKR}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          decisionTree: {
                            ...prev.decisionTree,
                            outOfCityTravelSurchargePKR: Number(e.target.value) || 0,
                          },
                        }))
                      }
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-mono text-gray-900"
                    />
                  </div>
                </div>
              </div>

              {/* STEP 1 BUILDER: Collect Event Type */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900">
                    Step 1: Collect Event Type (Wedding, Baraat, Walima, Engagement, Pre-wedding)
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      const nextEvts = [
                        ...config.decisionTree.eventTypes,
                        {
                          id: `evt-custom-${Date.now()}`,
                          label: "Custom Celebration",
                          baseRatePKR: 55000,
                          defaultDays: 1,
                          isMultiDay: false,
                          recommendedSetup: "Sony A7R V + 85mm f/1.4 GM Portrait Setup",
                        },
                      ];
                      setConfig((prev) => ({
                        ...prev,
                        decisionTree: { ...prev.decisionTree, eventTypes: nextEvts },
                      }));
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-xs font-semibold text-gray-800 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Event Option</span>
                  </button>
                </div>

                <input
                  type="text"
                  value={config.decisionTree.step1Prompt}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      decisionTree: { ...prev.decisionTree, step1Prompt: e.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs text-gray-900"
                />

                <div className="space-y-2">
                  {config.decisionTree.eventTypes.map((evt, idx) => (
                    <div
                      key={evt.id}
                      className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center p-2.5 rounded-xl bg-gray-50 border border-gray-200"
                    >
                      <input
                        type="text"
                        value={evt.label}
                        onChange={(e) => {
                          const next = [...config.decisionTree.eventTypes];
                          next[idx] = { ...evt, label: e.target.value };
                          setConfig((prev) => ({
                            ...prev,
                            decisionTree: { ...prev.decisionTree, eventTypes: next },
                          }));
                        }}
                        className="sm:col-span-4 px-2.5 py-1.5 rounded-lg bg-white border border-gray-200 text-xs font-semibold text-gray-900"
                      />
                      <div className="sm:col-span-3 flex items-center gap-1">
                        <span className="text-[11px] text-gray-500">PKR</span>
                        <input
                          type="number"
                          value={evt.baseRatePKR}
                          onChange={(e) => {
                            const next = [...config.decisionTree.eventTypes];
                            next[idx] = {
                              ...evt,
                              baseRatePKR: Number(e.target.value) || 0,
                            };
                            setConfig((prev) => ({
                              ...prev,
                              decisionTree: { ...prev.decisionTree, eventTypes: next },
                            }));
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-gray-200 text-xs font-mono text-gray-900"
                        />
                      </div>
                      <label className="sm:col-span-2 flex items-center gap-1.5 text-[11px] text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={evt.isMultiDay}
                          onChange={(e) => {
                            const next = [...config.decisionTree.eventTypes];
                            next[idx] = { ...evt, isMultiDay: e.target.checked };
                            setConfig((prev) => ({
                              ...prev,
                              decisionTree: { ...prev.decisionTree, eventTypes: next },
                            }));
                          }}
                          className="rounded accent-amber-500"
                        />
                        <span>Multi-Day</span>
                      </label>
                      <input
                        type="text"
                        value={evt.recommendedSetup}
                        onChange={(e) => {
                          const next = [...config.decisionTree.eventTypes];
                          next[idx] = { ...evt, recommendedSetup: e.target.value };
                          setConfig((prev) => ({
                            ...prev,
                            decisionTree: { ...prev.decisionTree, eventTypes: next },
                          }));
                        }}
                        placeholder="Recommended lens/camera setup"
                        className="sm:col-span-2 px-2.5 py-1.5 rounded-lg bg-white border border-gray-200 text-[11px] text-gray-700"
                      />
                      <div className="sm:col-span-1 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            if (config.decisionTree.eventTypes.length <= 1) return;
                            const next = config.decisionTree.eventTypes.filter(
                              (item) => item.id !== evt.id
                            );
                            setConfig((prev) => ({
                              ...prev,
                              decisionTree: { ...prev.decisionTree, eventTypes: next },
                            }));
                          }}
                          className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* STEP 2 BUILDER: Date & Location */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3 shadow-xs">
                <h3 className="text-sm font-bold text-gray-900">
                  Step 2: Collect Event Date &amp; Location
                </h3>
                <input
                  type="text"
                  value={config.decisionTree.step2Prompt}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      decisionTree: { ...prev.decisionTree, step2Prompt: e.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs text-gray-900"
                />

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Quick-Reply City Buttons
                  </label>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {config.decisionTree.popularCities.map((cityStr) => (
                      <span
                        key={cityStr}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gray-100 border border-gray-200 text-xs text-gray-800"
                      >
                        <span>{cityStr}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const nextCities = config.decisionTree.popularCities.filter(
                              (c) => c !== cityStr
                            );
                            setConfig((prev) => ({
                              ...prev,
                              decisionTree: {
                                ...prev.decisionTree,
                                popularCities: nextCities,
                              },
                            }));
                          }}
                          className="text-gray-400 hover:text-rose-600 cursor-pointer"
                        >
                          ×
                        </button>
                      </span>
                    ))}

                    <div className="inline-flex items-center gap-1">
                      <input
                        type="text"
                        value={newCityInput}
                        onChange={(e) => setNewCityInput(e.target.value)}
                        placeholder="Add city..."
                        className="px-2.5 py-1 rounded-lg border border-gray-200 text-xs w-28"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!newCityInput.trim()) return;
                          setConfig((prev) => ({
                            ...prev,
                            decisionTree: {
                              ...prev.decisionTree,
                              popularCities: [
                                ...prev.decisionTree.popularCities,
                                newCityInput.trim(),
                              ],
                            },
                          }));
                          setNewCityInput("");
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-900 text-amber-400 text-xs font-bold cursor-pointer"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* STEP 3 BUILDER: Required Coverage Hours & Team Size */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900">
                    Step 3: Required Coverage Hours &amp; Team Size
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      const nextTiers = [
                        ...config.decisionTree.coverageTiers,
                        {
                          id: `cov-custom-${Date.now()}`,
                          label: "8 Hours · Custom Crew",
                          hoursLabel: "8 Hours Coverage",
                          teamLabel: "2 Photographers + 1 Videographer",
                          additionalRatePKR: 20000,
                        },
                      ];
                      setConfig((prev) => ({
                        ...prev,
                        decisionTree: { ...prev.decisionTree, coverageTiers: nextTiers },
                      }));
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-xs font-semibold text-gray-800 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Coverage Tier</span>
                  </button>
                </div>

                <input
                  type="text"
                  value={config.decisionTree.step3Prompt}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      decisionTree: { ...prev.decisionTree, step3Prompt: e.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs text-gray-900"
                />

                <div className="space-y-2">
                  {config.decisionTree.coverageTiers.map((tier, idx) => (
                    <div
                      key={tier.id}
                      className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center p-2.5 rounded-xl bg-gray-50 border border-gray-200"
                    >
                      <input
                        type="text"
                        value={tier.label}
                        onChange={(e) => {
                          const next = [...config.decisionTree.coverageTiers];
                          next[idx] = { ...tier, label: e.target.value };
                          setConfig((prev) => ({
                            ...prev,
                            decisionTree: { ...prev.decisionTree, coverageTiers: next },
                          }));
                        }}
                        className="sm:col-span-4 px-2.5 py-1.5 rounded-lg bg-white border border-gray-200 text-xs font-semibold text-gray-900"
                      />
                      <input
                        type="text"
                        value={tier.teamLabel}
                        onChange={(e) => {
                          const next = [...config.decisionTree.coverageTiers];
                          next[idx] = { ...tier, teamLabel: e.target.value };
                          setConfig((prev) => ({
                            ...prev,
                            decisionTree: { ...prev.decisionTree, coverageTiers: next },
                          }));
                        }}
                        className="sm:col-span-4 px-2.5 py-1.5 rounded-lg bg-white border border-gray-200 text-xs text-gray-700"
                      />
                      <div className="sm:col-span-3 flex items-center gap-1">
                        <span className="text-[11px] text-gray-500">+PKR</span>
                        <input
                          type="number"
                          value={tier.additionalRatePKR}
                          onChange={(e) => {
                            const next = [...config.decisionTree.coverageTiers];
                            next[idx] = {
                              ...tier,
                              additionalRatePKR: Number(e.target.value) || 0,
                            };
                            setConfig((prev) => ({
                              ...prev,
                              decisionTree: { ...prev.decisionTree, coverageTiers: next },
                            }));
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-gray-200 text-xs font-mono text-gray-900"
                        />
                      </div>
                      <div className="sm:col-span-1 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            if (config.decisionTree.coverageTiers.length <= 1) return;
                            const next = config.decisionTree.coverageTiers.filter(
                              (item) => item.id !== tier.id
                            );
                            setConfig((prev) => ({
                              ...prev,
                              decisionTree: { ...prev.decisionTree, coverageTiers: next },
                            }));
                          }}
                          className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* STEP 4 BUILDER: Desired Add-ons */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900">
                    Step 4: Desired Add-ons (Drone, Albums, Fast Delivery, Gimbal)
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      const nextAddons = [
                        ...config.decisionTree.addons,
                        {
                          id: `addon-custom-${Date.now()}`,
                          label: "Custom Production Add-on",
                          ratePKR: 15000,
                          description: "Additional luxury deliverable",
                        },
                      ];
                      setConfig((prev) => ({
                        ...prev,
                        decisionTree: { ...prev.decisionTree, addons: nextAddons },
                      }));
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-xs font-semibold text-gray-800 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Add-on</span>
                  </button>
                </div>

                <input
                  type="text"
                  value={config.decisionTree.step4Prompt}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      decisionTree: { ...prev.decisionTree, step4Prompt: e.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs text-gray-900"
                />

                <div className="space-y-2">
                  {config.decisionTree.addons.map((addon, idx) => (
                    <div
                      key={addon.id}
                      className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center p-2.5 rounded-xl bg-gray-50 border border-gray-200"
                    >
                      <input
                        type="text"
                        value={addon.label}
                        onChange={(e) => {
                          const next = [...config.decisionTree.addons];
                          next[idx] = { ...addon, label: e.target.value };
                          setConfig((prev) => ({
                            ...prev,
                            decisionTree: { ...prev.decisionTree, addons: next },
                          }));
                        }}
                        className="sm:col-span-4 px-2.5 py-1.5 rounded-lg bg-white border border-gray-200 text-xs font-semibold text-gray-900"
                      />
                      <input
                        type="text"
                        value={addon.description}
                        onChange={(e) => {
                          const next = [...config.decisionTree.addons];
                          next[idx] = { ...addon, description: e.target.value };
                          setConfig((prev) => ({
                            ...prev,
                            decisionTree: { ...prev.decisionTree, addons: next },
                          }));
                        }}
                        className="sm:col-span-4 px-2.5 py-1.5 rounded-lg bg-white border border-gray-200 text-xs text-gray-700"
                      />
                      <div className="sm:col-span-3 flex items-center gap-1">
                        <span className="text-[11px] text-gray-500">PKR</span>
                        <input
                          type="number"
                          value={addon.ratePKR}
                          onChange={(e) => {
                            const next = [...config.decisionTree.addons];
                            next[idx] = {
                              ...addon,
                              ratePKR: Number(e.target.value) || 0,
                            };
                            setConfig((prev) => ({
                              ...prev,
                              decisionTree: { ...prev.decisionTree, addons: next },
                            }));
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-gray-200 text-xs font-mono text-gray-900"
                        />
                      </div>
                      <div className="sm:col-span-1 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            const next = config.decisionTree.addons.filter(
                              (item) => item.id !== addon.id
                            );
                            setConfig((prev) => ({
                              ...prev,
                              decisionTree: { ...prev.decisionTree, addons: next },
                            }));
                          }}
                          className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 4: LEAD HANDSHAKE & ZERO-COST ENGINE SETTINGS ================= */}
          {activeSubTab === "LEAD_HANDSHAKE" && (
            <div className="space-y-5">
              <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 space-y-5 shadow-xs">
                <div className="border-b border-gray-100 pb-4">
                  <h2 className="text-base font-bold text-gray-900">
                    CRM Lead Handshake &amp; Zero-Cost Intelligence Architecture
                  </h2>
                  <p className="text-xs text-gray-500">
                    Configure automatic conversion of completed chatbot conversations into CRM
                    Leads/Inquiries with the estimated package breakdown attached.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="flex items-start gap-3 p-4 rounded-xl border border-gray-200 bg-gray-50/70 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.leadHandshake.autoConvertCompletedToCrmLead}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          leadHandshake: {
                            ...prev.leadHandshake,
                            autoConvertCompletedToCrmLead: e.target.checked,
                          },
                        }))
                      }
                      className="mt-0.5 rounded accent-amber-500 w-4 h-4"
                    />
                    <div>
                      <div className="text-xs font-bold text-gray-900">
                        Auto-Convert Completed Chats into Admin CRM Leads
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                        Automatically creates a new Client, Inquiry Event, Official Quotation,
                        and Website Inquiry record with the full estimated package breakdown when
                        Step 4 completes.
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-4 rounded-xl border border-gray-200 bg-gray-50/70 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.leadHandshake.whatsappDirectHandoffEnabled}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          leadHandshake: {
                            ...prev.leadHandshake,
                            whatsappDirectHandoffEnabled: e.target.checked,
                          },
                        }))
                      }
                      className="mt-0.5 rounded accent-amber-500 w-4 h-4"
                    />
                    <div>
                      <div className="text-xs font-bold text-gray-900">
                        Enable Direct WhatsApp Transcript Handoff
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                        Displays the single-click &ldquo;Submit Inquiry via WhatsApp&rdquo; button
                        inside the live Estimated Package Card.
                      </p>
                    </div>
                  </label>
                </div>

                {/* Zero-Cost Engine Selector */}
                <div className="pt-2 border-t border-gray-100 space-y-3">
                  <div className="text-xs font-bold text-gray-900">
                    Response Engine Mode ($0 Operating Cost)
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setConfig((prev) => ({
                          ...prev,
                          engineSettings: {
                            ...prev.engineSettings,
                            mode: "LOCAL_ENGINE",
                          },
                        }))
                      }
                      className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                        config.engineSettings.mode === "LOCAL_ENGINE"
                          ? "border-amber-500 bg-amber-50/50"
                          : "border-gray-200 bg-white hover:bg-gray-50"
                      }`}
                    >
                      <div className="text-xs font-bold text-gray-900">
                        Option A: Native Local Decision-Tree &amp; Pattern Engine
                      </div>
                      <p className="text-[11px] text-gray-500 mt-1">
                        100% pure JavaScript execution using your trained Knowledge Base,
                        keyword scoring, and deterministic auto-calculator. Zero external API
                        calls.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setConfig((prev) => ({
                          ...prev,
                          engineSettings: {
                            ...prev.engineSettings,
                            mode: "HYBRID_GEMINI_FREE",
                          },
                        }))
                      }
                      className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                        config.engineSettings.mode === "HYBRID_GEMINI_FREE"
                          ? "border-amber-500 bg-amber-50/50"
                          : "border-gray-200 bg-white hover:bg-gray-50"
                      }`}
                    >
                      <div className="text-xs font-bold text-gray-900">
                        Option B: Hybrid Free-Tier AI + Local Decision-Tree Fallback
                      </div>
                      <p className="text-[11px] text-gray-500 mt-1">
                        Combines your instant 4-step Decision-Tree calculator with server-side
                        Google Gemini Free-Tier natural language generation and automatic local
                        fallback.
                      </p>
                    </button>
                  </div>
                </div>
              </div>

              {/* Recent Chatbot & Website Inquiry Leads in CRM */}
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">
                      Captured Chatbot &amp; Website Leads in Admin CRM ({chatbotCrmLeads.length})
                    </h3>
                    <p className="text-xs text-gray-500">
                      Conversations converted via the Chatbot Lead Handshake appear here and in
                      your Events &amp; Clients CRM tables.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void refreshAll()}
                    className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-xs font-semibold text-gray-700 cursor-pointer"
                  >
                    Refresh Leads
                  </button>
                </div>

                {chatbotCrmLeads.length === 0 ? (
                  <div className="p-8 text-center text-xs text-gray-500">
                    No chatbot inquiry leads yet. Complete Step 4 in the portfolio chatbot to
                    test automatic CRM lead creation.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50 text-gray-500 uppercase border-b border-gray-100">
                        <tr>
                          <th className="py-3 px-4">Event / Client</th>
                          <th className="py-3 px-4">Date &amp; City</th>
                          <th className="py-3 px-4">Estimated Package</th>
                          <th className="py-3 px-4">Source</th>
                          <th className="py-3 px-4 text-right">CRM Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {chatbotCrmLeads.slice(0, 10).map((ev) => (
                          <tr key={ev.id} className="hover:bg-amber-50/30">
                            <td className="py-3 px-4 font-bold text-gray-900">
                              {ev.title}
                              <div className="text-[11px] text-gray-500 font-normal truncate max-w-md">
                                {ev.notes.split("\n")[0]}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-gray-700">
                              <div>{ev.eventDate}</div>
                              <div className="text-[11px] text-gray-400">{ev.city}</div>
                            </td>
                            <td className="py-3 px-4 font-mono font-bold text-amber-700 tabular-nums">
                              PKR {(ev.packagePrice || 0).toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-gray-600">
                              {ev.createdBy === "royal-chatbot"
                                ? "Royal Chatbot"
                                : "Website Inquiry"}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="inline-flex items-center gap-1.5">
                                <a
                                  href={`/proposal/${ev.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] inline-flex items-center gap-1"
                                >
                                  <span>Proposal</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                                {navigate && (
                                  <button
                                    type="button"
                                    onClick={() => navigate(`/events/${ev.id}`)}
                                    className="px-2.5 py-1 rounded-lg bg-slate-900 text-amber-400 font-bold text-[11px] cursor-pointer"
                                  >
                                    Open Event
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= TAB 5: AI SECURITY & SCOPE SETTINGS (ADMIN COPILOT GOVERNANCE) ================= */}
          {activeSubTab === "AI_SECURITY_SCOPES" && (
            <div className="space-y-6">
              {/* System Access Scopes Card */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 space-y-5 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-4">
                  <div>
                    <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-amber-500" />
                      <span>Admin AI Copilot — System Access Scopes (RBAC)</span>
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Grant or deny permission for the Admin-Side Executive Voice &amp; Text AI
                      Copilot to make direct system edits across CRM leads, pricing, and portfolio.
                    </p>
                  </div>
                  <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 text-amber-400 text-xs font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={adminCopilot.enabled}
                      onChange={(e) => {
                        const next = { ...adminCopilot, enabled: e.target.checked };
                        setAdminCopilot(next);
                        void handleSaveConfig(config, next);
                      }}
                      className="rounded accent-amber-500 w-4 h-4"
                    />
                    <span>Copilot Micro-Bar Enabled</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {[
                    {
                      key: "allowPricingModifications" as const,
                      title: "Allow Pricing Modifications",
                      desc: "Permits voice/text commands to update package base rates (e.g., 'Change Signature Wedding Package to 180,000 PKR').",
                    },
                    {
                      key: "allowDataDeletion" as const,
                      title: "Allow Data Deletion",
                      desc: "Permits AI Copilot to delete CRM records, portfolio items, or purge logs. Recommended: OFF.",
                    },
                    {
                      key: "allowLeadStatusChanges" as const,
                      title: "Allow Lead Status Changes",
                      desc: "Permits commands like 'Mark Lead #104 status as Booked' to update event lifecycle states.",
                    },
                    {
                      key: "allowNewLeadCreation" as const,
                      title: "Allow New Lead Creation",
                      desc: "Permits commands like 'New lead add karo Name: Hamza, Date: 12 November, Budget: 250k'.",
                    },
                    {
                      key: "allowPortfolioEdits" as const,
                      title: "Allow Portfolio & CMS Edits",
                      desc: "Permits toggling featured status for homepage cinematic videos and portfolio items.",
                    },
                    {
                      key: "allowOperationalTimingsEdits" as const,
                      title: "Allow Studio Timings Updates",
                      desc: "Permits updating Sunday & studio operational hours via voice or text commands.",
                    },
                  ].map((scopeItem) => {
                    const isOn = adminCopilot.scopes[scopeItem.key];
                    return (
                      <label
                        key={scopeItem.key}
                        className={`flex items-start justify-between gap-3 p-4 rounded-xl border transition-all cursor-pointer ${
                          isOn
                            ? "border-emerald-300 bg-emerald-50/40"
                            : "border-gray-200 bg-gray-50/60"
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-900">
                              {scopeItem.title}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                isOn
                                  ? "bg-emerald-500/20 text-emerald-800"
                                  : "bg-rose-500/15 text-rose-700"
                              }`}
                            >
                              {isOn ? "ON" : "OFF"}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-500 leading-relaxed">
                            {scopeItem.desc}
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={isOn}
                          onChange={(e) => {
                            const next = {
                              ...adminCopilot,
                              scopes: {
                                ...adminCopilot.scopes,
                                [scopeItem.key]: e.target.checked,
                              },
                            };
                            setAdminCopilot(next);
                            saveAdminCopilotConfig(next);
                          }}
                          className="mt-1 rounded accent-amber-500 w-4 h-4 shrink-0"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Confirmation Guardrails & Custom System Instructions */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 space-y-5 shadow-xs">
                <div className="border-b border-gray-100 pb-3">
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span>Confirmation Guardrails &amp; Custom AI Rules</span>
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Require explicit visual popup confirmation before the AI executes sensitive or
                    destructive operations, and configure voice/language behavior.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <label className="flex items-start justify-between gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50/40 cursor-pointer">
                    <div>
                      <div className="text-xs font-bold text-gray-900">
                        Confirmation Popup for Destructive Actions
                      </div>
                      <p className="text-[11px] text-gray-600 mt-0.5">
                        Requires explicit visual popup approval before deleting leads, events, or
                        portfolio items.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={adminCopilot.guardrails.requireConfirmationForDestructive}
                      onChange={(e) => {
                        const next = {
                          ...adminCopilot,
                          guardrails: {
                            ...adminCopilot.guardrails,
                            requireConfirmationForDestructive: e.target.checked,
                          },
                        };
                        setAdminCopilot(next);
                        saveAdminCopilotConfig(next);
                      }}
                      className="mt-1 rounded accent-amber-500 w-4 h-4 shrink-0"
                    />
                  </label>

                  <label className="flex items-start justify-between gap-3 p-4 rounded-xl border border-gray-200 bg-gray-50/60 cursor-pointer">
                    <div>
                      <div className="text-xs font-bold text-gray-900">
                        Confirmation Popup Before Modifying Package Rates
                      </div>
                      <p className="text-[11px] text-gray-600 mt-0.5">
                        Requires visual confirmation dialog before the AI Copilot changes any
                        package base price.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={adminCopilot.guardrails.requireConfirmationForPricing}
                      onChange={(e) => {
                        const next = {
                          ...adminCopilot,
                          guardrails: {
                            ...adminCopilot.guardrails,
                            requireConfirmationForPricing: e.target.checked,
                          },
                        };
                        setAdminCopilot(next);
                        saveAdminCopilotConfig(next);
                      }}
                      className="mt-1 rounded accent-amber-500 w-4 h-4 shrink-0"
                    />
                  </label>
                </div>

                {/* Language & Voice Synthesis Settings */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Preferred Output Language
                    </label>
                    <select
                      value={adminCopilot.preferredOutputLanguage}
                      onChange={(e) => {
                        const next = {
                          ...adminCopilot,
                          preferredOutputLanguage: e.target.value as any,
                        };
                        setAdminCopilot(next);
                        saveAdminCopilotConfig(next);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-semibold text-gray-900"
                    >
                      <option value="AUTO">Auto-Detect (English &amp; Roman Urdu)</option>
                      <option value="EN">Always Professional English</option>
                      <option value="ROMAN_URDU">Always Natural Roman Urdu</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Voice Mic Recognition Locale
                    </label>
                    <select
                      value={adminCopilot.voiceRecognitionLang}
                      onChange={(e) => {
                        const next = {
                          ...adminCopilot,
                          voiceRecognitionLang: e.target.value as "en-US" | "ur-PK",
                        };
                        setAdminCopilot(next);
                        saveAdminCopilotConfig(next);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-semibold text-gray-900"
                    >
                      <option value="en-US">English &amp; Roman Urdu (en-US)</option>
                      <option value="ur-PK">Pakistan Urdu &amp; English (ur-PK)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Real-Time Voice Synthesis (TTS)
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const next = {
                          ...adminCopilot,
                          voiceResponseEnabled: !adminCopilot.voiceResponseEnabled,
                        };
                        setAdminCopilot(next);
                        saveAdminCopilotConfig(next);
                      }}
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer ${
                        adminCopilot.voiceResponseEnabled
                          ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                          : "border-gray-300 bg-gray-100 text-gray-600"
                      }`}
                    >
                      <Volume2 className="w-4 h-4" />
                      <span>
                        {adminCopilot.voiceResponseEnabled
                          ? "Voice Output Active (Hands-Free)"
                          : "Voice Output Muted"}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Custom System Instructions for Admin Copilot */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Custom System Instructions &amp; Strict Operational Rules
                  </label>
                  <textarea
                    rows={4}
                    value={adminCopilot.customSystemInstructions}
                    onChange={(e) => {
                      const next = {
                        ...adminCopilot,
                        customSystemInstructions: e.target.value,
                      };
                      setAdminCopilot(next);
                      saveAdminCopilotConfig(next);
                    }}
                    placeholder="e.g., Always ask for confirmation before modifying package rates. Keep voice responses under 2 sentences."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs text-gray-900 font-mono leading-relaxed focus:outline-none focus:border-amber-500"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    Tip: Include{" "}
                    <code className="px-1 py-0.5 rounded bg-gray-100 text-gray-800">
                      Always ask for confirmation before modifying package rates
                    </code>{" "}
                    to automatically trigger the visual confirmation guardrail on rate edits.
                  </p>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => void handleSaveConfig(config, adminCopilot)}
                    className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save AI Security &amp; Scope Settings</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN (4 Cols): LIVE CHATBOT SIMULATOR & AUTO-CALCULATOR SANDBOX */}
        <div className="xl:col-span-4 space-y-4">
          <div className="rounded-2xl border border-[#C9A76A]/40 bg-[#111113] text-[#F5F2EB] overflow-hidden shadow-xl">
            <div className="px-4 py-3.5 bg-gradient-to-r from-[#16161A] via-[#1C1A17] to-[#16161A] border-b border-[#C9A76A]/25 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-[#C9A76A]/15 border border-[#C9A76A]/40 flex items-center justify-center text-[#C9A76A]">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#F5F2EB]">
                    Live Training Sandbox
                  </div>
                  <div className="text-[10px] text-[#C9A76A]">
                    {config.statusLabel}
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-mono text-emerald-400">
                Real-Time Preview
              </span>
            </div>

            {/* Interactive Auto-Calculator Preview Controls */}
            <div className="p-3.5 bg-[#16161A] border-b border-white/10 space-y-2.5 text-xs">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[#C9A76A]">
                Test Decision-Tree Auto-Calculator
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-[#9E988E] mb-0.5">
                    Step 1: Event Type
                  </label>
                  <select
                    value={simEventTypeId}
                    onChange={(e) => setSimEventTypeId(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg bg-[#111113] border border-white/15 text-[11px] text-[#F5F2EB]"
                  >
                    {config.decisionTree.eventTypes.map((evt) => (
                      <option key={evt.id} value={evt.id}>
                        {evt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-[#9E988E] mb-0.5">
                    Step 2: City
                  </label>
                  <select
                    value={simCity}
                    onChange={(e) => setSimCity(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg bg-[#111113] border border-white/15 text-[11px] text-[#F5F2EB]"
                  >
                    {config.decisionTree.popularCities.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-[#9E988E] mb-0.5">
                  Step 3: Coverage &amp; Crew Tier
                </label>
                <select
                  value={simCoverageId}
                  onChange={(e) => setSimCoverageId(e.target.value)}
                  className="w-full px-2 py-1.5 rounded-lg bg-[#111113] border border-white/15 text-[11px] text-[#F5F2EB]"
                >
                  {config.decisionTree.coverageTiers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Calculated Output Box */}
              <div className="p-2.5 rounded-xl bg-[#111113] border border-[#C9A76A]/30 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[#9E988E]">Estimated Package Total:</span>
                  <span className="font-mono font-bold text-sm text-[#C9A76A] tabular-nums">
                    PKR {simEstimate.estimatedTotalPKR.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-[#9E988E]">
                  <span>
                    {simEstimate.depositPercent}% Deposit: PKR{" "}
                    {simEstimate.depositAmountPKR.toLocaleString()}
                  </span>
                  {simEstimate.isMultiDayDiscountApplied && (
                    <span className="text-emerald-400">
                      -{simEstimate.multiDayDiscountPercent}% Multi-Day Off
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Sandbox Message Stream */}
            <div className="p-3.5 space-y-2.5 max-h-64 overflow-y-auto text-xs">
              {simMessages.map((m, i) => (
                <div
                  key={i}
                  className={`flex flex-col ${
                    m.sender === "user" ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`max-w-[90%] rounded-xl px-3 py-2 text-[11px] leading-relaxed whitespace-pre-line ${
                      m.sender === "user"
                        ? "bg-[#C9A76A] text-[#111113] font-semibold"
                        : "bg-[#1B1B1F] text-[#E8E4DC] border border-white/10"
                    }`}
                  >
                    {m.badge && m.sender === "bot" && (
                      <div className="text-[10px] font-bold text-[#C9A76A] mb-0.5">
                        {m.badge}
                      </div>
                    )}
                    {m.text}
                  </div>
                </div>
              ))}
            </div>

            {/* Sandbox Input */}
            <form
              onSubmit={handleSimSend}
              className="p-3 bg-[#141418] border-t border-white/10 flex items-center gap-2"
            >
              <input
                type="text"
                value={simInput}
                onChange={(e) => setSimInput(e.target.value)}
                placeholder="Test a question (e.g. drone rate, outdoor lens)..."
                className="flex-1 bg-[#111113] border border-white/15 rounded-lg px-3 py-1.5 text-xs text-[#F5F2EB] placeholder:text-[#9E988E] focus:outline-none focus:border-[#C9A76A]"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg bg-[#C9A76A] text-[#111113] text-xs font-bold cursor-pointer"
              >
                Test
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
