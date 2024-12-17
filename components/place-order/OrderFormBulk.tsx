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
  receiver_phone_number: string;
  cod_amount: number;
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
  dropoffTwo: AddressData;
  package: PackageData;
  payment?: any; // Add if `payment` has a specific structure, otherwise use `any`
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
  order_cost: string;
  is_available: boolean;
}
interface icon {
  original_image: string;
}
interface SavedCardProp {
  id: number;
  payment_method_id: string;
  brand: string;
  card_last_four_digit: number;
}
interface InvoiceReminder {
  type: string;
  message: string;
}

// Initial Form Data with Explicit Type
const initialFormData: FormData = {
  pickup: {
    address: "",
    building: "",
    directions: "",
    receiver_phone_number: "",
    cod_amount: 0,
    location: { lat: 24.4539, lng: 54.3773 }, // Default to Abu Dhabi
  },
  dropoff: {
    address: "",
    building: "",
    directions: "",
    receiver_phone_number: "",
    cod_amount: 0,
    location: { lat: 24.4539, lng: 54.3773 },
  },
  dropoffTwo: {
    address: "",
    building: "",
    directions: "",
    receiver_phone_number: "",
    cod_amount: 0,
    location: { lat: 24.4539, lng: 54.3773 },
  },
  package: {
    vehicle_type: 0,
    receiver_phone_number: "",
    tip: 0,
    order_reference_number: "",
    cod_amount: 0,
  },
};

