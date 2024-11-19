"use client"
import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { KpiSummarySection } from "@/components/dashboard/KpiSummarySection";
import { RecentTransactionsSection } from "@/components/dashboard/RecentTransactionsSection";
import { RecentOrdersSection } from "@/components/dashboard/RecentOrdersSection";
import api from "@/services/api";
import { log } from "console";
import Head from "next/head";

// Define your data types
interface DataType {
  id: number;
  name: string;
  // ... other fields
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

export default function DashboardPage(): JSX.Element {
  const isAuthenticated = useAuth();
  const [data, setData] = useState<DataType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [kpiSummary, setKpiSummary] = useState<null>(null);
  const [recentTransactions, setRecentTransactions] = useState<[]>([]);
  const [recentOrders, setRecentOrders] = useState<OrderRowProps[]>([]);
  const [brandsData, setBrandsData] = useState([]);
  const [locationsData, setLocationsData] = useState([]);
  // Fetch data function
  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await api.get("/dashboardAnalytics");

      const data = await response.data;

      setKpiSummary(data.data.kpiSummary);
      setRecentTransactions(data.data.recentTransactions);
      setRecentOrders(data.data.recentOrders);
      setBrandsData(data.data.topBrands);
      setLocationsData(data.data.getLocations);
      setError(null);
    } catch (err) {
      setError("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);

  return (
    <>
      <div className="mx-auto space-y-6">
        {kpiSummary ? (
          <KpiSummarySection kpiSummary={kpiSummary} />
        ) : (
          <div>Loading KPI Summary...</div> // Optional loading message
        )}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
          <div className="col-span-12 lg:col-span-7 ltablet:col-span-12 flex">
            <div className="w-full flex-grow">
              {recentTransactions ? (
                <RecentTransactionsSection
                  recentTransactions={recentTransactions}
                />
              ) : (
                <div>Loading recentTransactions Summary...</div> // Optional loading message
              )}
            </div>
          </div>
          <div className="col-span-12 lg:col-span-5 ltablet:col-span-12 flex">
            <div className="w-full flex-grow">
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
          <div className="col-span-12 ltablet:col-span-12">
            {loading ? (
              <div>Loading recent orders...</div>
            ) : (
              <RecentOrdersSection orders={recentOrders} />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
