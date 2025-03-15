"use client";

import { useState, useEffect, use } from "react";
import { MapPin, Package, Star, Phone } from "lucide-react";
import MapRoute from "@/components/order-tracking/MapRoute";
import TrackingStatus from "@/components/order-tracking/TrackingStatus";
import LocationDetails from "@/components/order-tracking/LocationDetails";
import useWebSocket from "@/hooks/useWebSocket";
import api from "@/services/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { IconBrandWhatsapp } from "@tabler/icons-react";

interface PageProps {
  params: Promise<{
    order_number: string;
  }>;
}

interface OrderStage {
  stage: string;
  time: string | null;
  completed: boolean;
}

interface OrderInfo {
  order_id: number;
  order_number: number;
  order_reference_number: string | null;
  order_reference_number_two: string | null;
  order_display_id: string | null;
  order_type: string;
  order_time: string | null;
  vehicle_type: string;
  payable_amount: number;
}

interface Location {
  id: number;
  order_id: number;
  address: string;
  latitude: number;
  longitude: number;
  short_name: string | null;
  flat_no: string;
  city: string;
  direction: string | null;
}

interface TaskLocation {
  task_type_id: number;
  task_status: number;
  accepted_at: string | null;
  started_at: string | null;
  reached_at: string | null;
  completed_at: string | null;
  recipient_number: string | null;
  cod_amount: string | null;
  cash_collected: number;
  delivery_mode: string | null;
  proof_image: string | null;
  location: Location;
}

interface DriverInfo {
  driver_id: number;
  driver_image: string;
  lat: number;
  lng: number;
  vehicle: string;
  avg_rating: number;
  total_reviews: number;
  contact_number: string;
}

interface Order {
  order_info: OrderInfo;
  stages: OrderStage[];
  taskLocations: TaskLocation[];
  driverInfo: DriverInfo | [];
}

