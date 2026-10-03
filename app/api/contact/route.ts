import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { dbInstance } from "@/lib/admin/db";

export async function POST(request: Request) {
  try {
    const data = await request.json();

    const required = ["brideName", "groomName", "phone", "email", "weddingDate", "city", "services"];
    for (const field of required) {
      if (!data[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    const submission = {
      ...data,
      submittedAt: new Date().toISOString(),
    };

    const leadsDir = path.join(process.cwd(), "data", "leads");
    await mkdir(leadsDir, { recursive: true });
    const filename = `lead-${Date.now()}.json`;
    await writeFile(
      path.join(leadsDir, filename),
      JSON.stringify(submission, null, 2)
    );

    // Seamless sync into Royal Studio Admin Dashboard CRM & Events
    try {
      const db = dbInstance.getData();
      const clientName = `${data.brideName} & ${data.groomName}`.trim();
      let client = db.clients.find(c => c.phone === data.phone || c.name.toLowerCase() === clientName.toLowerCase());
      if (!client) {
        client = {
          id: `cli-${Date.now().toString().slice(-6)}`,
          name: clientName,
          phone: data.phone,
          whatsapp: data.phone,
          email: data.email || '',
          address: data.venue || '',
          city: data.city || 'Burewala',
          notes: `Services requested: ${Array.isArray(data.services) ? data.services.join(', ') : data.services}. ${data.message || ''}`,
          createdDate: new Date().toISOString(),
          createdBy: 'website-inquiry',
        };
        db.clients.unshift(client);
      }

      const newInquiryEvent = {
        id: `evt-${Date.now().toString().slice(-6)}`,
        clientId: client.id,
        title: `${clientName} Wedding`,
        category: 'Wedding' as const,
        weddingSubtype: 'Barat' as const,
        eventDate: data.weddingDate,
        startTime: '18:00',
        endTime: '23:00',
        venue: data.venue || data.city || 'Burewala',
        city: data.city || 'Burewala',
        status: 'Inquiry' as const,
        packagePrice: 0,
        advancePaid: 0,
        discount: 0,
        tax: 0,
        notes: `Website inquiry submission. Requested services: ${Array.isArray(data.services) ? data.services.join(', ') : data.services}. Notes: ${data.message || 'No additional notes.'}`,
        createdBy: 'website-inquiry',
        createdDate: new Date().toISOString(),
        updatedDate: new Date().toISOString(),
        isMultiDay: false,
        staffCost: 0,
        rentalCost: 0,
        eventExpenses: 0,
        netProfit: 0,
        netMargin: 0,
        totalClientPayments: 0,
        remainingBalance: 0,
      };
      db.events.unshift(newInquiryEvent);
      dbInstance.save();
    } catch (dbErr) {
      console.warn('Could not record contact submission to studio_db:', dbErr);
    }

    // Optional: forward to Formspree when FORMSPREE_ENDPOINT is set
    const formspreeEndpoint = process.env.FORMSPREE_ENDPOINT;
    if (formspreeEndpoint) {
      await fetch(formspreeEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(data),
      });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to submit inquiry" }, { status: 500 });
  }
}

