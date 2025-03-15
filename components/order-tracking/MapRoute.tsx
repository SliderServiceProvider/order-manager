"use client";

import { useEffect, useRef, useState } from "react";
import { Loader } from "lucide-react";

interface MapLocation {
  lat: number;
  lng: number;
  address?: string;
}

interface MapRouteProps {
  pickup: MapLocation;
  dropoffs: MapLocation[]; // Changed from single dropoff to array of dropoffs
  currentLocation: MapLocation | null;
  path: MapLocation[];
}

declare global {
  interface Window {
    google: any;
    initMap?: () => void;
  }
}

export default function MapRoute({
  pickup,
  dropoffs,
  currentLocation,
  path,
}: MapRouteProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [map, setMap] = useState<any>(null);
  const driverMarkerRef = useRef<any>(null);
  const pulseCircleRef = useRef<any>(null);

  // Load Google Maps script
  useEffect(() => {
    if (!window.google) {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&callback=initMap`;
      script.async = true;
      script.defer = true;

      window.initMap = () => {
        setMapLoaded(true);
      };

      document.head.appendChild(script);

      return () => {
        document.head.removeChild(script);
        window.initMap = undefined;
      };
    } else {
      setMapLoaded(true);
    }
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;

    // Create map centered on pickup location
    const newMap = new window.google.maps.Map(mapRef.current, {
      center: pickup,
      zoom: 12,
      mapTypeControl: false,
      fullscreenControl: false,
      streetViewControl: false,
    });

    setMap(newMap);
  }, [mapLoaded, pickup]);

  // Create pulsing circle animation
  const createPulsingDot = (map: any, position: MapLocation) => {
    // Remove previous markers if they exist
    if (driverMarkerRef.current) {
      driverMarkerRef.current.setMap(null);
    }
    if (pulseCircleRef.current) {
      pulseCircleRef.current.setMap(null);
    }

    // Create the driver marker (navigation arrow)
    driverMarkerRef.current = new window.google.maps.Marker({
      position: position,
      map,
      icon: {
        path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
        scale: 6,
        fillColor: "#4285F4",
        fillOpacity: 1,
        strokeColor: "#FFFFFF",
        strokeWeight: 2,
        rotation: 0, // You can set this dynamically based on heading if available
      },
      zIndex: 2,
    });

    // Create the pulsing circle
    const pulseCircle = new window.google.maps.Circle({
      strokeColor: "#4285F4",
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: "#4285F4",
      fillOpacity: 0.35,
      map,
      center: position,
      radius: 30,
      zIndex: 1,
    });

    pulseCircleRef.current = pulseCircle;

    // Animate the circle
    let direction = 1;
    let radius = 30;
    const animateCircle = () => {
      radius += direction * 0.5;
      if (radius > 50) {
        direction = -1;
      } else if (radius < 30) {
        direction = 1;
      }
      pulseCircle.setRadius(radius);
      window.requestAnimationFrame(animateCircle);
    };

    animateCircle();
  };

  // Add markers when map is ready
  useEffect(() => {
    if (!map) return;

    // Clear previous markers
    map.overlayMapTypes.clear();

    // Add pickup marker
    new window.google.maps.Marker({
      position: pickup,
      map,
      icon: {
        url: "https://maps.google.com/mapfiles/ms/icons/green-dot.png",
        scaledSize: new window.google.maps.Size(40, 40),
      },
      title: "Pickup Location",
    });

    // Add all dropoff markers
    dropoffs.forEach((dropoff, index) => {
      new window.google.maps.Marker({
        position: dropoff,
        map,
        icon: {
          url: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
          scaledSize: new window.google.maps.Size(40, 40),
        },
        title: `Dropoff Location ${index + 1}`,
        label: {
          text: `${index + 1}`,
          color: "white",
          fontSize: "14px",
          fontWeight: "bold",
        },
      });
    });

    // Add driver marker with pulsing effect if available
    if (currentLocation && currentLocation.lat && currentLocation.lng) {
      createPulsingDot(map, currentLocation);
    }

    // Fit bounds to include all points
    const bounds = new window.google.maps.LatLngBounds();
    bounds.extend(pickup);

    // Add all dropoff locations to bounds
    dropoffs.forEach((dropoff) => {
      bounds.extend(dropoff);
    });

    if (currentLocation && currentLocation.lat && currentLocation.lng) {
      bounds.extend(currentLocation);
    }

    map.fitBounds(bounds);
  }, [map, pickup, dropoffs, currentLocation]);

  // Update driver marker position when it changes
  useEffect(() => {
    if (
      !map ||
      !currentLocation ||
      !currentLocation.lat ||
      !currentLocation.lng
    )
      return;

    createPulsingDot(map, currentLocation);
  }, [map, currentLocation]);

  if (!mapLoaded) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-100">
        <Loader className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading map...</span>
      </div>
    );
  }

  return <div ref={mapRef} className="h-full w-full" />;
}
