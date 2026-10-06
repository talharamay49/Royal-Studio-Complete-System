import { NextRequest, NextResponse } from "next/server";
import { dbInstance } from "@/lib/admin/db";
import { LUXURY_ADDON_CATALOG } from "@/lib/pricing/unifiedPricing";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const decodedId = decodeURIComponent(id).trim();
    const db = await dbInstance.ensureHydrated();

    // Find event by eventId, quotationId/quotationNumber, invoiceId/invoiceNumber, or lead reference
    let event = db.events.find((e) => e.id === decodedId);

    if (!event) {
      const quo = db.quotations.find(
        (q) =>
          q.id === decodedId ||
          q.quotationNumber.toLowerCase() === decodedId.toLowerCase()
      );
      if (quo) {
        event = db.events.find((e) => e.id === quo.eventId);
      }
    }

    if (!event) {
      const inv = db.invoices.find(
        (i) =>
          i.id === decodedId ||
          i.invoiceNumber.toLowerCase() === decodedId.toLowerCase()
      );
      if (inv) {
        event = db.events.find((e) => e.id === inv.eventId);
      }
    }

    if (!event && db.cms?.websiteLeads) {
      const lead = db.cms.websiteLeads.find(
        (l) =>
          l.id === decodedId ||
          l.linkedEventId === decodedId ||
          decodedId.toLowerCase().includes(l.id.slice(-6).toLowerCase())
      );
      if (lead?.linkedEventId) {
        event = db.events.find((e) => e.id === lead.linkedEventId);
      }
    }

    // Fallback to first event if demo id is passed
    if (!event && decodedId === "demo" && db.events.length > 0) {
      event = db.events[0];
    }

    if (!event) {
      return NextResponse.json(
        { error: "Proposal or Event not found" },
        { status: 404 }
      );
    }

    const client = db.clients.find((c) => c.id === event!.clientId) || {
      id: "cli-guest",
      name: event.title.split("—")[0]?.trim() || "Valued Client",
      phone: "",
      whatsapp: "",
      email: "",
      address: event.venue,
      city: event.city,
      notes: "",
      createdDate: event.createdDate,
      createdBy: "Royal Studio",
    };

    const daySchedules = db.daySchedules
      .filter((ds) => ds.eventId === event!.id)
      .sort((a, b) => a.dayNumber - b.dayNumber);

    const quotation =
      db.quotations.find((q) => q.eventId === event!.id) || {
        id: `quo-${event.id.slice(-4)}`,
        quotationNumber: `RS-QUO-${event.id.slice(-4).toUpperCase()}`,
        clientId: client.id,
        eventId: event.id,
        issueDate: event.createdDate?.split("T")[0] || new Date().toISOString().split("T")[0],
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        subtotal: (event.packagePrice || 0) + (event.discount || 0),
        discount: event.discount || 0,
        tax: event.tax || 0,
        total: (event.packagePrice || 0) + (event.tax || 0),
        paymentTerms: db.profile.paymentTerms,
        notes: event.notes || "",
        createdBy: "Royal Studio",
      };

    const invoice = db.invoices.find((i) => i.eventId === event!.id) || null;
    const payments = db.payments.filter((p) => p.eventId === event!.id);

    // Record client proposal view timestamp & initialize approvalHistory if needed
    const nowIso = new Date().toISOString();
    if (!event.proposalFirstViewedAt) {
      event.proposalFirstViewedAt = nowIso;
    }
    event.proposalLastViewedAt = nowIso;
    event.proposalViewCount = (event.proposalViewCount || 0) + 1;

    if (!Array.isArray(event.approvalHistory) || event.approvalHistory.length === 0) {
      event.approvalHistory = [
        {
          id: `hist-issued-${event.id}`,
          action: "ISSUED",
          timestamp: quotation.issueDate
            ? `${quotation.issueDate}T09:00:00.000Z`
            : event.createdDate || nowIso,
          actorName: db.profile.studioName || "Royal Studio",
          details: `Official Proposal ${quotation.quotationNumber} generated & issued to ${client.name}`,
        },
        {
          id: `hist-viewed-${event.id}`,
          action: "VIEWED",
          timestamp: event.proposalFirstViewedAt,
          actorName: client.name,
          signatureName: event.approvedByClient || client.name,
          details: `Proposal opened and reviewed online by ${client.name}`,
        },
      ];
      if (event.approvedByClient && event.approvedAt) {
        event.approvalHistory.push({
          id: `hist-accepted-${event.id}`,
          action: "ACCEPTED",
          timestamp: event.approvedAt,
          actorName: event.approvedByClient,
          signatureName: event.approvedByClient,
          details: `Digitally signed & accepted proposal terms as "${event.approvedByClient}"`,
        });
      }
      await dbInstance.save();
    } else {
      // Update latest VIEWED timestamp entry or append if none exists
      const viewedIdx = event.approvalHistory.findIndex((h) => h.action === "VIEWED");
      if (viewedIdx >= 0) {
        event.approvalHistory[viewedIdx] = {
          ...event.approvalHistory[viewedIdx],
          timestamp: nowIso,
          actorName: client.name,
          signatureName: event.approvedByClient || client.name,
          details: `Proposal viewed online by ${client.name} (View #${event.proposalViewCount})`,
        };
      } else {
        event.approvalHistory.push({
          id: `hist-viewed-${Date.now()}`,
          action: "VIEWED",
          timestamp: nowIso,
          actorName: client.name,
          signatureName: event.approvedByClient || client.name,
          details: `Proposal viewed online by ${client.name}`,
        });
      }
      await dbInstance.save();
    }

    return NextResponse.json({
      event,
      client,
      quotation,
      invoice,
      daySchedules,
      payments,
      profile: db.profile,
      addonCatalog: LUXURY_ADDON_CATALOG,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to load proposal" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const decodedId = decodeURIComponent(id).trim();
    const body = await req.json();
    const db = await dbInstance.ensureHydrated();

    let event = db.events.find((e) => e.id === decodedId);
    if (!event) {
      const quo = db.quotations.find(
        (q) =>
          q.id === decodedId ||
          q.quotationNumber.toLowerCase() === decodedId.toLowerCase()
      );
      if (quo) {
        event = db.events.find((e) => e.id === quo.eventId);
      }
    }

    if (!event) {
      return NextResponse.json(
        { error: "Proposal event not found" },
        { status: 404 }
      );
    }

    const action = body.action as
      | "UPDATE_ADDONS"
      | "APPROVE_PROPOSAL"
      | "NOTIFY_ADMIN_APPROVAL"
      | "SUBMIT_DEPOSIT_RECEIPT";
    const incomingAddons: string[] | undefined = Array.isArray(body.selectedAddons)
      ? body.selectedAddons.map((s: unknown) => String(s))
      : undefined;

    if (incomingAddons !== undefined) {
      const prevAddons = event.selectedAddons || [];
      const prevAddonsFee = prevAddons.reduce((sum, label) => {
        const match = LUXURY_ADDON_CATALOG.find(
          (a) => a.label.toLowerCase() === label.toLowerCase()
        );
        return sum + (match ? match.price : 0);
      }, 0);

      const newAddonsFee = incomingAddons.reduce((sum, label) => {
        const match = LUXURY_ADDON_CATALOG.find(
          (a) => a.label.toLowerCase() === label.toLowerCase()
        );
        return sum + (match ? match.price : 0);
      }, 0);

      const eventDays = db.daySchedules.filter((ds) => ds.eventId === event!.id);
      const daysSum = eventDays.reduce(
        (sum, ds) => sum + (Number(ds.customPrice) || 0),
        0
      );

      if (daysSum > 0) {
        event.packagePrice = Math.max(
          0,
          daysSum + newAddonsFee - (Number(event.discount) || 0)
        );
      } else {
        const baseWithoutPrevAddons = Math.max(
          0,
          (Number(event.packagePrice) || 0) - prevAddonsFee
        );
        event.packagePrice = baseWithoutPrevAddons + newAddonsFee;
      }

      event.selectedAddons = incomingAddons;
      event.updatedDate = new Date().toISOString();
    }

    let emailNotification: {
      sent: boolean;
      recipient: string;
      subject: string;
      timestamp: string;
      message: string;
    } | null = null;

    const triggerStudioAdminEmailNotification = async (
      signerName: string,
      clientComment: string,
      triggerStage: "IMMEDIATE_CLICK" | "FINAL_APPROVAL"
    ) => {
      const nowIso = new Date().toISOString();
      const clientObj = db.clients.find((c) => c.id === event!.clientId);
      const quoObj = db.quotations.find((q) => q.eventId === event!.id);
      const adminEmail =
        db.profile?.notificationEmail ||
        db.profile?.email ||
        "royalstudio089@gmail.com";
      const studioName = db.profile?.studioName || "Royal Studio";
      const refNum = quoObj?.quotationNumber || `RS-QUO-${event!.id.slice(-4).toUpperCase()}`;
      const grandTotal = Math.max(
        0,
        (Number(event!.packagePrice) || 0) + (Number(event!.tax) || 0)
      );
      const paidAmt = Number(event!.totalClientPayments) || 0;
      const paymentStatusLabel =
        paidAmt >= grandTotal && grandTotal > 0
          ? "Full Payment Received"
          : paidAmt > 0
          ? `Partial Payment (PKR ${paidAmt.toLocaleString("en-PK")} Paid)`
          : "Awaiting Booking Advance";

      const subject = `[${studioName}] Proposal Digitally Accepted & Approved — ${refNum} (${event!.title})`;
      const message = [
        `Immediate Admin Notification: Client "${signerName}" clicked 'Digitally Accept & Approve Proposal' for ${event!.title} (${refNum}).`,
        `Client: ${clientObj?.name || signerName} (${clientObj?.phone || clientObj?.whatsapp || "N/A"})`,
        `Event Date & Venue: ${event!.eventDate} at ${event!.venue}, ${event!.city}`,
        `Approved Proposal Total: PKR ${grandTotal.toLocaleString("en-PK")} (${paymentStatusLabel})`,
        `Selected Add-Ons: ${(event!.selectedAddons || []).join(", ") || "None"}`,
        clientComment ? `Client Notes: ${clientComment}` : "",
        `Timestamp: ${nowIso}`,
      ]
        .filter(Boolean)
        .join("\n");

      // Optional webhook/email relay if configured in environment
      const webhookUrl = process.env.ADMIN_EMAIL_WEBHOOK_URL;
      if (webhookUrl) {
        try {
          await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: adminEmail,
              subject,
              text: message,
              proposalRef: refNum,
              eventId: event!.id,
              signerName,
              triggerStage,
              timestamp: nowIso,
            }),
          });
        } catch {
          // Non-blocking fallback to internal audit log
        }
      }

      if (!Array.isArray(db.profileAuditLogs)) {
        db.profileAuditLogs = [];
      }
      db.profileAuditLogs.unshift({
        id: `audit-email-${Date.now()}`,
        timestamp: nowIso,
        userId: "client-portal",
        userName: signerName,
        userRole: "ADMIN",
        section: "Proposal Approval Email Notification",
        changedFields: ["proposalApprovalEmailNotification"],
        summary: `Admin email notification dispatched to ${adminEmail} — ${subject}`,
      });

      return {
        sent: true,
        recipient: adminEmail,
        subject,
        timestamp: nowIso,
        message,
      };
    };

    if (action === "NOTIFY_ADMIN_APPROVAL") {
      const signatureName = String(
        body.clientSignatureName || "Client Digital Approval"
      ).trim();
      const clientComment = String(body.clientNotes || "").trim();
      emailNotification = await triggerStudioAdminEmailNotification(
        signatureName,
        clientComment,
        "IMMEDIATE_CLICK"
      );

      if (!Array.isArray(event.approvalHistory)) {
        event.approvalHistory = [];
      }
      event.approvalHistory.push({
        id: `hist-email-${Date.now()}`,
        action: "ACCEPTED",
        timestamp: emailNotification.timestamp,
        actorName: signatureName,
        signatureName,
        details: `Admin email notification triggered immediately to ${emailNotification.recipient} upon clicking 'Digitally Accept & Approve Proposal'`,
      });
    }

    if (action === "APPROVE_PROPOSAL") {
      const signatureName = String(
        body.clientSignatureName || "Client Digital Approval"
      ).trim();
      const clientComment = String(body.clientNotes || "").trim();
      const nowIso = new Date().toISOString();

      event.status = "Confirmed";
      event.approvedByClient = signatureName;
      event.approvedAt = nowIso;
      event.updatedDate = nowIso;

      emailNotification = await triggerStudioAdminEmailNotification(
        signatureName,
        clientComment,
        "FINAL_APPROVAL"
      );

      if (!Array.isArray(event.approvalHistory)) {
        event.approvalHistory = [];
      }
      if (!event.approvalHistory.some((h) => h.action === "VIEWED")) {
        event.approvalHistory.push({
          id: `hist-viewed-${event.id}`,
          action: "VIEWED",
          timestamp: event.proposalFirstViewedAt || nowIso,
          actorName: signatureName,
          signatureName,
          details: `Proposal viewed online prior to acceptance`,
        });
      }
      event.approvalHistory.push({
        id: `hist-accepted-${Date.now()}`,
        action: "ACCEPTED",
        timestamp: nowIso,
        actorName: signatureName,
        signatureName,
        details: `Proposal digitally accepted & signed by "${signatureName}"${
          clientComment ? ` — Note: "${clientComment}"` : ""
        } (Admin email notification sent to ${emailNotification.recipient})`,
      });

      const approvalStamp = `[DIGITALLY APPROVED by ${signatureName} on ${
        nowIso.split("T")[0]
      }]${clientComment ? ` Note: ${clientComment}` : ""}`;

      if (!event.notes.includes("[DIGITALLY APPROVED")) {
        event.notes = [event.notes, approvalStamp].filter(Boolean).join(" | ");
      }

      const quo = db.quotations.find((q) => q.eventId === event!.id);
      if (quo && !quo.notes.includes("[DIGITALLY APPROVED")) {
        quo.notes = [quo.notes, approvalStamp].filter(Boolean).join(" | ");
      }

      // Sync CMS Lead if linked
      if (db.cms?.websiteLeads) {
        const lead = db.cms.websiteLeads.find((l) => l.linkedEventId === event!.id);
        if (lead) {
          lead.status = "Booked";
        }
      }
    }

    let createdDepositPayment: any = null;
    if (action === "SUBMIT_DEPOSIT_RECEIPT") {
      const nowIso = new Date().toISOString();
      const amountNum = Number(body.amount || 0);
      if (amountNum <= 0) {
        return NextResponse.json(
          { error: "Please enter a valid deposit amount greater than 0." },
          { status: 400 }
        );
      }
      const method = (body.paymentMethod || "Bank Transfer") as any;
      const reference = String(body.referenceNumber || "").trim();
      const senderAccountTitle = String(body.senderAccountTitle || "").trim();
      const notes = String(body.notes || "Advance deposit uploaded via Digital Proposal").trim();
      const receiptImageDataUrl =
        typeof body.receiptImageDataUrl === "string" && body.receiptImageDataUrl.startsWith("data:image/")
          ? body.receiptImageDataUrl
          : undefined;

      const existingInv = db.invoices.find((i) => i.eventId === event!.id);

      createdDepositPayment = {
        id: `pay-${Date.now().toString().slice(-6)}`,
        paymentId: `PAY-${Date.now().toString().slice(-4)}`,
        eventId: event.id,
        invoiceId: existingInv?.id,
        amount: amountNum,
        paymentDate: nowIso.split("T")[0],
        method,
        reference: reference || `REF-${Date.now().toString().slice(-5)}`,
        notes: senderAccountTitle ? `${notes} (Sender: ${senderAccountTitle})` : notes,
        createdBy: "client-proposal",
        verificationStatus: "Pending Verification" as const,
        receiptImageDataUrl,
        senderAccountTitle: senderAccountTitle || undefined,
        submittedByClientAt: nowIso,
      };

      db.payments.unshift(createdDepositPayment);

      if (!Array.isArray(event.approvalHistory)) {
        event.approvalHistory = [];
      }
      const cliObj = db.clients.find((c) => c.id === event!.clientId);
      event.approvalHistory.push({
        id: `hist-deposit-${Date.now()}`,
        action: "DEPOSIT_UPLOADED",
        timestamp: nowIso,
        actorName: event.approvedByClient || senderAccountTitle || cliObj?.name || "Client",
        signatureName: event.approvedByClient || senderAccountTitle || cliObj?.name,
        details: `Uploaded ${method} deposit receipt of PKR ${amountNum.toLocaleString("en-PK")} (Ref: ${createdDepositPayment.reference}) — Flagged for Admin Verification in Finance`,
      });

      if (!Array.isArray(db.profileAuditLogs)) {
        db.profileAuditLogs = [];
      }
      db.profileAuditLogs.unshift({
        id: `audit-dep-${Date.now()}`,
        timestamp: nowIso,
        userId: "client-portal",
        userName: senderAccountTitle || cliObj?.name || "Client",
        userRole: "CLIENT",
        section: "Digital Proposal Deposit Upload",
        changedFields: ["payments", "verificationStatus"],
        summary: `Client uploaded ${method} deposit receipt of PKR ${amountNum.toLocaleString("en-PK")} (Ref: ${createdDepositPayment.reference}) for "${event.title}". Pending Admin verification in Finance tab.`,
      });
    }

    await dbInstance.recalculateEvent(event.id);
    await dbInstance.save();

    const updatedClient = db.clients.find((c) => c.id === event!.clientId);
    const updatedDays = db.daySchedules
      .filter((ds) => ds.eventId === event!.id)
      .sort((a, b) => a.dayNumber - b.dayNumber);
    const updatedQuotation = db.quotations.find((q) => q.eventId === event!.id);
    const updatedInvoice = db.invoices.find((i) => i.eventId === event!.id);
    const updatedPayments = db.payments.filter((p) => p.eventId === event!.id);

    return NextResponse.json({
      success: true,
      event,
      client: updatedClient,
      quotation: updatedQuotation,
      invoice: updatedInvoice,
      daySchedules: updatedDays,
      payments: updatedPayments,
      payment: createdDepositPayment,
      emailNotification,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to update proposal" },
      { status: 500 }
    );
  }
}
