"use client";
import api from "@/services/api";
import {
  IconChevronLeft,
  IconChevronRight,
  IconDownload,
  IconEye,
  IconFileTypePdf,
} from "@tabler/icons-react";
import React, { useState, useEffect } from "react";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "../ui/pagination";
import { Button } from "../ui/button";

interface InvoiceOrderProps {
  id: number;
  order_number: string;
  order_reference_number: string;
  vehicle_type?: string;
  orderTime: string;
  order_pricing?: string;
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
  current_page: number;
}

export default function InvoiceOrder({
  isShowOrderRefNo,
  invoiceId,
}: {
  isShowOrderRefNo: boolean;
  invoiceId: number;
}) {
  const [orders, setOrders] = useState<InvoiceOrderProps[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [pagination, setPagination] = useState<PaginationMetadata>({
    prev_page_url: null,
    next_page_url: null,
    links: [],
    current_page: 1,
  });

  // Debounce the search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500); // 500ms debounce
    return () => clearTimeout(handler);
  }, [search]);

  // Fetch invoices on changes to the current page or debounced search
  useEffect(() => {
    fetchInvoices();
  }, [pagination.current_page, debouncedSearch]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const response = await api.get(
        `/order-manager/getInvoiceOrders?invoice_id=${invoiceId}&page=${pagination.current_page}&search=${debouncedSearch}`
      );
      const data = response.data;
      
      setOrders(data.data.data);
      setPagination({
        prev_page_url: data.data.prev_page_url,
        next_page_url: data.data.next_page_url,
        links: data.data.links,
        current_page: data.data.current_page,
      });
    } catch (error) {
      console.error("Error fetching invoices:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (url: string | null) => {
    if (url) {
      const pageUrl = new URL(url);
      const pageNumber = pageUrl.searchParams.get("page");
      if (pageNumber) {
        setPagination((prev) => ({
          ...prev,
          current_page: parseInt(pageNumber, 10),
        }));
      }
    }
  };


  // Handle reset button click
  const handleReset = () => {
    setSearch(""); // Clear the search input
    setDebouncedSearch(""); // Reset debounced search
    setPagination({
      prev_page_url: null,
      next_page_url: null,
      links: [],
      current_page: 1, // Reset to the first page
    });
    fetchInvoices(); // Re-fetch the invoices with default parameters
  };

  return (
    <div>
      <div className="mb-4 flex items-center gap-4">
        {/* Search Input */}
        <input
          type="text"
          className="border rounded px-4 py-1.5 w-4/3"
          placeholder="Search by order number"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button className="bg-gray-300 text-black" onClick={handleReset}>
          Reset
        </Button>
      </div>

      {/* Data Table */}
      {loading ? (
        <div className="text-center">
          <p>Loading...</p>
        </div>
      ) : (
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr>
              <th className="border p-4">Order Number #</th>
              {isShowOrderRefNo && (
                <th className="border px-4 py-2">Order Reference Number</th>
              )}
              <th className="border p-4">Vehicle Type</th>
              <th className="border p-4">Order Time</th>
              <th className="border p-4">Order Value</th>
              <th className="border p-4"></th>
            </tr>
          </thead>
          <tbody>
            {orders.length > 0 ? (
              orders.map((order) => (
                <tr key={order.id}>
                  <td className="border px-4 py-2 text-center">
                    {order.order_number}
                  </td>
                  {isShowOrderRefNo && (
                    <td className="border px-4 py-2 text-center">
                      {order.order_reference_number || "N/A"}
                    </td>
                  )}
                  <td className="border px-4 py-2 text-center">
                    <span className="font-medium">{order.vehicle_type}</span>
                  </td>
                  <td className="border px-4 py-2 text-center">
                    {order.orderTime}
                  </td>
                  <td className="border px-4 py-2 text-center">
                    {order.order_pricing}
                  </td>
                  <td className="flex border px-4 py-2 gap-2 justify-center">
                    <a
                      href={`/orders/order-details/${order.order_number}`}
                      className="text-green-500 hover:underline rounded-md bg-green-100 p-1"
                    >
                      <IconEye />
                    </a>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="text-center py-4">
                  No orders found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {/* Pagination */}
      <div className="mt-4">
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (pagination.prev_page_url) {
                    handlePageChange(pagination.prev_page_url);
                  }
                }}
                className={
                  !pagination.prev_page_url
                    ? "pointer-events-none opacity-50"
                    : ""
                }
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
                    isActive={link.active}
                  >
                    {link.label}
                  </PaginationLink>
                </PaginationItem>
              ))}

            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (pagination.next_page_url) {
                    handlePageChange(pagination.next_page_url);
                  }
                }}
                className={
                  !pagination.next_page_url
                    ? "pointer-events-none opacity-50"
                    : ""
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
}
