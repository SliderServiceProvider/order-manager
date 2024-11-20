"use client";

import { useState, useRef, useEffect } from "react";
import { MapPin, Package, CreditCard } from "lucide-react";
import { GoogleMap, useLoadScript, Marker } from "@react-google-maps/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import Autocomplete from "@/components/googlemap/AutoComplete";
import api from "@/services/api";
import { DateTimePicker } from "@/components/place-order/DateTimePicker";
import { format } from "date-fns";

type Location = {
  lat: number;
  lng: number;
};

type AddressData = {
  address: string;
  building: string;
  directions: string;
  location: Location;
};

type PackageData = {
  vehicle_type: number;
  receiver_phone_number: string;
  tip: number;
  order_reference_number: string;
  cod_amount: number;
};

type FormData = {
  pickup: AddressData;
  dropoff: AddressData;
  package: PackageData;
};

interface Locations {
  placeId: string;
  description: string;
  coordinates: Location;
}

interface VehicleProp {
  id: number;
  title: string;
  package_name: string;
  icon: icon;
  delivery_fee: string;
  is_available: boolean;
}
interface icon {
  original_image: string;
}

interface DeliverySummary {
  distance: number;
  duration: number;
  charged_amount: number;
}

export default function Component() {
  const [loading, setLoading] = useState(true);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [vehicles, setVehicles] = useState<VehicleProp[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleProp | null>(
    null
  );
  
  const [distance, setDistance] = useState<number | null>(null);
  const [duration, setDuration] = useState<number | null>(null);

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedTip, setSelectedTip] = useState<number | "custom">(5);
  const [customTip, setCustomTip] = useState<string>("");
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    pickup: {
      address: "",
      building: "",
      directions: "",
      // receiver_phone_number: "",
      location: { lat: 24.4539, lng: 54.3773 }, // Default to Abu Dhabi
    },
    dropoff: {
      address: "",
      building: "",
      directions: "",
      // receiver_phone_number: "",
      location: { lat: 24.4539, lng: 54.3773 },
    },
    package: {
      vehicle_type: 0,
      receiver_phone_number: "",
      tip: 0,
      order_reference_number: "",
      cod_amount: 0,
    },
  });

  const googleMapAPIKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: googleMapAPIKey,
    libraries: ["places"],
  });

  const steps = [
    { id: 1, name: "Pickup Address", icon: MapPin },
    { id: 2, name: "Drop Off Address", icon: MapPin },
    { id: 3, name: "Package", icon: Package },
  ];

  const handleLocationSelectNew = (location: Locations | null) => {
    if (!location) {
      console.log("No location selected");
      return;
    }

    const type = currentStep === 1 ? "pickup" : "dropoff";

    console.log(`Updating ${type} location in formData with:`, location);

    setFormData((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        address: location.description,
        location: location.coordinates,
      },
    }));
  };

  const handleNext = async () => {
    // If moving from Drop Off Address to Package screen, fetch vehicles
    if (currentStep === 2) {
      await fetchVehicles();
    }

    // Proceed to the next step
    setCurrentStep((prev) => Math.min(prev + 1, 3));
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const response = await api.post("/pickup-delivery/get-vehicles", {
        service_type_id: 1, // Example service type
        locations: [
          {
            latitude: formData.pickup.location.lat,
            longitude: formData.pickup.location.lng,
          },
          {
            latitude: formData.dropoff.location.lat,
            longitude: formData.dropoff.location.lng,
          },
        ],
      });
      const data = response.data;
      console.log(data.data.total_distance);

      setVehicles(data.data.vehicles);
      setDistance(data.data.total_distance);
      setDuration(data.data.total_duration);
    } catch (error) {
      console.error("Error fetching invoices:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleTipSelect = (tip: number | "custom") => {
    setSelectedTip(tip);
    if (tip !== "custom") {
      setCustomTip(""); // Clear custom input if selecting predefined tip
    }
  };

  const handleCustomTipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomTip(value);
    setSelectedTip("custom");
  };

  const handleDateTimeSelect = (date: Date | null, time: string | null) => {
    setSelectedDate(date);
    setSelectedTime(time);
  };

  const handleSubmit = async () => {
    const payload = {
      service_type: 1, // Assuming service type is predefined
      vehicle_type: selectedVehicle?.id || null, // Selected vehicle ID
      schedule_time:
        selectedDate && selectedTime
          ? `${format(selectedDate, "yyyy-MM-dd")} ${selectedTime}`
          : "", // Schedule time
      tip: selectedTip === "custom" ? parseFloat(customTip) || 0 : selectedTip, // Tip amount
      receiver_phone_number: formData.package.receiver_phone_number || null, // Receiver phone number
      cod_amount: formData.package.cod_amount || null, // COD amount
      tasks: [
        {
          task_type_id: 1, // Pickup task type
          address: formData.pickup.address,
          latitude: formData.pickup.location.lat,
          longitude: formData.pickup.location.lng,
          short_name: formData.pickup.directions, // You can replace it with dynamic data
          flat_no: formData.pickup.building || "",
          cod_amount: null, // Assuming no COD for pickup
        },
        {
          task_type_id: 2, // Dropoff task type
          address: formData.dropoff.address,
          latitude: formData.dropoff.location.lat,
          longitude: formData.dropoff.location.lng,
          short_name: formData.dropoff.directions, // You can replace it with dynamic data
          flat_no: formData.dropoff.building || "",
          cod_amount: null,
        },
      ],
      distance: distance || 0, // Replace with actual distance if calculated
      duration: duration || 0, // Replace with actual duration if calculated
    };

    console.log("Submitting form data:", payload);

    try {
      const response = await api.post("/place-order", payload); // Adjust the endpoint as per your backend
      if (response.status === 200) {
        console.log("Order placed successfully:", response.data);
        alert("Order placed successfully!");
      } else {
        console.error("Error placing order:", response.data);
        alert("Failed to place the order. Please try again.");
      }
    } catch (error) {
      console.error("Error submitting the form:", error);
      alert("An error occurred while placing the order.");
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
      case 2: {
        const type = currentStep === 1 ? "pickup" : "dropoff";
        return (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor={`${type}-address`}>Address</Label>
                <Input
                  readOnly
                  id={`${type}-address`}
                  placeholder="Select location"
                  value={formData[type].address}
                />
              </div>
              <div className="space-y-2 hidden">
                <Label htmlFor={`${type}-latitude`}>Latitude</Label>
                <Input
                  readOnly
                  id={`${type}-latitude`}
                  placeholder="Latitude"
                  value={formData[type].location.lat.toString()}
                />
              </div>
              <div className="space-y-2 hidden">
                <Label htmlFor={`${type}-longitude`}>Longitude</Label>
                <Input
                  readOnly
                  id={`${type}-longitude`}
                  placeholder="Longitude"
                  value={formData[type].location.lng.toString()}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${type}-building`}>
                  Flat / Building{" "}
                  <span className="italic text-gray-500">(optional)</span>
                </Label>
                <Input
                  id={`${type}-building`}
                  placeholder="Enter building details"
                  value={formData[type].building}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      [type]: { ...prev[type], building: e.target.value },
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${type}-directions`}>
                  Directions
                  <span className="italic text-gray-500">(optional)</span>
                </Label>
                <Textarea
                  id={`${type}-directions`}
                  placeholder="Enter directions"
                  value={formData[type].directions}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      [type]: { ...prev[type], directions: e.target.value },
                    }))
                  }
                />
              </div>
              <Button
                variant="secondary"
                onClick={() => {
                  if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition((position) => {
                      const newLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                      };
                      console.log("Current location:", newLocation);
                      setFormData((prev) => ({
                        ...prev,
                        [type]: {
                          ...prev[type],
                          location: newLocation,
                        },
                      }));
                    });
                  }
                }}
              >
                Locate Me
              </Button>
            </div>
            <div className="h-[550px] rounded-lg overflow-hidden relative">
              {isLoaded ? (
                <GoogleMap
                  zoom={15}
                  center={formData[type].location}
                  mapContainerClassName="w-full h-full"
                >
                  <Marker
                    position={formData[type].location}
                    draggable
                    onDragEnd={(e) => {
                      if (e.latLng) {
                        const newLocation = {
                          lat: e.latLng.lat(),
                          lng: e.latLng.lng(),
                        };
                        console.log("Marker dragged to:", newLocation);
                        setFormData((prev) => ({
                          ...prev,
                          [type]: {
                            ...prev[type],
                            location: newLocation,
                          },
                        }));
                      }
                    }}
                  />
                </GoogleMap>
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  Loading map...
                </div>
              )}
              <div className="absolute top-14 px-10 w-full z-50">
                <Autocomplete onLocationSelect={handleLocationSelectNew} />
              </div>
            </div>
          </div>
        );
      }
      case 3:
        return (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Choose Package</Label>
                {loadingVehicles ? (
                  <p>Loading vehicles...</p>
                ) : (
                  <div className="flex gap-4 justify-between">
                    {vehicles.map((vehicle) => (
                      <button
                        key={vehicle.id}
                        onClick={() => setSelectedVehicle(vehicle)}
                        className={`flex items-center justify-center gap-5 w-52 h-20 border border-gray-100 text-left rounded-lg ${
                          selectedVehicle?.id === vehicle.id
                            ? "bg-primary"
                            : "bg-slate-50"
                        }`}
                      >
                        <img
                          src={
                            vehicle.icon.original_image ||
                            "/default-vehicle-icon.png"
                          }
                          alt={vehicle.package_name}
                          className="h-10 mix-blend-multiply"
                        />
                        <div>
                          <p className="font-medium">{vehicle.package_name}</p>
                          <p className="text-sm font-medium">
                            {vehicle.delivery_fee} AED
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="receiver_phone_number">Receiver Number</Label>
                <Input
                  id="receiver_phone_number"
                  placeholder="Required format 05XXXXXXXX"
                  value={formData.package.receiver_phone_number || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      package: {
                        ...prev.package,
                        receiver_phone_number: e.target.value, // User input updates the state
                      },
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Tip</Label>
                <div className="flex gap-4">
                  {[5, 10, 15].map((tip) => (
                    <button
                      key={tip}
                      onClick={() => handleTipSelect(tip)}
                      className={`flex items-center justify-center w-20 h-10 border rounded-lg ${
                        selectedTip === tip
                          ? "bg-primary text-black"
                          : "bg-white"
                      }`}
                    >
                      {tip}
                    </button>
                  ))}
                  <div
                    className={`flex items-center w-20 h-10 border rounded-lg ${
                      selectedTip === "custom"
                        ? "bg-primary text-black"
                        : "bg-white"
                    }`}
                  >
                    <input
                      type="number"
                      value={customTip}
                      onChange={handleCustomTipChange}
                      placeholder="Enter"
                      className="w-full h-full text-center outline-none bg-transparent"
                    />
                  </div>
                </div>
                <p className="text-sm mt-2">
                  Selected Tip:{" "}
                  {selectedTip === "custom"
                    ? customTip
                      ? `${customTip} AED`
                      : "Custom (not entered)"
                    : `${selectedTip} AED`}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="order_reference_number">
                  Order Reference Number{" "}
                  <span className="italic text-gray-500">(optional)</span>
                </Label>
                <Input
                  id="order_reference_number"
                  placeholder="Enter order reference number"
                  value={formData.package.order_reference_number || ""} // Controlled input
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      package: {
                        ...prev.package,
                        order_reference_number: e.target.value,
                      },
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Schedule Time</Label>
                <DateTimePicker
                  onDateTimeChange={(date, time) => {
                    setSelectedDate(date);
                    setSelectedTime(time);
                  }}
                />
              </div>
              {distance || 0}
            </div>
            {/* Show Route */}
            <div>
              {isLoaded ? (
                <GoogleMap
                  zoom={15}
                  // center={formData[type].location}
                  mapContainerClassName="w-full h-full"
                ></GoogleMap>
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  Loading map...
                </div>
              )}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="mx-auto space-y-8">
      <h1 className="text-2xl font-bold">Place Order</h1>
      <div className="flex justify-between items-center">
        {steps.map((step) => (
          <div
            key={step.id}
            className={`flex items-center ${
              currentStep >= step.id
                ? "text-primary-foreground"
                : "text-muted-foreground"
            }`}
          >
            <div className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  currentStep >= step.id ? "bg-black text-white" : "bg-muted"
                }`}
              >
                <step.icon className="w-4 h-4" />
              </div>
              <span className="ml-2 font-medium">{step.name}</span>
            </div>
            {step.id < steps.length && (
              <div
                className={`h-px w-12 mx-2 ${
                  currentStep > step.id ? "bg-primary" : "bg-muted"
                }`}
              />
            )}
          </div>
        ))}
      </div>
      <Card className="py-6">
        <CardContent>{renderStep()}</CardContent>
      </Card>
      <div className="flex justify-between">
        <Button
          className="bg-black text-white"
          onClick={handleBack}
          disabled={currentStep === 1}
        >
          Back
        </Button>
        <Button
          className="bg-black text-white"
          onClick={currentStep === 3 ? handleSubmit : handleNext}
        >
          {currentStep === 3 ? "Place Order" : "Next"}
        </Button>
      </div>
    </div>
  );
}
