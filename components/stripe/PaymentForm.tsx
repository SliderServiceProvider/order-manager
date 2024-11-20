"use client";

import { useState } from "react";
import {
  Elements,
  useStripe,
  useElements,
  PaymentElement,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
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

const stripePublicKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

if (!stripePublicKey) {
  throw new Error("Stripe public key is not defined");
}

interface paymentProps {
  customerId: number;
  amount: number;
}

const stripePromise = loadStripe(stripePublicKey);

export default function PaymentForm({ amount, customerId }: paymentProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // First, submit the payment form to validate all fields
      if (!elements) {
        throw new Error("Elements have not loaded. Please try again.");
      }
      const submitResult = await elements.submit();
      if (submitResult.error) {
        throw new Error(submitResult.error.message ?? "Validation failed");
      }

      // Create the payment request using your existing API
      const formData = {
        customerId: customerId, // Example amount in cents
        amount: amount, // Example amount in cents
        currency: "aed",
      };

      const response = await api.post("/invoice/createPaymentIntent", formData);
      const { clientSecret } = response.data;

      if (!stripe) {
        throw new Error("Stripe hasn't loaded yet. Please try again.");
      }

      let confirmationPageurl = `${window.location.origin}/my-invoice/payment-confirmation`;

      if (customerId) {
        confirmationPageurl = `${window.location.origin}/order-manager/payment-confirmation?id=${customerId}`;
      }
      // Confirm the payment, passing the country data explicitly
      const result = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: {
          return_url: confirmationPageurl,
          payment_method_data: {
            billing_details: {
              address: {
                country: "AE", // Set the country explicitly
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

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-black">Invoice Payment</CardTitle>
        <CardDescription>
          Enter your card information to complete the payment.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name on Card</Label>
            <Input id="name" placeholder="John Doe" required />
          </div>
          <div className="space-y-2">
            <PaymentElement
              options={{
                fields: {
                  billingDetails: {
                    address: {
                      country: "never", // This hides the country field
                    },
                  },
                },
                defaultValues: {
                  billingDetails: {
                    address: {
                      country: "AE", // Set UAE as the default country
                    },
                  },
                },
              }}
              id="card-element"
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button
            type="submit"
            className="w-full mt-4"
            disabled={!stripe || loading}
          >
            {loading
              ? "Processing..."
              : `Pay Now AED ${(amount / 100).toFixed(2)}`}
          </Button>
        </CardFooter>
      </form>
      {error && <p className="text-red-500 text-center mt-4">{error}</p>}
    </Card>
  );
}
