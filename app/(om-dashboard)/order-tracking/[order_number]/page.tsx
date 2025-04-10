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
          Order #{order.order_info.order_number}
        </h1>
        <div className="flex items-center text-sm gap-2 text-gray-600">
          <span>Order ID: {order.order_info.order_id}</span>
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
          {order.order_info.vehicle_type && (
            <>
              <span className="h-4 w-px bg-gray-300"></span>
              <Badge
                variant="outline"
                className="bg-blue-50 text-blue-700 border-blue-200"
              >
                {order.order_info.vehicle_type}
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
              <Badge
                variant="outline"
                className="mb-2 sm:mb-0 bg-blue-50 text-blue-700 border-blue-200"
              >
                {(order.driverInfo as DriverInfo).vehicle}
              </Badge>
              <div className="flex gap-2">
                <a
                  href={`tel:${
                    (order.driverInfo as DriverInfo).contact_number
                  }`}
                  className="inline-flex items-center justify-center h-9 px-4 rounded-md text-sm font-medium bg-primary text-white hover:bg-primary/90"
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Call
                </a>
                <a
                  href={`https://wa.me/${(
                    order.driverInfo as DriverInfo
                  ).contact_number.replace(/\+/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center h-9 px-4 rounded-md text-sm font-medium bg-green-500 text-white hover:bg-green-600"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-4 w-4 mr-2"
                  >
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                    <path
                      d="M12 0C5.373 0 0 5.373 0 12c0 6.628 5.373 12 12 12 6.628 0 12-5.373 12-12 0-6.628-5.373-12-12-12zm.029 18.88a7.947 7.947 0 0 1-3.76-.954l-4.17 1.093 1.112-4.063A7.935 7.935 0 0 1 4.2 12c0-4.373 3.557-7.93 7.93-7.93S20.06 7.627 20.06 12c0 4.373-3.557 7.93-7.93 7.93h-.001z"
                      fillRule="nonzero"
                    />
                  </svg>
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

      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
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
