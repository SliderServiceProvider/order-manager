"use client";
import InvoiceList from "@/components/invoice/InvoiceList";
import { Button } from "@/components/ui/button";
import { IconCreditCardPay } from "@tabler/icons-react";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import StripeWrapper from "@/components/stripe/StripeWrapper";
import api from "@/services/api";
import { useAppSelector } from "@/hooks/useAuth";
import { log } from "node:console";
export default function page() {
  const isShowInvoices = useAppSelector(
    (state) => state.auth.user?.isShowInvoices
  ); // Access isInvoiceUser from Redux state
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [isLoading, setIsLoading] = useState<boolean>(true); // Initial loading state
  const [showRequestModal, setShowRequestModal] = useState(false);
  const handleClick = () => {
    setShowRequestModal(true);
  };

  const [invoiceAmount, setInvoiceAmount] = useState<number>(0);

  const fetchInvoiceAmount = async () => {
    try {
      const response = await api.get("/order-manager/getInvoiceAmount");

      const amount = response.data?.data; // Access the nested "data" field

      setInvoiceAmount(amount ?? 0); // Default to 0 if null
    } catch (error) {
      setInvoiceAmount(0); // Fallback in case of error
    } finally {
      setIsLoading(false); // Loading complete
      setLoading(false); // Loading complete
    }
  };

  // Fetch the fetchPayoutSummary on mount
  useEffect(() => {
    fetchInvoiceAmount();
  }, []);

  useEffect(() => {
    if (!isShowInvoices) {
      router.push("/dashboard");
    }
  }, [isShowInvoices, router]);

  const amountInSubunits = Math.round(invoiceAmount * 100);

  const handleCancelRequest = () => {
    setShowRequestModal(false);
  };

  return (
    <div>
      <div className="page-header flex justify-between">
        <h4 className="text-2xl text-black font-semibold">My Invoices</h4>
        <Button
          onClick={handleClick}
          className={`bg-black ${
            isLoading || invoiceAmount === 0
              ? "opacity-50 cursor-not-allowed"
              : ""
          }`}
          disabled={isLoading || invoiceAmount === 0} // Disable button if loading or amount is 0
        >
          <IconCreditCardPay /> Pay Invoice
        </Button>
      </div>
      {/* Payment Modal */}
      <Dialog open={showRequestModal} onOpenChange={setShowRequestModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invoice Payment</DialogTitle>
          </DialogHeader>
          <div>
            <StripeWrapper amount={amountInSubunits} />
          </div>
        </DialogContent>
      </Dialog>
      <div>
        {loading && <p>Loading...</p>}
        <InvoiceList />
      </div>
    </div>
  );
}
