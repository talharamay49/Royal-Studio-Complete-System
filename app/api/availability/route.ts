import { NextRequest, NextResponse } from "next/server";
import { dbInstance } from "@/lib/admin/db";

export interface DateAvailabilityInfo {
  date: string;
  status: "AVAILABLE" | "LIMITED_CREW" | "HIGH_DEMAND";
  badgeLabel: string;
  detailMessage: string;
  bookedEventsCount: number;
  remainingCrewEstimate: number;
  remainingCamerasEstimate: number;
  shiftsBooked: ("DAY_TIME" | "NIGHT_TIME")[];
}

export async function GET(req: NextRequest) {
  try {
    const db = await dbInstance.ensureHydrated();
    const { searchParams } = new URL(req.url);
    const datesParam = searchParams.get("dates") || "";
    const requestedDates = datesParam
      .split(",")
      .map((d) => d.trim())
      .filter(Boolean);

    const activeEvents = db.events.filter((e) => e.status !== "Cancelled");
    const activeEventIds = new Set(activeEvents.map((e) => e.id));

    const totalCrew = Math.max(
      6,
      db.teamMembers.filter((m) => m.isActive).length
    );
    const totalCameras = Math.max(
      6,
      db.equipment
        .filter((eq) => eq.category === "Camera" && eq.status !== "Maintenance")
        .reduce((acc, eq) => acc + (eq.quantity || 1), 0)
    );

    const evaluateDate = (dateStr: string): DateAvailabilityInfo => {
      const matchingDays = db.daySchedules.filter(
        (ds) => ds.date === dateStr && activeEventIds.has(ds.eventId)
      );

      const eventsWithoutDaySchedules = activeEvents.filter(
        (e) =>
          e.eventDate === dateStr &&
          !db.daySchedules.some((ds) => ds.eventId === e.id)
      );

      const bookedEventsCount =
        matchingDays.length + eventsWithoutDaySchedules.length;

      const camerasUsed =
        matchingDays.reduce((acc, ds) => acc + (ds.cameraCount || 2), 0) +
        eventsWithoutDaySchedules.reduce(
          (acc, e) => acc + (e.cameraCount || 2),
          0
        );

      const crewUsed =
        matchingDays.reduce((acc, ds) => acc + (ds.crewCount || 2), 0) +
        eventsWithoutDaySchedules.reduce(
          (acc, e) => acc + (e.crewCount || 2),
          0
        );

      const shiftsSet = new Set<"DAY_TIME" | "NIGHT_TIME">();
      matchingDays.forEach((ds) => {
        shiftsSet.add(ds.timingMode === "DAY_TIME" ? "DAY_TIME" : "NIGHT_TIME");
      });
      eventsWithoutDaySchedules.forEach((e) => {
        shiftsSet.add(e.timingMode === "DAY_TIME" ? "DAY_TIME" : "NIGHT_TIME");
      });

      const remainingCrewEstimate = Math.max(1, totalCrew - crewUsed);
      const remainingCamerasEstimate = Math.max(1, totalCameras - camerasUsed);

      if (bookedEventsCount === 0) {
        return {
          date: dateStr,
          status: "AVAILABLE",
          badgeLabel: "Available",
          detailMessage: `Prime availability — Full Executive Crew (${totalCrew} specialists) & Cinema Gear ready`,
          bookedEventsCount: 0,
          remainingCrewEstimate,
          remainingCamerasEstimate,
          shiftsBooked: [],
        };
      }

      if (bookedEventsCount === 1) {
        return {
          date: dateStr,
          status: "LIMITED_CREW",
          badgeLabel: "Limited Crew",
          detailMessage: `1 celebration scheduled · ${remainingCrewEstimate} crew & ${remainingCamerasEstimate} camera units remaining`,
          bookedEventsCount: 1,
          remainingCrewEstimate,
          remainingCamerasEstimate,
          shiftsBooked: Array.from(shiftsSet),
        };
      }

      return {
        date: dateStr,
        status: "HIGH_DEMAND",
        badgeLabel: "High Demand Date",
        detailMessage: `${bookedEventsCount} celebrations booked · Multi-team dispatch active (reserve immediately)`,
        bookedEventsCount,
        remainingCrewEstimate,
        remainingCamerasEstimate,
        shiftsBooked: Array.from(shiftsSet),
      };
    };

    const availabilityByDate: Record<string, DateAvailabilityInfo> = {};
    requestedDates.forEach((d) => {
      availabilityByDate[d] = evaluateDate(d);
    });

    return NextResponse.json({
      availabilityByDate,
      totalActiveCrew: totalCrew,
      totalActiveCameras: totalCameras,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to check availability" },
      { status: 500 }
    );
  }
}
