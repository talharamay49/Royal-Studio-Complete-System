"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  Calendar,
  MapPin,
  Clock,
  Users,
  Check,
  ChevronRight,
  RotateCcw,
  ExternalLink,
  Phone,
  User as UserIcon,
  Camera,
  ShieldCheck,
  Calculator,
  Bot,
} from "lucide-react";
import {
  defaultChatbotConfig,
  loadChatbotConfigFromLocal,
  calculateChatbotEstimate,
  matchKnowledgeBaseAndRespond,
  CHATBOT_SYNC_CHANNEL,
  type ChatbotConfig,
  type ChatbotInquiryDraft,
  type ChatbotMessage,
} from "@/lib/chatbot/chatbotEngine";
import { usePublicStudioProfile } from "@/components/shared/StudioProfileContext";

export default function RoyalChatbotWidget() {
  const pathname = usePathname();
  const profile = usePublicStudioProfile();

  const [config, setConfig] = useState<ChatbotConfig>(defaultChatbotConfig);
  const [isOpen, setIsOpen] = useState(false);
  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // Inquiry draft state for the 4-step decision tree + auto-calculator
  const [draft, setDraft] = useState<ChatbotInquiryDraft>(() => ({
    eventTypeId: defaultChatbotConfig.decisionTree.eventTypes[0]?.id,
    eventTypeLabel: defaultChatbotConfig.decisionTree.eventTypes[0]?.label,
    eventDate: new Date(Date.now() + 45 * 86400000).toISOString().split("T")[0],
    city: "Burewala",
    venue: "",
    coverageTierId: defaultChatbotConfig.decisionTree.coverageTiers[0]?.id,
    coverageTierLabel: defaultChatbotConfig.decisionTree.coverageTiers[0]?.label,
    selectedAddonIds: [],
    clientName: "",
    clientPhone: "",
  }));

  const [messages, setMessages] = useState<ChatbotMessage[]>([]);
  const [leadSubmissionResult, setLeadSubmissionResult] = useState<{
    submitting: boolean;
    saved: boolean;
    referenceId?: string;
    proposalUrl?: string;
    whatsappUrl?: string;
    autoConverted?: boolean;
  }>({ submitting: false, saved: false });

  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const hasAutoConvertedRef = useRef(false);

  // Sync Chatbot Configuration from localStorage, BroadcastChannel, CustomEvent & Server API
  useEffect(() => {
    const localCfg = loadChatbotConfigFromLocal();
    setConfig(localCfg);

    fetch("/api/chatbot", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.chatbotConfig) {
          setConfig(data.chatbotConfig);
        }
      })
      .catch(() => {});

    const handleCustomUpdate = (e: Event) => {
      const ce = e as CustomEvent<ChatbotConfig>;
      if (ce.detail) {
        setConfig(ce.detail);
      }
    };

    const handleStorageUpdate = (e: StorageEvent) => {
      if (e.key === "royal_studio_chatbot_config_v1" && e.newValue) {
        try {
          setConfig(JSON.parse(e.newValue));
        } catch {
          // Ignore
        }
      }
    };

    window.addEventListener("royalstudio:chatbot-updated", handleCustomUpdate);
    window.addEventListener("storage", handleStorageUpdate);

    let bc: BroadcastChannel | null = null;
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        bc = new BroadcastChannel(CHATBOT_SYNC_CHANNEL);
        bc.onmessage = (ev) => {
          if (ev.data?.type === "CHATBOT_CONFIG_UPDATED" && ev.data?.config) {
            setConfig(ev.data.config);
          }
        };
      } catch {
        // Ignore
      }
    }

    return () => {
      window.removeEventListener("royalstudio:chatbot-updated", handleCustomUpdate);
      window.removeEventListener("storage", handleStorageUpdate);
      if (bc) bc.close();
    };
  }, []);

  // Initialize greeting message when config loads or resets
  useEffect(() => {
    if (messages.length === 0) {
      const initialMsgs: ChatbotMessage[] = [
        {
          id: "msg-welcome",
          sender: "bot",
          text: config.welcomeGreeting,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ];
      if (config.decisionTree.guidedFlowEnabled) {
        initialMsgs.push({
          id: "msg-step-1",
          sender: "bot",
          text: config.decisionTree.step1Prompt,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          stepTag: "STEP_1_EVENT",
        });
      }
      setMessages(initialMsgs);
    }
  }, [config.welcomeGreeting, config.decisionTree.guidedFlowEnabled, config.decisionTree.step1Prompt, messages.length]);

  // Auto-scroll chat stream to bottom on new message
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, isTyping, activeStep, isOpen]);

  const liveEstimate = useMemo(
    () => calculateChatbotEstimate(config, draft),
    [config, draft]
  );

  const appendMessages = useCallback((...newMsgs: ChatbotMessage[]) => {
    setMessages((prev) => [...prev, ...newMsgs]);
  }, []);

  const submitLeadToPipeline = useCallback(
    async (options?: { openWhatsApp?: boolean; isAutoTrigger?: boolean }) => {
      setLeadSubmissionResult((prev) => ({ ...prev, submitting: true }));
      try {
        const res = await fetch("/api/chatbot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "SUBMIT_CHATBOT_LEAD",
            draft,
            transcript: messages,
            configOverride: config,
          }),
        });
        const data = await res.json();
        if (res.ok && data?.success) {
          setLeadSubmissionResult({
            submitting: false,
            saved: true,
            referenceId: data.referenceId,
            proposalUrl: data.proposalUrl,
            whatsappUrl: data.whatsappUrl,
            autoConverted: options?.isAutoTrigger,
          });

          if (options?.openWhatsApp && data.whatsappUrl) {
            window.location.href = data.whatsappUrl;
          }
          return data;
        }
      } catch {
        // Fallback direct WhatsApp URL construction if offline
      }

      const rawWa = (
        profile?.publicWhatsappNumber ||
        profile?.whatsapp ||
        "03084877073"
      ).replace(/[^0-9]/g, "");
      const cleanWa = rawWa.startsWith("92") ? rawWa : `92${rawWa.replace(/^0/, "")}`;
      const addonsList =
        liveEstimate.selectedAddons.map((a) => a.label).join(", ") || "Standard Package";
      const fallbackWaText = `*Assalam-o-Alaikum Royal Studio!*\nI planned my wedding package via Royal Assistant:\n• Event: ${liveEstimate.eventTypeLabel}\n• Date & City: ${liveEstimate.eventDate} in ${liveEstimate.city}\n• Coverage: ${liveEstimate.coverageTierLabel}\n• Add-ons: ${addonsList}\n• Estimated Total: PKR ${liveEstimate.estimatedTotalPKR.toLocaleString()}`;
      const fallbackWaUrl = `https://wa.me/${cleanWa}?text=${encodeURIComponent(fallbackWaText)}`;

      setLeadSubmissionResult((prev) => ({
        ...prev,
        submitting: false,
        whatsappUrl: fallbackWaUrl,
      }));

      if (options?.openWhatsApp) {
        window.location.href = fallbackWaUrl;
      }
      return null;
    },
    [draft, messages, config, profile, liveEstimate]
  );

  // Step 1 Handler: Select Event Type
  const handleSelectEventType = (evtId: string) => {
    const evtObj = config.decisionTree.eventTypes.find((e) => e.id === evtId);
    if (!evtObj) return;

    const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setDraft((prev) => ({
      ...prev,
      eventTypeId: evtObj.id,
      eventTypeLabel: evtObj.label,
    }));

    const userMsg: ChatbotMessage = {
      id: `usr-step1-${Date.now()}`,
      sender: "user",
      text: `${evtObj.label} (Base PKR ${evtObj.baseRatePKR.toLocaleString()})`,
      timestamp: nowTime,
    };

    const botMsg: ChatbotMessage = {
      id: `bot-step2-${Date.now() + 1}`,
      sender: "bot",
      text: `Excellent choice! For ${evtObj.label}, we recommend our ${evtObj.recommendedSetup}.\n\n${config.decisionTree.step2Prompt}`,
      timestamp: nowTime,
      stepTag: "STEP_2_DATE_CITY",
      showEstimateCard: config.decisionTree.autoCalculatorEnabled,
    };

    appendMessages(userMsg, botMsg);
    setActiveStep(2);
  };

  // Step 2 Handler: Confirm Date & Location
  const handleConfirmDateAndLocation = (selectedCityOverride?: string) => {
    const chosenCity = selectedCityOverride || draft.city || "Burewala";
    const chosenDate = draft.eventDate || "Upcoming 2026–2027 Date";
    const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    if (selectedCityOverride) {
      setDraft((prev) => ({ ...prev, city: selectedCityOverride }));
    }

    const userMsg: ChatbotMessage = {
      id: `usr-step2-${Date.now()}`,
      sender: "user",
      text: `Date: ${chosenDate} · Location: ${chosenCity}${
        draft.venue ? ` (${draft.venue})` : ""
      }`,
      timestamp: nowTime,
    };

    const isHomeBase = config.decisionTree.homeBaseCities.some((hb) =>
      chosenCity.toLowerCase().includes(hb.toLowerCase())
    );
    const travelNote = isHomeBase
      ? `Great news — ${chosenCity} is within our home studio zone with zero travel surcharge!`
      : `We regularly travel to ${chosenCity}! A standard out-of-city crew travel logistics allowance of PKR ${config.decisionTree.outOfCityTravelSurchargePKR.toLocaleString()} has been factored into your live estimate.`;

    const botMsg: ChatbotMessage = {
      id: `bot-step3-${Date.now() + 1}`,
      sender: "bot",
      text: `${travelNote}\n\n${config.decisionTree.step3Prompt}`,
      timestamp: nowTime,
      stepTag: "STEP_3_COVERAGE",
      showEstimateCard: config.decisionTree.autoCalculatorEnabled,
    };

    appendMessages(userMsg, botMsg);
    setActiveStep(3);
  };

  // Step 3 Handler: Select Coverage Hours & Team Size
  const handleSelectCoverageTier = (tierId: string) => {
    const tierObj = config.decisionTree.coverageTiers.find((c) => c.id === tierId);
    if (!tierObj) return;

    const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setDraft((prev) => ({
      ...prev,
      coverageTierId: tierObj.id,
      coverageTierLabel: tierObj.label,
    }));

    const userMsg: ChatbotMessage = {
      id: `usr-step3-${Date.now()}`,
      sender: "user",
      text: `${tierObj.label} (${tierObj.teamLabel})`,
      timestamp: nowTime,
    };

    const botMsg: ChatbotMessage = {
      id: `bot-step4-${Date.now() + 1}`,
      sender: "bot",
      text: `Noted! We have scheduled ${tierObj.hoursLabel} with ${tierObj.teamLabel}.\n\n${config.decisionTree.step4Prompt}`,
      timestamp: nowTime,
      stepTag: "STEP_4_ADDONS",
      showEstimateCard: config.decisionTree.autoCalculatorEnabled,
    };

    appendMessages(userMsg, botMsg);
    setActiveStep(4);
  };

  // Toggle Add-on in Step 4
  const handleToggleAddon = (addonId: string) => {
    setDraft((prev) => {
      const exists = prev.selectedAddonIds.includes(addonId);
      return {
        ...prev,
        selectedAddonIds: exists
          ? prev.selectedAddonIds.filter((id) => id !== addonId)
          : [...prev.selectedAddonIds, addonId],
      };
    });
  };

  // Step 4 Handler: Complete Guided Flow & Trigger Auto-Calculator + Optional Auto-CRM Lead Handshake
  const handleCompleteGuidedFlow = async () => {
    const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const est = calculateChatbotEstimate(config, draft);
    const addonLabels =
      est.selectedAddons.map((a) => a.label).join(", ") || "No extra add-ons";

    const userMsg: ChatbotMessage = {
      id: `usr-step4-${Date.now()}`,
      sender: "user",
      text: `Selected Add-ons: ${addonLabels}. Calculate my final package estimate!`,
      timestamp: nowTime,
    };

    const discountLine = est.isMultiDayDiscountApplied
      ? `Includes your ${est.multiDayDiscountPercent}% Multi-Day Wedding Discount (-PKR ${est.discountAmountPKR.toLocaleString()}). `
      : "";

    const botMsg: ChatbotMessage = {
      id: `bot-summary-${Date.now() + 1}`,
      sender: "bot",
      text: `Your custom Royal Studio package estimate is ready: PKR ${est.estimatedTotalPKR.toLocaleString()}! ${discountLine}A ${est.depositPercent}% booking deposit (PKR ${est.depositAmountPKR.toLocaleString()}) locks your wedding date and crew. Review your live Estimated Package Card below to book directly or transfer to WhatsApp.`,
      timestamp: nowTime,
      stepTag: "SUMMARY",
      showEstimateCard: true,
    };

    appendMessages(userMsg, botMsg);
    setActiveStep(5);

    if (
      config.leadHandshake.autoConvertCompletedToCrmLead &&
      !hasAutoConvertedRef.current
    ) {
      hasAutoConvertedRef.current = true;
      await submitLeadToPipeline({ isAutoTrigger: true });
    }
  };

  // Reset conversation
  const handleResetChat = () => {
    hasAutoConvertedRef.current = false;
    setLeadSubmissionResult({ submitting: false, saved: false });
    setActiveStep(1);
    const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const resetMsgs: ChatbotMessage[] = [
      {
        id: `msg-welcome-${Date.now()}`,
        sender: "bot",
        text: config.welcomeGreeting,
        timestamp: nowTime,
      },
    ];
    if (config.decisionTree.guidedFlowEnabled) {
      resetMsgs.push({
        id: `msg-step1-${Date.now() + 1}`,
        sender: "bot",
        text: config.decisionTree.step1Prompt,
        timestamp: nowTime,
        stepTag: "STEP_1_EVENT",
      });
    }
    setMessages(resetMsgs);
  };

  // Handle Free-Text or Quick FAQ Question
  const handleSendText = async (overrideQuestion?: string) => {
    const query = (overrideQuestion ?? inputText).trim();
    if (!query) return;
    if (!overrideQuestion) setInputText("");

    const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const userMsg: ChatbotMessage = {
      id: `usr-q-${Date.now()}`,
      sender: "user",
      text: query,
      timestamp: nowTime,
    };
    appendMessages(userMsg);
    setIsTyping(true);

    // 1. Instant local pattern-matching & Knowledge Base lookup
    const localResult = matchKnowledgeBaseAndRespond(query, config, draft);
    if (localResult.extractedDraftUpdates) {
      setDraft((prev) => ({ ...prev, ...localResult.extractedDraftUpdates }));
    }

    // 2. If Hybrid AI mode is enabled, try server-side free-tier Gemini proxy with local fallback
    if (config.engineSettings.mode === "HYBRID_GEMINI_FREE") {
      try {
        const res = await fetch("/api/chatbot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "GENERATE_REPLY",
            message: query,
            draft: { ...draft, ...(localResult.extractedDraftUpdates || {}) },
            configOverride: config,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setIsTyping(false);
          appendMessages({
            id: `bot-r-${Date.now()}`,
            sender: "bot",
            text: data.reply || localResult.reply,
            timestamp: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            matchedKnowledgeTitle:
              data.matchedKnowledgeTitle || localResult.matchedEntry?.title,
            showEstimateCard:
              Boolean(localResult.extractedDraftUpdates) ||
              query.toLowerCase().includes("estimate") ||
              query.toLowerCase().includes("quote") ||
              query.toLowerCase().includes("package"),
          });
          return;
        }
      } catch {
        // Fall through to zero-cost local response
      }
    }

    setTimeout(() => {
      setIsTyping(false);
      appendMessages({
        id: `bot-r-${Date.now()}`,
        sender: "bot",
        text: localResult.reply,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        matchedKnowledgeTitle: localResult.matchedEntry?.title,
        showEstimateCard:
          Boolean(localResult.extractedDraftUpdates) ||
          query.toLowerCase().includes("estimate") ||
          query.toLowerCase().includes("quote") ||
          query.toLowerCase().includes("package"),
      });
    }, 280);
  };

  if (pathname?.startsWith("/admin") || !config.enabled) {
    return null;
  }

  return (
    <div className="no-print fixed bottom-5 right-5 z-50 flex flex-col items-end">
      {/* Chat Window Modal / Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.96 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="mb-3 w-[calc(100vw-2rem)] sm:w-[420px] max-h-[82vh] flex flex-col rounded-2xl border border-[#C9A76A]/35 bg-[#111113]/95 backdrop-blur-xl text-[#F5F2EB] shadow-[0_24px_70px_rgba(0,0,0,0.75)] overflow-hidden"
          >
            {/* Luxury Charcoal & Brass Header */}
            <div className="px-4 py-3.5 bg-gradient-to-r from-[#16161A] via-[#1C1A17] to-[#16161A] border-b border-[#C9A76A]/25 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#C9A76A]/15 border border-[#C9A76A]/40 text-[#C9A76A]">
                  <Bot className="w-5 h-5" />
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-[#111113]" />
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-display text-base font-semibold tracking-wide text-[#F5F2EB] truncate">
                      {config.botName}
                    </h3>
                  </div>
                  <p className="text-[11px] text-[#C9A76A] font-medium truncate">
                    {config.statusLabel}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handleResetChat}
                  title="Restart Package Planner"
                  className="p-2 rounded-lg text-[#9E988E] hover:text-[#F5F2EB] hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label="Close Royal Assistant"
                  className="p-2 rounded-lg text-[#9E988E] hover:text-[#F5F2EB] hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Live Running Estimate Bar (when Auto-Calculator is enabled) */}
            {config.decisionTree.autoCalculatorEnabled && (
              <div className="px-4 py-2 bg-[#181715] border-b border-white/10 flex items-center justify-between text-xs shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <Calculator className="w-3.5 h-3.5 text-[#C9A76A] shrink-0" />
                  <span className="text-[#9E988E] truncate">
                    {liveEstimate.eventTypeLabel.split("(")[0].trim()} · {liveEstimate.city}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono font-semibold text-[#C9A76A] tabular-nums">
                    PKR {liveEstimate.estimatedTotalPKR.toLocaleString()}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveStep(5)}
                    className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-[#C9A76A]/20 text-[#C9A76A] hover:bg-[#C9A76A]/30 transition-colors cursor-pointer"
                  >
                    Quote Card
                  </button>
                </div>
              </div>
            )}

            {/* Chat Stream Body */}
            <div
              ref={chatScrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-3.5 max-h-[52vh]"
            >
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${
                    m.sender === "user" ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-line ${
                      m.sender === "user"
                        ? "bg-[#C9A76A] text-[#111113] font-medium rounded-br-xs"
                        : "bg-[#1B1B1F] text-[#E8E4DC] border border-white/10 rounded-bl-xs"
                    }`}
                  >
                    {m.matchedKnowledgeTitle && m.sender === "bot" && (
                      <div className="text-[10px] font-semibold text-[#C9A76A] mb-1">
                        {m.matchedKnowledgeTitle}
                      </div>
                    )}
                    {m.text}
                  </div>
                  <span className="mt-1 text-[10px] text-[#9E988E] px-1">
                    {m.sender === "bot" ? config.botName : "You"} · {m.timestamp}
                  </span>
                </div>
              ))}

              {isTyping && (
                <div className="flex items-center gap-2 text-xs text-[#9E988E] px-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-[#C9A76A] animate-bounce" />
                  <span className="inline-block w-2 h-2 rounded-full bg-[#C9A76A] animate-bounce [animation-delay:150ms]" />
                  <span className="inline-block w-2 h-2 rounded-full bg-[#C9A76A] animate-bounce [animation-delay:300ms]" />
                  <span className="text-[11px]">Royal Assistant is composing...</span>
                </div>
              )}

              {/* GUIDED DECISION-TREE INTERACTIVE CONTROLS */}
              {config.decisionTree.guidedFlowEnabled && (
                <div className="pt-1 space-y-2.5">
                  {/* Step Progress Indicator */}
                  <div className="flex items-center justify-between text-[11px] text-[#9E988E] px-1">
                    <span>
                      {activeStep <= 4
                        ? `Guided Coverage Planner · Step ${activeStep} of 4`
                        : "Instant Estimate Complete"}
                    </span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setActiveStep(s as 1 | 2 | 3 | 4)}
                          className={`h-1.5 rounded-full transition-all cursor-pointer ${
                            activeStep === s
                              ? "w-5 bg-[#C9A76A]"
                              : activeStep > s
                              ? "w-2.5 bg-emerald-500/70"
                              : "w-2.5 bg-white/15"
                          }`}
                          title={`Go to Step ${s}`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* STEP 1: Collect Event Type */}
                  {activeStep === 1 && (
                    <div className="rounded-xl border border-[#C9A76A]/25 bg-[#16161A] p-3 space-y-2">
                      <div className="text-[11px] font-semibold text-[#C9A76A] flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Select Celebration / Event Type:</span>
                      </div>
                      <div className="grid grid-cols-1 gap-1.5">
                        {config.decisionTree.eventTypes.map((evt) => {
                          const isSelected = draft.eventTypeId === evt.id;
                          return (
                            <button
                              key={evt.id}
                              type="button"
                              onClick={() => handleSelectEventType(evt.id)}
                              className={`w-full text-left px-3 py-2 rounded-lg border text-xs transition-all flex items-center justify-between gap-2 cursor-pointer ${
                                isSelected
                                  ? "border-[#C9A76A] bg-[#C9A76A]/15 text-[#F5F2EB]"
                                  : "border-white/10 bg-[#111113] text-[#E8E4DC] hover:border-[#C9A76A]/50"
                              }`}
                            >
                              <span className="font-medium truncate">{evt.label}</span>
                              <span className="font-mono text-[11px] text-[#C9A76A] shrink-0 tabular-nums">
                                PKR {evt.baseRatePKR.toLocaleString()}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* STEP 2: Date & Location */}
                  {activeStep === 2 && (
                    <div className="rounded-xl border border-[#C9A76A]/25 bg-[#16161A] p-3 space-y-3">
                      <div className="text-[11px] font-semibold text-[#C9A76A] flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Select Event Date & City:</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] text-[#9E988E] mb-1">
                            Preferred Date
                          </label>
                          <input
                            type="date"
                            value={draft.eventDate || ""}
                            onChange={(e) =>
                              setDraft((prev) => ({ ...prev, eventDate: e.target.value }))
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg bg-[#111113] border border-white/15 text-xs text-[#F5F2EB] focus:outline-none focus:border-[#C9A76A]"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-[#9E988E] mb-1">
                            City / Location
                          </label>
                          <input
                            type="text"
                            value={draft.city || ""}
                            onChange={(e) =>
                              setDraft((prev) => ({ ...prev, city: e.target.value }))
                            }
                            placeholder="e.g. Burewala, Lahore"
                            className="w-full px-2.5 py-1.5 rounded-lg bg-[#111113] border border-white/15 text-xs text-[#F5F2EB] focus:outline-none focus:border-[#C9A76A]"
                          />
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] text-[#9E988E] mb-1.5">
                          Quick-Select Popular Cities:
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {config.decisionTree.popularCities.map((cityItem) => (
                            <button
                              key={cityItem}
                              type="button"
                              onClick={() => handleConfirmDateAndLocation(cityItem)}
                              className={`px-2.5 py-1 rounded-lg border text-[11px] transition-colors cursor-pointer ${
                                draft.city?.toLowerCase() === cityItem.toLowerCase()
                                  ? "border-[#C9A76A] bg-[#C9A76A]/20 text-[#C9A76A] font-semibold"
                                  : "border-white/10 bg-[#111113] text-[#E8E4DC] hover:border-[#C9A76A]/40"
                              }`}
                            >
                              {cityItem}
                            </button>
                          ))}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleConfirmDateAndLocation()}
                        className="w-full py-2 px-3 rounded-lg bg-[#C9A76A] hover:bg-[#D4B87A] text-[#111113] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <span>Confirm Date & Location</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* STEP 3: Required Coverage Hours & Team Size */}
                  {activeStep === 3 && (
                    <div className="rounded-xl border border-[#C9A76A]/25 bg-[#16161A] p-3 space-y-2">
                      <div className="text-[11px] font-semibold text-[#C9A76A] flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        <span>Select Coverage Hours & Production Crew:</span>
                      </div>
                      <div className="space-y-1.5">
                        {config.decisionTree.coverageTiers.map((tier) => {
                          const isSelected = draft.coverageTierId === tier.id;
                          return (
                            <button
                              key={tier.id}
                              type="button"
                              onClick={() => handleSelectCoverageTier(tier.id)}
                              className={`w-full text-left px-3 py-2.5 rounded-lg border text-xs transition-all cursor-pointer ${
                                isSelected
                                  ? "border-[#C9A76A] bg-[#C9A76A]/15 text-[#F5F2EB]"
                                  : "border-white/10 bg-[#111113] text-[#E8E4DC] hover:border-[#C9A76A]/50"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold">{tier.label}</span>
                                <span className="font-mono text-[11px] text-[#C9A76A] tabular-nums shrink-0">
                                  {tier.additionalRatePKR === 0
                                    ? "Included"
                                    : `+PKR ${tier.additionalRatePKR.toLocaleString()}`}
                                </span>
                              </div>
                              <div className="text-[11px] text-[#9E988E] mt-0.5">
                                {tier.hoursLabel} · {tier.teamLabel}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* STEP 4: Desired Add-ons */}
                  {activeStep === 4 && (
                    <div className="rounded-xl border border-[#C9A76A]/25 bg-[#16161A] p-3 space-y-2.5">
                      <div className="text-[11px] font-semibold text-[#C9A76A] flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5" />
                        <span>Customize Add-ons (Drone, Albums, Fast Delivery):</span>
                      </div>
                      <div className="space-y-1.5">
                        {config.decisionTree.addons.map((addon) => {
                          const checked = draft.selectedAddonIds.includes(addon.id);
                          return (
                            <button
                              key={addon.id}
                              type="button"
                              onClick={() => handleToggleAddon(addon.id)}
                              className={`w-full text-left px-3 py-2 rounded-lg border text-xs transition-all flex items-center justify-between gap-2 cursor-pointer ${
                                checked
                                  ? "border-[#C9A76A] bg-[#C9A76A]/15 text-[#F5F2EB]"
                                  : "border-white/10 bg-[#111113] text-[#E8E4DC] hover:border-[#C9A76A]/40"
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <div
                                  className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 ${
                                    checked
                                      ? "bg-[#C9A76A] border-[#C9A76A] text-[#111113]"
                                      : "border-white/25 bg-transparent"
                                  }`}
                                >
                                  {checked && <Check className="w-3 h-3 stroke-[3]" />}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-medium truncate">{addon.label}</div>
                                  <div className="text-[10px] text-[#9E988E] truncate">
                                    {addon.description}
                                  </div>
                                </div>
                              </div>
                              <span className="font-mono text-[11px] text-[#C9A76A] shrink-0 tabular-nums">
                                +PKR {addon.ratePKR.toLocaleString()}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      <button
                        type="button"
                        onClick={handleCompleteGuidedFlow}
                        className="w-full py-2.5 px-4 rounded-lg bg-[#C9A76A] hover:bg-[#D4B87A] text-[#111113] text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                      >
                        <Calculator className="w-4 h-4" />
                        <span>
                          Generate Package Estimate (PKR{" "}
                          {liveEstimate.estimatedTotalPKR.toLocaleString()})
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* LIVE INLINE ESTIMATED PACKAGE CARD */}
              {(config.decisionTree.autoCalculatorEnabled &&
                (activeStep >= 2 || messages.some((m) => m.showEstimateCard))) && (
                <div className="rounded-xl border border-[#C9A76A]/40 bg-gradient-to-b from-[#1A1814] to-[#121215] p-3.5 space-y-3 shadow-lg">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-[#C9A76A] font-semibold">
                        Estimated Package Card
                      </div>
                      <h4 className="font-display text-base font-semibold text-[#F5F2EB]">
                        {liveEstimate.eventTypeLabel}
                      </h4>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-[#9E988E]">Estimated Total</div>
                      <div className="font-mono text-base font-bold text-[#C9A76A] tabular-nums">
                        PKR {liveEstimate.estimatedTotalPKR.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Line-Item Breakdown */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-[#E8E4DC]">
                      <span className="text-[#9E988E]">Base Event Coverage:</span>
                      <span className="font-mono tabular-nums">
                        PKR {liveEstimate.baseRatePKR.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[#E8E4DC]">
                      <span className="text-[#9E988E] truncate pr-2">
                        {liveEstimate.hoursLabel} ({liveEstimate.teamLabel}):
                      </span>
                      <span className="font-mono tabular-nums shrink-0">
                        {liveEstimate.coverageUpgradePKR === 0
                          ? "Included"
                          : `+PKR ${liveEstimate.coverageUpgradePKR.toLocaleString()}`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[#E8E4DC]">
                      <span className="text-[#9E988E]">
                        Date & City ({liveEstimate.eventDate} · {liveEstimate.city}):
                      </span>
                      <span className="font-mono tabular-nums shrink-0">
                        {liveEstimate.travelSurchargePKR === 0
                          ? "No Travel Fee"
                          : `+PKR ${liveEstimate.travelSurchargePKR.toLocaleString()}`}
                      </span>
                    </div>

                    {liveEstimate.selectedAddons.map((addon) => (
                      <div
                        key={addon.id}
                        className="flex items-center justify-between text-[#E8E4DC]"
                      >
                        <span className="text-[#C9A76A] truncate pr-2">
                          + {addon.label}:
                        </span>
                        <span className="font-mono tabular-nums shrink-0">
                          PKR {addon.ratePKR.toLocaleString()}
                        </span>
                      </div>
                    ))}

                    {liveEstimate.isMultiDayDiscountApplied && (
                      <div className="flex items-center justify-between text-emerald-400 font-medium pt-0.5">
                        <span>
                          Multi-Day Privilege Discount ({liveEstimate.multiDayDiscountPercent}%):
                        </span>
                        <span className="font-mono tabular-nums">
                          -PKR {liveEstimate.discountAmountPKR.toLocaleString()}
                        </span>
                      </div>
                    )}

                    <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-[#9E988E]">
                      <span>
                        Booking Deposit ({liveEstimate.depositPercent}% to Lock Date):
                      </span>
                      <span className="font-mono font-semibold text-[#F5F2EB] tabular-nums">
                        PKR {liveEstimate.depositAmountPKR.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Recommended Optical Setup Note */}
                  <div className="rounded-lg bg-white/5 px-2.5 py-1.5 text-[11px] text-[#E8E4DC] flex items-center gap-2">
                    <Camera className="w-3.5 h-3.5 text-[#C9A76A] shrink-0" />
                    <span className="truncate">{liveEstimate.recommendedLensNote}</span>
                  </div>

                  {/* Quick Client Details for CRM Lead Handshake */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <div className="relative">
                      <UserIcon className="w-3.5 h-3.5 text-[#9E988E] absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={draft.clientName || ""}
                        onChange={(e) =>
                          setDraft((prev) => ({ ...prev, clientName: e.target.value }))
                        }
                        placeholder="Your Name / Couple"
                        className="w-full pl-8 pr-2.5 py-1.5 rounded-lg bg-[#111113] border border-white/15 text-xs text-[#F5F2EB] placeholder:text-[#9E988E] focus:outline-none focus:border-[#C9A76A]"
                      />
                    </div>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 text-[#9E988E] absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        value={draft.clientPhone || ""}
                        onChange={(e) =>
                          setDraft((prev) => ({ ...prev, clientPhone: e.target.value }))
                        }
                        placeholder="Phone / WhatsApp"
                        className="w-full pl-8 pr-2.5 py-1.5 rounded-lg bg-[#111113] border border-white/15 text-xs text-[#F5F2EB] placeholder:text-[#9E988E] focus:outline-none focus:border-[#C9A76A]"
                      />
                    </div>
                  </div>

                  {/* Direct Inquiry Handoff Actions */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      disabled={leadSubmissionResult.submitting}
                      onClick={() => void submitLeadToPipeline({ openWhatsApp: false })}
                      className="w-full py-2 px-3 rounded-lg bg-[#C9A76A] hover:bg-[#D4B87A] text-[#111113] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>
                        {leadSubmissionResult.submitting
                          ? "Saving Quote..."
                          : "Book This Package"}
                      </span>
                    </button>

                    {config.leadHandshake.whatsappDirectHandoffEnabled && (
                      <button
                        type="button"
                        disabled={leadSubmissionResult.submitting}
                        onClick={() => void submitLeadToPipeline({ openWhatsApp: true })}
                        className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Submit via WhatsApp</span>
                      </button>
                    )}
                  </div>

                  {/* Confirmation Banner if Saved to Studio Booking Pipeline */}
                  {leadSubmissionResult.saved && (
                    <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-2.5 text-[11px] text-emerald-200 flex items-center justify-between gap-2">
                      <div>
                        <span className="font-semibold">
                          Synced to Royal Studio Pipeline ({leadSubmissionResult.referenceId})
                        </span>
                      </div>
                      {leadSubmissionResult.proposalUrl && (
                        <a
                          href={leadSubmissionResult.proposalUrl}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-500 text-slate-950 font-semibold text-[10px] shrink-0 hover:bg-emerald-400"
                        >
                          <span>View Proposal</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quick Knowledge Base Topic Buttons */}
            <div className="px-3.5 py-2 bg-[#141418] border-t border-white/10 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
              {[
                { label: "Packages & Rates", q: "What are your wedding packages and base rates?" },
                { label: "Drone & Albums", q: "What are your rates for Drone coverage and Luxury Albums?" },
                { label: "85mm Outdoor Setup", q: "What camera and 85mm portrait lens setup do you use for outdoor events?" },
                { label: "Deposit & Delivery", q: "What is your booking deposit percentage and delivery timeline?" },
              ].map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => void handleSendText(chip.q)}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-[#C9A76A]/20 hover:text-[#C9A76A] border border-white/10 text-[11px] text-[#E8E4DC] whitespace-nowrap transition-colors cursor-pointer shrink-0"
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* Free-Text Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleSendText();
              }}
              className="p-3 bg-[#111113] border-t border-white/10 flex items-center gap-2 shrink-0"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Ask about packages, drone, dates, or type a question..."
                className="flex-1 bg-[#1A1A1F] border border-white/15 rounded-xl px-3.5 py-2 text-xs text-[#F5F2EB] placeholder:text-[#9E988E] focus:outline-none focus:border-[#C9A76A]"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                aria-label="Send message"
                className="h-9 w-9 rounded-xl bg-[#C9A76A] hover:bg-[#D4B87A] disabled:opacity-40 text-[#111113] flex items-center justify-center transition-colors cursor-pointer shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Chat Trigger Button in Bottom-Right Corner */}
      <motion.button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        aria-label={isOpen ? "Close Royal Assistant Chatbot" : "Open Royal Assistant Chatbot"}
        className="group relative flex items-center gap-3 rounded-2xl border border-[#C9A76A]/45 bg-[#111113]/95 backdrop-blur-xl px-4 py-3 text-left text-[#F5F2EB] shadow-[0_14px_40px_rgba(0,0,0,0.65)] hover:border-[#C9A76A] transition-all cursor-pointer"
      >
        <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#C9A76A] to-[#9E7B3E] text-[#111113] shadow-inner shrink-0">
          {isOpen ? (
            <X className="w-5 h-5" />
          ) : (
            <MessageSquare className="w-5 h-5" />
          )}
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-[#111113]" />
          </span>
        </div>

        <div className="pr-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold tracking-wide text-[#C9A76A]">
              {config.statusLabel}
            </span>
          </div>
          <div className="font-display text-sm font-semibold text-[#F5F2EB]">
            Plan Wedding & Instant Quote
          </div>
        </div>
      </motion.button>
    </div>
  );
}
