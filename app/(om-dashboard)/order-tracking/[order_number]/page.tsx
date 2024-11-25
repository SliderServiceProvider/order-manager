"use client";

import { OrderTracking } from "@/components/order-tracking/orderTracking";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import api from "@/services/api";
import { Location, DeliveryStage, Order } from "@/types";
import { Loader2 } from "lucide-react";
import { use, useEffect, useState } from "react";

interface PageProps {
  params: Promise<{
    order_number: string;
  }>;
}


const Page: React.FC<PageProps> = ({ params }) => {
  const unwrappedParams = use(params); // Unwrap the `params` promise
  const { order_number } = unwrappedParams; // Access `order_number` safely
  const [loading, setLoading] = useState(false); // Loading state for API calls
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<Order | null>(null);

  // Fetch cancel reasons
  useEffect(() => {
    const fetchOrder = async () => {
      try {
        setLoading(true);
        const response = await api.get(
          `/order-manager/getTrackingDetails/${order_number}`
        );
        setOrder(response.data);
      } catch (error) {
        setError("Error fetching order details.");
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="mr-2 h-8 w-8 animate-spin" />
        <span className="text-xl font-semibold">Loading order details...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-10">
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container mx-auto py-10">
        <Alert>
          <AlertTitle>No Order Found</AlertTitle>
          <AlertDescription>
            We couldn't find the order you're looking for.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto">
      <h4 className="text-2xl text-black font-semibold mb-5">
        Order Tracking / {order_number}
      </h4>
      <OrderTracking order={order} />
    </div>
  );
};
export default Page;
