"use client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import React, { use, useEffect, useState } from "react";

interface PageProps {
  params: Promise<{
    order_number: string;
  }>;
}

interface Order {
  id: number;
  order_number: string;
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
}

interface DriverDetails {
  id: number;
  name: string;
  phone_number: string;
  image_url: string | null;
}
const Page: React.FC<PageProps> = ({ params }) => {
  const unwrappedParams = use(params); // Unwrap the `params` promise
  const { order_number } = unwrappedParams; // Access `order_number` safely

  const [order, setOrder] = useState<Order | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);

      const formData = {
        order_number: order_number,
      };

      const response = await api.post("/order-detail", formData);
      const responseData = response.data;

      setOrder(responseData.data);
    } catch (error) {
      setError("Error fetching order details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (order_number) {
      fetchOrders();
    }
  }, [order_number]);

  const orderData = order
    ? [
        { key: "Order Number", value: order.order_number },
        { key: "Order Ref. Number", value: order.order_reference_number },
        { key: "Order Type", value: order.order_type },
        { key: "Order Time", value: order.order_time },
        { key: "Order Status", value: order.task_status },
        { key: "Vehicle Type", value: order.vehicle_title },
        { key: "Payable Amount", value: order.payable_amount },
        { key: "Recipient Number", value: order.recipient_phone },
        { key: "Order Cost", value: order.order_cost },
        { key: "Cod Amount", value: order.cod_amount },
      ]
    : [];
  const PickupData = order?.pickup
    ? [
        { key: "Address", value: order.pickup.address },
        { key: "Flat/Building No", value: order.pickup.flat_no },
        { key: "Instruction", value: order.pickup.direction },
        { key: "City", value: order.pickup.city },
      ]
    : [];

  const DropOffData = order?.drop_off
    ? [
        { key: "Address", value: order.drop_off.address },
        { key: "Flat/Building No", value: order.drop_off.flat_no },
        { key: "Instruction", value: order.drop_off.direction },
        { key: "City", value: order.drop_off.city },
      ]
    : [];

    const DropOffDataTwo = order?.drop_off_two
      ? [
          { key: "Address", value: order.drop_off_two.address },
          { key: "Flat/Building No", value: order.drop_off_two.flat_no },
          { key: "Instruction", value: order.drop_off_two.direction },
          { key: "City", value: order.drop_off_two.city },
        ]
      : [];

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p>Loading order details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header flex justify-between">
        <h4 className="text-2xl text-black font-semibold">
          Order Details / {order_number}
        </h4>
        <Button variant="outline">
          <Link href="/orders" className="flex items-center">
            <IconChevronLeft /> Back to Order List
          </Link>
        </Button>
      </div>
      {/* Order Details Content */}
      <div className="flex gap-4">
        <Card className="w-4/12">
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
        <Card className="w-4/12">
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
        <Card className="w-4/12">
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
          <Card className="w-4/12">
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
    </div>
  );
};

export default Page;
