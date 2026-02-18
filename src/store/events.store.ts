"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CalendarEvent } from "@/types";
import { SEED_EVENTS } from "@/data/seed";

interface EventsState {
    events: CalendarEvent[];
    addEvent: (event: Omit<CalendarEvent, "id">) => void;
    removeEvent: (id: string) => void;
}

export const useEventsStore = create<EventsState>()(
    persist(
        (set) => ({
            events: SEED_EVENTS,
            addEvent: (event) =>
                set((s) => ({
                    events: [
                        ...s.events,
                        { ...event, id: `EVT${String(s.events.length + 1).padStart(3, "0")}` },
                    ],
                })),
            removeEvent: (id) =>
                set((s) => ({ events: s.events.filter((e) => e.id !== id) })),
        }),
        { name: "nexhrms-events", version: 1 }
    )
);
