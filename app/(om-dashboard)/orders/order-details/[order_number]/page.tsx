"use client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import api from "@/services/api";

import { IconChevronLeft } from "@tabler/icons-react";
import Link from "next/link";
import React, { use, useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import useWebSocket from "@/hooks/useWebSocket";

// Keep interfaces unchanged...
interface PageProps {
  params: Promise<{
    order_number: string;
  }>;
}

interface Order {
  id: number;
  order_number: string;
  order_display_id: string;
  order_reference_number: string;
  order_type: string;
  order_time: string;
  customer_id: string;
  recipient_phone: string;
  order_status: string;
  vehicle_title: string;
  task_status: string;
  payable_amount: string;
  order_cost: string;
  delivery_status: number;
  status: string;
  created_at: string;
  cod_amount: string;
  cash_collected: string;
  detailPageLink: string;
  date_time: string;
  pickup: LocationDetails;
  drop_off: LocationDetails;
  drop_off_two: LocationDetails;
  driver: DriverDetails;
}
interface LocationDetails {
  id: number;
  address: string;
  short_name: string;
  flat_no: string | null;
  city: string;
  direction: string | null;
  recipient_number: string;
  cod_amount: string | null;
}

interface DriverDetails {
  id: number;
  name: string;
  phone_number: string;
  image_url: string | null;
}

const Page: React.FC<PageProps> = ({ params }) => {
  const unwrappedParams = use(params);
  const { order_number } = unwrappedParams;
  const { toast } = useToast();

  // Group all state declarations together
  const [order, setOrder] = useState<Order | undefined>();
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [showRemarksModal, setShowRemarksModal] = useState(false);
  const [orderRemarks, setOrderRemarks] = useState<string>();
  const [refreshTable, setRefreshTable] = useState(false);

  // Derive orderId from order state
  const orderId = order?.id ? `${order.id}` : "23403";

  // Fetch order data
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const response = await api.post("/order-detail", { order_number });
        setOrder(response.data.data);
      } catch (error) {
        setApiError("Error fetching order details");
      } finally {
        setLoading(false);
      }
    };

    if (order_number) {
      fetchOrders();
    }
  }, [order_number]);

  // Data transformation functions
  const orderData = order
    ? [
        { key: "Order Number", value: order.order_display_id },
        { key: "Order Ref. Number", value: order.order_reference_number },
        { key: "Order Type", value: order.order_type },
        { key: "Order Time", value: order.order_time },
        { key: "Order Status", value: order.task_status },
        { key: "Vehicle Type", value: order.vehicle_title },
        { key: "Order Cost", value: order.payable_amount },
      ]
    : [];
  const PickupData = order?.pickup
    ? [
        { key: "Address", value: order.pickup.address },
        { key: "Flat/Building No", value: order.pickup.flat_no },
        { key: "Direction", value: order.pickup.direction },
        { key: "City", value: order.pickup.city },
      ]
    : [];

  const DropOffData = order?.drop_off
    ? [
        { key: "Address", value: order.drop_off.address },
        { key: "Flat/Building No", value: order.drop_off.flat_no },
        { key: "Direction", value: order.drop_off.direction },
        { key: "City", value: order.drop_off.city },
        { key: "Recipient Number", value: order.drop_off.recipient_number },
        { key: "Cod Amount", value: order.drop_off.cod_amount },
      ]
    : [];

  const DropOffDataTwo = order?.drop_off_two
    ? [
        { key: "Address", value: order.drop_off_two.address },
        { key: "Flat/Building No", value: order.drop_off_two.flat_no },
        { key: "Direction", value: order.drop_off_two.direction },
        { key: "City", value: order.drop_off_two.city },
        {
          key: "Recipient Number",
          value: order.drop_off_two.recipient_number,
        },
        { key: "Cod Amount", value: order.drop_off_two.cod_amount },
      ]
    : [];

  // Handler functions
  const handleSubmit = async () => {
    setSubmitLoading(true);
    try {
      const response = await api.post("/order-manager/reportOrder", {
        order_number: order?.order_number,
        order_remarks: orderRemarks,
      });

      if (response.data.success) {
        toast({
          className: cn("bg-green-500 text-white"),
          title: "Success",
          description: response.data.message,
        });
        setShowRemarksModal(false);
        setRefreshTable(true);
      } else {
        toast({
          variant: "destructive",
          title: "Submission failed.",
          description: response.data.message || "Failed to submit request.",
        });
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Submission failed.",
        description:
          err.response?.data?.message ||
          "There was a problem with your request.",
      });
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleCancelRequest = () => {
    setShowRemarksModal(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p>Loading order details...</p>
      </div>
    );
  }

  

  // Rest of the render logic remains the same...
  return (
    <div>
     
      <div className="page-header flex justify-between">
        <h4 className="text-2xl text-black font-semibold">
          Order Details / {order_number}
        </h4>
        <div>
          {order?.delivery_status === 5 ? (
            <Button className="bg-red-500 text-white mr-2">Cancelled</Button>
          ) : // <span className="bg-rose-100 text-rose-500 font-semibold px-2 py-2 rounded">
          //   Cancelled
          // </span>
          order?.delivery_status === 6 ? (
            <Button className="bg-emerald-500 text-white mr-2">
              Completed
            </Button>
          ) : order?.delivery_status === 2 ? (
            <Button className="bg-pink-500 text-white mr-2">Un Assigned</Button>
          ) : order?.delivery_status === 3 ? (
            <Button className="bg-blue-500 text-white mr-2">Assigned</Button>
          ) : (
            ""
          )}

          <Button variant="outline">
            <Link href="/orders" className="flex items-center">
              <IconChevronLeft /> Back to Order List
            </Link>
          </Button>
        </div>
      </div>
      {/* Order Details Content */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order Information</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orderData.map((data, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{data.key}</TableCell>
                  <TableCell>{data.value}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[160px]">Pickup Information</TableHead>
                {/* <TableHead>Value</TableHead> */}
              </TableRow>
            </TableHeader>
            <TableBody>
              {PickupData.map((data, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{data.key}</TableCell>
                  <TableCell>{data.value}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[160px]">Dropoff Information</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {DropOffData.map((data, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{data.key}</TableCell>
                  <TableCell>{data.value}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        {DropOffDataTwo.length > 0 && (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[160px]">
                    Dropoff Two Information
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {DropOffDataTwo.map((data, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{data.key}</TableCell>
                    <TableCell>{data.value}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
      {/* Create Payout Request Modal */}
      <Dialog open={showRemarksModal} onOpenChange={setShowRemarksModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Report Order</DialogTitle>
          </DialogHeader>
          <div className="grid w-full  items-center gap-1.5">
            <Label htmlFor="orderRemarks">Remarks</Label>
            <Textarea
              onChange={(e) => setOrderRemarks(e.target.value)}
            ></Textarea>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelRequest}>
              Cancel
            </Button>
            <Button
              className="bg-black text-white"
              onClick={handleSubmit}
              disabled={submitLoading || !orderRemarks} // Disable if loading or no amount
            >
              {submitLoading ? "Submitting..." : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Page;
