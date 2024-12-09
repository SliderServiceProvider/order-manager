"use client";

import { AlertTriangle, Monitor, CreditCard, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
} from "@/components/ui/dialog";
import { DialogTitle } from "@radix-ui/react-dialog";
import Link from "next/link";

interface InvoiceReminder {
  type: string;
  message: string;
}

interface WarningModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceReminder: InvoiceReminder | null;
  isAccountLocked: boolean;
}

export default function WarningModal({
  open,
  onOpenChange,
  invoiceReminder,
  isAccountLocked,
}: WarningModalProps) {
  const getIcon = () => {
    switch (invoiceReminder?.type) {
      case "reminder":
        return <CreditCard className="h-12 w-12 text-yellow-500" />;
      case "account_locked":
        return <Lock className="h-12 w-12 text-red-500" />;
      default:
        return <Monitor className="h-12 w-12 text-yellow-500" />;
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isAccountLocked && !newOpen) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => {
          e.preventDefault();
        }}
      >
        <DialogTitle></DialogTitle>
        <DialogHeader className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="absolute inset-0 bg-yellow-100 rounded-full scale-150 opacity-20" />
            <div className="relative bg-yellow-50 rounded-full p-4">
              {getIcon()}
            </div>
          </div>
        </DialogHeader>
        <div className="flex items-start space-x-2 p-2 rounded-lg bg-orange-50 mt-2">
          <AlertTriangle className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
          <DialogDescription className="text-base text-foreground">
            {invoiceReminder?.message}
          </DialogDescription>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          {/* if account is locked then show Link button */}
          {isAccountLocked ? (
            <Button
              variant="link"
              className="flex-1 bg-primary text-white text-black"
            >
              <Link href="/dashboard">View Dashboard</Link>
            </Button>
          ) : (
            <Button
              variant="ghost"
              className="flex-1 bg-gray-100 hover:bg-primary text-black"
              onClick={() => onOpenChange(false)}
            >
              Pay Later
            </Button>
          )}
          <Button
            variant="link"
            className="flex-1 bg-black hover:bg-gray-900 text-white"
          >
            <Link href="/invoices">Proceed to Payment</Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
