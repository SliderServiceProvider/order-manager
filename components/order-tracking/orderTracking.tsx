import { Order } from "@/types";
import { DeliveryTimeline } from "./DeliveryTimeLine";
import MapRoute from "./MapRoute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface OrderTrackingProps {
  order: Order;
}

export function OrderTracking({ order }: OrderTrackingProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Delivery Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <DeliveryTimeline stages={order.stages} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Delivery Map</CardTitle>
        </CardHeader>
        <CardContent>
          {/* <DeliveryMap
            pickupLocation={order.pickupLocation}
            dropoffLocation={order.dropoffLocation}
            driverLocation={order.driverLocation}
          /> */}
        </CardContent>
      </Card>
    </div>
  );
}
