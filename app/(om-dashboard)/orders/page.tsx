"use client"
import React, { useEffect, useState } from "react";
import SkeletonOrderCard from "@/components/orders/SkeletonOrderCard";
import OrderCard from "@/components/orders/OrderCard";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import api from "@/services/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DateRange } from "react-day-picker";

type TabType = "on_progress" | "completed" | "scheduled" | "cancelled";

interface Order {
  id: number;
  order_number: number;
  order_reference_number: string;
  order_type: string;
  order_time: string;
  customer_id: string;
  recipient_phone: string;
  order_status: string;
  vehicle_type: string;
  task_status: string;
  payable_amount: string;
  order_cost: string;
  status: string;
  order_rating: string;
  created_at: string;
  cod_amount: string;
  cash_collected: string;
  detailPageLink: string;
  date_time: string;
  pickup: LocationDetails;
  drop_off: LocationDetails;
  drop_off_two?: LocationDetails;
  driver?: DriverDetails;
}

interface LocationDetails {
  id: number;
  address: string;
  short_name: string;
  flat_no?: string;
  city: string;
  direction?: string;
}

interface DriverDetails {
  id: number;
  name: string;
  phone_number: string;
  image_url: string;
  avg_rating?: string;
  total_reviews?: string;
  rating?: string;
}
interface PaginationLink {
  url: string | null;
  label: string;
  active: boolean;
}

interface PaginationMetadata {
  prev_page_url: string | null;
  next_page_url: string | null;
  links: PaginationLink[];
}

export default function Page() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationMetadata>({
    prev_page_url: null,
    next_page_url: null,
    links: [],
  });
  const [activeTab, setActiveTab] = useState<TabType>("on_progress");
  const isTabType = (value: string): value is TabType =>
    ["on_progress", "completed", "scheduled", "cancelled"].includes(value);

  const [page, setPage] = useState(1);

  const handleTabChange = (type: TabType) => {
    setActiveTab(type);
    setPage(1); // Reset the page number to 1
    fetchOrders(type, 1); // Reset to page 1
  };

  const fetchOrders = async (type: TabType = activeTab, page = 1) => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: page.toString(),
        type,
      });

      const response = await api.get(`/orders?${queryParams}`);
      const data = response.data;
      
      setOrders(data.data.data);
      setPagination({
        prev_page_url: data.data.prev_page_url,
        next_page_url: data.data.next_page_url,
        links: data.data.links,
      });
    } catch (error) {
      setError("Error fetching orders");
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (url: string | null) => {
    if (url) {
      const urlParams = new URL(url);
      const pageParam = urlParams.searchParams.get("page");
      if (pageParam) {
        setPage(parseInt(pageParam));
        fetchOrders(activeTab, parseInt(pageParam));
      }
    }
  };

  useEffect(() => {
    fetchOrders(activeTab, page);
  }, [activeTab, page]);

  return (
    <div>
      <div className="page-header">
        <h4 className="text-2xl text-black font-semibold">My Orders</h4>
      </div>
      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          if (isTabType(value)) handleTabChange(value);
        }}
        className="w-4/6"
      >
        <TabsList className="flex justify-between bg-white">
          <TabsTrigger className="w-1/4" value="on_progress">
            On Progress
          </TabsTrigger>
          <TabsTrigger className="w-1/4" value="completed">
            Completed
          </TabsTrigger>
          <TabsTrigger className="w-1/4" value="scheduled">
            Scheduled
          </TabsTrigger>
          <TabsTrigger className="w-1/4" value="cancelled">
            Canceled
          </TabsTrigger>
        </TabsList>
        <TabsContent value={activeTab}>
          {loading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <SkeletonOrderCard key={index} />
            ))
          ) : orders.length > 0 ? (
            orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onRefresh={() => fetchOrders(activeTab)}
              />
            ))
          ) : (
            <p className="text-center text-gray-500 mt-4">
              No orders available.
            </p>
          )}

          {!loading && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      pagination.prev_page_url &&
                        handlePageChange(pagination.prev_page_url);
                    }}
                    //disabled={!pagination.prev_page_url}
                  />
                </PaginationItem>

                {pagination.links
                  .filter(
                    (link) =>
                      link.label !== "&laquo; Previous" &&
                      link.label !== "Next &raquo;"
                  )
                  .map((link, index) => (
                    <PaginationItem key={index}>
                      {link.url ? (
                        <PaginationLink
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            handlePageChange(link.url);
                          }}
                          className={`${
                            link.active
                              ? "bg-black text-white"
                              : "bg-white text-black"
                          } px-3 py-1 rounded border`}
                        >
                          {link.label
                            .replace("&laquo;", "«")
                            .replace("&raquo;", "»")}
                        </PaginationLink>
                      ) : (
                        <PaginationEllipsis />
                      )}
                    </PaginationItem>
                  ))}

                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      pagination.next_page_url &&
                        handlePageChange(pagination.next_page_url);
                    }}
                    // disabled={!pagination.next_page_url}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
