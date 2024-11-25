"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "../ui/visually-hidden";
import { Loader2, CheckCircle } from "lucide-react";

interface OrderStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: "loading" | "success";
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
    // Only allow closing if it's not through clicking outside
    // The Dialog will still allow closing via Escape key
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
          {status === "loading" ? (
            <>
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <h2 className="mt-4 text-lg font-semibold">
                Your order is being created...
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                This may take a few moments.
              </p>
            </>
          ) : (
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
