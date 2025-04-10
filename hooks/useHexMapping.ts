"use client";
import { useEffect, useState } from "react";

export function useHexMapping() {
  const [hexMapping, setHexMapping] = useState<Record<string, any> | null>(
    null
  );
  const [hexLoading, setHexLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchHexMapping() {
      try {
        setHexLoading(true);
        // Use your own proxy endpoint instead of the external API directly
        const res = await fetch("/api/proxy", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        if (!res.ok) {
          throw new Error(`Error fetching hexMapping: ${res.statusText}`);
        }

        const data = await res.json();
        setHexMapping(data);
      } catch (err: any) {
        console.error("Error in useHexMapping hook:", err);
        setError(err.message || "An error occurred");
      } finally {
        setHexLoading(false);
      }
    }

    fetchHexMapping();
  }, []);

  return { hexMapping, hexLoading, error };
}
