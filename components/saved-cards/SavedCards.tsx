"use client";

import { useState, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, CreditCard, Edit, Trash } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { Card as CardType, CardFormData } from "@/types/card";
import api from "@/services/api";

import { useToast } from "@/hooks/use-toast";
import { AddCardModal } from "./AddCardModal";
import { cn } from "@/lib/utils";

export function SavedCards() {
  const { toast } = useToast();
  const [cards, setCards] = useState<CardType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingCard, setEditingCard] = useState<CardType | null>(null);
  const [deletingCard, setDeletingCard] = useState<CardType | null>(null);
  const [formData, setFormData] = useState<CardFormData>({
    payment_method_id: "",
    exp_month: 1,
    exp_year: new Date().getFullYear(),
  });
  const closeDialogRef = useRef<HTMLButtonElement>(null);
  const [isAddCardModalOpen, setIsAddCardModalOpen] = useState(false);

  useEffect(() => {
    fetchCards();
  }, []);

  const handleAddCard = (card: CardType) => {
    setCards([...cards, card]);
    setIsAddCardModalOpen(false);
    toast({
      title: "Success",
      description: "New card added successfully",
      variant: "default",
    });
  };

  const fetchCards = async () => {
    setLoading(true);
    try {
      const response = await api.get("/saved-payment-methods");
      const data = response.data.cards;
      setCards(data);
    } catch (error: any) {
      console.error("Error fetching cards:", error);
      // Check if the error message is "User has no Stripe account"
      if (error?.response?.data?.message === "User has no Stripe account") {
        // Instead of showing an error, set cards to an empty array.
        setCards([]);
      } else {
        setError("An error occurred while fetching the cards.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (card: CardType) => {
    setEditingCard(card);
    setFormData({
      payment_method_id: card.id,
      exp_month: card.exp_month,
      exp_year: card.exp_year,
    });
  };

  const handleRemove = async (cardId: string) => {
    try {
      const response = await api.post("/delete-payment-method", {
        payment_method_id: cardId,
      });
      const responseData = response.data;
      
      if (responseData.status === "success") {
        setCards((prevCards) => prevCards.filter((card) => card.id !== cardId));
        toast({
          className: cn("bg-green-500 text-white"),
          title: "Success",
          description: responseData.message,
          variant: "default",
        });
      } else {
        setError("An error occurred while removing the card.");
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred while removing the card.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCard) return;

    try {
      const response = await api.put("/cards", {
        payment_method_id: formData.payment_method_id,
        exp_month: formData.exp_month,
        exp_year: formData.exp_year,
      });

      const updatedCard = response.data.card;

      toast({
        className: cn("bg-green-500 text-white"),
        title: "Success",
        description: response.data.message,
        variant: "default",
      });
      setCards(
        cards.map((card) =>
          card.id === updatedCard.id ? { ...card, ...updatedCard } : card
        )
      );
      setEditingCard(null);
      closeDialogRef.current?.click(); // Close the dialog
    } catch (err) {
      console.log(err);

      setError("An error occurred while updating the card.");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">Loading...</div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="page-header flex justify-between items-center">
        <h4 className="text-2xl text-black font-semibold">Saved Cards</h4>
        {/* <Button
          onClick={() => setIsAddCardModalOpen(true)}
          className="bg-black"
        >
          Add New Card
        </Button> */}
      </div>
      {cards.length === 0 ? (
        <p>You have no saved cards.</p>
      ) : (
        cards.map((card) => (
          <Card key={card.id}>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="mr-2" />
                {card.brand.charAt(0).toUpperCase() +
                  card.brand.slice(1)} **** {card.last4}
              </CardTitle>
              <CardDescription>
                Expires {card.exp_month}/{card.exp_year}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {card.is_default && <p>Default Card</p>}
              {card.card_holder_name && (
                <p>Name on card: {card.card_holder_name}</p>
              )}
            </CardContent>
            <CardFooter className="flex justify-end space-x-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(card)}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Card</DialogTitle>
                    <DialogDescription>
                      Update the expiration date of your card here. Click save
                      when you're done.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="expMonth" className="text-right">
                          Exp Month
                        </Label>
                        <Input
                          id="expMonth"
                          value={formData.exp_month}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              exp_month: Number.parseInt(e.target.value),
                            })
                          }
                          className="col-span-3"
                          type="number"
                          min="1"
                          max="12"
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="expYear" className="text-right">
                          Exp Year
                        </Label>
                        <Input
                          id="expYear"
                          value={formData.exp_year}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              exp_year: Number.parseInt(e.target.value),
                            })
                          }
                          className="col-span-3"
                          type="number"
                          min={new Date().getFullYear()}
                          max={new Date().getFullYear() + 20}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit" className="bg-black">
                        Save changes
                      </Button>
                    </DialogFooter>
                  </form>
                  <DialogClose ref={closeDialogRef} />
                </DialogContent>
              </Dialog>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeletingCard(card)}
                  >
                    <Trash className="w-4 h-4 mr-2" />
                    Remove
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Are you sure you want to remove this card?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete
                      your saved card information.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setDeletingCard(null)}>
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-black"
                      onClick={() =>
                        deletingCard && handleRemove(deletingCard.id)
                      }
                    >
                      Remove
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardFooter>
          </Card>
        ))
      )}
      <AddCardModal
        isOpen={isAddCardModalOpen}
        onClose={() => setIsAddCardModalOpen(false)}
        onCardAdded={handleAddCard}
      />
    </div>
  );
}
