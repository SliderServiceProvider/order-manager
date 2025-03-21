"use client";
import React, { useEffect, useRef, useState } from "react";
import { useAppSelector, useAuth } from "@/hooks/useAuth";
import { KpiSummarySection } from "@/components/dashboard/KpiSummarySection";
import { RecentTransactionsSection } from "@/components/dashboard/RecentTransactionsSection";
import { RecentOrdersSection } from "@/components/dashboard/RecentOrdersSection";
import api from "@/services/api";
import Head from "next/head";
import WarningModal from "@/components/invoice-warning/WarningModal";
import { Button } from "@/components/ui/button";
import DataExport from "@/components/dashboard/DataExport";

// Types remain the same...
interface DataType {
  id: number;
  name: string;
}

interface OrderData {
  brand_name: string;
  account_manager_name: string;
  order_number: string;
  order_cost: string;
  order_status: string;
  order_time: string;
}

interface OrderRowProps {
  brand_name: string;
  account_manager_name: string;
  order_number: number;
  order_cost: string;
  order_status: string;
  order_time: string;
}

interface InvoiceReminder {
  type: string;
  message: string;
}

export default function DashboardPage(): JSX.Element {
  // Auth and user states
  const isInvoiceUser = useAppSelector(
    (state) => state.auth.user?.isInvoiceUser
  );
  const isAuthenticated = useAuth();

  // Dashboard states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAccountLocked, setIsAccountLocked] = useState(false);
  const [invoiceReminder, setInvoiceReminder] =
    useState<InvoiceReminder | null>(null);
  const [open, setOpen] = useState(false);
  const [kpiSummary, setKpiSummary] = useState<null>(null);
  const [recentTransactions, setRecentTransactions] = useState<[]>([]);
  const [recentOrders, setRecentOrders] = useState<OrderRowProps[]>([]);
  const [brandsData, setBrandsData] = useState([]);
  const [locationsData, setLocationsData] = useState([]);

  // Fetch dashboard data
  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await api.get("/order-manager/dashboardAnalytics");
      const data = response.data;

      if (data.data.isAccountLocked===1){
        setIsAccountLocked(data.data.isAccountLocked);
      }else{
        setIsAccountLocked(false);
      }
        
      setInvoiceReminder(data.data.invoice_reminder);
      setKpiSummary(data.data.kpiSummary);
      setRecentTransactions(data.data.recentTransactions);
      setRecentOrders(data.data.recentOrders);
      setBrandsData(data.data.topBrands);
      setLocationsData(data.data.getLocations);
      setError(null);

      if (data.data.isAccountLocked || data.data.invoice_reminder) {
        setOpen(true);
      }
    } catch (err) {
      setError("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);

  // Modal handling
  useEffect(() => {
    if (isAccountLocked || invoiceReminder) {
      setOpen(true);
    }
  }, [isAccountLocked, invoiceReminder]);

  return (
    <>
      <div className="mx-auto space-y-6">
       
        {/* Rest of the dashboard components */}
        {kpiSummary ? (
          <KpiSummarySection kpiSummary={kpiSummary} />
        ) : (
          <div>Loading KPI Summary...</div>
        )}

        {isInvoiceUser && (
          <div className="grid grid-cols-2 gap-6 md:grid-cols-12">
            <div className="col-span-8 ltablet:col-span-12 flex">
              {recentTransactions ? (
                <RecentTransactionsSection
                  recentTransactions={recentTransactions}
                />
              ) : (
                <div>Loading recentTransactions Summary...</div>
              )}
            </div>
            <div className="col-span-4">
              <DataExport />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-6 md:grid-cols-12">
          <div
            className={`${
              !isInvoiceUser ? "col-span-8" : "col-span-12"
            } ltablet:col-span-12`}
          >
            {loading ? (
              <div>Loading recent orders...</div>
            ) : (
              <RecentOrdersSection orders={recentOrders} />
            )}
          </div>
          {!isInvoiceUser && (
            <div className="col-span-4">
              <DataExport />
            </div>
          )}
        </div>
      </div>

      <WarningModal
        open={open}
        onOpenChange={setOpen}
        invoiceReminder={invoiceReminder}
        isAccountLocked={isAccountLocked}
        isFromDashBoard={true}
      />
    </>
  );
}
