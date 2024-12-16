"use client";

import { useState, useEffect } from "react";
import {
  useStripe,
  useElements,
  PaymentElement,
} from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/services/api";

interface PaymentProps {
  amount: number;
  onAmountChange: (amount: number) => void;
}

export default function StripePaymentForm({
  amount,
  onAmountChange,
}: PaymentProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!elements) {
        throw new Error("Elements have not loaded. Please try again.");
      }
      const submitResult = await elements.submit();
      if (submitResult.error) {
        throw new Error(submitResult.error.message ?? "Validation failed");
      }

      const formData = {
        amount: amount * 100, // Convert to cents
        currency: "aed",
      };

      const response = await api.post(
        "/order-manager/topup/createPaymentIntent",
        formData
      );
      const { clientSecret } = response.data;

      if (!stripe) {
        throw new Error("Stripe hasn't loaded yet. Please try again.");
      }

      let confirmationPageurl = `${window.location.origin}/my-balance/payment-confirmation`;

      const result = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: {
          return_url: confirmationPageurl,
          payment_method_data: {
            billing_details: {
              address: {
                country: "AE",
              },
            },
          },
        },
      });

      if (result.error) {
        throw new Error(result.error.message ?? "Payment failed");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAmountInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newAmount = parseFloat(e.target.value);
    if (!isNaN(newAmount) && newAmount > 0) {
      onAmountChange(newAmount);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit}>
        <div className="py-4">
          <div className="space-y-2 mb-3">
            <Label htmlFor="amount">Enter Amount (AED)</Label>
            <Input
              id="amount"
              type="number"
              min="200"
              step="100"
              value={amount}
              onChange={handleAmountInputChange}
              required
            />
          </div>
          <div className="space-y-2">
            <PaymentElement
              options={{
                fields: {
                  billingDetails: {
                    address: {
                      country: "never",
                    },
                  },
                },
                defaultValues: {
                  billingDetails: {
                    address: {
                      country: "AE",
                    },
                  },
                },
              }}
              id="card-element"
            />
          </div>
        </div>
        <div>
          <Button
            type="submit"
            className="bg-black text-white w-full mt-4 h-12"
            disabled={!stripe || loading}
          >
            {loading ? "Processing..." : `Pay Now AED ${amount.toFixed(2)}`}
          </Button>
        </div>
      </form>
      {error && <p className="text-red-500 text-center mt-4">{error}</p>}
    </>
  );
}
