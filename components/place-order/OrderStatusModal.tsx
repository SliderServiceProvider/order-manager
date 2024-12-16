"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "../ui/visually-hidden";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

interface OrderStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: "loading" | "success" | "error";
  orderNumber: string;
}

export function OrderStatusModal({
  isOpen,
  onClose,
  status,
  orderNumber,
}: OrderStatusModalProps) {
  const [open, setOpen] = useState(isOpen);

  useEffect(() => {
    setOpen(isOpen);
  }, [isOpen]);

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen === false) {
      return;
    }
    setOpen(newOpen);
    if (!newOpen) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} modal={true}>
      <VisuallyHidden>
        <DialogTitle>Order Status</DialogTitle>
      </VisuallyHidden>
      <DialogContent className="sm:max-w-[425px]">
        <div className="flex flex-col items-center justify-center p-6 text-center">
          {status === "loading" && (
            <>
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <h2 className="mt-4 text-lg font-semibold">
                Your order is being created...
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                This may take a few moments.
              </p>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle className="h-10 w-10 text-green-500" />
              <h2 className="mt-4 text-lg font-semibold">
                Order placed successfully!
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Your order number is: {orderNumber}
              </p>
            </>
          )}

          {status === "error" && (
            <>
              <XCircle className="h-10 w-10 text-red-500" />
              <h2 className="mt-4 text-lg font-semibold text-red-600">
                Something went wrong!
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                We couldn't process your order. Please try again later.
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
