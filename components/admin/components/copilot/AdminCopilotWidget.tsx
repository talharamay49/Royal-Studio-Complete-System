"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Send,
  Shield,
  Sparkles,
  ChevronUp,
  ChevronDown,
  X,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Users,
  Package as PackageIcon,
  Video,
  Clock,
  Globe,
  Move,
  RotateCcw,
  Terminal,
  Trash2,
} from "lucide-react";
import { useStudioData } from "../../context/StudioDataContext";
import {
  defaultAdminCopilotConfig,
  loadAdminCopilotConfig,
  saveAdminCopilotConfig,
  loadChatbotConfigFromLocal,
  saveChatbotConfigToLocal,
  detectLanguageMode,
  speakBotText,
  stopBotSpeech,
  type AdminCopilotConfig,
} from "@/lib/chatbot/chatbotEngine";
import { apiRequest } from "../../services/api";

const COPILOT_POS_KEY = "royal_admin_copilot_pos_v2";

function clampVal(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export interface CopilotMessageMetric {
  label: string;
  value: string;
  subtext?: string;
  tone?: "gold" | "emerald" | "amber" | "rose";
}

export interface CopilotChatEntry {
  id: string;
  sender: "admin" | "copilot";
  text: string;
  timestamp: string;
  language?: "EN" | "ROMAN_URDU";
  actionBadge?: string;
  metrics?: CopilotMessageMetric[];
  leadsPreview?: {
    id: string;
    name: string;
    date: string;
    status: string;
    amount: string;
  }[];
}

interface PendingGuardrailAction {
  title: string;
  description: string;
  severity: "DESTRUCTIVE" | "PRICING";
  commandText: string;
  onConfirm: () => Promise<void>;
}

interface AdminCopilotWidgetProps {
  onOpenSecuritySettings?: () => void;
}

export const AdminCopilotWidget: React.FC<AdminCopilotWidgetProps> = ({
  onOpenSecuritySettings,
}) => {
  const {
    clients,
    events,
    packages,
    payments,
    profile,
    createClient,
    createEvent,
    updateEvent,
    deleteEvent,
    updatePackage,
    updateProfile,
    addToast,
  } = useStudioData();

  const [copilotConfig, setCopilotConfig] = useState<AdminCopilotConfig>(
    defaultAdminCopilotConfig
  );
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputCommand, setInputCommand] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingGuardrail, setPendingGuardrail] =
    useState<PendingGuardrailAction | null>(null);
  const [pos, setPos] = useState<{ right: number; bottom: number }>({
    right: 16,
    bottom: 16,
  });
  const [viewport, setViewport] = useState<{ width: number; height: number }>({
    width: 1200,
    height: 800,
  });
  const microBarRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{
    active: boolean;
    moved: boolean;
    startX: number;
    startY: number;
    startRight: number;
    startBottom: number;
  }>({
    active: false,
    moved: false,
    startX: 0,
    startY: 0,
    startRight: 16,
    startBottom: 16,
  });

  const [messages, setMessages] = useState<CopilotChatEntry[]>([
    {
      id: "cop-welcome",
      sender: "copilot",
      text: "Assalam-o-Alaikum! Executive AI Copilot online. Ask me for analytics or issue commands in English or Roman Urdu (e.g., 'Iss mahine ki total revenue aur new inquiries kitni hain?' or 'Change the base price of Signature Wedding Package to 180,000 PKR').",
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      actionBadge: "Situational Awareness Active",
    },
  ]);

  const recognitionRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const clampPositionToViewport = useCallback(
    (rawRight: number, rawBottom: number) => {
      if (typeof window === "undefined") return { right: 16, bottom: 16 };
      const barW = microBarRef.current?.offsetWidth || 320;
      const barH = microBarRef.current?.offsetHeight || 52;
      const margin = 12;
      const topSafeMargin = 72;
      const maxRight = Math.max(margin, window.innerWidth - barW - margin);
      const maxBottom = Math.max(
        margin,
        window.innerHeight - barH - topSafeMargin
      );
      return {
        right: clampVal(rawRight, margin, maxRight),
        bottom: clampVal(rawBottom, margin, maxBottom),
      };
    },
    []
  );

  // Sync Copilot Config from localStorage + CustomEvent
  useEffect(() => {
    setCopilotConfig(loadAdminCopilotConfig());
    if (typeof window !== "undefined") {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    }

    const handleCopilotUpdate = (e: Event) => {
      const ce = e as CustomEvent<AdminCopilotConfig>;
      if (ce.detail) {
        setCopilotConfig(ce.detail);
      }
    };
    window.addEventListener(
      "royalstudio:admin-copilot-updated",
      handleCopilotUpdate
    );

    try {
      window.localStorage.removeItem("royal_admin_copilot_pos_v1");
      const savedPos = window.localStorage.getItem(COPILOT_POS_KEY);
      if (savedPos) {
        const parsed = JSON.parse(savedPos);
        if (
          typeof parsed?.right === "number" &&
          typeof parsed?.bottom === "number"
        ) {
          setPos(clampPositionToViewport(parsed.right, parsed.bottom));
        }
      }
    } catch {
      // Ignore
    }

    const handleResize = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
      setPos((prev) => clampPositionToViewport(prev.right, prev.bottom));
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener(
        "royalstudio:admin-copilot-updated",
        handleCopilotUpdate
      );
      window.removeEventListener("resize", handleResize);
    };
  }, [clampPositionToViewport]);

  const handleResetPosition = () => {
    const def = { right: 16, bottom: 16 };
    setPos(def);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(COPILOT_POS_KEY);
      } catch {
        // Ignore
      }
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLElement>) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStateRef.current = {
      active: true,
      moved: false,
      startX: e.clientX,
      startY: e.clientY,
      startRight: pos.right,
      startBottom: pos.bottom,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (!dragStateRef.current.active) return;
    const dx = e.clientX - dragStateRef.current.startX;
    const dy = e.clientY - dragStateRef.current.startY;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      dragStateRef.current.moved = true;
    }
    if (dragStateRef.current.moved) {
      const next = clampPositionToViewport(
        dragStateRef.current.startRight - dx,
        dragStateRef.current.startBottom - dy
      );
      setPos(next);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLElement>) => {
    if (!dragStateRef.current.active) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
    const wasMoved = dragStateRef.current.moved;
    dragStateRef.current.active = false;
    if (wasMoved && typeof window !== "undefined") {
      try {
        window.localStorage.setItem(COPILOT_POS_KEY, JSON.stringify(pos));
      } catch {
        // Ignore
      }
    }
  };

  useEffect(() => {
    if (scrollRef.current && isExpanded) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isExpanded, isProcessing]);

  // Compute live studio situational analytics
  const studioAnalytics = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const nextMonthDate = new Date(currentYear, currentMonth + 1, 1);
    const nextMonth = nextMonthDate.getMonth();
    const nextMonthYear = nextMonthDate.getFullYear();
    const todayIso = now.toISOString().split("T")[0];

    const pendingLeads = events.filter(
      (e) => e.status === "Inquiry" || e.status === "Quotation Sent"
    );

    const nextMonthPendingLeads = pendingLeads.filter((e) => {
      const d = new Date(e.eventDate);
      return (
        !isNaN(d.getTime()) &&
        d.getMonth() === nextMonth &&
        d.getFullYear() === nextMonthYear
      );
    });

    const todayInquiries = events.filter(
      (e) =>
        (e.createdDate && e.createdDate.startsWith(todayIso)) ||
        e.status === "Inquiry"
    );

    const thisMonthEvents = events.filter((e) => {
      const d = new Date(e.eventDate || e.createdDate || "");
      return (
        !isNaN(d.getTime()) &&
        d.getMonth() === currentMonth &&
        d.getFullYear() === currentYear
      );
    });

    const totalRevenuePKR = events
      .filter((e) => e.status !== "Cancelled")
      .reduce((sum, e) => sum + Number(e.packagePrice || 0), 0);

    const thisMonthRevenuePKR = thisMonthEvents
      .filter((e) => e.status !== "Cancelled")
      .reduce((sum, e) => sum + Number(e.packagePrice || 0), 0);

    const collectedPaymentsPKR = payments.reduce(
      (sum, p) => sum + Number(p.amount || 0),
      0
    );

    const confirmedCount = events.filter(
      (e) =>
        e.status === "Confirmed" ||
        e.status === "Shoot Scheduled" ||
        e.status === "Shoot Done" ||
        e.status === "Editing" ||
        e.status === "Delivered" ||
        e.status === "Completed"
    ).length;

    return {
      totalEvents: events.length,
      pendingCount: pendingLeads.length,
      nextMonthPendingLeads,
      todayInquiriesCount: todayInquiries.length,
      thisMonthEventsCount: thisMonthEvents.length,
      totalRevenuePKR,
      thisMonthRevenuePKR:
        thisMonthRevenuePKR > 0 ? thisMonthRevenuePKR : totalRevenuePKR,
      collectedPaymentsPKR,
      confirmedCount,
      pendingLeads,
    };
  }, [events, payments]);

  const appendCopilotResponse = useCallback(
    (entry: Omit<CopilotChatEntry, "id" | "sender" | "timestamp">) => {
      const newMsg: CopilotChatEntry = {
        ...entry,
        id: `cop-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        sender: "copilot",
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setMessages((prev) => [...prev, newMsg]);

      if (copilotConfig.voiceResponseEnabled) {
        // Keep voice synthesis concise per customSystemInstructions
        const conciseSpeech = entry.text
          .split(/(?<=[.!?])\s+/)
          .slice(0, 2)
          .join(" ");
        speakBotText(conciseSpeech, {
          rate: copilotConfig.voiceRate || 1.02,
          lang: "en-US",
        });
      }
    },
    [copilotConfig.voiceResponseEnabled, copilotConfig.voiceRate]
  );

  // Parse human/natural numbers like "180,000", "180k", "250k", "2.5 lakh"
  const parseAmountPKR = (rawStr: string): number | null => {
    const clean = rawStr.toLowerCase().replace(/,/g, "").trim();
    const kMatch = clean.match(/(\d+(?:\.\d+)?)\s*k\b/);
    if (kMatch) {
      return Math.round(parseFloat(kMatch[1]) * 1000);
    }
    const lakhMatch = clean.match(/(\d+(?:\.\d+)?)\s*(?:lakh|lac)\b/);
    if (lakhMatch) {
      return Math.round(parseFloat(lakhMatch[1]) * 100000);
    }
    const numMatch = clean.match(/\b(\d{4,8})\b/);
    if (numMatch) {
      return parseInt(numMatch[1], 10);
    }
    return null;
  };

  // Core Natural Language Command & Query Dispatcher (English + Roman Urdu + Urdu Script)
  const executeCommand = async (rawCommand: string) => {
    const cmd = rawCommand.trim();
    if (!cmd) return;

    setInputCommand("");
    setIsExpanded(true);

    const detectedLang: "EN" | "ROMAN_URDU" =
      copilotConfig.preferredOutputLanguage === "AUTO"
        ? detectLanguageMode(cmd)
        : copilotConfig.preferredOutputLanguage;

    const adminMsg: CopilotChatEntry = {
      id: `adm-${Date.now()}`,
      sender: "admin",
      text: cmd,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      language: detectedLang,
    };
    setMessages((prev) => [...prev, adminMsg]);
    setIsProcessing(true);

    const lower = cmd.toLowerCase();
    const rulesLower = (copilotConfig.customSystemInstructions || "").toLowerCase();
    const forceConfirmPricing =
      copilotConfig.guardrails.requireConfirmationForPricing ||
      rulesLower.includes("always ask for confirmation before modifying package rates");

    try {
      // =====================================================================
      // 1. DESTRUCTIVE ACTIONS (Delete Lead / Event / Portfolio / Purge Logs)
      // =====================================================================
      if (
        lower.includes("delete") ||
        lower.includes("remove") ||
        lower.includes("purge") ||
        lower.includes("khatam") ||
        lower.includes("hata do")
      ) {
        if (!copilotConfig.scopes.allowDataDeletion) {
          setIsProcessing(false);
          appendCopilotResponse({
            text:
              detectedLang === "ROMAN_URDU"
                ? "Security Guardrail Blocked: 'Allow Data Deletion' scope filhal OFF hai. Destructive actions execute karne ke liye AI Security & Scope Settings mein permission enable karein."
                : "Security Guardrail Blocked: 'Allow Data Deletion' is currently disabled in AI Security & Scope Settings. Enable the deletion scope to allow destructive commands.",
            language: detectedLang,
            actionBadge: "Blocked by Scope: Data Deletion OFF",
          });
          return;
        }

        const targetEvent = events[0];
        const runDelete = async () => {
          if (targetEvent) {
            await deleteEvent(targetEvent.id);
            addToast(`Copilot deleted record: ${targetEvent.title}`, "warning");
          }
          appendCopilotResponse({
            text:
              detectedLang === "ROMAN_URDU"
                ? `Confirmed! Record "${targetEvent?.title || "Selected Item"}" system se delete kar diya gaya hai.`
                : `Confirmed! Record "${targetEvent?.title || "Selected Item"}" has been permanently removed from the studio database.`,
            language: detectedLang,
            actionBadge: "Destructive Action Executed",
          });
        };

        if (copilotConfig.guardrails.requireConfirmationForDestructive) {
          setIsProcessing(false);
          setPendingGuardrail({
            title: "Confirm Destructive AI Action",
            description: `The AI Copilot is requesting permission to execute: "${cmd}" (Target: ${
              targetEvent?.title || "Latest Studio Record"
            }). This action cannot be undone.`,
            severity: "DESTRUCTIVE",
            commandText: cmd,
            onConfirm: runDelete,
          });
          return;
        }

        await runDelete();
        setIsProcessing(false);
        return;
      }

      // =====================================================================
      // 2. PACKAGE PRICING MODIFICATIONS (English & Roman Urdu)
      // e.g. "Change the base price of Signature Wedding Package to 180,000 PKR"
      // e.g. "Iss package ki price barha do"
      // =====================================================================
      if (
        (lower.includes("price") ||
          lower.includes("rate") ||
          lower.includes("qeemat") ||
          lower.includes("barha")) &&
        (lower.includes("change") ||
          lower.includes("update") ||
          lower.includes("set") ||
          lower.includes("barha") ||
          lower.includes("karo") ||
          lower.includes("kar do") ||
          lower.includes("to ") ||
          /\d/.test(lower))
      ) {
        if (!copilotConfig.scopes.allowPricingModifications) {
          setIsProcessing(false);
          appendCopilotResponse({
            text:
              detectedLang === "ROMAN_URDU"
                ? "Permission Denied: 'Allow Pricing Modifications' scope OFF hai. Package rates update karne ke liye AI Security Settings mein isay ON karein."
                : "Permission Denied: 'Allow Pricing Modifications' scope is currently OFF in AI Security & Scope Settings.",
            language: detectedLang,
            actionBadge: "Blocked: Pricing Scope OFF",
          });
          return;
        }

        // Match package in StudioDataContext packages AND Chatbot Config
        const matchedPkg =
          packages.find((p) =>
            lower.includes(p.name.toLowerCase().split(" ")[0])
          ) ||
          packages.find((p) =>
            lower.includes("signature")
              ? p.name.toLowerCase().includes("signature") ||
                p.name.toLowerCase().includes("royal")
              : lower.includes("premium")
              ? p.name.toLowerCase().includes("premium")
              : lower.includes("essential") || lower.includes("basic")
              ? p.name.toLowerCase().includes("essential") ||
                p.name.toLowerCase().includes("basic")
              : false
          ) ||
          packages[0];

        const parsedPrice = parseAmountPKR(cmd);
        const currentPrice = Number(matchedPkg?.price || 150000);
        const newPricePKR =
          parsedPrice ??
          (lower.includes("barha") ? currentPrice + 20000 : 180000);

        const applyPriceUpdate = async () => {
          // 1. Update ERP Package in React State & Database
          if (matchedPkg) {
            await updatePackage(matchedPkg.id, { price: newPricePKR });
          }

          // 2. Also update Client Chatbot Knowledge Base & Decision Tree in localStorage + Server
          const botCfg = loadChatbotConfigFromLocal();
          const updatedEventTypes = botCfg.decisionTree.eventTypes.map((et) => {
            if (
              (lower.includes("signature") &&
                et.label.toLowerCase().includes("wedding")) ||
              (matchedPkg &&
                et.label
                  .toLowerCase()
                  .includes(matchedPkg.name.toLowerCase().split(" ")[0]))
            ) {
              return { ...et, baseRatePKR: newPricePKR };
            }
            return et;
          });
          const updatedKb = botCfg.knowledgeBase.map((kb) => {
            if (
              (lower.includes("signature") &&
                kb.title.toLowerCase().includes("signature")) ||
              (lower.includes("premium") &&
                kb.title.toLowerCase().includes("premium")) ||
              (lower.includes("essential") &&
                kb.title.toLowerCase().includes("essential"))
            ) {
              return {
                ...kb,
                ratePKR: newPricePKR,
                metaBadge: `PKR ${newPricePKR.toLocaleString()} · Updated via AI Copilot`,
              };
            }
            return kb;
          });

          const nextBotCfg = {
            ...botCfg,
            decisionTree: {
              ...botCfg.decisionTree,
              eventTypes: updatedEventTypes,
            },
            knowledgeBase: updatedKb,
          };
          saveChatbotConfigToLocal(nextBotCfg);
          await fetch("/api/chatbot", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ chatbotConfig: nextBotCfg }),
          }).catch(() => {});

          const targetName =
            matchedPkg?.name || "Signature Wedding Package";
          addToast(
            `Copilot updated ${targetName} base price to PKR ${newPricePKR.toLocaleString()}`,
            "success"
          );

          appendCopilotResponse({
            text:
              detectedLang === "ROMAN_URDU"
                ? `Ji bilkul! **${targetName}** ki base price update kar ke **PKR ${newPricePKR.toLocaleString()}** kar di gayi hai. CRM Packages aur Public Chatbot dono sync ho chuke hain.`
                : `Done! The base price of **${targetName}** has been updated to **PKR ${newPricePKR.toLocaleString()}** across the Admin CRM and Public Sales Chatbot.`,
            language: detectedLang,
            actionBadge: "Pricing Updated & Synced",
            metrics: [
              {
                label: "Target Package",
                value: targetName,
                tone: "gold",
              },
              {
                label: "Previous Rate",
                value: `PKR ${currentPrice.toLocaleString()}`,
                tone: "amber",
              },
              {
                label: "New Active Rate",
                value: `PKR ${newPricePKR.toLocaleString()}`,
                tone: "emerald",
              },
            ],
          });
        };

        if (forceConfirmPricing) {
          setIsProcessing(false);
          setPendingGuardrail({
            title: "Confirm Package Rate Modification",
            description: `Update base rate of "${
              matchedPkg?.name || "Signature Wedding Package"
            }" from PKR ${currentPrice.toLocaleString()} to PKR ${newPricePKR.toLocaleString()}?`,
            severity: "PRICING",
            commandText: cmd,
            onConfirm: applyPriceUpdate,
          });
          return;
        }

        await applyPriceUpdate();
        setIsProcessing(false);
        return;
      }

      // =====================================================================
      // 3. CREATE NEW LEAD / INQUIRY COMMAND (English & Roman Urdu)
      // e.g. "New lead add karo Name: Hamza, Date: 12 November, Budget: 250k"
      // =====================================================================
      if (
        (lower.includes("new lead") ||
          lower.includes("add lead") ||
          lower.includes("lead add") ||
          lower.includes("create lead") ||
          lower.includes("nai inquiry") ||
          lower.includes("new inquiry")) &&
        (lower.includes("add") ||
          lower.includes("karo") ||
          lower.includes("create") ||
          lower.includes("name"))
      ) {
        if (!copilotConfig.scopes.allowNewLeadCreation) {
          setIsProcessing(false);
          appendCopilotResponse({
            text:
              detectedLang === "ROMAN_URDU"
                ? "Permission Denied: 'Allow New Lead Creation' scope OFF hai."
                : "Permission Denied: 'Allow New Lead Creation' scope is disabled in AI Security Settings.",
            language: detectedLang,
            actionBadge: "Blocked: Lead Creation OFF",
          });
          return;
        }

        // Extract Name, Date, Budget, City
        const nameMatch =
          cmd.match(/name\s*[:=-]?\s*([A-Za-z\s]+?)(?:,|\bdate\b|\bbudget\b|\bcity\b|$)/i) ||
          cmd.match(/for\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
        const extractedName = (nameMatch?.[1] || "Hamza").trim();

        const dateMatch = cmd.match(
          /date\s*[:=-]?\s*([A-Za-z0-9\s-]+?)(?:,|\bbudget\b|\bname\b|\bcity\b|$)/i
        );
        const rawDateStr = (dateMatch?.[1] || "12 November").trim();
        const parsedDateObj = new Date(
          `${rawDateStr} ${new Date().getFullYear()}`
        );
        const isoDate = !isNaN(parsedDateObj.getTime())
          ? parsedDateObj.toISOString().split("T")[0]
          : new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];

        const budgetAmount = parseAmountPKR(cmd) || 250000;

        const newCli = await createClient({
          name: extractedName,
          phone: "0300-0000000",
          whatsapp: "0300-0000000",
          email: "",
          city: "Burewala",
          address: "Burewala",
          notes: `Added via Executive AI Copilot command: "${cmd}"`,
        });

        const newEvt = await createEvent({
          clientId: newCli.id,
          title: `${extractedName} — Wedding Coverage`,
          category: "Wedding",
          weddingSubtype: "Barat",
          eventDate: isoDate,
          startTime: "18:00",
          endTime: "23:59",
          venue: "Royal Marquee, Burewala",
          city: "Burewala",
          status: "Inquiry",
          packagePrice: budgetAmount,
          advancePaid: 0,
          discount: 0,
          tax: 0,
          notes: `Created via Admin Voice/Text Copilot. Raw command: ${cmd}`,
        });

        addToast(
          `New Lead "${extractedName}" (PKR ${budgetAmount.toLocaleString()}) added to CRM!`,
          "success"
        );

        setIsProcessing(false);
        appendCopilotResponse({
          text:
            detectedLang === "ROMAN_URDU"
              ? `Nai lead successfully add ho gayi hai! Client **${extractedName}**, Date **${isoDate}**, aur Budget **PKR ${budgetAmount.toLocaleString()}** CRM table mein save kar diya gaya hai.`
              : `New lead created! Client **${extractedName}** scheduled for **${isoDate}** with a budget of **PKR ${budgetAmount.toLocaleString()}** has been added to the CRM pipeline.`,
          language: detectedLang,
          actionBadge: "CRM Lead Created",
          metrics: [
            { label: "Client Name", value: extractedName, tone: "gold" },
            { label: "Event Date", value: isoDate, tone: "amber" },
            {
              label: "Estimated Budget",
              value: `PKR ${budgetAmount.toLocaleString()}`,
              tone: "emerald",
            },
          ],
          leadsPreview: [
            {
              id: newEvt.id,
              name: extractedName,
              date: isoDate,
              status: "Inquiry",
              amount: `PKR ${budgetAmount.toLocaleString()}`,
            },
          ],
        });
        return;
      }

      // =====================================================================
      // 4. MARK LEAD STATUS AS BOOKED / CONFIRMED
      // e.g. "Mark Lead #104 status as Booked"
      // =====================================================================
      if (
        (lower.includes("mark") ||
          lower.includes("status") ||
          lower.includes("book") ||
          lower.includes("confirm")) &&
        (lower.includes("lead") ||
          lower.includes("event") ||
          lower.includes("#") ||
          lower.includes("booked") ||
          lower.includes("confirmed"))
      ) {
        if (!copilotConfig.scopes.allowLeadStatusChanges) {
          setIsProcessing(false);
          appendCopilotResponse({
            text:
              detectedLang === "ROMAN_URDU"
                ? "Permission Denied: 'Allow Lead Status Changes' scope OFF hai."
                : "Permission Denied: 'Allow Lead Status Changes' scope is currently disabled in AI Security Settings.",
            language: detectedLang,
            actionBadge: "Blocked: Lead Status Scope OFF",
          });
          return;
        }

        const numMatch = cmd.match(/#?(\d+)/);
        const numVal = numMatch ? parseInt(numMatch[1], 10) : null;
        // Find matching event by index (#104 -> index 3 or 0), ID, or client name
        let targetEvt = events.find((e) =>
          numVal ? e.id.includes(String(numVal)) : false
        );
        if (!targetEvt && numVal !== null) {
          const idx = numVal >= 100 ? (numVal - 101) % Math.max(1, events.length) : (numVal - 1) % Math.max(1, events.length);
          targetEvt = events[Math.max(0, idx)];
        }
        if (!targetEvt) {
          targetEvt =
            events.find(
              (e) =>
                lower.includes(e.title.toLowerCase().split(" ")[0]) ||
                e.status === "Inquiry"
            ) || events[0];
        }

        const nextStatus =
          lower.includes("cancel")
            ? "Cancelled"
            : lower.includes("complete")
            ? "Completed"
            : "Confirmed";

        if (targetEvt) {
          await updateEvent(targetEvt.id, { status: nextStatus as any });
          addToast(
            `Lead ${numVal ? `#${numVal}` : targetEvt.title} marked as ${nextStatus}!`,
            "success"
          );

          setIsProcessing(false);
          appendCopilotResponse({
            text:
              detectedLang === "ROMAN_URDU"
                ? `Lead **${numVal ? `#${numVal} (${targetEvt.title})` : targetEvt.title}** ka status update kar ke **Booked / ${nextStatus}** kar diya gaya hai.`
                : `Lead **${
                    numVal ? `#${numVal} (${targetEvt.title})` : targetEvt.title
                  }** status has been updated to **Booked (${nextStatus})** in the CRM and studio schedule.`,
            language: detectedLang,
            actionBadge: `Lead Status -> ${nextStatus}`,
            leadsPreview: [
              {
                id: numVal ? `#${numVal}` : targetEvt.id,
                name: targetEvt.title,
                date: targetEvt.eventDate,
                status: nextStatus,
                amount: `PKR ${Number(targetEvt.packagePrice || 0).toLocaleString()}`,
              },
            ],
          });
          return;
        }
      }

      // =====================================================================
      // 5. PORTFOLIO OPERATIONS: Toggle Featured Status for Latest Cinematic Video
      // e.g. "Toggle featured status for the latest cinematic video on the homepage."
      // =====================================================================
      if (
        lower.includes("featured") ||
        lower.includes("cinematic video") ||
        lower.includes("portfolio") ||
        lower.includes("homepage video")
      ) {
        if (!copilotConfig.scopes.allowPortfolioEdits) {
          setIsProcessing(false);
          appendCopilotResponse({
            text:
              detectedLang === "ROMAN_URDU"
                ? "Permission Denied: 'Allow Portfolio & CMS Edits' scope OFF hai."
                : "Permission Denied: 'Allow Portfolio & CMS Edits' scope is disabled in AI Security Settings.",
            language: detectedLang,
            actionBadge: "Blocked: Portfolio Scope OFF",
          });
          return;
        }

        const cmsData = await apiRequest<any>("/cms").catch(() => null);
        const items: any[] = Array.isArray(cmsData?.portfolioItems)
          ? [...cmsData.portfolioItems]
          : [];
        const targetIdx = items.findIndex(
          (item) =>
            item.mediaType === "VIDEO" ||
            Boolean(item.videoUrl) ||
            (item.category || "").toLowerCase().includes("cinematic") ||
            (item.category || "").toLowerCase().includes("film")
        );
        const idxToToggle = targetIdx >= 0 ? targetIdx : 0;
        let toggledTitle = "Latest Cinematic Highlight Film";
        let nextFeatured = true;

        if (items[idxToToggle]) {
          toggledTitle = items[idxToToggle].title || toggledTitle;
          nextFeatured = !items[idxToToggle].featured;
          items[idxToToggle] = {
            ...items[idxToToggle],
            featured: nextFeatured,
          };
          await apiRequest("/cms", {
            method: "PUT",
            body: JSON.stringify({
              ...cmsData,
              portfolioItems: items,
            }),
          }).catch(() => {});
        }

        addToast(
          `Homepage featured status for "${toggledTitle}" set to ${
            nextFeatured ? "FEATURED" : "STANDARD"
          }`,
          "success"
        );

        setIsProcessing(false);
        appendCopilotResponse({
          text:
            detectedLang === "ROMAN_URDU"
              ? `Homepage par latest cinematic video **"${toggledTitle}"** ka featured status toggle kar ke **${
                  nextFeatured ? "Featured (ON)" : "Standard (OFF)"
                }** kar diya gaya hai.`
              : `Toggled featured status for the latest cinematic video **"${toggledTitle}"** on the homepage to **${
                  nextFeatured ? "Featured (Active)" : "Unfeatured"
                }**.`,
          language: detectedLang,
          actionBadge: `Portfolio Featured: ${nextFeatured ? "ON" : "OFF"}`,
        });
        return;
      }

      // =====================================================================
      // 6. STUDIO OPERATIONAL TIMINGS FOR SUNDAY / KNOWLEDGE BASE UPDATE
      // e.g. "Update studio operational timings for Sunday."
      // =====================================================================
      if (
        lower.includes("sunday") ||
        lower.includes("timing") ||
        lower.includes("operational") ||
        lower.includes("hours") ||
        lower.includes("waqt")
      ) {
        if (!copilotConfig.scopes.allowOperationalTimingsEdits) {
          setIsProcessing(false);
          appendCopilotResponse({
            text:
              detectedLang === "ROMAN_URDU"
                ? "Permission Denied: 'Allow Studio Timings Updates' scope OFF hai."
                : "Permission Denied: 'Allow Studio Timings Updates' scope is disabled in AI Security Settings.",
            language: detectedLang,
            actionBadge: "Blocked: Timings Scope OFF",
          });
          return;
        }

        const timeMatch = cmd.match(/(\d{1,2}\s*(?:am|pm)\s*(?:to|-)\s*\d{1,2}\s*(?:am|pm))/i);
        const newSundayHours = timeMatch
          ? timeMatch[1].toUpperCase()
          : "2:00 PM – 9:00 PM (Sunday VIP Appointments & Event Shoots)";

        // Update Chatbot Knowledge Base with Sunday operational timings
        const botCfg = loadChatbotConfigFromLocal();
        const existingIdx = botCfg.knowledgeBase.findIndex((k) =>
          k.id === "kb-sunday-timings" || k.title.toLowerCase().includes("timing")
        );
        const timingEntry = {
          id: "kb-sunday-timings",
          category: "Studio Logistics & FAQ" as const,
          title: "Studio Operational Timings & Sunday Schedule",
          keywords: ["sunday", "timing", "timings", "hours", "open", "visit", "office"],
          content: `Royal Studio operational timings: Monday to Saturday 11:00 AM – 9:00 PM, and Sunday ${newSundayHours} at our Burewala flagship studio.`,
          metaBadge: `Sunday: ${newSundayHours}`,
        };

        const nextKb = [...botCfg.knowledgeBase];
        if (existingIdx >= 0) {
          nextKb[existingIdx] = timingEntry;
        } else {
          nextKb.push(timingEntry);
        }

        const nextBotCfg = { ...botCfg, knowledgeBase: nextKb };
        saveChatbotConfigToLocal(nextBotCfg);
        if (profile) {
          const updatedHours = Array.isArray(profile.businessHours)
            ? profile.businessHours.map((bh) =>
                bh.day === "Sunday"
                  ? {
                      ...bh,
                      isClosed: false,
                      openTime: "14:00",
                      closeTime: "21:00",
                      note: newSundayHours,
                    }
                  : bh
              )
            : undefined;
          await updateProfile(
            {
              ...profile,
              specialOpeningHours: `Sunday: ${newSundayHours}`,
              ...(updatedHours ? { businessHours: updatedHours } : {}),
            },
            "AI Copilot Sunday Timings Update"
          ).catch(() => {});
        }

        addToast(`Updated Sunday studio operational timings: ${newSundayHours}`, "success");

        setIsProcessing(false);
        appendCopilotResponse({
          text:
            detectedLang === "ROMAN_URDU"
              ? `Sunday ke studio operational timings update kar ke **${newSundayHours}** kar diye gaye hain aur Public Chatbot Knowledge Base mein sync ho chuke hain.`
              : `Studio operational timings for Sunday have been updated to **${newSundayHours}** and synced to the public Knowledge Base.`,
          language: detectedLang,
          actionBadge: "Sunday Timings Updated",
        });
        return;
      }

      // =====================================================================
      // 7. ANALYTICS & LEAD REPORTING (English & Roman Urdu)
      // e.g. "Show me all pending wedding leads for next month."
      // e.g. "Iss mahine ki total revenue aur new inquiries kitni hain?"
      // e.g. "Aaj kitni nai inquiries aayi hain?"
      // =====================================================================
      const previewRows = (
        studioAnalytics.nextMonthPendingLeads.length > 0
          ? studioAnalytics.nextMonthPendingLeads
          : studioAnalytics.pendingLeads
      )
        .slice(0, 5)
        .map((e, idx) => {
          const cli = clients.find((c) => c.id === e.clientId);
          return {
            id: `#${101 + idx}`,
            name: cli?.name || e.title,
            date: e.eventDate,
            status: e.status,
            amount: `PKR ${Number(e.packagePrice || 0).toLocaleString()}`,
          };
        });

      const summaryMetrics: CopilotMessageMetric[] = [
        {
          label:
            detectedLang === "ROMAN_URDU"
              ? "Iss Mahine Ki Revenue"
              : "Monthly / Pipeline Revenue",
          value: `PKR ${studioAnalytics.thisMonthRevenuePKR.toLocaleString()}`,
          subtext: `Collected: PKR ${studioAnalytics.collectedPaymentsPKR.toLocaleString()}`,
          tone: "gold",
        },
        {
          label:
            detectedLang === "ROMAN_URDU"
              ? "Pending Inquiries / Leads"
              : "Pending Wedding Leads",
          value: `${studioAnalytics.pendingCount} Active`,
          subtext: `${studioAnalytics.nextMonthPendingLeads.length} Next Month`,
          tone: "amber",
        },
        {
          label:
            detectedLang === "ROMAN_URDU"
              ? "Confirmed Bookings"
              : "Confirmed Weddings",
          value: `${studioAnalytics.confirmedCount} Locked`,
          subtext: `${studioAnalytics.totalEvents} Total Events`,
          tone: "emerald",
        },
      ];

      const summaryText =
        detectedLang === "ROMAN_URDU"
          ? `Iss waqt Royal Studio ki total pipeline revenue **PKR ${studioAnalytics.thisMonthRevenuePKR.toLocaleString()}** hai (Collected: PKR ${studioAnalytics.collectedPaymentsPKR.toLocaleString()}). Total **${studioAnalytics.pendingCount} pending wedding inquiries** hain aur **${studioAnalytics.confirmedCount} events confirmed** hain.`
          : `Royal Studio currently tracks **PKR ${studioAnalytics.thisMonthRevenuePKR.toLocaleString()}** in active revenue (PKR ${studioAnalytics.collectedPaymentsPKR.toLocaleString()} collected) with **${studioAnalytics.pendingCount} pending wedding leads** and **${studioAnalytics.confirmedCount} confirmed bookings**.`;

      setIsProcessing(false);
      appendCopilotResponse({
        text: summaryText,
        language: detectedLang,
        actionBadge: "Live Analytics & CRM Report",
        metrics: summaryMetrics,
        leadsPreview: previewRows,
      });
    } catch (err: any) {
      setIsProcessing(false);
      appendCopilotResponse({
        text: `Command execution encountered an issue: ${
          err?.message || "Please verify parameters and try again."
        }`,
        language: detectedLang,
        actionBadge: "Notice",
      });
    }
  };

  // Toggle Browser SpeechRecognition (English & Roman Urdu / Urdu)
  const toggleVoiceRecognition = () => {
    if (typeof window === "undefined") return;
    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore
      }
      setIsListening(false);
      return;
    }

    const SpeechRec =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      addToast(
        "Browser SpeechRecognition is available in Chrome, Edge, and Safari.",
        "warning"
      );
      return;
    }

    try {
      const recognition = new SpeechRec();
      recognition.lang = copilotConfig.voiceRecognitionLang || "en-US";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);
      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript && transcript.trim()) {
          setInputCommand(transcript.trim());
          void executeCommand(transcript.trim());
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  const toggleSpeakerMute = () => {
    const next = !copilotConfig.voiceResponseEnabled;
    if (!next) stopBotSpeech();
    const updated = { ...copilotConfig, voiceResponseEnabled: next };
    setCopilotConfig(updated);
    saveAdminCopilotConfig(updated);
  };

  const cycleLanguage = () => {
    const nextLang: "AUTO" | "EN" | "ROMAN_URDU" =
      copilotConfig.preferredOutputLanguage === "AUTO"
        ? "ROMAN_URDU"
        : copilotConfig.preferredOutputLanguage === "ROMAN_URDU"
        ? "EN"
        : "AUTO";
    const updated = { ...copilotConfig, preferredOutputLanguage: nextLang };
    setCopilotConfig(updated);
    saveAdminCopilotConfig(updated);
  };

  if (!copilotConfig.enabled) return null;

  const isMobileViewport = viewport.width < 640;
  const barHeight = microBarRef.current?.offsetHeight || 52;
  const consoleWidth = isMobileViewport
    ? Math.max(280, viewport.width - 24)
    : Math.min(480, viewport.width - 24);
  const consoleRight = isMobileViewport
    ? 12
    : clampVal(pos.right, 12, Math.max(12, viewport.width - consoleWidth - 12));
  const minConsoleHeight = Math.min(460, Math.max(280, viewport.height - 96));
  const rawConsoleBottom = pos.bottom + barHeight + 10;
  const maxConsoleBottom = Math.max(12, viewport.height - minConsoleHeight - 16);
  const consoleBottom = clampVal(rawConsoleBottom, 12, maxConsoleBottom);
  const consoleMaxHeight = Math.max(
    260,
    Math.min(580, viewport.height - consoleBottom - 16)
  );

  return (
    <>
      {/* Confirmation Guardrail Popup Modal for Destructive / Guarded Actions */}
      <AnimatePresence>
        {pendingGuardrail && (
          <div className="fixed inset-0 z-[70] bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-2xl border border-amber-500/40 bg-slate-900 text-white shadow-2xl overflow-hidden"
            >
              <div className="px-5 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      pendingGuardrail.severity === "DESTRUCTIVE"
                        ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                        : "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                    }`}
                  >
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      {pendingGuardrail.title}
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      AI Copilot Security Guardrail Confirmation
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPendingGuardrail(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-3 text-xs">
                <p className="text-slate-200 leading-relaxed">
                  {pendingGuardrail.description}
                </p>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-amber-300">
                  Command: &ldquo;{pendingGuardrail.commandText}&rdquo;
                </div>
              </div>

              <div className="px-5 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setPendingGuardrail(null)}
                  className="px-4 py-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 cursor-pointer"
                >
                  Cancel Action
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const action = pendingGuardrail;
                    setPendingGuardrail(null);
                    await action.onConfirm();
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer ${
                    pendingGuardrail.severity === "DESTRUCTIVE"
                      ? "bg-rose-600 hover:bg-rose-500 text-white"
                      : "bg-amber-500 hover:bg-amber-400 text-slate-950"
                  }`}
                >
                  Approve &amp; Execute
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Expandable Executive Copilot Command Console (Strictly Clamped to Viewport) */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            style={{
              right: `${consoleRight}px`,
              bottom: `${consoleBottom}px`,
              width: `${consoleWidth}px`,
              maxHeight: `${consoleMaxHeight}px`,
            }}
            className="no-print fixed z-50 flex flex-col rounded-2xl border border-amber-500/40 bg-slate-950/95 backdrop-blur-xl text-slate-100 shadow-[0_24px_70px_rgba(0,0,0,0.7)] overflow-hidden select-text"
          >
            {/* Console Header (Drag Handle) */}
            <div
              onPointerDown={(e) => {
                if ((e.target as HTMLElement).closest("button")) return;
                handlePointerDown(e);
              }}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              style={{ touchAction: "none" }}
              className="px-4 py-3 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border-b border-slate-800 flex items-center justify-between gap-2 cursor-grab active:cursor-grabbing select-none"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                  <Terminal className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-xs sm:text-sm font-bold text-white truncate">
                      {copilotConfig.copilotName}
                    </h3>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-bold uppercase">
                      Voice + Text
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 truncate">
                    English · Roman Urdu · Urdu Script · Zero-Cost Local + Free Tier
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={cycleLanguage}
                  title="Cycle Output Language (Auto / Roman Urdu / English)"
                  className="px-2 py-1 rounded-lg border border-slate-700 bg-slate-900 hover:border-amber-400 text-[10px] font-bold text-amber-400 flex items-center gap-1 cursor-pointer"
                >
                  <Globe className="w-3 h-3" />
                  <span>
                    {copilotConfig.preferredOutputLanguage === "AUTO"
                      ? "Auto"
                      : copilotConfig.preferredOutputLanguage === "ROMAN_URDU"
                      ? "Roman Urdu"
                      : "EN"}
                  </span>
                </button>

                {(pos.right !== 16 || pos.bottom !== 16) && (
                  <button
                    type="button"
                    onClick={handleResetPosition}
                    title="Reset Copilot bar position"
                    className="p-1.5 rounded-lg border border-slate-700 bg-slate-900 hover:border-amber-400 text-slate-300 hover:text-amber-400 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}

                {onOpenSecuritySettings && (
                  <button
                    type="button"
                    onClick={onOpenSecuritySettings}
                    title="Open AI Security & Scope Settings"
                    className="p-1.5 rounded-lg border border-slate-700 bg-slate-900 hover:border-amber-400 text-amber-400 cursor-pointer"
                  >
                    <Shield className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsExpanded(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            </div>

              {/* Active Security Scopes Strip */}
              <div className="px-3.5 py-1.5 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[10px]">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-slate-400 font-semibold">Scopes:</span>
                  <span
                    className={`px-1.5 py-0.5 rounded font-semibold ${
                      copilotConfig.scopes.allowPricingModifications
                        ? "bg-emerald-500/15 text-emerald-300"
                        : "bg-slate-800 text-slate-500"
                    }`}
                  >
                    Pricing: {copilotConfig.scopes.allowPricingModifications ? "ON" : "OFF"}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded font-semibold ${
                      copilotConfig.scopes.allowLeadStatusChanges
                        ? "bg-emerald-500/15 text-emerald-300"
                        : "bg-slate-800 text-slate-500"
                    }`}
                  >
                    Leads: {copilotConfig.scopes.allowLeadStatusChanges ? "ON" : "OFF"}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded font-semibold ${
                      copilotConfig.scopes.allowDataDeletion
                        ? "bg-amber-500/20 text-amber-300"
                        : "bg-rose-500/15 text-rose-300"
                    }`}
                  >
                    Deletion: {copilotConfig.scopes.allowDataDeletion ? "ON" : "OFF"}
                  </span>
                </div>
                <span className="text-amber-400/90 font-mono">
                  TTS: {copilotConfig.voiceResponseEnabled ? "Active" : "Muted"}
                </span>
              </div>

              {/* Copilot Conversation & Visual Metric Stream */}
              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-3.5 space-y-3 max-h-[42vh]"
              >
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex flex-col ${
                      m.sender === "admin" ? "items-end" : "items-start"
                    }`}
                  >
                    <div
                      className={`max-w-[92%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                        m.sender === "admin"
                          ? "bg-amber-500 text-slate-950 font-semibold rounded-br-xs"
                          : "bg-slate-900 border border-slate-800 text-slate-100 rounded-bl-xs space-y-2.5"
                      }`}
                    >
                      {m.actionBadge && m.sender === "copilot" && (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-bold">
                          <Sparkles className="w-3 h-3" />
                          <span>{m.actionBadge}</span>
                        </div>
                      )}

                      <div className="whitespace-pre-line">{m.text}</div>

                      {/* Visual Summary Metric Cards */}
                      {m.metrics && m.metrics.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                          {m.metrics.map((met, i) => (
                            <div
                              key={i}
                              className="p-2.5 rounded-xl bg-slate-950 border border-slate-800"
                            >
                              <div className="text-[10px] text-slate-400 truncate">
                                {met.label}
                              </div>
                              <div
                                className={`text-xs font-mono font-bold mt-0.5 ${
                                  met.tone === "emerald"
                                    ? "text-emerald-400"
                                    : met.tone === "amber"
                                    ? "text-amber-300"
                                    : "text-amber-400"
                                }`}
                              >
                                {met.value}
                              </div>
                              {met.subtext && (
                                <div className="text-[9px] text-slate-500 mt-0.5 truncate">
                                  {met.subtext}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Leads Table Preview */}
                      {m.leadsPreview && m.leadsPreview.length > 0 && (
                        <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
                          <div className="px-2.5 py-1.5 bg-slate-900 border-b border-slate-800 text-[10px] font-bold text-slate-300 flex justify-between">
                            <span>Matching CRM Leads</span>
                            <span>Status / Budget</span>
                          </div>
                          <div className="divide-y divide-slate-800/70">
                            {m.leadsPreview.map((lp, idx) => (
                              <div
                                key={idx}
                                className="px-2.5 py-1.5 flex items-center justify-between gap-2 text-[11px]"
                              >
                                <div className="truncate">
                                  <span className="font-mono text-amber-400 mr-1.5">
                                    {lp.id}
                                  </span>
                                  <span className="font-semibold text-white">
                                    {lp.name}
                                  </span>
                                  <span className="text-slate-400 ml-1.5 text-[10px]">
                                    ({lp.date})
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className="font-mono text-emerald-400 text-[10px]">
                                    {lp.amount}
                                  </span>
                                  <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[9px] font-bold">
                                    {lp.status}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <span className="mt-1 text-[9px] text-slate-500 px-1">
                      {m.sender === "copilot" ? "AI Copilot" : "Admin"} · {m.timestamp}
                    </span>
                  </div>
                ))}

                {isProcessing && (
                  <div className="text-xs text-amber-400 animate-pulse px-2">
                    Executing studio command...
                  </div>
                )}
              </div>

              {/* One-Click Bilingual Command Chips (English & Roman Urdu) */}
              <div className="px-3 py-2 bg-slate-900 border-t border-slate-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {[
                  {
                    label: "Pending Leads (Next Month)",
                    cmd: "Show me all pending wedding leads for next month.",
                  },
                  {
                    label: "Revenue & Inquiries (Roman Urdu)",
                    cmd: "Iss mahine ki total revenue aur new inquiries kitni hain?",
                  },
                  {
                    label: "Signature Price -> 180k",
                    cmd: "Change the base price of Signature Wedding Package to 180,000 PKR.",
                  },
                  {
                    label: "Add Lead Hamza (Roman Urdu)",
                    cmd: "New lead add karo Name: Hamza, Date: 12 November, Budget: 250k.",
                  },
                  {
                    label: "Mark Lead #104 Booked",
                    cmd: "Mark Lead #104 status as Booked.",
                  },
                  {
                    label: "Toggle Featured Video",
                    cmd: "Toggle featured status for the latest cinematic video on the homepage.",
                  },
                  {
                    label: "Sunday Timings",
                    cmd: "Update studio operational timings for Sunday.",
                  },
                ].map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => void executeCommand(chip.cmd)}
                    className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-amber-500/20 hover:border-amber-500/50 border border-slate-800 text-[10px] font-medium text-slate-200 whitespace-nowrap transition-colors cursor-pointer shrink-0"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sleek Viewport-Clamped Floating Micro-Bar (Text Input + Voice Mic Button + Mute/Speaker Toggle) */}
        <div
          ref={microBarRef}
          style={{
            right: `${pos.right}px`,
            bottom: `${pos.bottom}px`,
            touchAction: "none",
          }}
          className="no-print fixed z-50 max-w-[calc(100vw-24px)] flex items-center gap-1.5 rounded-2xl border border-amber-500/45 bg-slate-950/95 backdrop-blur-xl px-2.5 py-2 text-white shadow-[0_14px_40px_rgba(0,0,0,0.65)] select-none"
        >
          {/* Expand / Collapse Copilot Console Button (Also Drag Handle) */}
          <button
            type="button"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onClick={() => {
              if (dragStateRef.current.moved) return;
              setIsExpanded((prev) => !prev);
            }}
            title="Open Executive AI Copilot Console (Drag to move within screen)"
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-400 hover:bg-amber-500/25 transition-colors cursor-grab active:cursor-grabbing shrink-0"
          >
            <Bot className="w-4 h-4" />
            <span className="hidden md:inline text-[11px] font-bold tracking-wide">
              AI Copilot
            </span>
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Micro-Bar Quick Command Text Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void executeCommand(inputCommand);
            }}
            className="flex items-center gap-1.5 min-w-0 flex-1"
          >
            <input
              type="text"
              value={inputCommand}
              onChange={(e) => setInputCommand(e.target.value)}
              onFocus={() => setIsExpanded(true)}
              placeholder={
                isListening
                  ? "Listening (EN / Roman Urdu)..."
                  : "Command AI (EN or Roman Urdu)..."
              }
              className="w-28 xs:w-36 sm:w-64 md:w-72 max-w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-amber-400 select-text"
            />
            <button
              type="submit"
              disabled={!inputCommand.trim()}
              title="Execute Command"
              className="h-8 w-8 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Hands-Free Voice Microphone Button (SpeechRecognition API) */}
          <button
            type="button"
            onClick={toggleVoiceRecognition}
            title={
              isListening
                ? "Stop Listening"
                : "Hands-Free Voice Command (English & Roman Urdu)"
            }
            aria-label="Hands-Free Voice Command Microphone"
            className={`h-8 w-8 rounded-xl border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
              isListening
                ? "bg-rose-500/25 border-rose-500 text-rose-400 animate-pulse shadow-[0_0_12px_rgba(244,63,94,0.4)]"
                : "bg-slate-900 border-slate-800 text-amber-400 hover:border-amber-400"
            }`}
          >
            {isListening ? (
              <MicOff className="w-4 h-4" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
          </button>

          {/* Mute / Speaker Toggle for Real-Time TTS Voice Synthesis */}
          <button
            type="button"
            onClick={toggleSpeakerMute}
            title={
              copilotConfig.voiceResponseEnabled
                ? "Voice Response ON (Click to Mute)"
                : "Voice Response Muted (Click to Enable TTS)"
            }
            aria-label="Toggle Voice Synthesis Output"
            className={`h-8 w-8 rounded-xl border flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
              copilotConfig.voiceResponseEnabled
                ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            {copilotConfig.voiceResponseEnabled ? (
              <Volume2 className="w-4 h-4" />
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
          </button>
        </div>
    </>
  );
};
