import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import api from "@/services/api";
import { useEffect, useState } from "react";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "../ui/pagination";

interface PayoutsProps {
  id: number;
  amount: number;
  status: number;
  payout_status: string;
  requested_date: string;
  approved_date: string;
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

interface PayoutHistoryProps {
  refreshTrigger: boolean;
}

export function PayoutHistory({ refreshTrigger }: PayoutHistoryProps) {
  const [loading, setLoading] = useState(true);
  const [payouts, setPayouts] = useState<PayoutsProps[]>([]);
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

  // Fetch payouts when current_page or debouncedSearch changes
  useEffect(() => {
    fetchPayouts();
  }, [pagination.current_page, debouncedSearch]);
  useEffect(() => {
    if (refreshTrigger) {
      fetchPayouts(); // Re-fetch when refreshTrigger changes
    }
  }, [refreshTrigger]);
  const fetchPayouts = async () => {
    setLoading(true);
    try {
      const response = await api.get(
        `/order-manager/getPayouts?page=${pagination.current_page}&search=${debouncedSearch}`
      );
      const data = response.data;
      // Validate and set API response data
      setPayouts(data.data || []);
      setPagination({
        prev_page_url: data.prev_page_url,
        next_page_url: data.next_page_url,
        links: data.links,
        current_page: data.current_page,
      });
    } catch (error) {
      console.error("Error fetching payouts:", error);
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

  return (
    <>
      <div className="mb-4">
        <input
          type="text"
          className="border rounded px-4 py-2 w-full"
          placeholder="Search payouts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Payout ID#</TableHead>
            <TableHead>Requested At</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Approved At</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center">
                Loading...
              </TableCell>
            </TableRow>
          ) : payouts.length > 0 ? (
            payouts.map((payout) => (
              <TableRow key={payout.id}>
                <TableCell>{payout.id}</TableCell>
                <TableCell>{payout.requested_date}</TableCell>
                <TableCell className="font-medium">{payout.amount}</TableCell>
                <TableCell>{payout.approved_date}</TableCell>
                <TableCell>
                  <span
                    className={`${
                      payout.status === 0
                        ? "bg-rose-100 text-rose-600"
                        : "bg-emerald-100 text-emerald-600"
                    } rounded-full py-1 px-2`}
                  >
                    {payout.payout_status}
                  </span>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={5} className="text-center">
                No payouts found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

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
    </>
  );
}
