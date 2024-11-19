"use client";
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import api from "@/services/api";
import { DateRange } from "react-day-picker";
import Link from "next/link";
import { IconEye } from "@tabler/icons-react";

interface Order {
  id: number;
  brand_name: string;
  account_manager_name: string;
  order_number: string;
  customer_id: string;
  order_type: string;
  order_time: string;
  vehicle_type: string;
  delivery_fee: string;
  tip: string;
  order_cost: string;
  order_status: string;
  created_at: string;
  cod_amount: string;
  cash_collected: string;
  detailPageLink: string;
}

interface OrderSummary {
  orderValueSum: string;
  tipSum: string;
  payableAmountSum: string;
}

export default function OrderTable() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [date, setDate] = useState<DateRange | undefined>();
  const [page, setPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [summary, setSummary] = useState<OrderSummary | null>(null);
  const perPage = 10;

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        search: searchTerm,
        start: ((page - 1) * perPage).toString(),
        date_range:
          date?.from && date?.to
            ? `${date.from.toISOString().split("T")[0]} to ${
                date.to.toISOString().split("T")[0]
              }`
            : "",
      });

      const response = await api.get(
        `/business-manager/getOrderData?${queryParams}`
      );
      const data = response.data;

      setOrders(data.data);
      setTotalRecords(data.recordsTotal);
      setSummary({
        orderValueSum: data.orderValueSum,
        tipSum: data.tipSum,
        payableAmountSum: data.payableAmountSum,
      });
    } catch (error) {
      // console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [searchTerm, date, page]);

  const totalPages = Math.ceil(totalRecords / perPage);
  const startRecord = (page - 1) * perPage + 1;
  const endRecord = Math.min(page * perPage, totalRecords);

  // Determine the class for the status badge based on the status value
  const getStatusClasses = (status: string) => {
    switch (status) {
      case "Completed":
        return "bg-emerald-100 text-emerald-600";
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
    <Card className="card bg-white">
      <CardHeader className="gap-4">
        <h4>Order History</h4>
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm focus:outline-none focus:ring-0 focus:shadow-none"
            />
          </div>
          <div>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[280px] justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date?.from ? (
                    date.to ? (
                      <>
                        {format(date.from, "LLL dd, y")} -{" "}
                        {format(date.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(date.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={date?.from}
                  selected={date}
                  onSelect={setDate}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Total Order Value</p>
              <p className="text-xl font-bold text-black">
                AED {summary.orderValueSum}
              </p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Total Tips</p>
              <p className="text-xl font-bold text-black">
                AED {summary.tipSum}
              </p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Total Payable Amount</p>
              <p className="text-xl font-bold text-black">
                AED {summary.payableAmountSum}
              </p>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="rounded-md border min-h-[600px] overflow-x-auto">
          <Table className="w-full">
            <TableHeader>
              <TableRow>
                <TableHead>Brand</TableHead>
                <TableHead>Account Manager</TableHead>
                <TableHead>Order #</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Order Time</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Delivery Fee</TableHead>
                <TableHead>Tip</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>COD Amount</TableHead>
                {/* <TableHead>Cash Collection</TableHead> */}
                <TableHead>Created At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                  </TableCell>
                </TableRow>
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-gray-">
                    No orders found
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order, index) => (
                  <TableRow key={index}>
                    <TableCell>{order.brand_name}</TableCell>
                    <TableCell>
                      <Link href={`account-manager/${order.customer_id}`}>
                        {order.account_manager_name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link
                        className="text-blue-500"
                        href={`order-analytics/order-details/${order.order_number}`}
                      >
                        {order.order_number}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "status-badge",
                          order.order_type === "now" &&
                            "bg-green-100 text-green-600",
                          order.order_type === "schedule" &&
                            "bg-amber-100 text-amber-600"
                        )}
                      >
                        {order.order_type}
                      </span>
                    </TableCell>
                    <TableCell>{order.order_time}</TableCell>
                    <TableCell>{order.vehicle_type}</TableCell>
                    <TableCell className="text-black">
                      {order.delivery_fee}
                    </TableCell>
                    <TableCell className="text-black">{order.tip}</TableCell>
                    <TableCell className="text-black">
                      {order.order_cost}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`status-badge ${getStatusClasses(
                          order.order_status
                        )}`}
                      >
                        {order.order_status}
                      </span>
                    </TableCell>

                    <TableCell>{order.cod_amount}</TableCell>
                    {/* <TableCell>
                      {order.cod_amount && (
                        <span
                          className={cn(
                            "status-badge",
                            order.cash_collected === "Collected" &&
                              "bg-green-100 text-green-600",
                            order.cash_collected === "Not Collected" &&
                              "bg-red-100 text-red-600",
                            order.cash_collected === "Not updated yet" &&
                              "bg-amber-100 text-amber-600"
                          )}
                        >
                          {order.cash_collected}
                        </span>
                      )}
                    </TableCell> */}

                    <TableCell>{order.created_at}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 flex flex-col md:flex-row items-center justify-between">
          <div className="text-sm text-gray-600 w-1/4">
            Showing {startRecord} to {endRecord} of {totalRecords} orders
          </div>
          <Pagination className="mt-2 md:mt-0">
            <PaginationContent className="flex justify-end">
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setPage(page - 1)}
                  className={cn(page === 1 && "pointer-events-none opacity-50")}
                />
              </PaginationItem>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => (
                <PaginationItem key={`page-${i}`}>
                  <PaginationLink
                    onClick={() => setPage(i + 1)}
                    isActive={page === i + 1}
                  >
                    {i + 1}
                  </PaginationLink>
                </PaginationItem>
              ))}

              {totalPages > 5 && <PaginationEllipsis />}
              <PaginationItem>
                <PaginationNext
                  onClick={() => setPage(page + 1)}
                  className={cn(
                    page === totalPages && "pointer-events-none opacity-50"
                  )}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </CardContent>
    </Card>
  );
}
