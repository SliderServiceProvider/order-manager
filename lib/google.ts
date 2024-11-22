// Remove the "use server" directive since we're running this in the browser
import { CustomPlaceAutocompleteResult } from "@/types";

export const autocomplete = async (
  input: string,
  options?: { components?: string }
): Promise<CustomPlaceAutocompleteResult[]> => {
  if (!input) return [];

  try {
    // Create a new AutocompleteService instance
    const service = new google.maps.places.AutocompleteService();

    const request = {
      input,
      componentRestrictions: options?.components
        ? { country: options.components.split(":")[1] }
        : undefined,
    };

    // Use promisified version of the getPlacePredictions method
    const predictions = await new Promise<
      google.maps.places.AutocompletePrediction[]
    >((resolve, reject) => {
      service.getPlacePredictions(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          resolve(results);
        } else {
          reject(new Error(status));
        }
      });
    });

    // Map the predictions to your custom type
    return predictions.map((prediction) => ({
      description: prediction.description,
      place_id: prediction.place_id,
    }));
  } catch (error) {
    console.error("Error fetching autocomplete predictions:", error);
    return [];
  }
};
