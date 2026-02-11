"use client";

import { useEffect, useState } from "react";

type NavBadges = {
  pendingBookings: number;
  unreadMessages: number;
};

export function useNavBadges(role: "CLIENT" | "ARTIST"): NavBadges {
  const [badges, setBadges] = useState<NavBadges>({
    pendingBookings: 0,
    unreadMessages: 0,
  });

  useEffect(() => {
    async function fetchCounts() {
      try {
        const fetches: Promise<Response>[] = [fetch("/api/messages/unread")];

        if (role === "ARTIST") {
          fetches.push(fetch("/api/bookings/count"));
        }

        const results = await Promise.all(fetches);
        const [messagesRes, bookingsRes] = results;

        const messagesData = messagesRes.ok
          ? await messagesRes.json()
          : { count: 0 };

        let bookingsCount = 0;
        if (bookingsRes?.ok) {
          const bookingsData = await bookingsRes.json();
          bookingsCount = bookingsData.count;
        }

        setBadges({
          unreadMessages: messagesData.count,
          pendingBookings: bookingsCount,
        });
      } catch {
        // silently fail — badges are non-critical
      }
    }

    fetchCounts();
    const interval = setInterval(fetchCounts, 30000);
    return () => clearInterval(interval);
  }, [role]);

  return badges;
}
