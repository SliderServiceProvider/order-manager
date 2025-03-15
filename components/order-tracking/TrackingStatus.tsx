import { MapPin, Truck } from "lucide-react";

interface TrackingStatusProps {
  status: "picked_up" | "in_transit" | "delivered";
  pickupInfo: {
    location: string;
    date: string;
  };
  dropoffInfo: {
    location: string;
    date: string;
  };
}

export default function TrackingStatus({
  status,
  pickupInfo,
  dropoffInfo,
}: TrackingStatusProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-4 flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <div className="relative">
          <MapPin className="h-6 w-6 text-gray-800" />
          {status !== "picked_up" && (
            <div className="absolute top-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-white" />
          )}
        </div>
        <div>
          <p className="font-medium">Picked Up</p>
          <p className="text-sm text-gray-500">{pickupInfo.date}</p>
        </div>
      </div>

      <div className="flex-1 mx-4 relative">
        <div className="h-0.5 bg-gray-200 w-full absolute top-1/2 transform -translate-y-1/2"></div>
        <div
          className={`h-0.5 absolute top-1/2 transform -translate-y-1/2 bg-blue-600`}
          style={{
            width:
              status === "picked_up"
                ? "0%"
                : status === "in_transit"
                ? "50%"
                : "100%",
            transition: "width 0.5s ease-in-out",
          }}
        ></div>

        <div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
          style={{
            transition: "left 0.5s ease-in-out",
            left:
              status === "picked_up"
                ? "0%"
                : status === "in_transit"
                ? "50%"
                : "100%",
          }}
        >
          <div className="bg-white p-1 rounded-full border border-blue-600">
            <Truck className="h-5 w-5 text-blue-600" />
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative">
          <MapPin className="h-6 w-6 text-gray-800" />
          {status === "delivered" && (
            <div className="absolute top-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-white" />
          )}
        </div>
        <div>
          <p className="font-medium">Dropoff</p>
          <p className="text-sm text-gray-500">{dropoffInfo.date}</p>
        </div>
      </div>
    </div>
  );
}
