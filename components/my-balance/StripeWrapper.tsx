"use client";

import { useState, useEffect } from "react";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe, Stripe, StripeElementsOptions } from "@stripe/stripe-js";
import StripePaymentForm from "./StripePaymentForm";

const stripePublicKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePmcKey = process.env.NEXT_PUBLIC_STRIPE_PMC_KEY;

if (!stripePublicKey) {
  throw new Error("Stripe public key is not defined");
}

const stripePromise = loadStripe(stripePublicKey);

export default function StripeWrapper() {
  const [amount, setAmount] = useState(200); // Default amount in AED
  const [options, setOptions] = useState<StripeElementsOptions>({
    mode: "payment",
    amount: amount * 100, // Convert to cents
    currency: "aed",
    appearance: {
      theme: "stripe",
      variables: {
        colorPrimary: "#3b82f6",
      },
    },
    paymentMethodCreation: "manual",
    paymentMethodConfiguration: stripePmcKey,
  });

  useEffect(() => {
    setOptions(prevOptions => ({
      ...prevOptions,
      amount: amount * 100, // Update amount when it changes
    }));
  }, [amount]);

  const handleAmountChange = (newAmount: number) => {
    setAmount(newAmount);
  };

  return (
    <Elements stripe={stripePromise} options={options}>
      <StripePaymentForm amount={amount} onAmountChange={handleAmountChange} />
    </Elements>
  );
}

