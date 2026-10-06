import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { dbInstance } from "@/lib/admin/db";
import { getAuthUser } from "@/lib/admin/apiHandler";
import { computeInvoiceStatus } from "@/components/admin/utils/calculations";
import { persistWebsiteInquiryToFirestore } from "@/lib/db/storageAdapter";
import {
  defaultChatbotConfig,
  sanitizeChatbotConfig,
  calculateChatbotEstimate,
  matchKnowledgeBaseAndRespond,
  type ChatbotConfig,
  type ChatbotInquiryDraft,
  type ChatbotMessage,
} from "@/lib/chatbot/chatbotEngine";
import {
  portfolioItems as defaultPortfolioItems,
  pricingPackages as defaultPricingPackages,
  detailedServices as defaultDetailedServices,
  testimonials as defaultTestimonials,
  blogPosts as defaultBlogPosts,
} from "@/lib/data";

function sanitizeStr(val: unknown, maxLen = 400): string {
  if (typeof val !== "string") return "";
  return val.replace(/<[^>]*>?/gm, "").trim().slice(0, maxLen);
}

export async function GET() {
  const db = await dbInstance.ensureHydrated();
  const savedConfig = (db.cms as any)?.chatbotConfig;
  const savedAdminCopilot = (db.cms as any)?.adminCopilotConfig;
  const config = sanitizeChatbotConfig(savedConfig || defaultChatbotConfig);
  return NextResponse.json({
    chatbotConfig: config,
    adminCopilotConfig: savedAdminCopilot || null,
  });
}

