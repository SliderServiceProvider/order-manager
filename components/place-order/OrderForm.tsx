"use client";

import type React from "react";
import { useState, useRef, useEffect } from "react";
import {
  MapPin,
  Package,
  CreditCard,
  Check,
  ChevronsUpDown,
} from "lucide-react";
import {
  GoogleMap,
  type Libraries,
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
import RouteMap from "@/components/googlemap/RouteMap";
import Loader from "@/components/place-order/Loader";
import { useToast } from "@/hooks/use-toast";
import { IconCreditCardPay, IconWallet } from "@tabler/icons-react";
import { useRouter } from "next/navigation";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { OrderStatusModal } from "@/components/place-order/OrderStatusModal";
import { useAppSelector } from "@/hooks/useAuth";
import WarningModal from "../invoice-warning/WarningModal";
import StripeWrapperForOrder, {
  type StripePaymentRef,
} from "./StripeWrapperForOrder";
import { useStripe } from "@stripe/react-stripe-js";
import { Checkbox } from "../ui/checkbox";
import { cn } from "@/lib/utils";

// Uber spatial index
import * as h3 from "h3-js";
import { useHexMapping } from "@/hooks/useHexMapping";

const RESOLUTION = 6;
// --- Types ---
interface HexData {
  h3Index: string;
  zone_id: number | null;
}
type Location = {
  lat: number;
  lng: number;
};

type AddressData = {
  id?: number;
  address: string;
  building: string;
  directions: string;
  location: Location;
  is_primary?: boolean;
  nick_name?: string;
  receiver_phone_number?: string | null;
  cod_amount?: number | null;
  order_reference_number?: string;
  // NEW FIELD to track the saved address for this drop-off
  selectedSavedAddress?: AddressData | null;
};

type PackageData = {
  vehicle_type: number;
  receiver_phone_number: string;
  tip: number;
  cod_amount: number | null;
};

type FormData = {
  pickup: AddressData;
  dropoffs: AddressData[];
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
  icon: { original_image: string };
  delivery_fee: string;
  order_cost: string;
  is_available: boolean;
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

type PrefixGroup = {
  prefixes: string[];
  length: number;
};

// --- Component ---
export default function OrderForm({ deliveryType }: { deliveryType: string }) {
  const userId = useAppSelector((state) => state.auth.user?.id);
  const router = useRouter();
  const stripeFormRef = useRef<StripePaymentRef>(null);
  const stripe = useStripe();
  const { toast } = useToast();

  // H3
  const { hexMapping, hexLoading, error } = useHexMapping();
  const [pickupHexData, setPickupHexData] = useState<HexData | null>(null);
  const [dropoffHexData, setDropoffHexData] = useState<HexData[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingPackageScreen, setLoadingPackageScreen] = useState(false);
  const [isAccountLocked, setIsAccountLocked] = useState(false);
  const [isInvoiceUser, setIsInvoiceUser] = useState(false);
  const [invoiceReminder, setInvoiceReminder] =
    useState<InvoiceReminder | null>(null);
  const [savedCards, setSavedCards] = useState<SavedCardProp[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [vehicles, setVehicles] = useState<VehicleProp[]>([]);
  const [maxCodAmount, setMaxCodAmount] = useState<number>(0);
  const [currentStep, setCurrentStep] = useState(1);
  // Saved addresses for pickup
  const [pickupAddresses, setPickupAddresses] = useState<AddressData[]>([]);
  const [clearInputTrigger, setClearInputTrigger] = useState(false);

  // For pickup combobox
  const [savedAddressOpenPickup, setSavedAddressOpenPickup] = useState(false);
  const [savedAddressQueryPickup, setSavedAddressQueryPickup] = useState("");
  const [selectedPickupSavedAddress, setSelectedPickupSavedAddress] =
    useState<AddressData | null>(null);

  // For dropoff combobox
  const [savedAddressOpenDropoff, setSavedAddressOpenDropoff] = useState(false);
  const [savedAddressQueryDropoff, setSavedAddressQueryDropoff] = useState("");
  // Removed single dropoff state. Each dropoff now stores its own selectedSavedAddress

  // Dynamic form state
  const [formData, setFormData] = useState<FormData>({
    pickup: {
      address: "",
      building: "",
      directions: "",
      location: { lat: 24.4539, lng: 54.3773 },
    },
    dropoffs: [
      {
        address: "",
        building: "",
        directions: "",
        location: { lat: 24.4539, lng: 54.3773 },
        selectedSavedAddress: null,
      },
    ],
    package: {
      vehicle_type: 0,
      receiver_phone_number: "",
      tip: 0,
      cod_amount: null,
    },
  });

  //  useEffect(() => {
  //    console.log("hexMapping updated:", hexMapping);
  //  }, [hexMapping]);

  useEffect(() => {
    const prefillData = localStorage.getItem("prefillOrderData");
    if (prefillData) {
      const parsedData = JSON.parse(prefillData);
      // Extract COD amounts and receiver phone numbers from tasks
      let codFirst = null;
      let codSecond = null;
      let phoneFirst = null;
      let phoneSecond = null;
      if (parsedData.tasks && Array.isArray(parsedData.tasks)) {
        parsedData.tasks.forEach((task: any) => {
          if (task.task_type_id === 2) {
            codFirst = task.cod_amount;
            phoneFirst = task.recipient_number;
          } else if (task.task_type_id === 3) {
            codSecond = task.cod_amount;
            phoneSecond = task.recipient_number;
          }
        });
      }

      // Build dropoffs array.
      const dropoffs: AddressData[] = [];
      if (parsedData.drop_off) {
        dropoffs.push({
          address: parsedData.drop_off.address || "",
          building: parsedData.drop_off.flat_no || "",
          directions: parsedData.drop_off.direction || "",
          location: {
            lat: Number(parsedData.drop_off.latitude) || 24.4539,
            lng: Number(parsedData.drop_off.longitude) || 54.3773,
          },
          selectedSavedAddress: null,
          // Use the receiver number from tasks if available, else fallback.
          receiver_phone_number: phoneFirst || parsedData.recipient_phone || "",
          // Use COD amount from tasks if available; otherwise, fallback.
          cod_amount: codFirst || parsedData.cod_amount || null,
          order_reference_number: parsedData.order_reference_number || "",
        });
      }
      if (parsedData.drop_off_two) {
        dropoffs.push({
          address: parsedData.drop_off_two.address || "",
          building: parsedData.drop_off_two.flat_no || "",
          directions: parsedData.drop_off_two.direction || "",
          location: {
            lat: Number(parsedData.drop_off_two.latitude) || 24.4539,
            lng: Number(parsedData.drop_off_two.longitude) || 54.3773,
          },
          selectedSavedAddress: null,
          receiver_phone_number:
            phoneSecond || parsedData.recipient_phone || "",
          cod_amount: codSecond || null,
          order_reference_number: parsedData.order_reference_number_two || "",
        });
      }
      // Handle pickup address - ensure we're getting the correct data
      let pickupAddress = "";
      let pickupBuilding = "";
      let pickupDirections = "";
      let pickupLat = 24.4539;
      let pickupLng = 54.3773;

      if (parsedData.pickup) {
        pickupAddress = parsedData.pickup.address || "";
        pickupBuilding =
          parsedData.pickup.flat_no || parsedData.pickup.building || "";
        pickupDirections =
          parsedData.pickup.direction || parsedData.pickup.directions || "";
        pickupLat =
          Number(parsedData.pickup.latitude) ||
          Number(parsedData.pickup.lat) ||
          24.4539;
        pickupLng =
          Number(parsedData.pickup.longitude) ||
          Number(parsedData.pickup.lng) ||
          54.3773;
      }

      setFormData({
        pickup: {
          address: pickupAddress,
          building: pickupBuilding,
          directions: pickupDirections,
          location: {
            lat: pickupLat,
            lng: pickupLng,
          },
          selectedSavedAddress: null,
        },
        dropoffs: dropoffs.length ? dropoffs : formData.dropoffs,
        package: {
          vehicle_type: parsedData.vehicle_type || 0,
          receiver_phone_number: parsedData.recipient_phone || "",
          tip: parsedData.tip || 0,
          cod_amount: parsedData.cod_amount || null,
        },
      });
      // Directly move to the package screen for "order again"
      setCurrentStep(3);
      
    }
  }, []);

  useEffect(() => {
    if (currentStep === 3 && hexMapping) {
      fetchVehicles();
      localStorage.removeItem("prefillOrderData");
    }
  }, [currentStep, hexMapping]);

  useEffect(() => {
    if (vehicles.length > 0 && formData.package.vehicle_type) {
      const preselected = vehicles.find(
        (v) => v.id === formData.package.vehicle_type
      );
      if (preselected) {
        setSelectedVehicle(preselected);
        const fee = Number.parseFloat(preselected.order_cost) || 0;
        setDeliveryFee(fee);
        const tip =
          selectedTip === "custom"
            ? Number.parseFloat(customTip) || 0
            : Number.parseFloat(selectedTip.toString()) || 0;
        updateOrderCost(fee, tip);
      }
    }
  }, [vehicles, formData.package.vehicle_type]);

  const [currentDropoffIndex, setCurrentDropoffIndex] = useState(0);

  const addDropoffAddress = () => {
    if (formData.dropoffs.length >= 2) {
      toast({
        variant: "destructive",
        title: "Limit reached",
        description: "You can only add up to 2 drop offs.",
      });
      return;
    }
    setFormData((prev) => ({
      ...prev,
      dropoffs: [
        ...prev.dropoffs,
        {
          address: "",
          building: "",
          directions: "",
          location: { lat: 24.4539, lng: 54.3773 },
          selectedSavedAddress: null,
        },
      ],
    }));
    setCurrentDropoffIndex(formData.dropoffs.length);
  };

  const removeDropoffAddress = (index: number) => {
    if (formData.dropoffs.length <= 1) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "You must have at least one drop-off address.",
      });
      return;
    }
    setFormData((prev) => ({
      ...prev,
      dropoffs: prev.dropoffs.filter((_, i) => i !== index),
    }));
    if (currentDropoffIndex >= index) {
      setCurrentDropoffIndex(Math.max(0, currentDropoffIndex - 1));
    }
  };

  // Separate states for "save address" and nicknames
  const [savePickupAddress, setSavePickupAddress] = useState(false);
  const [pickupNickname, setPickupNickname] = useState("");
  const [saveDropoffAddress, setSaveDropoffAddress] = useState(false);
  const [dropoffNickname, setDropoffNickname] = useState("");

  const [pasteLocationInput, setPasteLocationInput] = useState("");

  const [selectedVehicle, setSelectedVehicle] = useState<VehicleProp | null>(
    null
  );
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [orderCost, setOrderCost] = useState(0);
  const [orderPaymentMethod, setOrderPaymentMethod] = useState<
    number | string | null
  >(null);
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);

  const mapRef = useRef<google.maps.Map | null>(null);
  const [mapIsMoving, setMapIsMoving] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedTip, setSelectedTip] = useState<number | "custom">(0);
  const [customTip, setCustomTip] = useState<string>("");

  const shouldGeocode = useRef(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [orderStatus, setOrderStatus] = useState<
    "loading" | "success" | "error"
  >("loading");
  const [orderNumber, setOrderNumber] = useState("");
  const [open, setOpen] = useState(false);
  const [responseMessage, setResponseMessage] = useState<string | null>(null);

  // --- Helpers ---
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

  const validatePhoneNumber = (
    phoneNumber: string
  ): { isValid: boolean; error?: string } => {
    const number = phoneNumber.trim();
    const validationGroups: PrefixGroup[] = [
      { prefixes: ["02", "03", "04", "06", "07", "08", "09"], length: 9 },
      {
        prefixes: ["050", "052", "054", "055", "056", "057", "058"],
        length: 10,
      },
    ];
    if (!number)
      return { isValid: false, error: "Please enter a recipient number." };
    if (!number.startsWith("0"))
      return { isValid: false, error: "Phone number must start with 0." };
    if (!/^\d+$/.test(number))
      return {
        isValid: false,
        error: "Phone number must contain only digits.",
      };
    for (const group of validationGroups) {
      if (group.prefixes.some((prefix) => number.startsWith(prefix))) {
        if (number.length !== group.length) {
          return {
            isValid: false,
            error: "Invalid phone number. Check the format and length.",
          };
        }
        return { isValid: true };
      }
    }
    return {
      isValid: false,
      error: "Invalid phone number. Please enter a valid phone number.",
    };
  };

  // Transform API address object to our AddressData type
  const transformAddress = (addr: any): AddressData => ({
    id: addr.id,
    nick_name: addr.nick_name,
    address: addr.address,
    building: addr.flat_no,
    directions: addr.direction || "",
    location: {
      lat: Number.parseFloat(addr.lat),
      lng: Number.parseFloat(addr.lng),
    },
    is_primary: addr.is_primary === 1,
  });

  // --- Fetch Addresses ---
  const fetchAddresses = async () => {
    setLoading(true);
    try {
      const response = await api.get("/order-manager/getPrimaryAddress");
      const data = response.data;
      setIsAccountLocked(data.isAccountLocked);
      setIsInvoiceUser(data.invoice_order);
      setInvoiceReminder(data.invoice_reminder);
      setMaxCodAmount(data.max_cod_amount);

      if (data.isAccountLocked || data.invoice_reminder) setOpen(true);

      if (data?.addresses && Array.isArray(data.addresses)) {
        const transformedAddresses = data.addresses.map(transformAddress);
        setPickupAddresses(transformedAddresses);
        const primaryAddress = transformedAddresses.find(
          (address: AddressData) => address.is_primary === true
        );
        if (primaryAddress) {
          setFormData((prev) => ({
            ...prev,
            pickup: {
              ...prev.pickup,
              address: primaryAddress.address,
              building: primaryAddress.building,
              directions: primaryAddress.directions,
              location: {
                lat: primaryAddress.location.lat,
                lng: primaryAddress.location.lng,
              },
            },
          }));
        } else {
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              async (position) => {
                const coordinates = {
                  lat: position.coords.latitude,
                  lng: position.coords.longitude,
                };
                try {
                  const geocoder = new google.maps.Geocoder();
                  const result = await geocoder.geocode({
                    location: coordinates,
                  });
                  const address =
                    result.results?.[0]?.formatted_address ||
                    "Unknown Location";
                  setFormData((prev) => ({
                    ...prev,
                    pickup: {
                      ...prev.pickup,
                      address: address,
                      location: coordinates,
                    },
                  }));
                } catch (error) {
                  console.error("Error getting location:", error);
                }
              },
              (error) => {
                console.error("Error getting current position:", error);
              }
            );
          }
        }
      } else {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              const coordinates = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
              };
              try {
                const geocoder = new google.maps.Geocoder();
                const result = await geocoder.geocode({
                  location: coordinates,
                });
                const address =
                  result.results?.[0]?.formatted_address || "Unknown Location";
                setFormData((prev) => ({
                  ...prev,
                  pickup: {
                    ...prev.pickup,
                    address: address,
                    location: coordinates,
                  },
                }));
              } catch (error) {
                console.error("Error getting location:", error);
              }
            },
            (error) => {
              console.error("Error getting current position:", error);
            }
          );
        }
      }
    } catch (error) {
      console.error("Error fetching addresses:", error);
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const coordinates = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            };
            try {
              const geocoder = new google.maps.Geocoder();
              const result = await geocoder.geocode({ location: coordinates });
              const address =
                result.results?.[0]?.formatted_address || "Unknown Location";
              setFormData((prev) => ({
                ...prev,
                pickup: {
                  ...prev.pickup,
                  address: address,
                  location: coordinates,
                },
              }));
            } catch (error) {
              console.error("Error getting location:", error);
            }
          },
          (error) => {
            console.error("Error getting current position:", error);
          }
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch addresses if no prefill data exists
    if (!localStorage.getItem("prefillOrderData")) {
      fetchAddresses();
    }
  }, []);

  useEffect(() => {
    if (isAccountLocked || invoiceReminder) setOpen(true);
  }, [isAccountLocked, invoiceReminder]);

  const googleMapAPIKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  const libraries: Libraries = ["places"];
  const { isLoaded } = useLoadScript({
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

  const debounceTimeout: NodeJS.Timeout | null = null;

  const handleLocationSelectNew = (location: Locations | null) => {
    if (!location) {
      return;
    }
    if (currentStep === 1) {
      setFormData((prev) => ({
        ...prev,
        pickup: {
          ...prev.pickup,
          address: location.description,
          location: location.coordinates,
        },
      }));
    } else {
      setFormData((prev) => {
        const updatedDropoffs = [...prev.dropoffs];
        updatedDropoffs[currentDropoffIndex] = {
          ...updatedDropoffs[currentDropoffIndex],
          address: location.description,
          location: location.coordinates,
        };
        return {
          ...prev,
          dropoffs: updatedDropoffs,
        };
      });
    }
  };

  const handleNext = async () => {
    if (currentStep === 1) {
      // Validate pickup address
      if (!formData.pickup.address.trim()) {
        toast({
          variant: "destructive",
          title: "Submission failed",
          description: "Please select a pickup address before proceeding.",
        });
        return;
      }
    } else if (currentStep === 2) {
      // Validate ALL dropoffs for required fields
      const MAX_COD_AMOUNT = 400;
      for (let i = 0; i < formData.dropoffs.length; i++) {
        const dropoff = formData.dropoffs[i];
        if (!dropoff.address.trim()) {
          toast({
            variant: "destructive",
            title: "Submission failed",
            description: `Please select a drop-off address for drop-off ${
              i + 1
            }.`,
          });
          return;
        }
        if (!dropoff.building.trim()) {
          toast({
            variant: "destructive",
            title: "Submission failed",
            description: `Please enter a valid building number for drop-off ${
              i + 1
            }.`,
          });
          return;
        }
        if (!dropoff.receiver_phone_number?.trim()) {
          toast({
            variant: "destructive",
            title: "Submission failed",
            description: `Please enter a valid receiver number for drop-off ${
              i + 1
            }.`,
          });
          return;
        }
        const validation = validatePhoneNumber(
          dropoff.receiver_phone_number || ""
        );
        if (!validation.isValid) {
          toast({
            variant: "destructive",
            title: "Submission failed",
            description: validation.error,
          });
          return;
        }
        if (dropoff.cod_amount != null) {
          if (dropoff.cod_amount <= 0 || dropoff.cod_amount > MAX_COD_AMOUNT) {
            toast({
              variant: "destructive",
              title: "Submission failed",
              description:
                dropoff.cod_amount <= 0
                  ? "The COD amount must be greater than 0, please enter a valid amount."
                  : `The COD amount cannot exceed AED ${MAX_COD_AMOUNT}, please enter a valid amount.`,
            });
            return;
          }
        }
      }
      setLoadingPackageScreen(true);
      try {
        await fetchVehicles();
      } catch (error) {}
    }
    if (currentStep === 3) {
      if (!selectedVehicle) {
        toast({
          variant: "destructive",
          title: "Submission failed",
          description: "Please select a package.",
        });
        return;
      }
      if (selectedDate && !selectedTime) {
        toast({
          variant: "destructive",
          title: "Submission failed",
          description: "Please select a time for the selected date.",
        });
        return;
      }
    }
    setPasteLocationInput("");
    if (currentStep < steps.length) {
      setClearInputTrigger(true);
      setTimeout(() => setClearInputTrigger(false), 0);
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
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  // Determine service_type_id based on drop-off count and COD amount
  const dropoffs = formData.dropoffs;
  let service_type_id: number;
  if (dropoffs.length > 1) {
    service_type_id = 5;
  } else {
    service_type_id =
      dropoffs[0].cod_amount != null && dropoffs[0].cod_amount > 0 ? 4 : 1;
  }

  const fetchVehicles = async () => {
    setLoadingVehicles(true);
    try {
      if (hexMapping) {
        // Compute pickup hex data
        const pickupLat = formData.pickup.location.lat;
        const pickupLng = formData.pickup.location.lng;
        const pickupIndex = h3.latLngToCell(pickupLat, pickupLng, RESOLUTION);
        const emirateDataPickup = hexMapping[pickupIndex];
        setPickupHexData({
          h3Index: pickupIndex,
          zone_id: emirateDataPickup ? emirateDataPickup.zone_id : null,
        });

        // Compute hex data for every dropoff
        const dropoffHexDataArray = formData.dropoffs.map((dropoff) => {
          const dropoffIndex = h3.latLngToCell(
            dropoff.location.lat,
            dropoff.location.lng,
            RESOLUTION
          );
          const emirateDataDropoff = hexMapping[dropoffIndex];
          return {
            h3Index: dropoffIndex,
            zone_id: emirateDataDropoff ? emirateDataDropoff.zone_id : null,
          };
        });
        setDropoffHexData(dropoffHexDataArray);

        // Use the first dropoff as a reference for the vehicle API call if needed
        const firstDropoff = formData.dropoffs[0];
        const firstDropoffIndex = h3.latLngToCell(
          firstDropoff.location.lat,
          firstDropoff.location.lng,
          RESOLUTION
        );
        const emirateDataFirstDropoff = hexMapping[firstDropoffIndex];

        const locations = [
          {
            latitude: pickupLat,
            longitude: pickupLng,
          },
          ...formData.dropoffs.map((dropoff) => ({
            latitude: dropoff.location.lat,
            longitude: dropoff.location.lng,
          })),
        ];

        const response = await api.post("/pickup-delivery/get-vehicles", {
          pickupIndex: {
            h3Index: pickupIndex,
            emirate: emirateDataPickup ? emirateDataPickup.name_en : null,
            zone_id: emirateDataPickup ? emirateDataPickup.zone_id : null,
          },
          dropoffIndex: {
            h3Index: firstDropoffIndex,
            emirate: emirateDataFirstDropoff
              ? emirateDataFirstDropoff.name_en
              : null,
            zone_id: emirateDataFirstDropoff
              ? emirateDataFirstDropoff.zone_id
              : null,
          },
          service_type_id: service_type_id,
          locations: locations,
        });
        const data = response.data;
        setLoadingVehicles(false);
        setLoadingPackageScreen(false);
        setVehicles(data.data.vehicles);
        setDistance(data.data.total_distance);
        setDuration(data.data.total_duration);
      }
    } catch (error) {
      console.error("Error fetching vehicles:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderCost = (fee: number, tip: number) => {
    setOrderCost(fee + tip);
  };

  const handleVehicleSelect = (vehicle: VehicleProp) => {
    if (vehicle.is_available) {
      const fee = Number.parseFloat(vehicle.order_cost) || 0;
      setSelectedVehicle(vehicle);
      setDeliveryFee(fee);
      const tip =
        selectedTip === "custom"
          ? Number.parseFloat(customTip) || 0
          : Number.parseFloat(selectedTip.toString()) || 0;
      updateOrderCost(fee, tip);
    }
  };

  const calculateTotal = () => {
    const tip =
      selectedTip === "custom"
        ? Number.parseFloat(customTip) || 0
        : selectedTip || 0;
    return (deliveryFee + tip).toFixed(2);
  };

  const handleTipSelect = (tip: number | "custom") => {
    setSelectedTip(tip);
    if (tip !== "custom") {
      setCustomTip("");
      updateOrderCost(deliveryFee, tip);
    }
  };

  const handleCustomTipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomTip(value);
    setSelectedTip("custom");
    updateOrderCost(deliveryFee, Number.parseFloat(value) || 0);
  };

  const amountInSubunits = Math.round(orderCost * 100);

  const handleDateTimeSelect = (date: Date | null, time: string | null) => {
    setSelectedDate(date);
    setSelectedTime(time);
  };

  const handlePayWithBalance = () => {
    setOrderPaymentMethod(4);
  };

  const handlePayWithCreditCard = () => {
    setOrderPaymentMethod(3);
  };

  const handleSubmit = async () => {
    try {
      setIsModalOpen(true);
      setOrderStatus("loading");
      if (!isInvoiceUser) {
        if (orderPaymentMethod === 3) {
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
          const payload = prepareOrderPayload(paymentMethod);
          await submitOrder(payload);
        } else {
          const payload = prepareOrderPayload(null);
          await submitOrder(payload);
        }
      } else {
        const payload = prepareOrderPayload(null);
        await submitOrder(payload);
      }
    } catch (error: any) {
      setResponseMessage(
        error.response?.data?.message ||
          "An unexpected error occurred. Please try again."
      );
      setOrderStatus("error");
      setTimeout(() => setIsModalOpen(false), 3000);
    }
  };

  const prepareOrderPayload = (currentPaymentMethod: any) => {
    const tasks = [
      {
        task_type_id: 1,
        address: formData.pickup.address,
        latitude: formData.pickup.location.lat,
        longitude: formData.pickup.location.lng,
        flat_no: formData.pickup.building,
        direction: formData.pickup.directions || "",
        receiver_phone_number: null,
        cod_amount: null,
        save_address: savePickupAddress,
        saved_address_nickname: savePickupAddress ? pickupNickname : null,
        h3_index: pickupHexData ? pickupHexData.h3Index : null,
        zone_id: pickupHexData ? pickupHexData.zone_id : null,
      },
      ...formData.dropoffs.map((dropoff, index) => ({
        task_type_id: index + 2, // drop-off tasks will be 2, 3, etc.
        address: dropoff.address,
        latitude: dropoff.location.lat,
        longitude: dropoff.location.lng,
        flat_no: dropoff.building,
        direction: dropoff.directions || "",
        receiver_phone_number: dropoff.receiver_phone_number,
        cod_amount: dropoff.cod_amount || null,
        order_reference_number: dropoff.order_reference_number || null, // Fixed line
        save_address:
          index === currentDropoffIndex ? saveDropoffAddress : false,
        saved_address_nickname:
          index === currentDropoffIndex && saveDropoffAddress
            ? dropoffNickname
            : null,
        h3_index: dropoffHexData[index] ? dropoffHexData[index].h3Index : null,
        zone_id: dropoffHexData[index] ? dropoffHexData[index].zone_id : null,
      })),
    ];

    return {
      source: "order_manager",
      business_customer: userId,
      service_type: service_type_id,
      payment_type: isInvoiceUser ? 2 : 1,
      vehicle_type: selectedVehicle?.id || null,
      isVendorOrder: false,
      invoice_order: isInvoiceUser,
      schedule_time:
        selectedDate && selectedTime
          ? `${format(selectedDate, "yyyy-MM-dd")} ${selectedTime}`
          : "",
      tip:
        selectedTip === "custom"
          ? Number.parseFloat(customTip) || 0
          : selectedTip,
      distance: distance || 0,
      duration: duration || 0,
      payment_method: orderPaymentMethod,
      paymentMethod:
        orderPaymentMethod === 5 ? paymentMethod : currentPaymentMethod,
      tasks: tasks,
    };
  };

  const submitOrder = async (payload: Record<string, any>) => {
    const response = await api.post("/order-manager/processOrder", payload);
    if (response.status === 200) {
      const orderNumber = response.data.data;
      setOrderNumber(orderNumber);
      setResponseMessage(response.data.message || "Order Placed Successfully!");
      setOrderStatus("success");
      setTimeout(() => {
        setIsModalOpen(false);
        router.push(`/order-tracking/${orderNumber}`);
      }, 2000);
    } else {
      setIsModalOpen(false);
      setResponseMessage("Failed to place the order. Please try again.");
      setOrderStatus("error");
    }
  };

  const handlePasteLocation: React.ClipboardEventHandler<
    HTMLInputElement
  > = async (e) => {
    const pastedData = e.clipboardData.getData("Text");
   
    const regex = /@([-0-9.]+),([-0-9.]+)/;
    const plusCodeRegex = /^[A-Z0-9]{4}\+[A-Z0-9]{2}(?: [\w\s]+)?$/;
    const shortLinkRegex = /^https:\/\/maps\.app\.goo\.gl\/.+$/;
    const match = pastedData.match(regex);
    const isPlusCode = plusCodeRegex.test(pastedData);
    const isShortLink = shortLinkRegex.test(pastedData);
    if (match) {
      const lat = Number.parseFloat(match[1]);
      const lng = Number.parseFloat(match[2]);
      await resolveLocationFromCoordinates(
        { lat, lng },
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
        const lat = Number.parseFloat(match[1]);
        const lng = Number.parseFloat(match[2]);
        await resolveLocationFromCoordinates({ lat, lng }, type);
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
      const geocoder = new google.maps.Geocoder();
      const result = await geocoder.geocode({ location: coordinates });
      if (result.results?.[0]) {
        if (type === "pickup") {
          setFormData((prev) => ({
            ...prev,
            pickup: {
              ...prev.pickup,
              address: result.results[0].formatted_address,
              location: coordinates,
            },
          }));
        } else {
          setFormData((prev) => {
            const updatedDropoffs = [...prev.dropoffs];
            updatedDropoffs[currentDropoffIndex] = {
              ...updatedDropoffs[currentDropoffIndex],
              address: result.results[0].formatted_address,
              location: coordinates,
            };
            return {
              ...prev,
              dropoffs: updatedDropoffs,
            };
          });
        }
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
      const geocoder = new google.maps.Geocoder();
      const result = await geocoder.geocode({ address: plusCode });
      if (result.results?.[0]) {
        const location = result.results[0].geometry.location;
        const coordinates = { lat: location.lat(), lng: location.lng() };
        if (type === "pickup") {
          setFormData((prev) => ({
            ...prev,
            pickup: {
              ...prev.pickup,
              address: result.results[0].formatted_address,
              location: coordinates,
            },
          }));
        } else {
          setFormData((prev) => {
            const updatedDropoffs = [...prev.dropoffs];
            updatedDropoffs[currentDropoffIndex] = {
              ...updatedDropoffs[currentDropoffIndex],
              address: result.results[0].formatted_address,
              location: coordinates,
            };
            return {
              ...prev,
              dropoffs: updatedDropoffs,
            };
          });
        }
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

  const handleMapIdle = async (type: "pickup" | "dropoff") => {
    if (!mapIsMoving) return;
    if (mapRef.current) {
      const center = mapRef.current.getCenter();
      if (center) {
        const newLocation = { lat: center.lat(), lng: center.lng() };
        if (type === "pickup") {
          setFormData((prev) => ({
            ...prev,
            pickup: { ...prev.pickup, location: newLocation },
          }));
        } else {
          setFormData((prev) => {
            const updatedDropoffs = [...prev.dropoffs];
            updatedDropoffs[currentDropoffIndex] = {
              ...updatedDropoffs[currentDropoffIndex],
              location: newLocation,
            };
            return { ...prev, dropoffs: updatedDropoffs };
          });
        }
        try {
          const geocoder = new google.maps.Geocoder();
          const result = await geocoder.geocode({ location: newLocation });
          const address =
            result.results?.[0]?.formatted_address || "Unknown Location";
          
          if (type === "pickup") {
            setFormData((prev) => ({
              ...prev,
              pickup: { ...prev.pickup, address },
            }));
          } else {
            setFormData((prev) => {
              const updatedDropoffs = [...prev.dropoffs];
              updatedDropoffs[currentDropoffIndex] = {
                ...updatedDropoffs[currentDropoffIndex],
                address,
              };
              return { ...prev, dropoffs: updatedDropoffs };
            });
          }
        } catch (error) {
          console.error("[handleMapIdle] Geocoding error:", error);
        }
      } else {
        console.warn("Failed to get map center");
      }
    }
    setMapIsMoving(false);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
      case 2: {
        const type = currentStep === 1 ? "pickup" : "dropoff";
        const currentDropoff = formData.dropoffs[currentDropoffIndex];
        const onLoad = (mapInstance: google.maps.Map) => {
          mapRef.current = mapInstance;
        };
        return (
          <div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                {currentStep === 2 && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">
                        Drop-off Addresses ({formData.dropoffs.length})
                      </h3>
                      {formData.dropoffs.length < 2 && (
                        <Button
                          variant="outline"
                          onClick={addDropoffAddress}
                          className="flex items-center gap-1"
                        >
                          <span>Add Drop-off</span>
                        </Button>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {formData.dropoffs.map((_, index) => (
                        <Button
                          key={index}
                          variant={
                            currentDropoffIndex === index
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                          onClick={() => setCurrentDropoffIndex(index)}
                          className="flex items-center gap-1"
                        >
                          <span>Address {index + 1}</span>
                          {formData.dropoffs.length > 1 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeDropoffAddress(index);
                              }}
                              className="ml-1 text-red-500 hover:text-red-700"
                            >
                              ×
                            </button>
                          )}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex items-end justify-between gap-2">
                  <div className="space-y-2 w-5/6">
                    <Label htmlFor={`${type}-address`}>Address</Label>
                    <Input
                      className="h-11"
                      readOnly
                      id={`${type}-address`}
                      placeholder="Select location"
                      value={
                        type === "pickup"
                          ? formData.pickup.address
                          : currentDropoff.address
                      }
                    />
                  </div>
                  <div>
                    <Popover
                      open={
                        type === "pickup"
                          ? savedAddressOpenPickup
                          : savedAddressOpenDropoff
                      }
                      onOpenChange={
                        type === "pickup"
                          ? setSavedAddressOpenPickup
                          : setSavedAddressOpenDropoff
                      }
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="h-11"
                          role="combobox"
                          aria-expanded={
                            type === "pickup"
                              ? savedAddressOpenPickup
                              : savedAddressOpenDropoff
                          }
                        >
                          {type === "pickup"
                            ? selectedPickupSavedAddress
                              ? selectedPickupSavedAddress.nick_name
                              : "Select Saved Address"
                            : currentDropoff.selectedSavedAddress
                            ? currentDropoff.selectedSavedAddress.nick_name
                            : "Select Saved Address"}
                          <ChevronsUpDown className="opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[200px] p-0">
                        <Command>
                          <CommandInput
                            placeholder="Search saved address..."
                            className="h-9"
                            value={
                              type === "pickup"
                                ? savedAddressQueryPickup
                                : savedAddressQueryDropoff
                            }
                            onValueChange={(value) =>
                              type === "pickup"
                                ? setSavedAddressQueryPickup(value)
                                : setSavedAddressQueryDropoff(value)
                            }
                          />
                          <CommandList>
                            {((type === "pickup"
                              ? savedAddressQueryPickup
                              : savedAddressQueryDropoff) === ""
                              ? pickupAddresses
                              : pickupAddresses.filter((addr) => {
                                  const nickname = addr.nick_name
                                    ? addr.nick_name.toLowerCase()
                                    : "";
                                  const query = (
                                    type === "pickup"
                                      ? savedAddressQueryPickup
                                      : savedAddressQueryDropoff
                                  ).toLowerCase();
                                  return nickname.includes(query);
                                })
                            ).length === 0 ? (
                              <CommandEmpty>
                                No saved addresses found.
                              </CommandEmpty>
                            ) : (
                              <CommandGroup>
                                {(type === "pickup"
                                  ? savedAddressQueryPickup
                                    ? pickupAddresses.filter(
                                        (addr: AddressData) =>
                                          (addr.nick_name ?? "")
                                            .toLowerCase()
                                            .includes(
                                              savedAddressQueryPickup.toLowerCase()
                                            )
                                      )
                                    : pickupAddresses
                                  : savedAddressQueryDropoff
                                  ? pickupAddresses.filter(
                                      (addr: AddressData) =>
                                        (addr.nick_name ?? "")
                                          .toLowerCase()
                                          .includes(
                                            savedAddressQueryDropoff.toLowerCase()
                                          )
                                    )
                                  : pickupAddresses
                                ).map((addr: AddressData) => (
                                  <CommandItem
                                    key={addr.id}
                                    onSelect={() => {
                                      if (type === "pickup") {
                                        setFormData((prev) => ({
                                          ...prev,
                                          pickup: {
                                            ...prev.pickup,
                                            address: addr.address,
                                            building: addr.building,
                                            directions: addr.directions,
                                            location: addr.location,
                                          },
                                        }));
                                        setSelectedPickupSavedAddress(addr);
                                        setSavedAddressOpenPickup(false);
                                        setSavedAddressQueryPickup("");
                                      } else {
                                        setFormData((prev) => {
                                          const updatedDropoffs = [
                                            ...prev.dropoffs,
                                          ];
                                          updatedDropoffs[currentDropoffIndex] =
                                            {
                                              ...updatedDropoffs[
                                                currentDropoffIndex
                                              ],
                                              address: addr.address,
                                              building: addr.building,
                                              directions: addr.directions,
                                              location: addr.location,
                                              selectedSavedAddress: addr,
                                            };
                                          return {
                                            ...prev,
                                            dropoffs: updatedDropoffs,
                                          };
                                        });
                                        setSavedAddressOpenDropoff(false);
                                        setSavedAddressQueryDropoff("");
                                      }
                                    }}
                                  >
                                    {addr.nick_name}
                                    <Check
                                      className={cn(
                                        "ml-auto",
                                        type === "pickup"
                                          ? selectedPickupSavedAddress?.id ===
                                            addr.id
                                            ? "opacity-100"
                                            : "opacity-0"
                                          : currentDropoff.selectedSavedAddress
                                              ?.id === addr.id
                                          ? "opacity-100"
                                          : "opacity-0"
                                      )}
                                    />
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            )}
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <div className="space-y-2 hidden">
                  <Label htmlFor={`${type}-latitude`}>Latitude</Label>
                  <Input
                    readOnly
                    id={`${type}-latitude`}
                    placeholder="Latitude"
                    value={
                      type === "pickup"
                        ? formData.pickup.location.lat.toString()
                        : currentDropoff.location.lat.toString()
                    }
                  />
                </div>
                <div className="space-y-2 hidden">
                  <Label htmlFor={`${type}-longitude`}>Longitude</Label>
                  <Input
                    readOnly
                    id={`${type}-longitude`}
                    placeholder="Longitude"
                    value={
                      type === "pickup"
                        ? formData.pickup.location.lng.toString()
                        : currentDropoff.location.lng.toString()
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${type}-building`}>Flat / Building</Label>
                  <Input
                    className="h-11"
                    id={`${type}-building`}
                    placeholder="Enter building details"
                    value={
                      type === "pickup"
                        ? formData.pickup.building
                        : currentDropoff.building
                    }
                    onChange={(e) =>
                      setFormData((prev) => {
                        if (type === "pickup") {
                          return {
                            ...prev,
                            pickup: {
                              ...prev.pickup,
                              building: e.target.value,
                            },
                          };
                        } else {
                          const updatedDropoffs = [...prev.dropoffs];
                          updatedDropoffs[currentDropoffIndex] = {
                            ...updatedDropoffs[currentDropoffIndex],
                            building: e.target.value,
                          };
                          return { ...prev, dropoffs: updatedDropoffs };
                        }
                      })
                    }
                  />
                </div>

                {type === "dropoff" && (
                  <div className="flex gap-2 mt-4">
                    <div className="space-y-2 w-1/2">
                      <Label htmlFor={`${type}-receiver_phone_number`}>
                        Receiver Number
                      </Label>
                      <Input
                        className="h-11"
                        id={`${type}-receiver_phone_number`}
                        placeholder="Required format 05XXXXXXXX"
                        value={currentDropoff.receiver_phone_number || ""}
                        onChange={(e) =>
                          setFormData((prev) => {
                            const updatedDropoffs = [...prev.dropoffs];
                            updatedDropoffs[currentDropoffIndex] = {
                              ...updatedDropoffs[currentDropoffIndex],
                              receiver_phone_number: e.target.value,
                            };
                            return { ...prev, dropoffs: updatedDropoffs };
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2 w-1/2">
                      <Label htmlFor={`${type}-cod_amount`}>
                        COD Amount
                        <span className="italic text-gray-500">(optional)</span>
                      </Label>
                      <Input
                        className="h-11"
                        type="number"
                        min={1}
                        id={`${type}-cod_amount`}
                        placeholder="Enter cod amount"
                        value={currentDropoff.cod_amount?.toString() || ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          setFormData((prev) => {
                            const updatedDropoffs = [...prev.dropoffs];
                            updatedDropoffs[currentDropoffIndex] = {
                              ...updatedDropoffs[currentDropoffIndex],
                              cod_amount:
                                value === "" ? null : Number.parseFloat(value),
                            };
                            return { ...prev, dropoffs: updatedDropoffs };
                          });
                        }}
                      />
                    </div>
                    <div className="space-y-2 w-1/2">
                      <Label htmlFor={`${type}-order_reference_number`}>
                        Order Reference Number
                        <span className="italic text-gray-500">(optional)</span>
                      </Label>
                      <Input
                        className="h-11"
                        min={1}
                        id={`${type}-order_reference_number`}
                        placeholder="Enter reference number"
                        value={
                          currentDropoff.order_reference_number?.toString() ||
                          ""
                        }
                        onChange={(e) =>
                          setFormData((prev) => {
                            const updatedDropoffs = [...prev.dropoffs];
                            updatedDropoffs[currentDropoffIndex] = {
                              ...updatedDropoffs[currentDropoffIndex],
                              order_reference_number: e.target.value,
                            };
                            return { ...prev, dropoffs: updatedDropoffs };
                          })
                        }
                      />
                    </div>
                  </div>
                )}
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
                        Click this option to automatically update your location
                        to your current position
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
                                currentStep === 1 ? "pickup" : "dropoff"
                              );
                              setPasteLocationInput("");
                              setClearInputTrigger(true);
                              setTimeout(() => setClearInputTrigger(false), 0);
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
                        Copy the location link from Google Maps and paste it
                        here to set your location manually.
                      </span>
                    </Label>
                    <Input
                      type="text"
                      placeholder="Enter or paste Google Maps link, Plus Code, or short link"
                      className="h-11"
                      value={pasteLocationInput}
                      onChange={(e) => setPasteLocationInput(e.target.value)}
                      onPaste={handlePasteLocation}
                    />
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2 w-1/2 mt-5">
                    <Checkbox
                      id={`save-${type}`}
                      checked={
                        type === "pickup"
                          ? savePickupAddress
                          : saveDropoffAddress
                      }
                      onCheckedChange={(checked) => {
                        if (type === "pickup") {
                          setSavePickupAddress(checked === true);
                          if (!checked) setPickupNickname("");
                        } else {
                          setSaveDropoffAddress(checked === true);
                          if (!checked) setDropoffNickname("");
                        }
                      }}
                    />
                    <label
                      htmlFor={`save-${type}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Save address for future use
                    </label>
                  </div>
                  {(type === "pickup"
                    ? savePickupAddress
                    : saveDropoffAddress) && (
                    <div className="w-1/2">
                      <Input
                        value={
                          type === "pickup" ? pickupNickname : dropoffNickname
                        }
                        onChange={(e) =>
                          type === "pickup"
                            ? setPickupNickname(e.target.value)
                            : setDropoffNickname(e.target.value)
                        }
                        placeholder="Enter a nickname"
                      />
                    </div>
                  )}
                </div>
              </div>
              <div className="h-[550px] rounded-lg overflow-hidden relative">
                {isLoaded ? (
                  <GoogleMap
                    zoom={15}
                    center={
                      type === "pickup"
                        ? formData.pickup.location
                        : currentDropoff.location
                    }
                    mapContainerClassName="w-full h-full"
                    onLoad={(mapInstance) => {
                      mapRef.current = mapInstance;
                    }}
                    onDragStart={() => setMapIsMoving(true)}
                    onIdle={() => handleMapIdle(type)}
                  ></GoogleMap>
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
                <div
                  className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-full z-10"
                  style={{ pointerEvents: "none" }}
                >
                  <img src="/marker-icon.png" alt="Marker" />
                </div>
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
                      <div className="flex justify-center items-center h-20">
                        <Loader isVisible={true} />
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 lg:justify-between">
                        {vehicles.map((vehicle) => (
                          <button
                            key={vehicle.id}
                            onClick={() => handleVehicleSelect(vehicle)}
                            className={`flex items-center justify-center gap-5 py-4 border border-gray-100 text-left rounded-lg transition-colors ${
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
                                "/default-vehicle-icon.png" ||
                                "/placeholder.svg"
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
                        Selected Tip:{" "}
                        {selectedTip === "custom"
                          ? customTip
                            ? `${customTip} AED`
                            : "Custom (not entered)"
                          : `${selectedTip || 0} AED`}
                      </p>
                      {selectedTip !== 0 && (
                        <button
                          onClick={() => {
                            setSelectedTip(0);
                            setCustomTip("");
                            updateOrderCost(deliveryFee, 0);
                          }}
                          className="text-xs text-red-500 border border-red-500 rounded-lg px-2 py-1 hover:bg-red-100"
                        >
                          Remove Tip
                        </button>
                      )}
                    </div>
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
                          const value = e.target.value;
                          setFormData((prev) => ({
                            ...prev,
                            package: {
                              ...prev.package,
                              cod_amount:
                                value === "" ? null : Number.parseFloat(value),
                            },
                          }));
                        }}
                      />
                    </div>
                  )}
                </div>
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
              <div>
                {isLoaded &&
                formData.pickup.location.lat &&
                formData.dropoffs.length > 0 ? (
                  <RouteMap
                    isLoaded={isLoaded}
                    pickup={formData.pickup.location}
                    dropoff={formData.dropoffs.map((d) => d.location)}
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
              {savedCards.length > 0 && (
                <>
                  {savedCards.map((card) => (
                    <button
                      key={card.id}
                      onClick={() => {
                        setPaymentMethod(card.payment_method_id);
                        setOrderPaymentMethod(5);
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
              <button
                onClick={() => {
                  setOrderPaymentMethod(4);
                  setPaymentMethod(null);
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
              <button
                onClick={() => {
                  setOrderPaymentMethod(3);
                  setPaymentMethod(null);
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
