import { NextResponse } from "next/server";
import { dbInstance } from "@/lib/admin/db";
import { persistWebsiteInquiryToFirestore } from "@/lib/db/storageAdapter";
import {
  calculateDaySummary,
  type CustomDayConfiguration,
} from "@/lib/pricing/unifiedPricing";
import {
  portfolioItems as defaultPortfolioItems,
  pricingPackages as defaultPricingPackages,
  detailedServices as defaultDetailedServices,
  testimonials as defaultTestimonials,
  blogPosts as defaultBlogPosts,
} from "@/lib/data";
import { computeInvoiceStatus } from "@/components/admin/utils/calculations";

function sanitizeField(value: unknown, maxLength = 500): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/<[^>]*>?/gm, "")
    .trim()
    .slice(0, maxLength);
}

export async function GET() {
  const db = await dbInstance.ensureHydrated();
  const p = db.profile;
  return NextResponse.json({
    studioName: p.publicStudioName || p.studioName,
    phones: Array.from(new Set([p.publicContactNumber || p.phone, p.phone2].filter(Boolean))),
    whatsapp: p.publicWhatsappNumber || p.whatsapp || p.phone,
    email: p.bookingEmail || p.email,
    supportEmail: p.supportEmail || p.email,
    address: p.publicDisplayAddress || p.address,
    city: p.city || "Burewala",
    googleMapsUrl: p.googleMapsUrl,
    businessHours: p.showBusinessHoursPublicly ? p.businessHours || [] : [],
    social: {
      instagram: p.instagram,
      facebook: p.facebook,
      youtube: p.youtube,
      tiktok: p.tiktok,
    },
  });
}

