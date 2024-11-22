"use client";
import { useEffect, useState } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

interface Coordinates {
  lat: number;
  lng: number;
}

interface Location {
  placeId: string;
  description: string;
  coordinates: Coordinates;
}

interface CustomPlaceAutocompleteResult {
  description: string;
  place_id: string;
}

interface AutocompleteProps {
  onLocationSelect: (location: Location | null) => void;
  isLoaded: boolean;
}

export default function Autocomplete({
  onLocationSelect,
  isLoaded,
}: AutocompleteProps) {
  const [predictions, setPredictions] = useState<
    CustomPlaceAutocompleteResult[]
  >([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSelected, setIsSelected] = useState(false);

  const fetchPredictions = async (input: string) => {
    if (!input.trim() || !isLoaded || !window.google?.maps?.places) return [];

    try {
      const service = new window.google.maps.places.AutocompleteService();
      const request = {
        input,
        componentRestrictions: { country: "AE" },
      };

      const predictions = await new Promise<
        google.maps.places.AutocompletePrediction[]
      >((resolve, reject) => {
        service.getPlacePredictions(request, (results, status) => {
          if (
            status === window.google.maps.places.PlacesServiceStatus.OK &&
            results
          ) {
            resolve(results);
          } else {
            reject(new Error(status));
          }
        });
      });

      return predictions.map((prediction) => ({
        description: prediction.description,
        place_id: prediction.place_id,
      }));
    } catch (error) {
      console.error("Error fetching predictions:", error);
      return [];
    }
  };

  const handleSelect = async (placeId: string, description: string) => {
    if (!isLoaded || !window.google?.maps) return;

    setIsSelected(true);
    setInput(description);
    setPredictions([]);

    try {
      const geocoder = new window.google.maps.Geocoder();
      const result = await new Promise<google.maps.GeocoderResult[]>(
        (resolve, reject) => {
          geocoder.geocode({ placeId }, (results, status) => {
            if (status === window.google.maps.GeocoderStatus.OK && results) {
              resolve(results);
            } else {
              reject(new Error(status));
            }
          });
        }
      );

      if (result.length > 0) {
        const location = result[0].geometry.location;
        const locationData: Location = {
          placeId,
          description,
          coordinates: {
            lat: location.lat(),
            lng: location.lng(),
          },
        };
        onLocationSelect(locationData);
      } else {
        onLocationSelect(null);
      }
    } catch (error) {
      console.error("Error fetching location details:", error);
      onLocationSelect(null);
    }
  };

  useEffect(() => {
    const getPredictions = async () => {
      if (!input.trim() || !isLoaded || isSelected) {
        setPredictions([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const results = await fetchPredictions(input);
        setPredictions(results);
      } catch (error) {
        console.error("Error fetching predictions:", error);
        setPredictions([]);
      } finally {
        setIsLoading(false);
      }
    };

    const timer = setTimeout(getPredictions, 300);
    return () => clearTimeout(timer);
  }, [input, isLoaded, isSelected]);

  return (
    <Command
      shouldFilter={false}
      className="rounded-lg border border-gray-200 shadow-none"
    >
      <CommandInput
        value={input}
        onValueChange={(value) => {
          setInput(value);
          setIsSelected(false);
          if (!value.trim()) {
            setPredictions([]);
            onLocationSelect(null);
          }
        }}
        className="border-none focus:ring-0"
        placeholder="Search location..."
      />
      <CommandList>
        {isLoading ? (
          <CommandEmpty>Loading...</CommandEmpty>
        ) : predictions.length === 0 && input && !isSelected ? (
          <CommandEmpty>No locations found</CommandEmpty>
        ) : null}
        {predictions.length > 0 && !isSelected && (
          <CommandGroup heading="Suggestions">
            {predictions.map((prediction) => (
              <CommandItem
                key={prediction.place_id}
                onSelect={() =>
                  handleSelect(prediction.place_id, prediction.description)
                }
              >
                {prediction.description}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </Command>
  );
}
