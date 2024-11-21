import React, { useState, useEffect, useCallback } from "react";
import { GoogleMap, Marker, DirectionsRenderer } from "@react-google-maps/api";

type Location = {
  lat: number;
  lng: number;
};

type RouteMapProps = {
  isLoaded: boolean; // Receive `isLoaded` from the parent
  pickup: Location;
  dropoff: Location;
};

const RouteMap: React.FC<RouteMapProps> = ({ isLoaded, pickup, dropoff }) => {
  const [directions, setDirections] =
    useState<google.maps.DirectionsResult | null>(null);

  const fetchDirections = useCallback(() => {
    if (!window.google || !pickup.lat || !dropoff.lat) return;

    const directionsService = new window.google.maps.DirectionsService();

    directionsService.route(
      {
        origin: {
          lat: pickup.lat,
          lng: pickup.lng,
        },
        destination: {
          lat: dropoff.lat,
          lng: dropoff.lng,
        },
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === window.google.maps.DirectionsStatus.OK && result) {
          setDirections(result);
        } else {
          console.error("Directions request failed:", status);
        }
      }
    );
  }, [pickup, dropoff]);

  useEffect(() => {
    if (isLoaded) {
      fetchDirections();
    }
  }, [isLoaded, fetchDirections]);

  if (!isLoaded) return <div>Loading...</div>;

  return (
    <GoogleMap zoom={15} center={pickup} mapContainerClassName="w-full h-full">
      <Marker position={pickup} />
      <Marker position={dropoff} />
      {directions && (
        <DirectionsRenderer
          directions={directions}
          options={{
            suppressMarkers: true,
            polylineOptions: {
              strokeColor: "#000",
              strokeWeight: 5,
            },
          }}
        />
      )}
    </GoogleMap>
  );
};

export default RouteMap;
