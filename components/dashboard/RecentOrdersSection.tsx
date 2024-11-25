import React from "react";
import Link from "next/link";
import { IconArrowNarrowRight, IconEye } from "@tabler/icons-react";
import { Card, CardContent, CardHeader } from "../ui/card";

interface OrderRowProps {
  brand: string;
  accountManager: string;
  orderNumber: string;
  cost: string;
  status: string;
  orderTime: string;
  detailPageLink: string;
}

// Define the type of data received from the API, if needed
interface RecentOrder {
  brand_name: string;
  account_manager_name: string;
  order_number: number;
  order_cost: string;
  order_status: string;
  order_time: string;
}

interface RecentOrdersSectionProps {
  orders: RecentOrder[]; // Accept raw API data
}

function OrderRow({
  brand,
  accountManager,
  orderNumber,
  cost,
  status,
  orderTime,
  detailPageLink,
}: OrderRowProps) {
  // Determine the class for the status badge based on the status value
  const getStatusClasses = () => {
    switch (status) {
      case "Completed":
        return "bg-green-100 text-green-600";
      case "Canceled":
        return "bg-red-100 text-red-600";
      case "Assigned":
        return "bg-blue-100 text-blue-600";
      case "Un Assigned":
        return "bg-amber-100 text-amber-600";
      default:
        return "bg-gray-100 text-gray-600"; // Default styling if status is unrecognized
    }
  };

  return (
    <tr>
      <td className="border-t border-muted-200 py-4 px-3 text-sm font-medium">
        <Link className="text-blue-500" href={detailPageLink}>
          {orderNumber}
        </Link>
      </td>
      <td className="border-t border-muted-200 py-4 px-3 text-sm text-black font-bold">
        {cost}
      </td>
      <td className="border-t border-muted-200 py-4 px-3 text-sm font-semibold">
        <span className={`status-badge ${getStatusClasses()}`}>{status}</span>
      </td>
      <td className="border-t border-muted-200 py-4 px-3 text-sm">
        {orderTime}
      </td>
      <td className="border-t border-muted-200 py-4 px-3 text-sm">
        <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-blue-50">
          <Link className="text-blue-500" href={detailPageLink}>
            <IconEye size={18} />
          </Link>
        </div>
      </td>
    </tr>
  );
}

export function RecentOrdersSection({
  orders,
}: RecentOrdersSectionProps): JSX.Element {
  return (
    <Card className="card bg-white">
      <CardHeader className="flex flex-row items-center justify-between">
        <h4 className="text-black font-semibold uppercase">Recent Orders</h4>
        <Link
          href="/orders"
          className="rounded-lg py-1 px-2 text-sm border mt-0"
        >
          View All
        </Link>
      </CardHeader>
      <CardContent>
        <div className="w-full overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="bg-transparent py-2 px-3 text-start text-xs font-medium uppercase text-muted-400">
                  Order Number
                </th>
                <th className="bg-transparent py-2 px-3 text-start text-xs font-medium uppercase text-muted-400">
                  Cost
                </th>
                <th className="bg-transparent py-2 px-3 text-start text-xs font-medium uppercase text-muted-400">
                  Status
                </th>
                <th className="bg-transparent py-2 px-3 text-start text-xs font-medium uppercase text-muted-400">
                  Order Time
                </th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order, index) => (
                <OrderRow
                  key={index}
                  brand={order.brand_name}
                  accountManager={order.account_manager_name}
                  orderNumber={`#${order.order_number}`} // Format order number here
                  cost={`AED ${order.order_cost}`} // Format cost here
                  status={order.order_status}
                  orderTime={new Date(order.order_time).toLocaleString()} // Format date here
                  detailPageLink={`/orders/order-details/${order.order_number}`} // Link generation
                />
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
