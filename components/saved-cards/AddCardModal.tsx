"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import api from "@/services/api";

interface AddCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCardAdded: (card: any) => void;
}

export function AddCardModal({
  isOpen,
  onClose,
  onCardAdded,
}: AddCardModalProps) {
  const { toast } = useToast();
  const [cardHolderName, setCardHolderName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expMonth, setExpMonth] = useState("");
  const [expYear, setExpYear] = useState("");
  const [cvc, setCvc] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await api.post("/add-payment-method", {
        card_number: cardNumber,
        exp_month: Number.parseInt(expMonth),
        exp_year: Number.parseInt(expYear),
        cvc: cvc,
      });

      if (response.data.status === "success") {
        toast({
          title: "Success",
          description: "Card added successfully",
          variant: "default",
        });
        onCardAdded(response.data.card);
        onClose(); // Close the modal after successful addition
        // Reset form fields
        setCardNumber("");
        setExpMonth("");
        setExpYear("");
        setCvc("");
      } else {
        throw new Error(response.data.message || "Failed to add card");
      }
    } catch (error:any) {
      toast({
        title: "Error",
        description: error.message || "An error occurred while adding the card",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Card</DialogTitle>
          <DialogDescription>
            Enter your card details to add a new payment method.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="cardHolderName" className="text-right">
                Card Holder Name
              </Label>
              <Input
                id="cardHolderName"
                value={cardHolderName}
                onChange={(e) => setCardHolderName(e.target.value)}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="cardNumber" className="text-right">
                Card Number
              </Label>
              <Input
                id="cardNumber"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="expMonth" className="text-right">
                Exp Month
              </Label>
              <Input
                id="expMonth"
                value={expMonth}
                onChange={(e) => setExpMonth(e.target.value)}
                className="col-span-3"
                type="number"
                min="1"
                max="12"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="expYear" className="text-right">
                Exp Year
              </Label>
              <Input
                id="expYear"
                value={expYear}
                onChange={(e) => setExpYear(e.target.value)}
                className="col-span-3"
                type="number"
                min={new Date().getFullYear()}
                max={new Date().getFullYear() + 20}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" className="bg-black">
              Add Card
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
