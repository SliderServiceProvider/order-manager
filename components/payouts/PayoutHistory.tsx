import { useEffect, useState } from "react";
import api from "@/services/api";
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
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "../ui/calendar";
import { DateRange } from "react-day-picker";

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
  const [currentPage, setCurrentPage] = useState(1);
  const [date, setDate] = useState<DateRange | undefined>({
    from: undefined,
    to: undefined,
  });
  const [pagination, setPagination] = useState<PaginationMetadata>({
    prev_page_url: null,
    next_page_url: null,
    links: [],
    current_page: 1,
  });

  // Fetch payouts with debounced search
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchPayouts(currentPage, search, date);
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [search, currentPage, date, refreshTrigger]);

  const fetchPayouts = async (
    page: number,
    searchTerm: string,
    dateRange: DateRange | undefined
  ) => {
    setLoading(true);
    try {
      let dateRangeParam = "";
      if (dateRange?.from && dateRange?.to) {
        dateRangeParam = `&date_range=${format(
          dateRange.from,
          "yyyy-MM-dd"
        )} to ${format(dateRange.to, "yyyy-MM-dd")}`;
      }

      const response = await api.get(
        `/order-manager/getPayouts?page=${page}&search=${searchTerm}${dateRangeParam}`
      );

      const data = response.data;

      setPayouts(data.data || []);
      setPagination({
        prev_page_url: data.prev_page_url,
        next_page_url: data.next_page_url,
        links: data.links || [],
        current_page: data.current_page,
      });
    } catch (error) {
      console.error("Error fetching payouts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (url: string | null) => {
    if (!url) return;

    try {
      const pageUrl = new URL(url);
      const pageNumber = pageUrl.searchParams.get("page");
      if (pageNumber) {
        setCurrentPage(parseInt(pageNumber));
      }
    } catch (error) {
      console.error("Error parsing URL:", error);
    }
  };

  return (
    <>
      <Card className="mt-10">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="font-medium">Payout History</CardTitle>
          <div className="flex gap-2">
            <Input
              placeholder="Search payouts..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1); // Reset to first page on search
              }}
              className="w-4/3"
            />
            <div className="flex-none">
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
                    onSelect={(newDate) => {
                      setDate(newDate);
                      setCurrentPage(1);
                    }}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardHeader>
        <CardContent>
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
                    <TableCell className="font-medium">
                      {payout.amount}
                    </TableCell>
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
                      handlePageChange(pagination.prev_page_url);
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
                      handlePageChange(pagination.next_page_url);
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
        </CardContent>
      </Card>
    </>
  );
}
