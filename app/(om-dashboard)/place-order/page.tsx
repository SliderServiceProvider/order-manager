"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { MapPin, Package, CreditCard } from "lucide-react";
import {
  GoogleMap,
  Marker,
  DirectionsRenderer,
  Libraries,
  useLoadScript,
} from "@react-google-maps/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import Autocomplete from "@/components/googlemap/AutoComplete";
import api from "@/services/api";
import { DateTimePicker } from "@/components/place-order/DateTimePicker";
import { format } from "date-fns";
import { getCurrentLocation } from "@/utils/locationHelper";
import RouteMap from "@/components/googlemap/RouteMap";
import Loader from "@/components/place-order/Loader";
import { flushSync } from "react-dom";

import { toast, useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { IconCurrencyDirham } from "@tabler/icons-react";

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
  const [loadingPackageScreen, setLoadingPackageScreen] = useState(false);
  const [location, setLocation] = useState(null);
  const [address, setAddress] = useState<string | null>(null);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [primaryAddress, setPrimaryAddress] = useState(null);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [vehicles, setVehicles] = useState<VehicleProp[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleProp | null>(
    null
  );

  // Reference to the map instance
  const mapRef = useRef<google.maps.Map | null>(null);
  const [mapIsMoving, setMapIsMoving] = useState(false);

  const [distance, setDistance] = useState<number | null>(null);
  const [duration, setDuration] = useState<number | null>(null);

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedTip, setSelectedTip] = useState<number | "custom">(0);
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

  // Fetch Primary Address to show as pickup location
  const fetchPrimaryAddress = async () => {
    setLoading(true);
    try {
      const response = await api.get("/order-manager/getPrimaryAddress");
      const data = response.data;

      if (data?.address) {
        // Update the form data with the primary address
        setFormData((prev) => ({
          ...prev,
          pickup: {
            ...prev.pickup,
            address: data.address.address,
            building: data.address.flat_no,
            directions: data.address.direction,
            location: {
              lat: data.address.latitude,
              lng: data.address.longitude,
            },
          },
        }));
      } else {
        // Fallback to fetching the current location
        await getCurrentLocation(setFormData, "pickup");
      }
    } catch (error) {
      console.error("Error fetching primary address:", error);
      // Fallback to fetching the current location in case of an error
      await getCurrentLocation(setFormData, "pickup");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrimaryAddress();
  }, []);

  const googleMapAPIKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  // Define libraries array outside component to prevent unnecessary re-renders
  const libraries: Libraries = ["places"];
  // Load script in the parent
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: googleMapAPIKey,
    libraries: libraries,
  });

  const steps = [
    { id: 1, name: "Pickup Address", icon: MapPin },
    { id: 2, name: "Drop Off Address", icon: MapPin },
    { id: 3, name: "Package", icon: Package },
  ];

  let debounceTimeout: NodeJS.Timeout | null = null;

  const handleLocationSelectNew = (location: Locations | null) => {
    if (!location) {
      console.log("No location selected");
      return;
    }

    const type = currentStep === 1 ? "pickup" : "dropoff";

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
    setLoadingPackageScreen(true);
    const type = currentStep === 1 ? "pickup" : "dropoff"; // Determine if it's pickup or dropoff

    // Address validation
    if (!formData[type].address.trim()) {
      toast({
        variant: "destructive",
        title: "Submission failed",
        description: `Please select a ${type} address before proceeding.`,
      });
      return; // Prevent navigation to the next step
    }
    // Building validation only for dropoff
    if (type === "dropoff" && !formData.dropoff.building.trim()) {
      toast({
        variant: "destructive",
        title: "Submission failed",
        description: "Please enter a valid building number for the dropoff.",
      });
      return;
    }

    if (currentStep === 2) {
      setLoadingPackageScreen(true);
      try {
        await fetchVehicles(); // Perform async operation
      } catch (error) {}
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
      // Hide loader after async operation
      setLoadingPackageScreen(false);
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
    console.log(formData.package.vehicle_type);

    // Check receiver number is empty or not
    if (!selectedVehicle) {
      toast({
        variant: "destructive",
        title: "Submission failed",
        description: "Please select a package.",
      });
      return;
    }
    // Check receiver number is empty or not
    if (!formData.package.receiver_phone_number.trim()) {
      toast({
        variant: "destructive",
        title: "Submission failed",
        description: "Please enter a recipient number.",
      });
      return;
    }
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

  const fetchAddressFromCoordinates = async (
    latitude: number,
    longitude: number
  ): Promise<string | null> => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();

      if (data?.results?.length > 0) {
        return data.results[0].formatted_address;
      } else {
        console.error("No address found for the current location.");
        return null;
      }
    } catch (error) {
      console.error("Error fetching address from Google API:", error);
      return null;
    }
  };

  const handleLocationPaste = async (
    e: React.ClipboardEvent<HTMLInputElement>,
    type: "pickup" | "dropoff"
  ) => {
    const pastedData = e.clipboardData.getData("Text");

    try {
      // Extract lat,lng from the pasted Google Maps URL
      const regex = /@([-0-9.]+),([-0-9.]+)/;
      const match = pastedData.match(regex);

      if (match) {
        const lat = parseFloat(match[1]);
        const lng = parseFloat(match[2]);

        // Update formData with coordinates
        setFormData((prev) => ({
          ...prev,
          [type]: {
            ...prev[type],
            location: { lat, lng },
          },
        }));

        // Fetch the address using Geocoding API
        const address = await fetchAddressFromCoordinates(lat, lng);
        if (address) {
          setFormData((prev) => ({
            ...prev,
            [type]: {
              ...prev[type],
              address,
            },
          }));
        }

        toast({
          variant: "destructive",
          title: `${type === "pickup" ? "Pickup" : "Dropoff"} location updated`,
          description: address || "Address updated successfully.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Invalid URL",
          description: "Please paste a valid Google Maps location link.",
        });
      }
    } catch (error) {
      console.error("Error handling pasted location:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to process the pasted location.",
      });
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
      case 2: {
        const type = currentStep === 1 ? "pickup" : "dropoff";

        const onLoad = (mapInstance: google.maps.Map) => {
          mapRef.current = mapInstance;
          console.log("Map loaded and mapRef set:", mapRef.current);
        };

        const handleMapIdle = async (type: "pickup" | "dropoff") => {
          if (!mapIsMoving) return; // Prevent redundant calls when the map is not being moved

          if (mapRef.current) {
            const center = mapRef.current.getCenter();

            if (center) {
              const newLocation = {
                lat: center.lat(),
                lng: center.lng(),
              };

              // Update location in form data
              setFormData((prev) => ({
                ...prev,
                [type]: {
                  ...prev[type],
                  location: newLocation,
                },
              }));

              // Fetch the address for the updated coordinates
              const address = await fetchAddressFromCoordinates(
                newLocation.lat,
                newLocation.lng
              );

              console.log("Fetched address for new location:", address);

              // Update the address in form data
              setFormData((prev) => ({
                ...prev,
                [type]: {
                  ...prev[type],
                  address: address || "Unknown Location",
                },
              }));
            } else {
              console.warn("Failed to get map center");
            }
          }
          setMapIsMoving(false); // Reset moving state after idle
        };

        return (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor={`${type}-address`}>Address</Label>
                <Input
                  className="h-11"
                  readOnly
                  id={`${type}-address`}
                  placeholder="Select location"
                  value={formData[type].address}
                  onPaste={(e) => handleLocationPaste(e, type)}
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
                  Flat / Building
                  <span className="italic text-gray-500">(optional)</span>
                </Label>
                <Input
                  className="h-11"
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
                  onLoad={onLoad} // Set mapRef
                  onDragStart={() => setMapIsMoving(true)} // Set moving state when dragging starts
                  onIdle={() => handleMapIdle(type)}
                >
                  {/* Remove the Marker component */}
                </GoogleMap>
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  Loading map...
                </div>
              )}
              <div className="absolute top-14 px-10 w-full z-50">
                <Autocomplete
                  isLoaded={isLoaded}
                  onLocationSelect={handleLocationSelectNew}
                />
              </div>

              {/* Fixed Center Marker */}
              <div
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-full z-10"
                style={{ pointerEvents: "none" }}
              >
                <img src="/marker-icon.png" alt="Marker" />
              </div>
            </div>
          </div>
        );
      }
      case 3:
        return (
          <>
            <Loader isVisible={loadingPackageScreen} />

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                {/* Package Details */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Choose Package</Label>
                    {loadingVehicles ? (
                      <div className="grid grid-cols-2 gap-4">
                        {Array.from({ length: 4 }).map((_, index) => (
                          <div
                            key={index}
                            className="w-52 h-20 bg-gray-200 animate-pulse rounded-lg"
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="flex gap-4 flex-wrap lg:justify-between">
                        {vehicles.map((vehicle) => (
                          <button
                            key={vehicle.id}
                            onClick={() =>
                              vehicle.is_available &&
                              setSelectedVehicle(vehicle)
                            }
                            className={`flex items-center justify-center gap-5 w-52 h-20 border border-gray-100 text-left rounded-lg ${
                              vehicle.is_available
                                ? ""
                                : "opacity-50 cursor-not-allowed"
                            } ${
                              selectedVehicle?.id === vehicle.id &&
                              vehicle.is_available
                                ? "bg-primary"
                                : "bg-slate-50"
                            }`}
                            disabled={!vehicle.is_available}
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
                              <p className="font-medium">
                                {vehicle.package_name}
                              </p>
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
                    <Label htmlFor="receiver_phone_number">
                      Receiver Number
                    </Label>
                    <Input
                      className="h-11"
                      id="receiver_phone_number"
                      placeholder="Required format 05XXXXXXXX"
                      value={formData.package.receiver_phone_number || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          package: {
                            ...prev.package,
                            receiver_phone_number: e.target.value,
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
                    <div className="flex items-center gap-2 mt-2">
                      <p className="text-sm text-muted-foreground">
                        Selected Tip:
                        {selectedTip === "custom"
                          ? customTip
                            ? `${customTip} AED`
                            : "Custom (not entered)"
                          : `${selectedTip || 0} AED`}
                      </p>
                      {selectedTip !== 0 && (
                        <button
                          onClick={() => {
                            setSelectedTip(0); // Reset the selected tip
                            setCustomTip(""); // Clear custom tip input
                          }}
                          className="text-xs text-red-500 border border-red-500 rounded-lg px-2 py-1 hover:bg-red-100"
                        >
                          Remove Tip
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="order_reference_number">
                      Order Reference Number
                      <span className="italic text-gray-500">(optional)</span>
                    </Label>
                    <Input
                      className="h-11"
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
                </div>
                {/* Display delivery summary */}
                <div className="flex mt-10 gap-10">
                  <div className="flex gap-2">
                    <img
                      src="/distance.png"
                      alt="slider"
                      className="h-12 mix-blend-multiply"
                    />
                    <div>
                      <span className="text-gray-500">Delivery Distance</span>
                      <p>
                        {distance}
                        <span className="text-sm ml-1">KM</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <img
                      src="/time.png"
                      alt="slider"
                      className="h-12 mix-blend-multiply"
                    />
                    <div>
                      <span className="text-gray-500">Delivery Time</span>
                      <p>
                        {duration}
                        <span className="text-sm ml-1">Min</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <img
                      src="/fee.png"
                      alt="slider"
                      className="h-12 mix-blend-multiply"
                    />
                    <div>
                      <span className="text-gray-500">Delivery Fee</span>
                      <p>
                        <span className="text-sm mr-1">AED</span>
                        {selectedVehicle
                          ? parseFloat(selectedVehicle.delivery_fee) +
                            (selectedTip === "custom"
                              ? parseFloat(customTip) || 0
                              : selectedTip || 0)
                          : "0"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              {/* Show Route */}
              <div>
                {isLoaded &&
                formData.pickup.location.lat &&
                formData.dropoff.location.lat ? (
                  <RouteMap
                    isLoaded={isLoaded}
                    pickup={formData.pickup.location}
                    dropoff={formData.dropoff.location}
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 animate-pulse flex items-center justify-center rounded-lg">
                    Loading route...
                  </div>
                )}
              </div>
            </div>
          </>
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
            className={`flex flex-col items-center ${
              currentStep >= step.id ? "text-black" : "text-muted-foreground"
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
                className={`h-1 w-20 mx-2 ${
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

      <div className="flex gap-4">
        <Button
          className="bg-primary text-black w-[250px]"
          onClick={handleBack}
          disabled={currentStep === 1}
        >
          Back
        </Button>
        <Button
          className="bg-black text-white w-[250px]"
          onClick={currentStep === 3 ? handleSubmit : handleNext}
        >
          {currentStep === 3 ? "Place Order" : "Next"}
        </Button>
      </div>
    </div>
  );
}