export default function OrderFormBulk({
  deliveryType,
}: {
  deliveryType: string;
}) {
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
  const [address, setAddress] = useState<string | null>(null);
  const [savedCards, setSavedCards] = useState<SavedCardProp[]>([]);
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
  const [orderPaymentMethod, setOrderPaymentMethod] = useState<number | null>(
    null
  );
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
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  const shouldGeocode = useRef(true); // To prevent unnecessary geocoding
  const [formData, setFormData] = useState<FormData>(initialFormData);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [orderStatus, setOrderStatus] = useState<
    "loading" | "success" | "error"
  >("loading");
  const [orderNumber, setOrderNumber] = useState("");
  const [open, setOpen] = useState(false);

  // Mock getCurrentLocation function (replace with your actual implementation)
  const getCurrentLocation = useCallback(
    async (
      setFormData: React.Dispatch<React.SetStateAction<FormData>>,
      locationType: string
    ) => {
      // Implement your current location fetching logic here
      // This is a placeholder implementation
      setFormData((prev) => ({
        ...prev,
        [locationType]: {
          ...prev[locationType as keyof FormData],
          location: { lat: 24.4539, lng: 54.3773 },
        },
      }));
    },
    []
  );

  const fetchPrimaryAddress = useCallback(async () => {
    setLoading(true);

    try {
      const response = await api.get("/order-manager/getPrimaryAddress");
      const data = response.data;

      setIsAccountLocked(data.isAccountLocked);
      setIsInvoiceUser(data.invoice_order);
      setInvoiceReminder(data.invoice_reminder);
      setSavedCards(data.userSavedCards);

      if (invoiceReminder) {
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
  }, [getCurrentLocation, invoiceReminder, setFormData]);

  useEffect(() => {
    fetchPrimaryAddress();
  }, [fetchPrimaryAddress]);

  useEffect(() => {
    if (invoiceReminder) {
      setOpen(true);
    }
  }, [invoiceReminder]);
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
  ];

  // Add Drop Off Address Two step if deliveryType is "bulk"
  if (deliveryType === "bulk") {
    baseSteps.push({ id: 3, name: "Drop Off Address Two", icon: MapPin });
  }

  baseSteps.push({ id: 4, name: "Package", icon: Package });

  const steps = isInvoiceUser
    ? baseSteps
    : [...baseSteps, { id: 5, name: "Payment", icon: CreditCard }];

  let debounceTimeout: NodeJS.Timeout | null = null;

  const handleLocationSelectNew = (location: Locations | null) => {
    if (!location) {
      console.log("No location selected");
      return;
    }

    // const type = currentStep === 1 ? "pickup" : "dropoff";

    let type: "pickup" | "dropoff" | "dropoffTwo" | "package" | "payment";
    if (currentStep === 1) {
      type = "pickup";
    } else if (currentStep === 2) {
      type = "dropoff";
    } else if (currentStep === 3) {
      type = "dropoffTwo";
    } else if (currentStep === 4) {
      type = "package";
    } else if (currentStep === 5) {
      type = "payment";
    } else {
      console.warn("Invalid step for location selection");
      return;
    }

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
    let type: "pickup" | "dropoff" | "dropoffTwo" | "package" | "payment";
    if (currentStep === 1) {
      type = "pickup";
    } else if (currentStep === 2) {
      type = "dropoff";
    } else if (currentStep === 3) {
      type = "dropoffTwo";
    } else if (currentStep === 4) {
      type = "package";
    } else if (currentStep === 5) {
      type = "payment";
    } else {
      console.warn("Invalid step for location selection");
      return;
    }

    // Address and Building Validation for Pickup, Dropoff, and DropoffTwo
    if (currentStep <= 3) {
      if (!formData[type]?.address?.trim()) {
        toast({
          variant: "destructive",
          title: "Submission failed",
          description: `Please select a valid address for ${type}.`,
        });
        return;
      }

      if (
        (type === "dropoff" || type === "dropoffTwo") &&
        !formData[type]?.building?.trim()
      ) {
        toast({
          variant: "destructive",
          title: "Submission failed",
          description: `Please enter a valid building number for ${type}.`,
        });
        return;
      }
    }

    // Receiver Number and COD Amount Validation for Dropoff and DropoffTwo
    if (type === "dropoff" || type === "dropoffTwo") {
      if (!formData[type]?.receiver_phone_number?.trim()) {
        toast({
          variant: "destructive",
          title: "Submission failed",
          description: `Please enter a valid receiver number for ${type}.`,
        });
        return;
      }

      if (
        !formData[type]?.cod_amount ||
        isNaN(Number(formData[type]?.cod_amount))
      ) {
        toast({
          variant: "destructive",
          title: "Submission failed",
          description: `Please enter a valid COD amount for ${type}.`,
        });
        return;
      }
    }

    if (currentStep === 3) {
      setLoadingPackageScreen(true);
      try {
        await fetchVehicles(); // Perform async operation
      } catch (error) {}
    }

    if ((currentStep as 1 | 2 | 3 | 4 | 5) === 4) {
      if (!selectedVehicle) {
        toast({
          variant: "destructive",
          title: "Submission failed",
          description: "Please select a package.",
        });
        return;
      }
      // if (!formData.package.receiver_phone_number.trim()) {
      //   toast({
      //     variant: "destructive",
      //     title: "Submission failed",
      //     description: "Please enter a recipient number.",
      //   });
      //   return;
      // }
      if (selectedDate && !selectedTime) {
        toast({
          variant: "destructive",
          title: "Submission failed",
          description: "Please select a time for the selected date.",
        });
        return;
      }
      if (
        deliveryType === "cod" &&
        (!formData.package.cod_amount || formData.package.cod_amount === 0)
      ) {
        toast({
          variant: "destructive",
          title: "Submission failed",
          description: "Please enter a valid COD amount.",
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

      setCurrentStep((currentStep + 1) as 1 | 2 | 3 | 4 | 5); // Cast to match the type
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
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1) as 1 | 2 | 3 | 4 | 5); // Cast the result
  };

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const response = await api.post("/pickup-delivery/get-vehicles", {
        service_type_id: 5,
        locations: [
          {
            latitude: formData.pickup.location.lat,
            longitude: formData.pickup.location.lng,
          },
          {
            latitude: formData.dropoff.location.lat,
            longitude: formData.dropoff.location.lng,
          },
          {
            latitude: formData.dropoffTwo.location.lat,
            longitude: formData.dropoffTwo.location.lng,
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
      const fee = parseFloat(vehicle.order_cost);
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
            alert("Stripe has not been initialized. Please try again later.");
            return;
          }

          const { isValid, paymentMethod } =
            (await stripeFormRef.current?.validatePayment()) || {};

          if (!isValid) {
            alert("Payment validation failed. Please check your card details.");
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
      console.error("Error submitting the order:", error);
      alert(error.message || "An unexpected error occurred. Please try again.");
    }
  };

  const prepareOrderPayload = (currentPaymentMethod: any) => ({
    source: "order_manager",
    business_customer: userId,
    service_type_id: 5,
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
      orderPaymentMethod === 5 ? paymentMethod : currentPaymentMethod,
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
        receiver_phone_number: formData.dropoff?.receiver_phone_number,
        cod_amount: formData.package?.cod_amount || 0,
      },
      ...(deliveryType === "bulk"
        ? [
            {
              task_type_id: 3,
              address: formData.dropoffTwo.address,
              latitude: formData.dropoffTwo.location.lat,
              longitude: formData.dropoffTwo.location.lng,
              flat_no: formData.dropoffTwo.building,
              direction: formData.dropoffTwo.directions || "",
              receiver_phone_number:
                formData.dropoffTwo?.receiver_phone_number || null,
            },
          ]
        : []),
    ],
  });

  const submitOrder = async (payload: Record<string, any>) => {
    // console.log(payload);

    // return;
    const response = await api.post("/order-manager/processOrder", payload);

    if (response.status === 200) {
      const orderNumber = response.data.data;
      setOrderNumber(orderNumber);
      setOrderStatus("success");

      // Wait for 2 seconds before processing the result
      setTimeout(() => {
        setIsModalOpen(false);
        router.push(`/orders/order-details/${orderNumber}`);
      }, 2000);
    } else {
      console.error("Error placing order:", response.data);
      setIsModalOpen(false);
      alert("Failed to place the order. Please try again.");
    }
    // if (response.status === 200) {
    //   alert("Order placed successfully!");
    // } else {
    //   alert("Failed to place the order. Please try again.");
    // }
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

    // Determine the current location type dynamically
    const type: "pickup" | "dropoff" | "dropoffTwo" =
      currentStep === 1
        ? "pickup"
        : currentStep === 2
        ? "dropoff"
        : "dropoffTwo";

    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      const coordinates = { lat, lng };

      await resolveLocationFromCoordinates(coordinates, type);
    } else if (isPlusCode) {
      await resolveLocationFromPlusCode(pastedData, type);
    } else if (isShortLink) {
      await resolveShortLink(pastedData, type);
    } else {
      console.warn("[handlePasteLocation] Invalid link format pasted.");
    }
  };

  const resolveShortLink = async (
    shortLink: string,
    type: "pickup" | "dropoff" | "dropoffTwo" // Allow dropoffTwo
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
    type: "pickup" | "dropoff" | "dropoffTwo" // Allow dropoffTwo
  ) => {
    try {
      const geocoder = new window.google.maps.Geocoder();
      const result = await geocoder.geocode({ location: coordinates });

      if (result && result.results?.[0]) {
        const address = result.results[0].formatted_address;

        // Log address for debugging
        console.log(
          "[resolveLocationFromCoordinates] Geocoded Address:",
          address
        );

        setFormData((prev) => ({
          ...prev,
          [type]: {
            ...prev[type],
            address: address, // Ensure the address field updates
            location: coordinates,
          },
        }));

        // Ensure the map pans to the location after state update
        if (mapRef.current) {
          mapRef.current.panTo(coordinates);
        }
      } else {
        console.warn(
          "[resolveLocationFromCoordinates] No valid address found."
        );
      }
    } catch (error) {
      console.error("[resolveLocationFromCoordinates] Geocoding error:", error);
    }
  };

  const resolveLocationFromPlusCode = async (
    plusCode: string,
    type: "pickup" | "dropoff" | "dropoffTwo" // Allow dropoffTwo
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
            location: coordinates,
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
      // Pickup, Dropoff, Dropoff Two
      case 1:
      case 2:
      case 3: {
        const type =
          currentStep === 1
            ? "pickup"
            : currentStep === 2
            ? "dropoff"
            : deliveryType === "bulk" && currentStep === 3
            ? "dropoffTwo"
            : "dropoff";

        const onLoad = (mapInstance: google.maps.Map) => {
          mapRef.current = mapInstance;
        };

        const handleMapIdle = async (
          type: "pickup" | "dropoff" | "dropoffTwo"
        ) => {
          if (!mapIsMoving) return;

          if (mapRef.current) {
            const center = mapRef.current.getCenter();
            if (center) {
              const newLocation = { lat: center.lat(), lng: center.lng() };

              setFormData((prev) => ({
                ...prev,
                [type]: { ...prev[type], location: newLocation },
              }));

              try {
                const geocoder = new window.google.maps.Geocoder();
                const result = await geocoder.geocode({
                  location: newLocation,
                });
                const address =
                  result.results?.[0]?.formatted_address || "Unknown Location";

                setFormData((prev) => ({
                  ...prev,
                  [type]: { ...prev[type], address },
                }));
              } catch (error) {
                console.error("Geocoding error:", error);
              }
            }
          }
          setMapIsMoving(false);
        };

        return (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              {/* Address Input */}
              <div className="space-y-2">
                <Label htmlFor={`${type}-address`}>Address</Label>
                <Input
                  readOnly
                  className="h-11"
                  id={`${type}-address`}
                  placeholder="Select location"
                  value={formData[type].address}
                />
              </div>

              {/* Building Input */}
              <div className="space-y-2">
                <Label htmlFor={`${type}-building`}>
                  Flat / Building{" "}
                  <span className="text-gray-500">(optional)</span>
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

              {/* Directions Input */}
              <div className="space-y-2">
                <Label htmlFor={`${type}-directions`}>
                  Directions <span className="text-gray-500">(optional)</span>
                </Label>
                <Textarea
                  id={`${type}-directions`}
                  placeholder="Enter directions"
                  value={formData[type].directions || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      [type]: { ...prev[type], directions: e.target.value },
                    }))
                  }
                />
              </div>
              {/*  Receiver Number && Cod Amount */}
              {(type === "dropoff" || type === "dropoffTwo") && (
                <div className="flex gap-2 mt-4">
                  {/* Receiver Number Input */}
                  <div className="space-y-2 w-1/2">
                    <Label htmlFor={`${type}-receiver_phone_number`}>
                      Receiver Number
                    </Label>
                    <Input
                      className="h-11"
                      id={`${type}-receiver_phone_number`}
                      placeholder="Enter receiver number"
                      value={formData[type]?.receiver_phone_number || ""} // Ensure safety with optional chaining
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          [type]: {
                            ...prev[type],
                            receiver_phone_number: e.target.value,
                          },
                        }))
                      }
                    />
                  </div>

                  {/* COD Amount Input */}
                  <div className="space-y-2 w-1/2">
                    <Label htmlFor={`${type}-cod_amount`}>COD Amount</Label>
                    <Input
                      className="h-11"
                      id={`${type}-cod_amount`}
                      placeholder="Enter cod amount"
                      value={formData[type]?.cod_amount || ""} // Ensure safety with optional chaining
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          [type]: {
                            ...prev[type],
                            cod_amount: e.target.value,
                          },
                        }))
                      }
                    />
                  </div>
                </div>
              )}

              {/* Additional Options */}
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
                            shouldGeocode.current = true;
                            mapRef.current.panTo(coordinates);
                            await resolveLocationFromCoordinates(
                              coordinates,
                              type
                            );
                            // Clear both the Autocomplete input and paste input
                            setPasteLocationInput("");
                            setClearInputTrigger(true); // Trigger Autocomplete to clear
                            setTimeout(() => setClearInputTrigger(false), 0); // Reset trigger
                          }
                        },
                        (error) =>
                          console.error("Error getting location:", error)
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

            {/* Google Map */}
            <div className="h-[550px] rounded-lg overflow-hidden relative">
              {isLoaded ? (
                <GoogleMap
                  zoom={15}
                  center={formData[type].location}
                  mapContainerClassName="w-full h-full"
                  onLoad={onLoad}
                  onDragStart={() => setMapIsMoving(true)}
                  onIdle={() => handleMapIdle(type)}
                >
                  {/* Fixed Marker */}
                  <div
                    className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-full z-10"
                    style={{ pointerEvents: "none" }}
                  >
                    <img src="/marker-icon.png" alt="Marker" />
                  </div>
                </GoogleMap>
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
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
            </div>
          </div>
        );
      }

      // Package Step
      case 4:
        return (
          <>
            {/* <Loader isVisible={loadingPackageScreen} /> */}

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
                                {vehicle.order_cost} AED
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
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
                        value={formData.package.cod_amount.toString() || ""}
                        onChange={(e) => {
                          const value = e.target.value; // Get the raw value
                          setFormData((prev) => ({
                            ...prev,
                            package: {
                              ...prev.package,
                              cod_amount: value === "" ? 0 : parseFloat(value),
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
                    dropoffTwo={
                      formData.dropoffTwo?.address?.trim() // Check if dropoffTwo has a valid address
                        ? formData.dropoffTwo.location
                        : null
                    }
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

      // Payment Step
      case 5:
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
          className={`w-[250px] ${
            isAccountLocked
              ? "bg-gray-400 text-gray-600 cursor-not-allowed"
              : "bg-black text-white hover:bg-gray-800"
          }`}
          onClick={handleNext}
          disabled={isAccountLocked}
        >
          {currentStep === 5
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
