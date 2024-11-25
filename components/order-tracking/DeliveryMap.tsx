import { useEffect, useMemo, useState } from "react";
import { useLoadScript, GoogleMap, Marker } from "@react-google-maps/api";
import echo from "@/lib/echo";
import { Location } from "@/types";
import { Loader2 } from "lucide-react";

interface DeliveryMapProps {
  pickupLocation: Location;
  dropoffLocation: Location;
  driverLocation: Location;
}

interface ConnectionStatus {
  isConnected: boolean;
  error: string | null;
}

export function DeliveryMap({
  pickupLocation,
  dropoffLocation,
  driverLocation: initialDriverLocation,
}: DeliveryMapProps) {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
  });

  const [driverLocation, setDriverLocation] = useState<Location>(
    initialDriverLocation
  );
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    isConnected: false,
    error: null,
  });

  // Subscribe to real-time updates
  useEffect(() => {
    let mounted = true;
    const channelName = `driverLocationUpdate.${driverLocation.driver_id}`;
    const userId = 2070;
    const handleError = (error: any) => {
      console.error("Echo connection error:", error);
      if (mounted) {
        setConnectionStatus({
          isConnected: false,
          error: "Lost connection to driver tracking service",
        });
      }
    };

    try {
        const channelN = echo.private(`messageCount.${userId}`);

        channelN
          .subscribed(() => {
            `Successfully subscribed to channel messageCount.${userId}`;
          })
          .error((error: any) => {
            console.error("Error subscribing to channel:", error);
          });

        channelN.listen(".NewMessageCount", (event: any) => {
          console.log("Received new message event:", event);
        });

      const channel = echo.private(channelName);

      // Handle successful connection
      channel.subscribed(() => {
        if (mounted) {
          setConnectionStatus({
            isConnected: true,
            error: null,
          });
        }
      });

      // Handle connection errors
      channel.error((error: any) => {
        handleError(error);
      });

      // Listen for location updates
      channel.listen(
        ".DriverLocationUpdated",
        (data: { location: Location }) => {
          if (mounted) {
            console.log("Driver location updated:", data.location);
            setDriverLocation(data.location);
          }
        }
      );

      // Cleanup function
      return () => {
        mounted = false;

        // Properly cleanup channel subscription
        if (echo.connector.channels[channelName]) {
          channel.stopListening(".DriverLocationUpdated");
          echo.leaveChannel(channelName);
        }
      };
    } catch (err) {
      handleError(err);
      return () => {
        mounted = false;
      };
    }
  }, [driverLocation.driver_id]);

  const center = useMemo(
    () => ({
      lat: (pickupLocation.lat + dropoffLocation.lat) / 2,
      lng: (pickupLocation.lng + dropoffLocation.lng) / 2,
    }),
    [pickupLocation, dropoffLocation]
  );

  const markerIcons = useMemo(() => {
    if (!isLoaded) return {};
    return {
      pickup: {
        url: "/assigned_P.png",
        scaledSize: new google.maps.Size(25, 35),
      },
      dropoff: {
        url: "/assigned_D.png",
        scaledSize: new google.maps.Size(25, 35),
      },
      driver: {
        url: "/location.png",
        scaledSize: new google.maps.Size(40, 40),
      },
    };
  }, [isLoaded]);

  // Loading states
  if (loadError) {
    return (
      <div className="w-full h-[400px] flex flex-col items-center justify-center bg-gray-100 text-red-500">
        <span>Error loading map</span>
        <span className="text-sm">{loadError.message}</span>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="w-full h-[400px] flex items-center justify-center bg-gray-100">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading map...
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Connection status indicator */}
      {connectionStatus.error && (
        <div className="absolute top-2 right-2 z-10 bg-red-100 text-red-600 px-3 py-1 rounded-full text-sm">
          {connectionStatus.error}
        </div>
      )}
      {connectionStatus.isConnected && (
        <div className="absolute top-2 right-2 z-10 bg-green-100 text-green-600 px-3 py-1 rounded-full text-sm flex items-center">
          <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
          Live tracking
        </div>
      )}

      <GoogleMap
        zoom={12}
        center={center}
        mapContainerClassName="w-full h-[400px]"
        options={{
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        }}
      >
        <Marker
          position={pickupLocation}
          icon={markerIcons.pickup}
          title="Pickup Location"
        />
        <Marker
          position={dropoffLocation}
          icon={markerIcons.dropoff}
          title="Dropoff Location"
        />
        <Marker
          position={driverLocation}
          icon={markerIcons.driver}
          title="Driver Location"
          animation={google.maps.Animation.DROP}
        />
      </GoogleMap>
    </div>
  );
}
