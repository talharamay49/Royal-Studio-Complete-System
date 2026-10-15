import { NextRequest, NextResponse } from "next/server";
import { dbInstance } from "@/lib/admin/db";

function normalizePhone(val?: string): string {
  return (val || "").replace(/[^0-9]/g, "");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawIdentifier = (body.identifier || body.email || body.phone || "").trim();
    const providedPassword = (body.password || body.pin || "").trim();

    if (!rawIdentifier || !providedPassword) {
      return NextResponse.json(
        {
          authenticated: false,
          error: "Please enter both your registered Email / Phone Number and your Password.",
        },
        { status: 400 }
      );
    }

    const db = await dbInstance.ensureHydrated();
    const cleanId = rawIdentifier.toLowerCase();
    const identDigits = normalizePhone(rawIdentifier);

    const matchedClient = db.clients.find((c) => {
      if (c.id.toLowerCase() === cleanId) return true;
      if (c.email && c.email.trim().toLowerCase() === cleanId) return true;
      if (identDigits.length >= 7) {
        const cPhone = normalizePhone(c.phone);
        const cWa = normalizePhone(c.whatsapp);
        if (
          cPhone === identDigits ||
          cWa === identDigits ||
          (cPhone.length >= 9 && identDigits.endsWith(cPhone.slice(-9))) ||
          (cWa.length >= 9 && identDigits.endsWith(cWa.slice(-9)))
        ) {
          return true;
        }
      }
      return false;
    });

    if (!matchedClient) {
      return NextResponse.json(
        {
          authenticated: false,
          error:
            "No client account found matching that Email or Phone Number. Please check your details or contact Royal Studio.",
        },
        { status: 404 }
      );
    }

    const expectedPassword = (matchedClient.portalPassword || "").trim();
    if (!expectedPassword || providedPassword !== expectedPassword) {
      return NextResponse.json(
        {
          authenticated: false,
          error:
            "Incorrect password. Please enter the login password generated for your account by Royal Studio.",
        },
        { status: 401 }
      );
    }

    const clientEvents = db.events.filter((e) => e.clientId === matchedClient.id);
    const matchedEvent = clientEvents[0] || null;
    const quo = matchedEvent
      ? db.quotations.find((q) => q.eventId === matchedEvent.id)
      : undefined;

    return NextResponse.json({
      authenticated: true,
      loginMode: "PASSWORD",
      identifier: matchedClient.email || matchedClient.phone || matchedClient.id,
      eventId: matchedEvent?.id || "",
      clientId: matchedClient.id,
      quotationId: quo?.id || "",
      quotationNumber: quo?.quotationNumber || "",
      eventTitle: matchedEvent?.title || `${matchedClient.name} — Client Portal`,
      clientName: matchedClient.name,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        authenticated: false,
        error: err?.message || "Verification failed",
      },
      { status: 500 }
    );
  }
}
