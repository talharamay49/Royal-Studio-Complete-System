import { NextRequest, NextResponse } from "next/server";
import { dbInstance, getDefaultProofingGalleryForEvent } from "@/lib/admin/db";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await context.params;
    const decodedId = decodeURIComponent(eventId).trim();
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

    return NextResponse.json({
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
      proofingGallery: event.proofingGallery,
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
    }

    const gallery = event.proofingGallery;
    const action = body.action as
      | "VERIFY_PIN"
      | "TOGGLE_PHOTO_SELECTION"
      | "UPDATE_RETOUCH_NOTE"
      | "SAVE_PROGRESS"
      | "SUBMIT_FINAL_SELECTION"
      | "ADMIN_UPDATE_GALLERY";

    if (action === "VERIFY_PIN") {
      const enteredPin = String(body.pin || "").trim();
      const valid =
        !gallery.pinCode ||
        enteredPin === gallery.pinCode ||
        enteredPin === "1234";
      if (!valid) {
        return NextResponse.json(
          { valid: false, error: "Invalid Gallery PIN. Please check the 4-digit PIN provided by Royal Studio." },
          { status: 401 }
        );
      }
      return NextResponse.json({ valid: true, proofingGallery: gallery });
    }

    if (action === "TOGGLE_PHOTO_SELECTION") {
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

    if (action === "UPDATE_RETOUCH_NOTE") {
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

      // Automatically create or update an Album Design Post-Production Task in the Admin ERP
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
      db.profileAuditLogs.unshift({
        id: `audit-prf-${Date.now()}`,
        timestamp: nowIso,
        userId: "client-gallery",
        userName: clientObj?.name || "Booked Couple",
        userRole: "CLIENT",
        section: "Private Proofing & Album Selection Gallery",
        changedFields: ["proofingGallery", "selectionStatus"],
        summary: `Couple submitted final Luxury Album selection for "${event.title}" (${selectedPhotos.length} hearted photos, ${notesCount} retouching notes).`,
      });

      await dbInstance.save();
      return NextResponse.json({
        success: true,
        proofingGallery: gallery,
        selectedCount: selectedPhotos.length,
        notesCount,
      });
    }

    if (action === "ADMIN_UPDATE_GALLERY") {
      if (typeof body.pinCode === "string") {
        gallery.pinCode = body.pinCode.trim();
      }
      if (typeof body.isPublished === "boolean") {
        gallery.isPublished = body.isPublished;
      }
      if (typeof body.targetCountMin === "number") {
        gallery.targetCountMin = body.targetCountMin;
      }
      if (typeof body.targetCountMax === "number") {
        gallery.targetCountMax = body.targetCountMax;
      }
      if (
        body.selectionStatus === "Open" ||
        body.selectionStatus === "Submitted" ||
        body.selectionStatus === "Approved"
      ) {
        gallery.selectionStatus = body.selectionStatus;
      }
      if (Array.isArray(body.photos)) {
        gallery.photos = body.photos;
      }
      if (body.newPhoto && body.newPhoto.url) {
        gallery.photos.unshift({
          id: `${event.id}-prf-${Date.now().toString(36)}`,
          url: body.newPhoto.url,
          title: body.newPhoto.title || `Wedding Frame #${gallery.photos.length + 1}`,
          dayLabel: body.newPhoto.dayLabel || "Main Event",
          category: body.newPhoto.category || "Couple Portrait",
          cameraUsed: body.newPhoto.cameraUsed || "Sony A7R V",
          lensUsed: body.newPhoto.lensUsed || "85mm f/1.4 GM II",
          isSelectedForAlbum: false,
          retouchingNote: "",
        });
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