export async function PUT(req: Request) {
  const db = await dbInstance.ensureHydrated();
  const user = getAuthUser(req);
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Unauthorized. Admin privileges required." },
      { status: 401 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const incomingConfig = body.chatbotConfig || body;
  const cleanConfig = sanitizeChatbotConfig({
    ...incomingConfig,
    updatedAt: new Date().toISOString(),
  });

  if (!db.cms) {
    db.cms = {
      portfolioItems: [...defaultPortfolioItems],
      pricingPackages: [...defaultPricingPackages],
      detailedServices: [...defaultDetailedServices],
      testimonials: [...defaultTestimonials],
      blogPosts: [...defaultBlogPosts],
      websiteLeads: [],
    };
  }
  (db.cms as any).chatbotConfig = cleanConfig;
  if (body.adminCopilotConfig) {
    (db.cms as any).adminCopilotConfig = body.adminCopilotConfig;
  }
  await dbInstance.save();

  return NextResponse.json({
    success: true,
    chatbotConfig: cleanConfig,
    adminCopilotConfig: (db.cms as any).adminCopilotConfig || null,
  });
}

export async function POST(req: Request) {
  try {
    const db = await dbInstance.ensureHydrated();
    const body = await req.json().catch(() => ({}));
    const action = body.action || "GENERATE_REPLY";

    const storedConfig: ChatbotConfig = sanitizeChatbotConfig(
      body.configOverride || (db.cms as any)?.chatbotConfig || defaultChatbotConfig
    );

    if (action === "GENERATE_REPLY") {
      const userMessage = sanitizeStr(body.message, 800);
      const preferredLang: "AUTO" | "EN" | "ROMAN_URDU" =
        body.preferredLang === "EN" || body.preferredLang === "ROMAN_URDU"
          ? body.preferredLang
          : "AUTO";

      const draft: ChatbotInquiryDraft = {
        eventTypeId: body.draft?.eventTypeId,
        eventTypeLabel: body.draft?.eventTypeLabel,
        eventDate: body.draft?.eventDate,
        city: body.draft?.city,
        venue: body.draft?.venue,
        coverageTierId: body.draft?.coverageTierId,
        coverageTierLabel: body.draft?.coverageTierLabel,
        selectedAddonIds: Array.isArray(body.draft?.selectedAddonIds)
          ? body.draft.selectedAddonIds
          : [],
        clientName: body.draft?.clientName,
        clientPhone: body.draft?.clientPhone,
      };

      const localMatch = matchKnowledgeBaseAndRespond(
        userMessage,
        storedConfig,
        draft,
        preferredLang
      );
      const mergedDraft: ChatbotInquiryDraft = {
        ...draft,
        ...(localMatch.extractedDraftUpdates || {}),
      };
      const estimate = calculateChatbotEstimate(storedConfig, mergedDraft);

      // If Hybrid Gemini Free-Tier mode is active and GEMINI_API_KEY is available on server
      const geminiKey = process.env.GEMINI_API_KEY;
      if (
        storedConfig.engineSettings.mode === "HYBRID_GEMINI_FREE" &&
        geminiKey &&
        geminiKey.trim().length > 5
      ) {
        try {
          const ai = new GoogleGenAI({ apiKey: geminiKey });
          const kbText = storedConfig.knowledgeBase
            .map(
              (k) =>
                `[${k.category}] ${k.title}${
                  k.ratePKR ? ` (PKR ${k.ratePKR.toLocaleString()})` : ""
                }: ${k.content}`
            )
            .join("\n");

          const langDirective =
            localMatch.detectedLanguage === "ROMAN_URDU"
              ? "IMPORTANT LANGUAGE RULE: Reply in natural, polite Roman Urdu (using English alphabet, e.g., 'Ji bilkul, hamara Signature Package...')."
              : "IMPORTANT LANGUAGE RULE: Reply in refined, warm Professional English.";

          const systemPrompt = [
            storedConfig.systemInstructions,
            "\nCRITICAL STUDIO RULES TO FOLLOW:",
            storedConfig.dynamicPromptRules,
            "\nTRAINED STUDIO KNOWLEDGE BASE:",
            kbText,
            `\nLIVE CLIENT ESTIMATE CONTEXT: Event=${estimate.eventTypeLabel}, City=${estimate.city}, Coverage=${estimate.coverageTierLabel}, Add-ons=${
              estimate.selectedAddons.map((a) => a.label).join(", ") || "None"
            }, Estimated Total=PKR ${estimate.estimatedTotalPKR.toLocaleString()}, ${estimate.depositPercent}% Deposit=PKR ${estimate.depositAmountPKR.toLocaleString()}.`,
            langDirective,
            "\nKeep your response concise (2 to 3 sentences), warm, editorial, and accurate to Royal Studio's PKR rates.",
          ].join("\n");

          const response = await ai.models.generateContent({
            model: "gemini-3.8-flash",
            contents: userMessage,
            config: {
              systemInstruction: systemPrompt,
              temperature: 0.4,
            },
          });

          if (response.text && response.text.trim()) {
            return NextResponse.json({
              reply: response.text.trim(),
              matchedKnowledgeTitle: localMatch.matchedEntry?.title || "AI Trained Concierge",
              extractedDraftUpdates: localMatch.extractedDraftUpdates,
              estimate,
              detectedLanguage: localMatch.detectedLanguage,
              engineUsed: "HYBRID_GEMINI_FREE",
            });
          }
        } catch {
          // Automatically fall back to zero-cost local rule engine
        }
      }

      return NextResponse.json({
        reply: localMatch.reply,
        matchedKnowledgeTitle: localMatch.matchedEntry?.title,
        extractedDraftUpdates: localMatch.extractedDraftUpdates,
        estimate,
        detectedLanguage: localMatch.detectedLanguage,
        engineUsed: "LOCAL_ENGINE",
      });
    }

    if (action === "SUBMIT_CHATBOT_LEAD") {
      const draft: ChatbotInquiryDraft = {
        eventTypeId: body.draft?.eventTypeId,
        eventTypeLabel: sanitizeStr(body.draft?.eventTypeLabel, 120),
        eventDate:
          sanitizeStr(body.draft?.eventDate, 60) ||
          new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
        city: sanitizeStr(body.draft?.city, 80) || "Burewala",
        venue: sanitizeStr(body.draft?.venue, 120),
        coverageTierId: body.draft?.coverageTierId,
        coverageTierLabel: sanitizeStr(body.draft?.coverageTierLabel, 140),
        selectedAddonIds: Array.isArray(body.draft?.selectedAddonIds)
          ? body.draft.selectedAddonIds
          : [],
        clientName: sanitizeStr(body.draft?.clientName, 120) || "Royal Chatbot Guest",
        clientPhone: sanitizeStr(body.draft?.clientPhone, 40) || "Pending WhatsApp Contact",
        clientNotes: sanitizeStr(body.draft?.clientNotes, 800),
      };

      const estimate = calculateChatbotEstimate(storedConfig, draft);
      const transcript: ChatbotMessage[] = Array.isArray(body.transcript)
        ? body.transcript.slice(-20)
        : [];

      const referenceId = `RS-BOT-${Date.now().toString().slice(-6)}`;
      const submittedAt = new Date().toISOString();
      const linkedEventId = `evt-bot-${Date.now().toString().slice(-6)}`;

      const addonsNames = estimate.selectedAddons.map((a) => a.label);
      const breakdownSummary = [
        `Event: ${estimate.eventTypeLabel} (Base PKR ${estimate.baseRatePKR.toLocaleString()})`,
        `Coverage: ${estimate.coverageTierLabel} (${estimate.hoursLabel} · ${estimate.teamLabel})`,
        addonsNames.length > 0 ? `Add-Ons: ${addonsNames.join(", ")}` : "Add-Ons: Standard",
        estimate.travelSurchargePKR > 0
          ? `Out-of-City Travel (${estimate.city}): PKR ${estimate.travelSurchargePKR.toLocaleString()}`
          : `City: ${estimate.city} (No Travel Fee)`,
        estimate.isMultiDayDiscountApplied
          ? `Multi-Day Discount (${estimate.multiDayDiscountPercent}%): -PKR ${estimate.discountAmountPKR.toLocaleString()}`
          : "",
        `Estimated Total: PKR ${estimate.estimatedTotalPKR.toLocaleString()} (${estimate.depositPercent}% Deposit: PKR ${estimate.depositAmountPKR.toLocaleString()})`,
      ]
        .filter(Boolean)
        .join(" | ");

      const transcriptText = transcript
        .map((m) => `[${m.sender === "bot" ? "Royal Assistant" : "Client"}]: ${m.text}`)
        .join("\n");

      // 1. Find or create CRM Client
      let client = db.clients.find(
        (c) =>
          (draft.clientPhone !== "Pending WhatsApp Contact" && c.phone === draft.clientPhone) ||
          c.name.toLowerCase() === draft.clientName!.toLowerCase()
      );

      if (!client) {
        client = {
          id: `cli-bot-${Date.now().toString().slice(-6)}`,
          name: draft.clientName!,
          phone: draft.clientPhone!,
          whatsapp: draft.clientPhone!,
          email: "",
          address: draft.venue || estimate.city,
          city: estimate.city,
          notes: `Chatbot Lead (${referenceId}). ${breakdownSummary}`,
          createdDate: submittedAt,
          createdBy: "royal-chatbot",
        };
        db.clients.unshift(client);
      }

      // 2. Create CRM Inquiry Event
      const newInquiryEvent = {
        id: linkedEventId,
        clientId: client.id,
        title: `${draft.clientName} — ${estimate.eventTypeLabel}`,
        category: (
          estimate.eventTypeLabel.toLowerCase().includes("engagement")
            ? "Engagement"
            : "Wedding"
        ) as any,
        weddingSubtype: (
          estimate.eventTypeLabel.toLowerCase().includes("walima")
            ? "Walima"
            : estimate.eventTypeLabel.toLowerCase().includes("nikah")
            ? "Nikah"
            : "Barat"
        ) as any,
        eventDate: draft.eventDate!,
        startTime: "18:00",
        endTime: "23:59",
        venue: draft.venue || estimate.city,
        city: estimate.city,
        status: "Inquiry" as const,
        packagePrice: estimate.estimatedTotalPKR,
        advancePaid: 0,
        discount: estimate.discountAmountPKR,
        tax: 0,
        notes: `Chatbot Automated Inquiry (${referenceId}).\n${breakdownSummary}\nRecommended Setup: ${estimate.recommendedLensNote}\n\n--- Chat Transcript ---\n${transcriptText}`,
        createdBy: "royal-chatbot",
        createdDate: submittedAt,
        updatedDate: submittedAt,
        isMultiDay: estimate.isMultiDayDiscountApplied,
        daysCount: estimate.isMultiDayDiscountApplied ? 3 : 1,
        selectedAddons: addonsNames,
        staffCost: 0,
        rentalCost: 0,
        eventExpenses: 0,
        netProfit: estimate.estimatedTotalPKR,
        netMargin: estimate.estimatedTotalPKR > 0 ? 100 : 0,
        totalClientPayments: 0,
        remainingBalance: estimate.estimatedTotalPKR,
      };
      db.events.unshift(newInquiryEvent);

      // 3. Add to Website Leads / Admin CRM Inquiries table
      if (!db.cms) {
        db.cms = {
          portfolioItems: [...defaultPortfolioItems],
          pricingPackages: [...defaultPricingPackages],
          detailedServices: [...defaultDetailedServices],
          testimonials: [...defaultTestimonials],
          blogPosts: [...defaultBlogPosts],
          websiteLeads: [],
        };
      }
      if (!Array.isArray(db.cms.websiteLeads)) {
        db.cms.websiteLeads = [];
      }

      db.cms.websiteLeads.unshift({
        id: referenceId,
        brideName: draft.clientName!,
        groomName: "Chatbot Inquiry",
        phone: draft.clientPhone!,
        email: "",
        weddingDate: draft.eventDate!,
        venue: draft.venue || estimate.city,
        city: estimate.city,
        services: breakdownSummary,
        budget: `PKR ${estimate.estimatedTotalPKR.toLocaleString()}`,
        message: draft.clientNotes || `Generated via Royal Assistant Chatbot. ${estimate.recommendedLensNote}`,
        status: storedConfig.leadHandshake.defaultLeadStatus || "New",
        submittedAt,
        linkedEventId,
      });

      // 4. Create Official Quotation & Invoice
      const issueDateStr = submittedAt.split("T")[0];
      const validUntilStr = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];
      const quoNumber = `${db.profile?.quotationPrefix || "RS-QUO-"}${String(
        (db.quotations?.length || 0) + 1001
      ).padStart(4, "0")}`;

      db.quotations.unshift({
        id: `quo-bot-${Date.now().toString().slice(-6)}`,
        quotationNumber: quoNumber,
        clientId: client.id,
        eventId: linkedEventId,
        issueDate: issueDateStr,
        validUntil: validUntilStr,
        subtotal: estimate.subtotalPKR,
        discount: estimate.discountAmountPKR,
        tax: 0,
        total: estimate.estimatedTotalPKR,
        paymentTerms:
          db.profile?.paymentTerms || "50% advance to lock dates and dedicated crew",
        notes: newInquiryEvent.notes,
        createdBy: "royal-chatbot",
      });

      const invNumber = `${db.profile?.invoicePrefix || "RS-INV-"}${String(
        (db.invoices?.length || 0) + 1001
      ).padStart(4, "0")}`;
      const invStatus = computeInvoiceStatus(
        { dueDate: draft.eventDate!, total: estimate.estimatedTotalPKR },
        0
      );

      db.invoices.unshift({
        id: `inv-bot-${Date.now().toString().slice(-6)}`,
        invoiceNumber: invNumber,
        clientId: client.id,
        eventId: linkedEventId,
        issueDate: issueDateStr,
        dueDate: draft.eventDate!,
        subtotal: estimate.subtotalPKR,
        discount: estimate.discountAmountPKR,
        tax: 0,
        total: estimate.estimatedTotalPKR,
        paidAmount: 0,
        remainingAmount: estimate.estimatedTotalPKR,
        paymentTerms:
          db.profile?.paymentTerms || "50% advance to lock dates and dedicated crew",
        status: invStatus,
        notes: `Auto-generated from Royal Assistant Chatbot (${referenceId}).`,
        createdBy: "royal-chatbot",
      });

      await persistWebsiteInquiryToFirestore({
        referenceId,
        brideName: draft.clientName!,
        groomName: "Chatbot Inquiry",
        phone: draft.clientPhone!,
        email: "",
        weddingDate: draft.eventDate!,
        city: estimate.city,
        venue: draft.venue || estimate.city,
        eventType: estimate.eventTypeLabel,
        message: breakdownSummary,
        submittedAt,
      }).catch(() => {});

      dbInstance.recalculateEvent(linkedEventId);
      await dbInstance.save();

      const rawWa = (
        db.profile?.publicWhatsappNumber ||
        db.profile?.whatsapp ||
        "03084877073"
      ).replace(/[^0-9]/g, "");
      const cleanWa = rawWa.startsWith("92") ? rawWa : `92${rawWa.replace(/^0/, "")}`;

      const waLines = [
        `*Assalam-o-Alaikum Royal Studio!*`,
        `I just planned my wedding coverage with the *Royal Assistant Chatbot* (Ref: *${referenceId}*):`,
        ``,
        `• *Client:* ${draft.clientName} (${draft.clientPhone})`,
        `• *Celebration:* ${estimate.eventTypeLabel}`,
        `• *Date & Location:* ${estimate.eventDate} in ${estimate.city}${
          draft.venue ? ` (${draft.venue})` : ""
        }`,
        `• *Coverage & Crew:* ${estimate.coverageTierLabel} (${estimate.teamLabel})`,
        `• *Selected Add-ons:* ${
          addonsNames.length > 0 ? addonsNames.join(", ") : "Standard Package"
        }`,
        estimate.isMultiDayDiscountApplied
          ? `• *Multi-Day Discount (${estimate.multiDayDiscountPercent}%):* -PKR ${estimate.discountAmountPKR.toLocaleString()}`
          : null,
        `• *Estimated Package Total:* *PKR ${estimate.estimatedTotalPKR.toLocaleString()}*`,
        `• *Booking Deposit (${estimate.depositPercent}%):* PKR ${estimate.depositAmountPKR.toLocaleString()}`,
        `• *Optical Setup:* ${estimate.recommendedLensNote}`,
      ]
        .filter(Boolean)
        .join("\n");

      const whatsappUrl = `https://wa.me/${cleanWa}?text=${encodeURIComponent(waLines)}`;

      return NextResponse.json({
        success: true,
        referenceId,
        eventId: linkedEventId,
        proposalUrl: `/proposal/${linkedEventId}`,
        whatsappUrl,
        estimate,
      });
    }

    return NextResponse.json({ error: "Invalid chatbot action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Chatbot request failed" },
      { status: 500 }
    );
  }
}
