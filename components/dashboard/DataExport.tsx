"use client";

import React, { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { format, addYears } from "date-fns";
import { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import api from "@/services/api";
import { log } from "node:console";

const MIN_DATE = new Date(2025, 0, 1); // January 1, 2025

export default function DataExport() {
  const [date, setDate] = useState<DateRange | undefined>();
  const [exportFormat, setExportFormat] = useState<string>("csv");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleExport = async () => {
    const adjustToLocalISOString = (date: Date, endOfDay = false) => {
      if (endOfDay) {
        date.setHours(23, 59, 59, 999);
      } else {
        date.setHours(0, 0, 0, 0);
      }
      const offsetMs = date.getTimezoneOffset() * 60 * 1000;
      return new Date(date.getTime() - offsetMs).toISOString().slice(0, -1);
    };

    const startDate = date?.from
      ? adjustToLocalISOString(date.from)
      : adjustToLocalISOString(new Date("2025-01-01"));

    const endDate = date?.to
      ? adjustToLocalISOString(date.to, true)
      : adjustToLocalISOString(new Date(), true);

    setLoading(true);
    setErrorMessage(null);
    try {
      const response = await api.post(
        "/order-manager/reports/order-accounting",
        {
          startDate,
          endDate,
          format: exportFormat, // 'csv' or 'pdf'
        },
        {
          responseType: "blob",
          headers: {
            Accept: exportFormat === "pdf" ? "application/pdf" : "text/csv",
          },
        }
      );

      // Get filename from response headers
      const disposition = response.headers["content-disposition"];
      let filename = "";

      // Extract filename from Content-Disposition header
      if (disposition && disposition.indexOf("attachment") !== -1) {
        const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
        const matches = filenameRegex.exec(disposition);
        if (matches != null && matches[1]) {
          filename = matches[1].replace(/['"]/g, "");
        }
      }

      // If no filename found, construct one
      if (!filename) {
        const startDateStr = date?.from
          ? date.from.toISOString().split("T")[0]
          : "2025-01-01";
        const endDateStr = date?.to
          ? date.to.toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0];
        filename = `orders_report_${startDateStr}_to_${endDateStr}.${exportFormat}`;
      }

      // Create blob and download
      const blob = new Blob([response.data], {
        type: exportFormat === "pdf" ? "application/pdf" : "text/csv",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error:any) {
      console.error("Export error:", error);
      const errorMessage =
        error.response?.data instanceof Blob
          ? await error.response.data.text()
          : error.response?.data?.message || "Export failed. Please try again.";
      setErrorMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-base font-bold uppercase">
          Export Data
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Select a date range and format to export your data.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {errorMessage && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Date Range
          </label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
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
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={setDate}
                numberOfMonths={2}
                className="rounded-md border"
                fromDate={MIN_DATE}
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Export Format
          </label>
          <Select value={exportFormat} onValueChange={setExportFormat}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select format" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">CSV/Excel</SelectItem>
              <SelectItem value="pdf">PDF</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={handleExport}
          className="w-full bg-black text-primary-foreground hover:bg-primary/90"
          disabled={loading}
        >
          {loading ? "Exporting..." : "Export Data"}
        </Button>
      </CardContent>
    </Card>
  );
}