export async function POST(request: Request) {
  try {
    await dbInstance.ensureHydrated();
    const data = await request.json().catch(() => ({}));

    const brideName = sanitizeField(data.brideName || data.clientName, 120);
    const groomName = sanitizeField(data.groomName, 120);
    const phone = sanitizeField(data.phone, 40);
    const whatsapp = sanitizeField(data.whatsapp || data.phone, 40);
    const email = sanitizeField(data.email, 160);
    const weddingDate = sanitizeField(data.weddingDate || data.eventDate, 40);
    const eventDaysCount = sanitizeField(data.eventDaysCount, 40) || "1 Day";
    const guestCount = sanitizeField(data.guestCount, 60);
    const city = sanitizeField(data.city, 100) || "Burewala";
    const venue = sanitizeField(data.venue, 200);
    const budget = sanitizeField(data.budget, 100);
    const eventType = sanitizeField(data.eventType, 80) || "Wedding";
    const packageInterest = sanitizeField(data.packageInterest, 120);
    const message = sanitizeField(data.message, 2000);
    const functionsList = Array.isArray(data.functions)
      ? data.functions.map((f: unknown) => sanitizeField(f, 60)).filter(Boolean)
      : [];
    const addonsList = Array.isArray(data.addons)
      ? data.addons.map((a: unknown) => sanitizeField(a, 80)).filter(Boolean)
      : [];
    const servicesList = Array.isArray(data.services)
      ? data.services.map((s: unknown) => sanitizeField(s, 80)).filter(Boolean)
      : [sanitizeField(data.services, 200)].filter(Boolean);

    if (servicesList.length === 0) {
      servicesList.push("Wedding Photography & Cinematic Films");
    }

    if (!brideName) {
      return NextResponse.json(
        { error: "Please enter your name (or Bride's name)." },
        { status: 400 }
      );
    }

    if (!phone) {
      return NextResponse.json(
        { error: "Please enter a valid phone or WhatsApp number so our team can reach you." },
        { status: 400 }
      );
    }

    if (!weddingDate) {
      return NextResponse.json(
        { error: "Please select your preferred event or wedding date." },
        { status: 400 }
      );
    }

    const referenceId = `RS-INQ-${Date.now().toString().slice(-6)}`;
    const submittedAt = new Date().toISOString();

    const submission = {
      referenceId,
      brideName,
      groomName,
      phone,
      email,
      weddingDate,
      city,
      venue,
      budget,
      eventType,
      packageInterest,
      message,
      services: servicesList,
      submittedAt,
    };

    // 1. Persist dedicated Website Inquiry document to Cloud Firestore (/website_inquiries/{referenceId})
    await persistWebsiteInquiryToFirestore({
      referenceId,
      brideName,
      groomName,
      phone,
      email,
      weddingDate,
      city,
      venue,
      eventType,
      message,
      submittedAt,
    });

    const clientDisplayName = groomName
      ? `${brideName} & ${groomName}`.trim()
      : brideName;

    const linkedEventId = `evt-${Date.now().toString().slice(-6)}`;

    const detailsSummary = [
      `Services: ${servicesList.join(", ")}`,
      packageInterest ? `Package: ${packageInterest}` : "",
      functionsList.length > 0 ? `Functions: ${functionsList.join(", ")}` : "",
      eventDaysCount ? `Duration: ${eventDaysCount}` : "",
      guestCount ? `Guests: ${guestCount}` : "",
      addonsList.length > 0 ? `Add-Ons: ${addonsList.join(", ")}` : "",
      budget ? `Budget: ${budget}` : "",
    ]
      .filter(Boolean)
      .join(" | ");

    // 2. Persist CRM Client, Inquiry Event, and Website Lead into Cloud Firestore Shards
    const db = dbInstance.getData();
    let client = db.clients.find(
      (c) =>
        c.phone === phone ||
        c.name.toLowerCase() === clientDisplayName.toLowerCase()
    );
    if (!client) {
      client = {
        id: `cli-${Date.now().toString().slice(-6)}`,
        name: clientDisplayName,
        phone,
        whatsapp,
        email: email || "",
        address: venue || city,
        city,
        notes: `Inquiry Ref: ${referenceId}. ${detailsSummary}. ${message}`,
        createdDate: submittedAt,
        createdBy: "website-inquiry",
      };
      db.clients.unshift(client);
    }

    const calculatedEstimate = Math.max(0, Number(data.calculatedEstimate || 0));
    const customDaysConfig: CustomDayConfiguration[] = Array.isArray(data.customDaysConfig)
      ? data.customDaysConfig
      : [];

    const newInquiryEvent = {
      id: linkedEventId,
      clientId: client.id,
      title: groomName
        ? `${clientDisplayName} Wedding`
        : `${clientDisplayName} — ${eventType}`,
      category: (
        ["Wedding", "Engagement", "Birthday", "Corporate", "Fashion", "Product"].includes(
          eventType
        )
          ? eventType
          : "Wedding"
      ) as any,
      weddingSubtype: "Barat" as const,
      eventDate: weddingDate,
      startTime: "18:00",
      endTime: "23:00",
      venue: venue || city,
      city,
      status: "Inquiry" as const,
      packagePrice: calculatedEstimate,
      advancePaid: 0,
      discount: 0,
      tax: 0,
      notes: `Website Inquiry (${referenceId}). ${detailsSummary}. Notes: ${
        message || "No additional notes."
      }`,
      createdBy: "website-inquiry",
      createdDate: submittedAt,
      updatedDate: submittedAt,
      isMultiDay:
        customDaysConfig.length > 1 ||
        eventDaysCount !== "1 Day" ||
        functionsList.length > 1,
      daysCount: Math.max(1, customDaysConfig.length || 1),
      selectedAddons: addonsList,
      staffCost: 0,
      rentalCost: 0,
      eventExpenses: 0,
      netProfit: calculatedEstimate,
      netMargin: calculatedEstimate > 0 ? 100 : 0,
      totalClientPayments: 0,
      remainingBalance: calculatedEstimate,
    };
    db.events.unshift(newInquiryEvent);

    if (customDaysConfig.length > 0 && Array.isArray(db.daySchedules)) {
      const baseDateObj = new Date(`${weddingDate}T12:00:00`);
      customDaysConfig.forEach((dayCfg, idx) => {
        const dayCalc = calculateDaySummary(dayCfg);
        let dayDateStr = weddingDate;
        if (!isNaN(baseDateObj.getTime())) {
          const d = new Date(baseDateObj);
          d.setDate(d.getDate() + idx);
          dayDateStr = d.toISOString().split("T")[0];
        }
        const primarySlot = dayCfg.tierSlots?.[0];
        db.daySchedules.push({
          id: `ds-${linkedEventId}-${idx + 1}`,
          eventId: linkedEventId,
          dayNumber: idx + 1,
          date: dayDateStr,
          eventType: dayCfg.eventFunction || `Day ${idx + 1}`,
          venue: venue || city,
          timingMode: "NIGHT_TIME",
          durationHours: 5,
          startTime: "18:00",
          endTime: "23:00",
          callTime: "17:00",
          dressCode: "Formal Black",
          notes: dayCalc.headlineSummary,
          customPackageName: dayCalc.headlineSummary,
          customPrice: dayCalc.daySubtotal,
          cameraCategory: primarySlot?.cameraCategory || "CAT_2",
          cameraCount: dayCalc.totalCameraUnits,
          cameraRatePerDay:
            dayCalc.slotSummaries?.[0]?.ratePerCam || 15000,
          crewCategory: primarySlot?.crewCategory || "CREW_CAT_2",
          crewCount: dayCalc.totalCameraUnits,
          crewRatePerDay: 0,
          photographersCount: dayCalc.totalPhotographers,
          cinematographersCount: dayCalc.totalVideographers,
          droneIncluded: dayCalc.totalDrones > 0,
          services: (dayCfg.services || []).map((s) => ({
            ...s,
            tierPricePerUnit:
              typeof s.tierPricePerUnit === "number"
                ? s.tierPricePerUnit
                : s.cameraCategory === "CAT_3"
                ? 20000
                : s.cameraCategory === "CAT_2"
                ? 15000
                : 10000,
          })),
        });
      });
    }

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
      brideName,
      groomName: groomName || "—",
      phone,
      email: email || "",
      weddingDate,
      venue: venue || city,
      city,
      services: detailsSummary,
      budget,
      message,
      status: "New",
      submittedAt,
      linkedEventId: newInquiryEvent.id,
    });

    // Auto-create Official Quotation and Invoice for this inquiry in ERP
    const issueDateStr = submittedAt.split("T")[0];
    const validUntilStr = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];
    const quoNumber = `${db.profile?.quotationPrefix || "RS-QUO-"}${String(
      (db.quotations?.length || 0) + 1001
    ).padStart(4, "0")}`;
    db.quotations.unshift({
      id: `quo-${Date.now().toString().slice(-6)}`,
      quotationNumber: quoNumber,
      clientId: client.id,
      eventId: linkedEventId,
      issueDate: issueDateStr,
      validUntil: validUntilStr,
      subtotal: calculatedEstimate,
      discount: 0,
      tax: 0,
      total: calculatedEstimate,
      paymentTerms: db.profile?.paymentTerms || "50% advance to lock dates and crew",
      notes: newInquiryEvent.notes,
      createdBy: "website-inquiry",
    });

    const invNumber = `${db.profile?.invoicePrefix || "RS-INV-"}${String(
      (db.invoices?.length || 0) + 1001
    ).padStart(4, "0")}`;
    const invStatus = computeInvoiceStatus(
      { dueDate: weddingDate, total: calculatedEstimate },
      0
    );
    db.invoices.unshift({
      id: `inv-${Date.now().toString().slice(-6)}`,
      invoiceNumber: invNumber,
      clientId: client.id,
      eventId: linkedEventId,
      issueDate: issueDateStr,
      dueDate: weddingDate,
      subtotal: calculatedEstimate,
      discount: 0,
      tax: 0,
      total: calculatedEstimate,
      paidAmount: 0,
      remainingAmount: calculatedEstimate,
      paymentTerms: db.profile?.paymentTerms || "50% advance to lock dates and crew",
      status: invStatus,
      notes: `Auto-generated from Website Inquiry (${referenceId}).`,
      createdBy: "website-inquiry",
    });

    dbInstance.recalculateEvent(linkedEventId);
    await dbInstance.save();

    const formspreeEndpoint = process.env.FORMSPREE_ENDPOINT;
    if (formspreeEndpoint && formspreeEndpoint.startsWith("https://")) {
      await fetch(formspreeEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(submission),
      }).catch(() => {});
    }

    const rawWa = (
      db.profile?.publicWhatsappNumber ||
      db.profile?.whatsapp ||
      "03084877073"
    ).replace(/[^0-9]/g, "");
    const cleanWa = rawWa.startsWith("92") ? rawWa : `92${rawWa.replace(/^0/, "")}`;
    const waText = `Assalam-o-Alaikum Royal Studio! I just submitted a booking inquiry (Ref: ${referenceId}) for ${clientDisplayName} on ${weddingDate} in ${city}.`;
    const whatsappUrl = `https://wa.me/${cleanWa}?text=${encodeURIComponent(waText)}`;

    return NextResponse.json({
      success: true,
      referenceId,
      eventId: linkedEventId,
      proposalUrl: `/proposal/${linkedEventId}`,
      clientName: clientDisplayName,
      whatsappUrl,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to submit inquiry" },
      { status: 500 }
    );
  }
}
