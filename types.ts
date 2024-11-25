// globals.d.ts
export {};

declare global {
  interface Window {
    Pusher: typeof import("pusher-js");
  }
}

export interface CustomPlaceAutocompleteResult {
  description: string;
  place_id: string;
  // Add other fields as needed
}
export interface Location {
  driver_id: number;
  lat: number;
  lng: number;
}

export interface DeliveryStage {
  stage: string;
  time: string;
  completed: boolean;
}

export interface Order {
  id: string;
  stages: DeliveryStage[];
  pickupLocation: Location;
  dropoffLocation: Location;
  driverLocation: Location;
}
