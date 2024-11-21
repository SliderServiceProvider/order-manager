import { Dispatch, SetStateAction } from "react";

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
  package: PackageData; // Include this field
};


// Function to fetch address from latitude and longitude
const fetchAddressFromCoordinates = async (
  latitude: number,
  longitude: number
): Promise<string | null> => {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&location_type=ROOFTOP`
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

// Reusable function to get current location and update form data
export const getCurrentLocation = async (
  setFormData: Dispatch<SetStateAction<FormData>>,
  type: "pickup" | "dropoff"
) => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        // Fetch address from coordinates
        const address = await fetchAddressFromCoordinates(latitude, longitude);

        // Update form data
        setFormData((prev: FormData) => ({
          ...prev,
          [type]: {
            ...prev[type],
            address: address || "Unknown Location",
            location: { lat: latitude, lng: longitude },
          },
        }));
      },
      (error) => {
        console.error("Error fetching geolocation:", error);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  } else {
    console.error("Geolocation not supported by this browser.");
  }
};
