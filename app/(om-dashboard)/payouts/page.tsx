"use client"
import { PayoutHistory } from '@/components/payouts/PayoutHistory';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/services/api';
import { IconCurrencyDirham } from '@tabler/icons-react';
import React, { useEffect, useState } from 'react'

interface InvoiceSummaryProps {
  total_payout_value: number;
  total_paid_amount: number;
  total_request_value: number;
  total_pending_value: number;
}
export default function page() {
  const [loading, setLoading] = useState(true);
  const [payoutSummary, setPayoutSummary] = useState<InvoiceSummaryProps>();
  const fetchPayoutSummary = async () => {
    setLoading(true);
    try {
      const response = await api.get("/order-manager/getPayoutSummary");
      const data = response.data;
      setPayoutSummary(data);
    } catch (error) {
      console.error("Error fetching invoices:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch the fetchPayoutSummary on mount
  useEffect(() => {
    fetchPayoutSummary();
  }, []);
  return (
    <div>
      <div className="page-header">
        <h4 className="text-2xl text-black font-semibold">My Payouts</h4>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">
              Total Payout Value
            </CardTitle>
            <IconCurrencyDirham className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {payoutSummary?.total_payout_value}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">
              Completed Payout Value
            </CardTitle>
            <IconCurrencyDirham className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {payoutSummary?.total_paid_amount}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">
              Requested Amount
            </CardTitle>
            <IconCurrencyDirham className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {payoutSummary?.total_request_value}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">
              Balance Payout Value
            </CardTitle>
            <IconCurrencyDirham className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {payoutSummary?.total_pending_value}
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Payout History */}
      <Card className="mt-10">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="font-medium">Payout History</CardTitle>
        </CardHeader>
        <CardContent>
          <PayoutHistory />
        </CardContent>
      </Card>
    </div>
  );
}
