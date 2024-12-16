"use client";
import { PayoutHistory } from "@/components/payouts/PayoutHistory";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/services/api";
import { IconCurrencyDirham } from "@tabler/icons-react";
import React, { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { BalanceHistory } from "@/components/my-balance/BalanceHistory";
import StripeWrapper from "@/components/my-balance/StripeWrapper";

interface BalanceSummaryProps {
  availableTopUpBalance: string;
}
export default function page() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false); // Loading for submit button
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [amount, setAmount] = useState<string>(""); // State for amount input
  const [balanceSummary, setBalanceSummary] = useState<BalanceSummaryProps>();
  const [refreshTable, setRefreshTable] = useState(false); // Track table refresh

  const fetchPayoutSummary = async () => {
    setLoading(true);
    try {
      const response = await api.get("/order-manager/getBalanceSummary");
      const data = response.data;
      setBalanceSummary(data);
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

  const handleClick = () => {
    setShowRequestModal(true);
  };

  const handleSubmit = async () => {
    setSubmitLoading(true); // Start loading
    try {
      const response = await api.post("/order-manager/createPayoutRequest", {
        amount: parseFloat(amount), // Convert input string to float
      });
      const responseData = response.data;
      // alert("Order cancellation submitted successfully.");
      if (responseData.success == true) {
        toast({
          className: cn("bg-green-500 text-white"),
          title: "Success",
          description: responseData.message,
          variant: "default",
        });
        setShowRequestModal(false);
        fetchPayoutSummary(); // Refresh data
        setRefreshTable(true); // Trigger table refresh
      } else {
        toast({
          variant: "destructive",
          title: "Submission failed",
          description:
            responseData.message || "Failed to submit payout request.",
        });
        setSubmitLoading(false); // End loading
      }
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message || "There was a problem with your request.";
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: errorMessage,
        action: <ToastAction altText="Try again">Try again</ToastAction>,
      });
      setSubmitLoading(false); // End loading
    }
  };

  const handleCancelRequest = () => {
    setShowRequestModal(false);
  };

  const topupAmount = 200;

  const amountInSubunits = Math.round(topupAmount * 100);

  return (
    <div>
      <div className="page-header flex justify-between">
        <h4 className="text-2xl text-black font-semibold">My Balance</h4>
        <Button onClick={() => handleClick()} className="bg-black text-white">
          Top Up Balance
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">
              Available To Up Balance
            </CardTitle>
            <IconCurrencyDirham className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {balanceSummary?.availableTopUpBalance}
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Create Payout Request Modal */}
      <Dialog open={showRequestModal} onOpenChange={setShowRequestModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Top Up Balance</DialogTitle>
          </DialogHeader>
          <div>
            <StripeWrapper/>
          </div>
        </DialogContent>
      </Dialog>
      {/* Payout History */}
      <BalanceHistory refreshTrigger={refreshTable} />
    </div>
  );
}
