import { NextRequest, NextResponse } from "next/server";
import {
  dbInstance,
  getDefaultProofingGalleryForEvent,
  deriveDefaultPinForEvent,
} from "@/lib/admin/db";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await context.params;
    const decodedId = decodeURIComponent(eventId).trim();
    const { searchParams } = new URL(req.url);
    const providedPin = (
      searchParams.get("pin") ||
      req.headers.get("x-gallery-pin") ||
      ""
    ).trim();

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
        { error: "Event gallery not found" },
        { status: 404 }
      );
    }

    if (!event.proofingGallery) {
      event.proofingGallery = getDefaultProofingGalleryForEvent(
        event.id,
        event.title
      );
      await dbInstance.save();
    } else if (
      !event.proofingGallery.pinCode ||
      event.proofingGallery.pinCode === "1234"
    ) {
      event.proofingGallery.pinCode = deriveDefaultPinForEvent(event.id);
      if (typeof event.proofingGallery.isPinProtected !== "boolean") {
        event.proofingGallery.isPinProtected = false;
      }
      await dbInstance.save();
    }

    const client = db.clients.find((c) => c.id === event!.clientId) || {
      id: event.clientId,
      name: "Valued Couple",
      phone: "",
      whatsapp: "",
      email: "",
      address: "",
      city: event.city || "Lahore",
      notes: "",
      createdDate: event.createdDate,
      createdBy: "usr-admin",
    };

    const daySchedules = db.daySchedules
      .filter((ds) => ds.eventId === event!.id)
      .sort((a, b) => a.dayNumber - b.dayNumber);

    const gallery = event.proofingGallery;
    const isPinRequired = gallery.isPinProtected !== false;
    const phoneDigits = (client.phone || "").replace(/[^0-9]/g, "");
    const phoneLast4 = phoneDigits.slice(-4);

    const isPinVerified =
      !isPinRequired ||
      (providedPin.length > 0 &&
        (providedPin === gallery.pinCode ||
          (phoneLast4.length === 4 && providedPin === phoneLast4)));

    // If PIN is required and not yet verified, NEVER leak photos or pinCode!
    if (!isPinVerified) {
      return NextResponse.json({
        locked: true,
        event: {
          id: event.id,
          title: event.title,
          category: event.category,
          weddingSubtype: event.weddingSubtype,
          eventDate: event.eventDate,
          venue: event.venue,
          city: event.city,
          status: event.status,
        },
        client: {
          id: client.id,
          name: client.name,
          phone: "",
          whatsapp: "",
          city: client.city,
        },
        daySchedules: [],
        proofingGallery: {
          isPinProtected: true,
          isPublished: gallery.isPublished ?? true,
          minAlbumSelection: gallery.minAlbumSelection || gallery.targetCountMin || 100,
          maxAlbumSelection: gallery.maxAlbumSelection || gallery.targetCountMax || 150,
          selectionStatus: gallery.selectionStatus || "Open",
          photos: [],
        },
        profile: {
          studioName: db.profile.studioName,
          tagline: db.profile.tagline,
          phone: db.profile.phone,
          whatsapp: db.profile.whatsapp,
          email: db.profile.email,
          address: db.profile.address,
          city: db.profile.city,
          logo: db.profile.logo,
          primaryLogo: db.profile.primaryLogo,
        },
      });
    }

    return NextResponse.json({
      locked: false,
      event: {
        id: event.id,
        title: event.title,
        category: event.category,
        weddingSubtype: event.weddingSubtype,
        eventDate: event.eventDate,
        venue: event.venue,
        city: event.city,
        status: event.status,
      },
      client: {
        id: client.id,
        name: client.name,
        phone: client.phone,
        whatsapp: client.whatsapp,
        city: client.city,
      },
      daySchedules,
      proofingGallery: gallery,
      profile: {
        studioName: db.profile.studioName,
        tagline: db.profile.tagline,
        phone: db.profile.phone,
        whatsapp: db.profile.whatsapp,
        email: db.profile.email,
        address: db.profile.address,
        city: db.profile.city,
        logo: db.profile.logo,
        primaryLogo: db.profile.primaryLogo,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to load proofing gallery" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await context.params;
    const decodedId = decodeURIComponent(eventId).trim();
    const body = await req.json();
    const db = await dbInstance.ensureHydrated();

    const event = db.events.find((e) => e.id === decodedId);
    if (!event) {
      return NextResponse.json(
        { error: "Event gallery not found" },
        { status: 404 }
      );
    }

    if (!event.proofingGallery) {
      event.proofingGallery = getDefaultProofingGalleryForEvent(
        event.id,
        event.title
      );
    } else if (
      !event.proofingGallery.pinCode ||
      event.proofingGallery.pinCode === "1234"
    ) {
      event.proofingGallery.pinCode = deriveDefaultPinForEvent(event.id);
    }

    const client = db.clients.find((c) => c.id === event.clientId);
    const phoneDigits = (client?.phone || "").replace(/[^0-9]/g, "");
    const phoneLast4 = phoneDigits.slice(-4);

    const gallery = event.proofingGallery;
    const action = body.action as
      | "VERIFY_PIN"
      | "TOGGLE_PHOTO_SELECTION"
      | "TOGGLE_SELECT"
      | "UPDATE_RETOUCH_NOTE"
      | "SAVE_NOTE"
      | "ADD_PHOTO"
      | "SAVE_PROGRESS"
      | "SUBMIT_FINAL_SELECTION"
      | "ADMIN_UPDATE_GALLERY";

    if (action === "VERIFY_PIN") {
      const enteredPin = String(body.pin || "").trim();
      const valid =
        gallery.isPinProtected === false ||
        (enteredPin.length > 0 &&
          (enteredPin === gallery.pinCode ||
            (phoneLast4.length === 4 && enteredPin === phoneLast4)));
      if (!valid) {
        return NextResponse.json(
          {
            valid: false,
            error:
              "Invalid Gallery PIN. Please enter the private 4-digit PIN provided by Royal Studio Admin for your celebration.",
          },
          { status: 401 }
        );
      }

      const daySchedules = db.daySchedules
        .filter((ds) => ds.eventId === event.id)
        .sort((a, b) => a.dayNumber - b.dayNumber);

      return NextResponse.json({
        valid: true,
        proofingGallery: gallery,
        daySchedules,
        client: client
          ? {
              id: client.id,
              name: client.name,
              phone: client.phone,
              whatsapp: client.whatsapp,
              city: client.city,
            }
          : undefined,
      });
    }

    if (action === "TOGGLE_PHOTO_SELECTION" || action === "TOGGLE_SELECT") {
      const photoId = String(body.photoId || "");
      const photo = gallery.photos.find((p) => p.id === photoId);
      if (photo) {
        photo.isSelectedForAlbum =
          typeof body.isSelected === "boolean"
            ? body.isSelected
            : !photo.isSelectedForAlbum;
        photo.selectedAt = photo.isSelectedForAlbum
          ? new Date().toISOString()
          : undefined;
      }
      event.updatedDate = new Date().toISOString();
      await dbInstance.save();
      return NextResponse.json({ success: true, proofingGallery: gallery });
    }

    if (action === "UPDATE_RETOUCH_NOTE" || action === "SAVE_NOTE") {
      const photoId = String(body.photoId || "");
      const note = String(body.retouchingNote || "").trim();
      const photo = gallery.photos.find((p) => p.id === photoId);
      if (photo) {
        photo.retouchingNote = note;
        if (note && !photo.isSelectedForAlbum) {
          photo.isSelectedForAlbum = true;
          photo.selectedAt = new Date().toISOString();
        }
      }
      event.updatedDate = new Date().toISOString();
      await dbInstance.save();
      return NextResponse.json({ success: true, proofingGallery: gallery });
    }

    if (action === "ADD_PHOTO") {
      const title = String(body.title || "Custom Reference Frame").trim();
      const url = String(body.url || "").trim();
      if (url) {
        gallery.photos.unshift({
          id: `${event.id}-prf-${Date.now()}`,
          url,
          title,
          dayLabel: String(body.dayLabel || "Day 2 · Barat"),
          category: String(body.category || "Couple Portrait") as any,
          isSelectedForAlbum: true,
          retouchingNote: String(body.retouchingNote || ""),
          selectedAt: new Date().toISOString(),
        });
        event.updatedDate = new Date().toISOString();
        await dbInstance.save();
      }
      return NextResponse.json({ success: true, proofingGallery: gallery });
    }

    if (action === "SAVE_PROGRESS") {
      if (Array.isArray(body.photos)) {
        gallery.photos = body.photos;
      }
      if (typeof body.clientSubmissionNote === "string") {
        gallery.clientSubmissionNote = body.clientSubmissionNote.trim();
      }
      event.updatedDate = new Date().toISOString();
      await dbInstance.save();
      return NextResponse.json({ success: true, proofingGallery: gallery });
    }

    if (action === "SUBMIT_FINAL_SELECTION") {
      const nowIso = new Date().toISOString();
      if (Array.isArray(body.photos)) {
        gallery.photos = body.photos;
      }
      if (typeof body.clientSubmissionNote === "string") {
        gallery.clientSubmissionNote = body.clientSubmissionNote.trim();
      }
      gallery.selectionStatus = "Submitted";
      gallery.submittedAt = nowIso;
      event.updatedDate = nowIso;

      const selectedPhotos = gallery.photos.filter((p) => p.isSelectedForAlbum);
      const notesCount = gallery.photos.filter(
        (p) => p.retouchingNote && p.retouchingNote.trim().length > 0
      ).length;
      const clientObj = db.clients.find((c) => c.id === event.clientId);

      const taskTitle = `Luxury Album Selection Submitted (${selectedPhotos.length} Photos, ${notesCount} Retouch Notes)`;
      const existingTask = db.tasks.find(
        (t) =>
          t.eventId === event.id &&
          t.title.toLowerCase().includes("luxury album selection")
      );
      const albumDesigner = db.teamMembers.find(
        (m) => m.role === "Album Designer" || m.role === "Editor"
      );

      if (existingTask) {
        existingTask.title = taskTitle;
        existingTask.status = "In Progress";
        existingTask.priority = "Urgent";
        existingTask.description = `Client ${clientObj?.name || ""} finalized ${selectedPhotos.length} frames for the Luxury Storybook Album (${notesCount} specific retouching notes). Couple Note: "${gallery.clientSubmissionNote || "None"}"`;
      } else {
        db.tasks.unshift({
          id: `tsk-alb-${Date.now().toString().slice(-5)}`,
          eventId: event.id,
          title: taskTitle,
          assigneeId: albumDesigner?.id,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          priority: "Urgent",
          status: "In Progress",
          description: `Client ${clientObj?.name || ""} finalized ${selectedPhotos.length} frames for the Luxury Storybook Album (${notesCount} specific retouching notes). Couple Note: "${gallery.clientSubmissionNote || "None"}"`,
          createdDate: nowIso.split("T")[0],
        });
      }

      if (!Array.isArray(db.profileAuditLogs)) {
        db.profileAuditLogs = [];
      }
      (db.profileAuditLogs as any[]).unshift({
        id: `audit-prf-${Date.now()}`,
        timestamp: nowIso,
        userId: "client-gallery",
        userName: clientObj?.name || "Booked Couple",
        userRole: "ADMIN",
        section: "Private Proofing & Album Selection Gallery",
        changedFields: ["selectionStatus", "clientSubmissionNote", "photos"],
        summary: `Couple (${clientObj?.name || "Client"}) submitted final Luxury Album selection (${selectedPhotos.length} photos, ${notesCount} retouching notes) for ${event.title}.`,
      });

      await dbInstance.save();

      return NextResponse.json({
        success: true,
        selectedCount: selectedPhotos.length,
        notesCount,
        proofingGallery: gallery,
      });
    }

    if (action === "ADMIN_UPDATE_GALLERY") {
      if (typeof body.pinCode === "string" && body.pinCode.trim()) {
        gallery.pinCode = body.pinCode.trim();
      }
      if (typeof body.isPublished === "boolean") {
        gallery.isPublished = body.isPublished;
      }
      if (typeof body.isPinProtected === "boolean") {
        gallery.isPinProtected = body.isPinProtected;
      }
      if (typeof body.minAlbumSelection === "number") {
        gallery.minAlbumSelection = body.minAlbumSelection;
        gallery.targetCountMin = body.minAlbumSelection;
      }
      if (typeof body.maxAlbumSelection === "number") {
        gallery.maxAlbumSelection = body.maxAlbumSelection;
        gallery.targetCountMax = body.maxAlbumSelection;
      }
      if (body.selectionStatus) {
        gallery.selectionStatus = body.selectionStatus;
      }
      if (Array.isArray(body.photos)) {
        gallery.photos = body.photos;
      }
      event.updatedDate = new Date().toISOString();
      await dbInstance.save();
      return NextResponse.json({ success: true, proofingGallery: gallery });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to update proofing gallery" },
      { status: 500 }
    );
  }
}
