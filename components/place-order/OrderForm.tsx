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
import {
  IconCreditCard,
  IconCreditCardPay,
  IconCurrencyDirham,
  IconWallet,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";

import { OrderStatusModal } from "@/components/place-order/OrderStatusModal";
// Import the custom hook to access Redux state and dispatch
import { useAppSelector } from "@/hooks/useAuth";
import WarningModal from "../invoice-warning/WarningModal";
import StripeWrapper from "../stripe/StripeWrapper";
import StripeWrapperForOrder, {
  StripePaymentRef,
} from "./StripeWrapperForOrder";
import { useStripe } from "@stripe/react-stripe-js";
import { log } from "node:console";

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
  cod_amount: number | null;
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
interface SavedCardProp {
  id: number;
  payment_method_id: string;
  brand: string;
  card_last_four_digit: number;
}
interface icon {
  original_image: string;
}

interface InvoiceReminder {
  type: string;
  message: string;
}

export default function OrderForm({ deliveryType }: { deliveryType: string }) {
  const userId = useAppSelector((state) => state.auth.user?.id); // Access user name from Redux state
  const router = useRouter();
  const stripeFormRef = useRef<StripePaymentRef>(null);
  const stripe = useStripe();
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [loadingPackageScreen, setLoadingPackageScreen] = useState(false);
  const [location, setLocation] = useState(null);
  const [status, setStatus] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [clearInputTrigger, setClearInputTrigger] = useState(false);
  const [pasteLocationInput, setPasteLocationInput] = useState("");
  const [isAccountLocked, setIsAccountLocked] = useState(false);
  const [isInvoiceUser, setIsInvoiceUser] = useState(false);
  const [invoiceReminder, setInvoiceReminder] =
    useState<InvoiceReminder | null>(null);
  const [savedCards, setSavedCards] = useState<SavedCardProp[]>([]);
  const [address, setAddress] = useState<string | null>(null);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [primaryAddress, setPrimaryAddress] = useState(null);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [vehicles, setVehicles] = useState<VehicleProp[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleProp | null>(
    null
  );
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [orderCost, setOrderCost] = useState(0);
  const [orderPaymentMethod, setOrderPaymentMethod] = useState<
    number | string | null
  >(null);

  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);

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
  const shouldGeocode = useRef(true); // To prevent unnecessary geocoding
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
      cod_amount: null,
    },
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [orderStatus, setOrderStatus] = useState<
    "loading" | "success" | "error"
  >("loading");
  const [orderNumber, setOrderNumber] = useState("");
  const [open, setOpen] = useState(false);
  const [responseMessage, setResponseMessage] = useState<string | null>(null);
  // Function to check if the phone number starts with a valid mobile network code
  const startsWithValidMobileNetworkCode = (number: string): boolean => {
    const validCodes = [
      "02",
      "03",
      "04",
      "06",
      "07",
      "08",
      "09",
      "050",
      "052",
      "054",
      "055",
      "056",
      "057",
      "058",
    ];
    return validCodes.some((code) => number.startsWith(code));
  };
  
  // Fetch Primary Address to show as pickup location
  const fetchPrimaryAddress = async () => {
    setLoading(true);

    try {
      const response = await api.get("/order-manager/getPrimaryAddress");
      const data = response.data;
      setIsAccountLocked(data.isAccountLocked);
      setIsInvoiceUser(data.invoice_order);
      setInvoiceReminder(data.invoice_reminder);
      setSavedCards(data.userSavedCards);

      if (data.isAccountLocked) {
        setOpen(true);
      } else if (data.invoice_reminder) {
        setOpen(true);
      }

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

  useEffect(() => {
    if (isAccountLocked) {
      setOpen(true); // Open modal if account is locked
    } else if (invoiceReminder) {
      setOpen(true); // Open modal if there's an invoice reminder
    }
  }, [isAccountLocked, invoiceReminder]);

  const googleMapAPIKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  // Define libraries array outside component to prevent unnecessary re-renders
  const libraries: Libraries = ["places"];
  // Load script in the parent
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: googleMapAPIKey,
    libraries: libraries,
  });

  const baseSteps = [
    { id: 1, name: "Pickup Address", icon: MapPin },
    { id: 2, name: "Drop Off Address", icon: MapPin },
    { id: 3, name: "Package Details", icon: Package },
  ];

  const steps = isInvoiceUser
    ? baseSteps
    : [...baseSteps, { id: 4, name: "Payment", icon: CreditCard }];

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
    // setLoadingPackageScreen(true);
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
    // manage validation for package screen
    if (currentStep === 3) {
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
      // if (!formData.package.receiver_phone_number.trim()) {
      //   toast({
      //     variant: "destructive",
      //     title: "Submission failed",
      //     description: "Please enter a recipient number.",
      //   });
      //   return;
      // }
      const receiverPhoneNumber = formData.package.receiver_phone_number;
      // Check if the phone number is empty
      if (!receiverPhoneNumber.trim()) {
        toast({
          variant: "destructive",
          title: "Submission failed",
          description: "Please enter a recipient number.",
        });
        return false;
      }
      // Check if the phone number starts with 0
      if (!/^0/.test(receiverPhoneNumber)) {
        toast({
          variant: "destructive",
          title: "Submission failed",
          description: "Phone number must start with 0.",
        });
        return false;
      }
      // Check if the phone number starts with a valid mobile network code
      if (!startsWithValidMobileNetworkCode(receiverPhoneNumber)) {
        toast({
          variant: "destructive",
          title: "Submission failed",
          description:
            "Invalid phone number. Please enter a valid phone number.",
        });
        return false;
      }

      if (
        (receiverPhoneNumber.startsWith("02") &&
          receiverPhoneNumber.length != 9) ||
        (receiverPhoneNumber.startsWith("05") &&
          receiverPhoneNumber.length != 10)
      ) {
        toast({
          variant: "destructive",
          title: "Submission failed",
          description: "Invalid phone number. Check the format and length.",
        });
        return false;
      }

      // Validate schedule time if selectedDate is provided
      if (selectedDate && !selectedTime) {
        toast({
          variant: "destructive",
          title: "Submission failed",
          description: "Please select a time for the selected date.",
        });
        return;
      }

      const MAX_COD_AMOUNT = 400;

      if (deliveryType === "cod" && !formData.package.cod_amount) {
        toast({
          variant: "destructive",
          title: "Submission failed",
          description: "The valid COD amount is required.",
        });
        return;
      }
      if (
        deliveryType === "cod" &&
        (formData.package?.cod_amount ?? 0) > MAX_COD_AMOUNT
      ) {
        toast({
          variant: "destructive",
          title: "Submission failed",
          description: `The COD amount cannot exceed AED ${MAX_COD_AMOUNT}, Please enter a valid amount.`,
        });
        return;
      }
    }
    // Clear input field when moving to the next screen
    setPasteLocationInput("");
    if (currentStep < steps.length) {
      setClearInputTrigger(true); // Trigger to clear input field
      // Immediately reset the trigger to allow clearing in subsequent steps
      setTimeout(() => {
        setClearInputTrigger(false);
      }, 0);
      setCurrentStep(currentStep + 1);
    } else {
      if (!isInvoiceUser && !orderPaymentMethod) {
        toast({
          variant: "destructive",
          title: "Submission failed",
          description: "Please select a payment method.",
        });
        return;
      }
      handleSubmit();
    }
    // Proceed to the next step
    // setCurrentStep((prev) => Math.min(prev + 1, 4));
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const response = await api.post("/pickup-delivery/get-vehicles", {
        service_type_id: deliveryType === "cod" ? 4 : 1,
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

  const updateOrderCost = (fee: number, tip: number) => {
    const totalCost = fee + tip;
    setOrderCost(totalCost);
  };

  const handleVehicleSelect = (vehicle: VehicleProp) => {
    if (vehicle.is_available) {
      const fee = parseFloat(vehicle.delivery_fee);
      setSelectedVehicle(vehicle);
      setDeliveryFee(fee);
      const tip =
        selectedTip === "custom"
          ? parseFloat(customTip) || 0
          : parseFloat(selectedTip.toString()) || 0; // Convert to string for consistency
      updateOrderCost(fee, tip);
    }
  };

  const calculateTotal = () => {
    const tip =
      selectedTip === "custom" ? parseFloat(customTip) || 0 : selectedTip || 0;
    return (deliveryFee + tip).toFixed(2); // Total including delivery fee and tip
  };

  const handleTipSelect = (tip: number | "custom") => {
    setSelectedTip(tip);
    if (tip !== "custom") {
      setCustomTip(""); // Clear custom input if selecting predefined tip
      updateOrderCost(deliveryFee, tip); // Update order cost
    }
  };

  const handleCustomTipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomTip(value);
    setSelectedTip("custom");
    const customTipValue = parseFloat(value) || 0;
    updateOrderCost(deliveryFee, customTipValue); // Update order cost
  };

  const amountInSubunits = Math.round(orderCost * 100);

  const handleDateTimeSelect = (date: Date | null, time: string | null) => {
    setSelectedDate(date);
    setSelectedTime(time);
  };

  // Handlers for setting payment methods
  const handlePayWithBalance = () => {
    setOrderPaymentMethod(4); // 4 for "Pay with Balance"
  };

  const handlePayWithCreditCard = () => {
    setOrderPaymentMethod(3); // 3 for "Pay with Credit Cards"
  };

  const handleSubmit = async () => {
    try {
      setIsModalOpen(true);
      setOrderStatus("loading");
      if (!isInvoiceUser) {
        if (orderPaymentMethod === 3) {
          // Stripe Payment Validation Only for orderPaymentMethod === 3
          if (!stripe) {
            console.warn(
              "Stripe has not been initialized. Please try again later."
            );
            return;
          }

          const { isValid, paymentMethod } =
            (await stripeFormRef.current?.validatePayment()) || {};

          if (!isValid) {
            setResponseMessage(
              "Payment validation failed. Please check your card details."
            );
            setOrderStatus("error");
            return;
          }

          // Prepare payload with the payment method
          const payload = prepareOrderPayload(paymentMethod);
          await submitOrder(payload);
        } else {
          // Prepare payload for other payment methods
          const payload = prepareOrderPayload(null);
          await submitOrder(payload);
        }
      } else {
        // Invoice user: No Stripe payment logic
        const payload = prepareOrderPayload(null);
        await submitOrder(payload);
      }
    } catch (error: any) {
      setResponseMessage(
        error.response.data.message ||
          "An unexpected error occurred. Please try again."
      );
      setOrderStatus("error");
      // Wait for 3 seconds before processing the result
      setTimeout(() => {
        setIsModalOpen(false);
      }, 3000);
    }
  };

  const prepareOrderPayload = (currentPaymentMethod: any) => ({
    source: "order_manager",
    business_customer: userId,
    service_type_id: deliveryType === "cod" ? 4 : 1,
    payment_type: isInvoiceUser ? 2 : 1,
    vehicle_id: selectedVehicle?.id || null,
    isVendorOrder: false, // Is this an order from a vendor client?
    invoice_order: isInvoiceUser, // Is this an order from a vendor client?
    schedule_time:
      selectedDate && selectedTime
        ? `${format(selectedDate, "yyyy-MM-dd")} ${selectedTime}`
        : "",
    tip: selectedTip === "custom" ? parseFloat(customTip) || 0 : selectedTip,
    recipient_phone: formData.package?.receiver_phone_number || null,
    order_reference_number: formData.package?.order_reference_number || null,
    cod_amount: formData.package?.cod_amount || null,
    distance: distance || 0,
    duration: duration || 0,
    payment_method: orderPaymentMethod,
    paymentMethod:
      orderPaymentMethod === 5 ? paymentMethod : currentPaymentMethod, // Use paymentMethod for saved cards
    tasks: [
      {
        task_type_id: 1,
        address: formData.pickup.address,
        latitude: formData.pickup.location.lat,
        longitude: formData.pickup.location.lng,
        flat_no: formData.pickup.building,
        direction: formData.pickup?.directions || "",
        receiver_phone_number: null,
        cod_amount: null,
      },
      {
        task_type_id: 2,
        address: formData.dropoff.address,
        latitude: formData.dropoff.location.lat,
        longitude: formData.dropoff.location.lng,
        flat_no: formData.dropoff.building,
        direction: formData.dropoff?.directions || "",
        receiver_phone_number: formData.package?.receiver_phone_number || null,
        cod_amount: formData.package?.cod_amount || null,
      },
    ],
  });

  const submitOrder = async (payload: Record<string, any>) => {
    const response = await api.post("/order-manager/processOrder", payload);

    if (response.status === 200) {
      const orderNumber = response.data.data;
      setOrderNumber(orderNumber);
      setResponseMessage(response.data.message || "Order Placed Successfully!");
      setOrderStatus("success");

      // Wait for 2 seconds before processing the result
      setTimeout(() => {
        setIsModalOpen(false);
        router.push(`/orders/order-details/${orderNumber}`);
      }, 2000);
    } else {
      setIsModalOpen(false);
      setResponseMessage("Failed to place the order. Please try again.");
      setOrderStatus("error");
      // alert("Failed to place the order. Please try again.");
    }
  };

  // Paste Map Link
  const handlePasteLocation: React.ClipboardEventHandler<
    HTMLInputElement
  > = async (e) => {
    const pastedData = e.clipboardData.getData("Text");
    console.log("[handlePasteLocation] Pasted data:", pastedData);

    const regex = /@([-0-9.]+),([-0-9.]+)/;
    const plusCodeRegex = /^[A-Z0-9]{4}\+[A-Z0-9]{2}(?: [\w\s]+)?$/;
    const shortLinkRegex = /^https:\/\/maps\.app\.goo\.gl\/.+$/;

    const match = pastedData.match(regex);
    const isPlusCode = plusCodeRegex.test(pastedData);
    const isShortLink = shortLinkRegex.test(pastedData);

    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      const coordinates = { lat, lng };
      await resolveLocationFromCoordinates(
        coordinates,
        currentStep === 1 ? "pickup" : "dropoff"
      );
    } else if (isPlusCode) {
      await resolveLocationFromPlusCode(
        pastedData,
        currentStep === 1 ? "pickup" : "dropoff"
      );
    } else if (isShortLink) {
      await resolveShortLink(
        pastedData,
        currentStep === 1 ? "pickup" : "dropoff"
      );
    }
  };

  const resolveShortLink = async (
    shortLink: string,
    type: "pickup" | "dropoff"
  ) => {
    try {
      const response = await fetch(shortLink, {
        method: "HEAD",
        redirect: "follow",
      });
      const expandedUrl = response.url;

      const regex = /@([-0-9.]+),([-0-9.]+)/;
      const plusCodeRegex = /^[A-Z0-9]{4}\+[A-Z0-9]{2}(?: [\w\s]+)?$/;

      const match = expandedUrl.match(regex);
      const isPlusCode = plusCodeRegex.test(expandedUrl);

      if (match) {
        const lat = parseFloat(match[1]);
        const lng = parseFloat(match[2]);
        const coordinates = { lat, lng };
        await resolveLocationFromCoordinates(coordinates, type);
      } else if (isPlusCode) {
        await resolveLocationFromPlusCode(expandedUrl, type);
      } else {
        console.warn(
          "[resolveShortLink] Expanded URL does not contain valid location data."
        );
      }
    } catch (error) {
      console.error("[resolveShortLink] Error expanding short link:", error);
    }
  };

  const resolveLocationFromCoordinates = async (
    coordinates: Location,
    type: "pickup" | "dropoff"
  ) => {
    try {
      const geocoder = new window.google.maps.Geocoder();
      const result = await geocoder.geocode({ location: coordinates });

      if (result.results?.[0]) {
        setFormData((prev) => ({
          ...prev,
          [type]: {
            ...prev[type],
            address: result.results[0].formatted_address,
            location: coordinates,
          },
        }));

        // Center map on location
        if (mapRef.current) {
          mapRef.current.panTo(coordinates);
        }
      }
    } catch (error) {
      console.error("[resolveLocationFromCoordinates] Geocoding error:", error);
    }
  };

  const resolveLocationFromPlusCode = async (
    plusCode: string,
    type: "pickup" | "dropoff"
  ) => {
    try {
      const geocoder = new window.google.maps.Geocoder();
      const result = await geocoder.geocode({ address: plusCode });

      if (result.results?.[0]) {
        const location = result.results[0].geometry.location;
        const coordinates = { lat: location.lat(), lng: location.lng() };

        setFormData((prev) => ({
          ...prev,
          [type]: {
            ...prev[type],
            address: result.results[0].formatted_address,
            coordinates,
          },
        }));

        // Center map on resolved coordinates
        if (mapRef.current) {
          mapRef.current.panTo(coordinates);
        }
      } else {
        console.warn(
          "[resolveLocationFromPlusCode] No results found for Plus Code."
        );
      }
    } catch (error) {
      console.error("[resolveLocationFromPlusCode] Geocoding error:", error);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
      case 2: {
        const type = currentStep === 1 ? "pickup" : "dropoff";

        const onLoad = (mapInstance: google.maps.Map) => {
          mapRef.current = mapInstance;
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

              // Fetch the address for the updated coordinates using Geocoder
              try {
                const geocoder = new window.google.maps.Geocoder();
                const result = await geocoder.geocode({
                  location: newLocation,
                });

                const address =
                  result.results?.[0]?.formatted_address || "Unknown Location";
                console.log("Fetched address for new location:", address);

                // Update the address in form data
                setFormData((prev) => ({
                  ...prev,
                  [type]: {
                    ...prev[type],
                    address,
                  },
                }));
              } catch (error) {
                console.error("[handleMapIdle] Geocoding error:", error);
              }
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
                  value={formData[type]?.directions || ""} // Ensures fallback to an empty string
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      [type]: { ...prev[type], directions: e.target.value },
                    }))
                  }
                />
              </div>
              <hr />
              <div className="space-y-2">
                <div className="py-2">
                  <p className="text-gray-500 text-sm">
                    Or you can update your location using one of the following
                    options
                  </p>
                </div>
                <div>
                  <p className="text-sm">
                    Locate Me:
                    <span className="text-gray-500 ml-1">
                      Click this option to automatically update your location to
                      your current position
                    </span>
                  </p>
                </div>

                <Button
                  className="bg-gray-100 text-black shadow-none border"
                  onClick={() => {
                    if (navigator.geolocation) {
                      navigator.geolocation.getCurrentPosition(
                        async (position) => {
                          const coordinates = {
                            lat: position.coords.latitude,
                            lng: position.coords.longitude,
                          };
                          if (mapRef.current) {
                            shouldGeocode.current = true; // Enable geocoding for user interaction
                            mapRef.current.panTo(coordinates);
                            await resolveLocationFromCoordinates(
                              coordinates,
                              currentStep === 1 ? "pickup" : "dropoff"
                            );
                            // Clear both the Autocomplete input and paste input
                            setPasteLocationInput("");
                            setClearInputTrigger(true); // Trigger Autocomplete to clear
                            setTimeout(() => setClearInputTrigger(false), 0); // Reset trigger
                          }
                        },
                        (error) => {
                          console.error("Error getting location:", error);
                        }
                      );
                    }
                  }}
                >
                  Locate Me
                </Button>

                <div>
                  <Label className="text-sm">
                    Paste Location Link:
                    <span className="text-gray-500 ml-1">
                      Copy the location link from Google Maps and paste it here
                      to set your location manually.
                    </span>
                  </Label>
                  <Input
                    type="text"
                    placeholder="Enter or paste Google Maps link, Plus Code, or short link"
                    className="h-11"
                    value={pasteLocationInput} // Bind the value to state
                    onChange={(e) => setPasteLocationInput(e.target.value)} // Update state on input change
                    onPaste={handlePasteLocation}
                  />
                </div>
              </div>
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
                  clearInputTrigger={clearInputTrigger}
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
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {Array.from({ length: 4 }).map((_, index) => (
                          <div
                            key={index}
                            className="w-52 h-20 bg-gray-200 animate-pulse rounded-lg"
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 lg:justify-between">
                        {vehicles.map((vehicle) => (
                          <button
                            key={vehicle.id}
                            onClick={() => handleVehicleSelect(vehicle)}
                            className={`flex items-center justify-center gap-5 py-4 border border-gray-100 text-left rounded-lg ${
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
                            updateOrderCost(deliveryFee, 0); // Update the order cost to exclude tip
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

                  {deliveryType === "cod" && (
                    <div className="space-y-2">
                      <Label htmlFor="cod_amount">COD Amount</Label>
                      <Input
                        className="h-11"
                        id="cod_amount"
                        placeholder="Enter cod amount"
                        value={formData.package.cod_amount?.toString() || ""}
                        onChange={(e) => {
                          const value = e.target.value; // Get the raw value
                          setFormData((prev) => ({
                            ...prev,
                            package: {
                              ...prev.package,
                              cod_amount:
                                value === "" ? null : parseFloat(value),
                            },
                          }));
                        }}
                      />
                    </div>
                  )}
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
                      <span className="text-gray-500 text-sm">
                        Delivery Distance
                      </span>
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
                      <span className="text-gray-500 text-sm">
                        Delivery Time
                      </span>
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
                      <span className="text-gray-500 text-sm">
                        Delivery Fee
                      </span>
                      <p>
                        <span className="text-sm mr-1">AED</span>
                        {calculateTotal()}
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
      case 4:
        return (
          <div className="w-1/2 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 lg:justify-between">
              {/* Render Saved Cards */}
              {savedCards.length > 0 && (
                <>
                  {savedCards.map((card) => (
                    <button
                      key={card.id}
                      onClick={() => {
                        console.log(
                          "Selected Payment Method ID:",
                          card.payment_method_id
                        );
                        setPaymentMethod(card.payment_method_id); // Set saved card
                        setOrderPaymentMethod(5); // Set order payment method to 5
                      }}
                      className={`flex items-center justify-center gap-5 py-4 border border-gray-100 text-left rounded-lg transition-colors ${
                        orderPaymentMethod === 5 &&
                        paymentMethod === card.payment_method_id
                          ? "bg-primary text-black"
                          : "bg-slate-50 hover:bg-primary hover:text-black"
                      }`}
                    >
                      <IconCreditCardPay />
                      <div>
                        <p className="font-medium">
                          **** **** **** {card.card_last_four_digit}
                        </p>
                        <p className="text-sm text-gray-500">{card.brand}</p>
                      </div>
                    </button>
                  ))}
                </>
              )}

              {/* Pay with Balance Button */}
              <button
                onClick={() => {
                  setOrderPaymentMethod(4); // Set orderPaymentMethod to 4 for Balance
                  setPaymentMethod(null); // Clear saved card selection
                }}
                className={`flex items-center justify-center gap-5 py-4 border border-gray-100 text-left rounded-lg transition-colors ${
                  orderPaymentMethod === 4
                    ? "bg-primary text-black"
                    : "bg-slate-50 hover:bg-primary hover:text-black"
                }`}
              >
                <IconWallet />
                <div>
                  <p className="font-medium">Pay with Balance</p>
                </div>
              </button>

              {/* Add Card Button */}
              <button
                onClick={() => {
                  setOrderPaymentMethod(3); // Set orderPaymentMethod to 3 for Add Card
                  setPaymentMethod(null); // Clear saved card selection
                }}
                className={`flex items-center justify-center gap-5 py-4 border border-gray-100 text-left rounded-lg transition-colors ${
                  orderPaymentMethod === 3
                    ? "bg-primary text-black"
                    : "bg-slate-50 hover:bg-primary hover:text-black"
                }`}
              >
                <IconCreditCardPay />
                <div>
                  <p className="font-medium">Add Card</p>
                </div>
              </button>
            </div>

            {/* Conditionally render Stripe Wrapper */}
            {orderPaymentMethod === 3 && (
              <div className="card-payment">
                <StripeWrapperForOrder
                  ref={stripeFormRef}
                  amount={amountInSubunits}
                />
              </div>
            )}
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
            <div
              className={`h-1 w-20 mx-2 ${
                currentStep === step.id ? "bg-primary" : "bg-muted"
              }`}
            />
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
          className={`w-[250px] ${
            isAccountLocked
              ? "bg-gray-400 text-gray-600 cursor-not-allowed"
              : "bg-black text-white hover:bg-gray-800"
          }`}
          onClick={handleNext}
          disabled={isAccountLocked}
        >
          {currentStep === 4
            ? `Place Order AED ${calculateTotal()}`
            : currentStep === steps.length
            ? "Place Order"
            : "Next"}
        </Button>
      </div>
      <OrderStatusModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        status={orderStatus}
        orderNumber={orderNumber}
        responseMessage={responseMessage}
      />
      {/* Invoice Reminder Modal */}
      <WarningModal
        open={open}
        onOpenChange={setOpen}
        invoiceReminder={invoiceReminder}
        isAccountLocked={isAccountLocked}
        isFromDashBoard={false}
      />
    </div>
  );
}
