"use client";

import React, { useRef, useState, useEffect } from "react";
import { Input } from "../ui/input";
import { Switch } from "../ui/switch";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import Autocomplete from "../googlemap/AutoComplete";
import { GoogleMap, Libraries, useLoadScript } from "@react-google-maps/api";
import { IconCurrentLocation } from "@tabler/icons-react";

interface Coordinates {
  lat: number;
  lng: number;
}

// Updated interface to include nick_name
interface AddressFormData {
  address: string;
  flatNo: string;
  street?: string;
  direction?: string;
  isDefault: boolean;
  coordinates: Coordinates;
  nick_name: string;
}

interface AddressFormProps {
  initialAddress: string;
  initialFlatNo: string;
  initialStreet?: string;
  initialDirection?: string;
  initialCoordinates?: Coordinates;
  initialNickName: string|null;
  isDefault: boolean;
  onSubmit: (address: AddressFormData) => Promise<void>;
  isSubmitting: boolean;
}

const DEFAULT_COORDINATES: Coordinates = {
  lat: 25.2048,
  lng: 55.2708,
}; // Dubai coordinates

export default function AddressForm({
  initialAddress,
  initialFlatNo,
  initialDirection,
  initialStreet,
  initialCoordinates,
  initialNickName = "",
  isDefault,
  onSubmit,
  isSubmitting,
}: AddressFormProps) {
  const [formData, setFormData] = useState<AddressFormData>({
    address: initialAddress,
    flatNo: initialFlatNo,
    street: initialStreet || "",
    direction: initialDirection || "",
    isDefault: isDefault,
    coordinates: initialCoordinates || DEFAULT_COORDINATES,
    nick_name: initialNickName || "",
  });

  // State to handle validation errors for specific fields
  const [validationErrors, setValidationErrors] = useState<{
    nick_name?: string;
    flatNo?: string;
  }>({});

  // Sync form state when editing (if props change)
  useEffect(() => {
    setFormData({
      address: initialAddress,
      flatNo: initialFlatNo,
      street: initialStreet || "",
      direction: initialDirection || "",
      isDefault: isDefault,
      coordinates: initialCoordinates || DEFAULT_COORDINATES,
      nick_name: initialNickName || "",
    });
  }, [
    initialAddress,
    initialFlatNo,
    initialStreet,
    initialDirection,
    isDefault,
    initialCoordinates,
    initialNickName,
  ]);

  const [mapIsMoving, setMapIsMoving] = useState(false);
  const mapRef = useRef<google.maps.Map | null>(null);
  const previousCenter = useRef<Coordinates | null>(null);
  const shouldGeocode = useRef(true);
  const [clearInputTrigger, setClearInputTrigger] = useState(false);
  const libraries: Libraries = ["places"];
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  const onMapLoad = (map: google.maps.Map) => {
    mapRef.current = map;
  };

  const handleMapIdle = async () => {
    if (!mapRef.current || !isLoaded || !shouldGeocode.current) return;

    const center = mapRef.current.getCenter();
    if (!center) return;

    const newCoordinates = {
      lat: center.lat(),
      lng: center.lng(),
    };

    if (
      previousCenter.current &&
      previousCenter.current.lat === newCoordinates.lat &&
      previousCenter.current.lng === newCoordinates.lng
    ) {
      console.log("[handleMapIdle] Center unchanged. Skipping geocode.");
      return;
    }

    previousCenter.current = newCoordinates;

    try {
      const geocoder = new window.google.maps.Geocoder();
      const result = await geocoder.geocode({ location: newCoordinates });

      if (result.results?.[0]) {
        setFormData((prev) => ({
          ...prev,
          address: result.results[0].formatted_address,
          coordinates: newCoordinates,
        }));
      }
    } catch (error) {
      console.error("[handleMapIdle] Geocoding error:", error);
    } finally {
      setMapIsMoving(false);
    }
  };

  const handleLocationSelect = (
    location: { description: string; coordinates: Coordinates } | null
  ) => {
    if (!location) return;

    setFormData((prev) => ({
      ...prev,
      address: location.description,
      coordinates: location.coordinates,
    }));

    if (mapRef.current) {
      shouldGeocode.current = false;
      mapRef.current.panTo(location.coordinates);
    }
  };

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
      resolveLocationFromCoordinates(coordinates);
    } else if (isPlusCode) {
      resolveLocationFromPlusCode(pastedData);
    } else if (isShortLink) {
      resolveShortLink(pastedData);
    } else {
      console.warn("[handlePasteLocation] Invalid input format.");
    }
  };

  const resolveShortLink = async (shortLink: string) => {
    try {
      const response = await fetch(shortLink, {
        method: "HEAD",
        redirect: "follow",
      });
      const expandedUrl = response.url;
      console.log("[resolveShortLink] Expanded URL:", expandedUrl);

      const regex = /@([-0-9.]+),([-0-9.]+)/;
      const plusCodeRegex = /^[A-Z0-9]{4}\+[A-Z0-9]{2}(?: [\w\s]+)?$/;

      const match = expandedUrl.match(regex);
      const isPlusCode = plusCodeRegex.test(expandedUrl);

      if (match) {
        const lat = parseFloat(match[1]);
        const lng = parseFloat(match[2]);
        const coordinates = { lat, lng };
        resolveLocationFromCoordinates(coordinates);
      } else if (isPlusCode) {
        resolveLocationFromPlusCode(expandedUrl);
      } else {
        console.warn(
          "[resolveShortLink] Expanded URL does not contain valid location data."
        );
      }
    } catch (error) {
      console.error("[resolveShortLink] Error expanding short link:", error);
    }
  };

  const resolveLocationFromCoordinates = async (coordinates: Coordinates) => {
    try {
      const geocoder = new window.google.maps.Geocoder();
      const result = await geocoder.geocode({ location: coordinates });

      if (result.results?.[0]) {
        setFormData((prev) => ({
          ...prev,
          address: result.results[0].formatted_address,
          coordinates,
        }));

        if (mapRef.current) {
          mapRef.current.panTo(coordinates);
        }
      }
    } catch (error) {
      console.error("[resolveLocationFromCoordinates] Geocoding error:", error);
    }
  };

  const resolveLocationFromPlusCode = async (plusCode: string) => {
    try {
      const geocoder = new window.google.maps.Geocoder();
      const result = await geocoder.geocode({ address: plusCode });

      if (result.results?.[0]) {
        const location = result.results[0].geometry.location;
        const coordinates = { lat: location.lat(), lng: location.lng() };
        console.log(coordinates);
        setFormData((prev) => ({
          ...prev,
          address: result.results[0].formatted_address,
          coordinates,
        }));

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

  const handleSubmit = async () => {
    // Reset validation errors
    setValidationErrors({});
    // Perform client-side validation
    const errors: { nick_name?: string; flatNo?: string } = {};
    if (!formData.nick_name.trim()) {
      errors.nick_name = "Nick name is required";
    }
    if (!formData.flatNo.trim()) {
      errors.flatNo = "Flat no is required";
    }
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    try {
      // Await the onSubmit callback (which should throw if backend returns an error)
      await onSubmit(formData);
    } catch (err: any) {
      // Example: backend error response structure:
      // { "message": "Failed to update address", "error": "The nick name field is required." }
      const backendError = err.response?.data?.error;
      if (backendError) {
        if (backendError.toLowerCase().includes("nick name")) {
          setValidationErrors((prev) => ({ ...prev, nick_name: backendError }));
        }
        if (backendError.toLowerCase().includes("flat no")) {
          setValidationErrors((prev) => ({ ...prev, flatNo: backendError }));
        }
      }
    }
  };

  return (
    <div className="flex gap-4 h-full">
      {/* Form Section */}
      <div className="w-1/2 flex flex-col">
        <Card className="flex-1">
          <CardContent className="p-6 h-full flex flex-col">
            {/* Address Section */}
            <div className="flex items-center justify-between mb-4">
              <Input
                type="text"
                value={formData.address}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, address: e.target.value }))
                }
                placeholder="Enter Address"
                className="flex-1 h-11"
              />
            </div>

            {/* Nick Name Input */}
            <div className="flex items-center justify-between mb-4">
              <Input
                type="text"
                value={formData.nick_name}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    nick_name: e.target.value,
                  }))
                }
                placeholder="Enter Nick Name"
                className="flex-1 h-11"
              />
              {validationErrors.nick_name && (
                <p className="text-red-500 text-sm mt-1">
                  {validationErrors.nick_name}
                </p>
              )}
            </div>

            {/* Flat/Street Fields */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="flex flex-col">
                <Input
                  type="text"
                  value={formData.flatNo}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, flatNo: e.target.value }))
                  }
                  placeholder="House / Apartment / Flat No."
                  className="h-11"
                />
                {validationErrors.flatNo && (
                  <p className="text-red-500 text-sm mt-1">
                    {validationErrors.flatNo}
                  </p>
                )}
              </div>
              <Input
                type="text"
                value={formData.street}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, street: e.target.value }))
                }
                placeholder="Street / Type Name (optional)"
                className="h-11"
              />
            </div>

            {/* Additional Instructions */}
            <div className="mb-4">
              <Textarea
                value={formData.direction}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    direction: e.target.value,
                  }))
                }
                placeholder="Additional directions"
              />
            </div>

            {/* Default Address Section */}
            <div className="flex items-center space-x-2 mb-4">
              <Switch
                id="default-address"
                checked={formData.isDefault}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, isDefault: checked }))
                }
              />
              <Label htmlFor="default-address">Default Address</Label>
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
                          shouldGeocode.current = true;
                          mapRef.current.panTo(coordinates);
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
                    Copy the location link from Google Maps and paste it here to
                    set your location manually.
                  </span>
                </Label>
                <Input
                  type="text"
                  placeholder="Enter or paste Google Maps link, Plus Code, or short link"
                  className="h-11"
                  onPaste={handlePasteLocation}
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="text-right mt-4">
              <Button
                className="bg-black text-white"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Updating..." : "Update"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Map Section */}
      <div className="w-1/2 flex flex-col">
        <Card className="flex-1">
          <CardContent className="p-6 h-full flex flex-col">
            <div className="h-full rounded-lg overflow-hidden relative">
              {isLoaded ? (
                <GoogleMap
                  zoom={15}
                  center={formData.coordinates}
                  mapContainerClassName="w-full h-full"
                  onLoad={onMapLoad}
                  onDragStart={() => {
                    shouldGeocode.current = true;
                    setMapIsMoving(true);
                  }}
                  onIdle={handleMapIdle}
                ></GoogleMap>
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  Loading map...
                </div>
              )}

              <div className="absolute top-14 px-10 w-full z-50">
                <Autocomplete
                  isLoaded={isLoaded}
                  onLocationSelect={handleLocationSelect}
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
