"use client";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { autocomplete } from "@/lib/google";
import { PlaceAutocompleteResult } from "@googlemaps/google-maps-services-js";
import { useEffect, useState, useRef } from "react";

interface Coordinates {
  lat: number;
  lng: number;
}

interface Location {
  placeId: string;
  description: string;
  coordinates: Coordinates;
}

interface AutocompleteProps {
  onLocationSelect: (location: Location | null) => void;
}

export default function Autocomplete({ onLocationSelect }: AutocompleteProps) {
  const [predictions, setPredictions] = useState<PlaceAutocompleteResult[]>([]);
  const [input, setInput] = useState("");
  const [showList, setShowList] = useState(false);
  const justSelectedRef = useRef(false);

  const handleSelect = async (placeId: string, description: string) => {
    setInput(description);
    setPredictions([]); // Reset predictions
    setShowList(false);
    justSelectedRef.current = true;

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?place_id=${placeId}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();

      if (data.status === "OK" && data.results.length > 0) {
        const { lat, lng } = data.results[0].geometry.location;
        const locationData: Location = {
          placeId,
          description,
          coordinates: { lat, lng },
        };
        console.log("Sending location to parent:", locationData);
        onLocationSelect(locationData);
      }
    } catch (error) {
      console.error("Error fetching location details:", error);
      onLocationSelect(null);
    }
  };

  const handleInputChange = (value: string) => {
    setInput(value);
    if (justSelectedRef.current) {
      justSelectedRef.current = false;
      return;
    }
    if (!value.trim()) {
      onLocationSelect(null);
    }
    setShowList(true);
  };

  useEffect(() => {
    const getPredictions = async () => {
      if (!input.trim() || justSelectedRef.current) {
        setPredictions([]); // Always reset predictions to an empty array
        return;
      }

      try {
        const results = await autocomplete(input);
        setPredictions(Array.isArray(results) ? results : []); // Ensure `results` is an array
        setShowList(true);
      } catch (error) {
        console.error("Error fetching predictions:", error);
        setPredictions([]); // Reset predictions on error
      }
    };

    const timer = setTimeout(getPredictions, 300);
    return () => clearTimeout(timer);
  }, [input]);

  return (
    <Command className="rounded-lg border shadow-md">
      <CommandInput
        placeholder="Search location..."
        value={input}
        onValueChange={handleInputChange}
        onFocus={() => {
          if (!justSelectedRef.current && input.trim()) {
            setShowList(true);
          }
        }}
        onBlur={() => {
          setTimeout(() => setShowList(false), 200); // Delay to handle item click
        }}
      />
      <CommandList>
        <CommandGroup>
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
      </CommandList>
    </Command>
  );
}
