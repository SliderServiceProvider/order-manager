"use client";
import { Button } from "@/components/ui/button";
import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import api from "@/services/api";

import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { MessageSquareWarning } from "lucide-react";
import { TicketHistory } from "@/components/order-support/TicketHistory";
import { IconHelpCircle } from "@tabler/icons-react";

export default function page() {
  const { toast } = useToast();
  const [showSupportModal, setShowSupprtModal] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string>(); // Loading for submit button
  const [orderRemarks, setOrderRemarks] = useState<string>(); // Loading for submit button
  const [refreshTable, setRefreshTable] = useState(false); // Track table refresh
  const [submitLoading, setSubmitLoading] = useState(false); // Loading for submit button

  const handleClick = () => {
    setShowSupprtModal(true);
  };
  const handleCancelRequest = () => {
    setShowSupprtModal(false);
  };

  const handleSubmit = async () => {
    setSubmitLoading(true); // Start loading
    // Form Validation
    // Form Validation
    if (!orderNumber || orderNumber.trim() === "") {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Order Number is required.",
      });
      setSubmitLoading(false);
      return;
    }

    if (!orderRemarks || orderRemarks.trim() === "") {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Order Remarks are required.",
      });
      setSubmitLoading(false);
      return;
    }
    try {
      const response = await api.post("/order-manager/reportOrder", {
        order_number: orderNumber, // Convert input string to float
        order_remarks: orderRemarks, // Convert input string to float
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
        setShowSupprtModal(false);
        setRefreshTable(true); // Trigger table refresh
      } else {
        toast({
          variant: "destructive",
          title: "Submission failed.",
          description: responseData.message || "Failed to submit request.",
        });
        setSubmitLoading(false); // End loading
      }
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message || "There was a problem with your request.";
      toast({
        variant: "destructive",
        title: "Submission failed.",
        description: errorMessage,
      });
      setSubmitLoading(false); // End loading
    }
  };

  return (
    <>
      <div className="page-header flex justify-between">
        <h4 className="text-2xl text-black font-semibold">Order Support</h4>
        <Button onClick={() => handleClick()} className="bg-black text-white">
          <IconHelpCircle /> Create Ticket
        </Button>
      </div>
      {/* Create Payout Request Modal */}
      <Dialog open={showSupportModal} onOpenChange={setShowSupprtModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Ticket</DialogTitle>
          </DialogHeader>
          <div className="form-group">
            <Label htmlFor="orderRemarks">Order Number</Label>
            <Input onChange={(e) => setOrderNumber(e.target.value)} />
          </div>
          <div className="form-group">
            <Label htmlFor="orderRemarks">Remarks</Label>
            <Textarea
              className="min-h-28"
              onChange={(e) => setOrderRemarks(e.target.value)}
            ></Textarea>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelRequest}>
              Cancel
            </Button>
            <Button
              className="bg-black text-white"
              onClick={handleSubmit}
              disabled={submitLoading || !orderNumber || !orderRemarks} // Disable if loading or no amount
            >
              {submitLoading ? "Submitting..." : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Ticket History */}
      <TicketHistory refreshTrigger={refreshTable} />
    </>
  );
}