export default function TrackingPage({ params }: PageProps) {
  const unwrappedParams = use(params);
  const { order_number } = unwrappedParams;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch order data
  useEffect(() => {
    const fetchOrder = async () => {
      try {
        setLoading(true);
        const response = await api.get(
          `/order-manager/getTrackingDetails/${order_number}`
        );
        console.log("Order details:", response.data);
        setOrder(response.data);
      } catch (err) {
        setError("Failed to fetch order data");
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [order_number]);

  // Determine current delivery status
  const determineDeliveryStatus = ():
    | "picked_up"
    | "in_transit"
    | "delivered" => {
    if (!order) return "in_transit";

    const pickupCompleted = order.stages.find(
      (s) => s.stage === "Pickup Completed"
    )?.completed;
    const deliveryCompleted = order.stages.find(
      (s) => s.stage === "Delivery Completed"
    )?.completed;

    if (deliveryCompleted) return "delivered";
    if (pickupCompleted) return "in_transit";
    return "picked_up";
  };

  // Check if driver is assigned
  const isDriverAssigned = (): boolean => {
    if (!order) return false;
    return Array.isArray(order.driverInfo) ? false : true;
  };

  // Get driver location if assigned
  const getDriverLocation = () => {
    if (!order || !isDriverAssigned()) return null;

    const driverInfo = order.driverInfo as DriverInfo;
    return {
      lat: driverInfo.lat,
      lng: driverInfo.lng,
    };
  };

  // Connect to WebSocket for real-time driver location updates
  const { isConnected, error: wsError } = useWebSocket({
    channelName: `private-driverLocation.${order_number}`,
    events: [
      {
        event: "NewLocation",
        handler: (data) => {
          console.log("Received data:", data);
          if (order && isDriverAssigned()) {
            setOrder({
              ...order,
              driverInfo: {
                ...(order.driverInfo as DriverInfo),
                lat: data.lat,
                lng: data.lng,
              },
            });
          }
        },
      },
    ],
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        Loading order details...
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex items-center justify-center h-screen text-red-500">
        Error: {error || "Order not found"}
      </div>
    );
  }

  const deliveryStatus = determineDeliveryStatus();
  const driverLocation = getDriverLocation();

  // Get pickup location (task_type_id === 1)
  const pickupLocation = order.taskLocations.find(
    (task) => task.task_type_id === 1
  )?.location;

  // Get all dropoff locations (task_type_id === 2 OR task_type_id === 3)
  const dropoffLocations = order.taskLocations
    .filter((task) => task.task_type_id === 2 || task.task_type_id === 3)
    .map((task) => task.location);

  return (
    <div className="container mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">
          Order Details
        </h1>
        <div className="flex items-center text-sm gap-2 text-gray-600">
          <span>Order ID: {order.order_info.order_number}</span>
          <span className="h-4 w-px bg-gray-300"></span>
          <div className="flex items-center gap-1">
            {isDriverAssigned() ? (
              <>
                <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span>Driver online</span>
              </>
            ) : (
              <>
                <span className="inline-block w-2 h-2 bg-yellow-500 rounded-full"></span>
                <span>Driver not assigned</span>
              </>
            )}
          </div>
          {isDriverAssigned() && (
            <>
              <span className="h-4 w-px bg-gray-300"></span>
              <Badge
                variant="outline"
                className="bg-blue-50 text-blue-700 border-blue-200"
              >
                {(order.driverInfo as DriverInfo).vehicle}
              </Badge>
            </>
          )}
        </div>
      </div>

      {isDriverAssigned() && (
        <div className="mb-6 bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-primary">
              <AvatarImage
                src={(order.driverInfo as DriverInfo).driver_image}
                alt="Driver"
              />
              <AvatarFallback>DR</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-lg">Your Driver</h3>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex items-center">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="ml-1 text-sm font-medium">
                    {(order.driverInfo as DriverInfo).avg_rating.toFixed(1)}
                  </span>
                </div>
                <span className="text-sm text-muted-foreground">
                  ({(order.driverInfo as DriverInfo).total_reviews} reviews)
                </span>
              </div>
            </div>
            <div className="ml-auto flex flex-col sm:flex-row gap-2">
              <a
                href={`tel:${(order.driverInfo as DriverInfo).contact_number}`}
              >
                <Badge
                  variant="outline"
                  className="mb-2 sm:mb-0 bg-blue-50 text-blue-700 border-blue-200 flex items-center h-9 px-3"
                >
                  <Phone className="h-4 w-4 mr-2" />
                  {(order.driverInfo as DriverInfo).contact_number}
                </Badge>
              </a>

              <div className="flex gap-2">
                <a
                  href={`https://wa.me/${(
                    order.driverInfo as DriverInfo
                  ).contact_number.replace(/\+/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center h-9 px-4 rounded-md text-sm font-medium bg-green-500 text-white hover:bg-green-600 gap-1"
                >
                  <IconBrandWhatsapp size={16} />
                  WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6">
        <TrackingStatus
          status={deliveryStatus}
          pickupInfo={{
            location: pickupLocation?.address || "Pickup",
            date: order.stages[0].time || "Pending",
          }}
          dropoffInfo={{
            location:
              dropoffLocations[dropoffLocations.length - 1]?.address ||
              "Dropoff",
            date: order.stages[6].time || "Pending",
          }}
        />
      </div>

      <div className="bg-gray-100 rounded-lg shadow-md overflow-hidden mb-6">
        <div className="h-[400px] w-full">
          {pickupLocation && dropoffLocations.length > 0 && (
            <MapRoute
              pickup={{
                lat: pickupLocation.latitude,
                lng: pickupLocation.longitude,
                address: pickupLocation.address,
              }}
              dropoffs={dropoffLocations.map((location) => ({
                lat: location.latitude,
                lng: location.longitude,
                address: location.address,
              }))}
              currentLocation={driverLocation}
              path={[]}
            />
          )}
        </div>
      </div>

      <div className="mb-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Delivery Stages</h2>
          <div className="space-y-4">
            {order.stages.map((stage, index) => (
              <div key={index} className="flex items-center gap-3">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center ${
                    stage.completed
                      ? "bg-green-500"
                      : "border-2 border-gray-300"
                  }`}
                >
                  {stage.completed && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-3 w-3 text-white"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <p
                    className={`font-medium ${
                      stage.completed ? "text-green-600" : "text-gray-700"
                    }`}
                  >
                    {stage.stage}
                  </p>
                </div>
                <div className="text-sm text-gray-500">{stage.time || "-"}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {order.taskLocations.map((task, index) => {
          const isPickup = task.task_type_id === 1;
          const taskTypeLabel =
            task.task_type_id === 1
              ? "Pickup"
              : task.task_type_id === 2
              ? "Dropoff"
              : "Second Dropoff";

          const orderRefNo =
            task.task_type_id === 1
              ? ""
              : task.task_type_id === 2
              ? order.order_info.order_reference_number?.trim() || "N/A"
              : order.order_info.order_reference_number_two?.trim() || "N/A";

          return (
            <LocationDetails
              key={index}
              title={taskTypeLabel}
              icon={
                isPickup ? (
                  <MapPin className="h-5 w-5" />
                ) : (
                  <Package className="h-5 w-5" />
                )
              }
              orderRefNo={orderRefNo}
              address={task.location.address}
              flatNo={task.location.flat_no}
              city={task.location.city}
              direction={task.location.direction || undefined}
              startDateTime={
                isPickup
                  ? task.started_at || "Scheduled Pickup Time"
                  : task.started_at || "Scheduled Delivery Time"
              }
              endDateTime={task.completed_at || "Estimated Completion"}
              recipientNumber={task.recipient_number}
              codAmount={task.cod_amount}
              cashCollectionStatus={task.cash_collected}
            />
          );
        })}
      </div>

      {!isConnected && (
        <div className="mt-4 p-4 bg-yellow-50 text-yellow-700 rounded-md">
          WebSocket disconnected. Reconnecting...
        </div>
      )}
    </div>
  );
}
