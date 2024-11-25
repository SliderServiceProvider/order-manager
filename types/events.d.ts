// types/events.d.ts
declare global {
  interface OrderStatusUpdated {
    order: {
      id: number;
      status: string;
      // Add other order properties you need
    };
  }

  type EchoEventMap = {
    OrderStatusUpdated: OrderStatusUpdated;
    // Add other event types here
  };
}

export {};
