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
        const res = await fetch("http://192.168.1.68:3001/api/hexMapping", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "omit",
        });
        console.log("Response from API:", res);
        if (!res.ok) {
          throw new Error(`Error fetching hexMapping: ${res.statusText}`);
        }
        const data = await res.json();
        console.log("Received hexMapping data:", data);
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
