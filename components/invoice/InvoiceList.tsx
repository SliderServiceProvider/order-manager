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

interface InvoiceProps {
  id: number;
  invoice_number: string;
  amount: string;
  delivery_count: number;
  status?: string;
  invoice_created_at: string;
  view_url?: string;
  download_url?: string;
  detail_page_url?: string;
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

export default function InvoiceList() {
  const [invoices, setInvoices] = useState<InvoiceProps[]>([]);
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
        `/order-manager/getInvoices?page=${pagination.current_page}&search=${debouncedSearch}`
      );
      const data = response.data;
      
      setInvoices(data.data.data);
      setPagination((prev) => ({
        prev_page_url: data.data.prev_page_url,
        next_page_url: data.data.next_page_url,
        links: data.data.links,
        current_page: data.data.current_page,
      }));
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
          current_page: parseInt(pageNumber),
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
          className="border rounded px-4 py-1.5 w-3/12"
          placeholder="Search by invoice number or amount"
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
              <th className="border px-4 py-2">Invoice #</th>
              <th className="border px-4 py-2">Amount</th>
              <th className="border px-4 py-2">Deliveries</th>
              <th className="border px-4 py-2">Status</th>
              <th className="border px-4 py-2">Created At</th>
              <th className="border px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length > 0 ? (
              invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td className="border px-4 py-2 text-center">
                    {invoice.invoice_number}
                  </td>
                  <td className="border px-4 py-2 text-center">
                    <span className="font-medium">AED {invoice.amount}</span>
                  </td>
                  <td className="border px-4 py-2 text-center">
                    <span className="font-medium">
                      {invoice.delivery_count}
                    </span>
                  </td>
                  <td className="border px-4 py-2 text-center">
                    <span
                      className={`px-3 py-1 rounded-full ${
                        invoice.status === "paid"
                          ? "bg-green-100 text-green-500"
                          : "bg-red-100 text-red-500"
                      }`}
                    >
                      {invoice.status}
                    </span>
                  </td>
                  <td className="border px-4 py-2 text-center">
                    {invoice.invoice_created_at}
                  </td>
                  <td className="flex border px-4 py-2 gap-2 justify-center">
                    <a
                      href={`/invoices/invoice-details/${invoice.invoice_number}`}
                      rel="noopener noreferrer"
                      className="text-green-500 hover:underline rounded-md bg-green-100 p-1"
                    >
                      <IconEye />
                    </a>
                    <a
                      href={invoice.view_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-red-500 hover:underline rounded-md bg-red-100 p-1"
                    >
                      <IconFileTypePdf />
                    </a>
                    <a
                      href={invoice.download_url}
                      className="text-white hover:underline rounded-md bg-black p-1"
                    >
                      <IconDownload />
                    </a>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="text-center py-4">
                  No invoices found.
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
                      isActive={link.active}
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
