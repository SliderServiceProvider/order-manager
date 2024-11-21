"use client"
import InvoiceList from '@/components/invoice/InvoiceList';
import { Button } from '@/components/ui/button';
import { IconCreditCardPay } from '@tabler/icons-react';
import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import StripeWrapper from '@/components/stripe/StripeWrapper';
export default function page() {
  const [loading, setLoading] = useState(true);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const handleClick = () => {
    setShowRequestModal(true);
  };

  const invoiceAmount = 1540;

  const handleSubmit = () => {};

  const handleCancelRequest = () => {
    setShowRequestModal(false);
  };
  return (
    <div>
      <div className="page-header flex justify-between">
        <h4 className="text-2xl text-black font-semibold">My Invoices</h4>
        <Button onClick={() => handleClick()} className="bg-black">
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
            <StripeWrapper amount={invoiceAmount} />
          </div>
        </DialogContent>
      </Dialog>
      <div>
        <InvoiceList />
      </div>
    </div>
  );
}
