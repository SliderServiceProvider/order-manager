"use client";

import { useEffect, useState } from "react";
import { GoogleMap, Marker } from "@react-google-maps/api";

type Location = {
  lat: number;
  lng: number;
};

interface RouteMapProps {
  isLoaded: boolean;
  pickup: Location;
  dropoff: Location | Location[];
}

export default function RouteMap({ isLoaded, pickup, dropoff }: RouteMapProps) {
  const [error, setError] = useState<string | null>(null);

  if (!isLoaded) return <div>Loading map...</div>;

  return (
    <div className="h-[550px] rounded-lg overflow-hidden">
      <GoogleMap
        zoom={12}
        center={pickup}
        mapContainerClassName="w-full h-full"
      >
        <Marker position={pickup} label={{ text: "P", color: "white" }} />
        {Array.isArray(dropoff) ? (
          dropoff.map((loc, i) => (
            <Marker
              key={i}
              position={loc}
              label={{ text: `D${i + 1}`, color: "white" }}
            />
          ))
        ) : (
          <Marker position={dropoff} label={{ text: "D", color: "white" }} />
        )}

        {error && (
          <div className="absolute top-0 left-0 right-0 bg-red-500 text-white p-2 text-center">
            {error}
          </div>
        )}
      </GoogleMap>
    </div>
  );
}
