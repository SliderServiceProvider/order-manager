"use client";

import { useState, useEffect } from "react";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe, Stripe, StripeElementsOptions } from "@stripe/stripe-js";
import PaymentForm from "./PaymentForm";

const stripePublicKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

if (!stripePublicKey) {
  throw new Error("Stripe public key is not defined");
}

interface paymentProps {
  customerId: number;
  amount: number;
}

const stripePromise = loadStripe(stripePublicKey);

export default function StripeWrapper({ amount, customerId }: paymentProps) {
  const options: StripeElementsOptions = {
    mode: "payment",
    amount,
    currency: "aed",
    appearance: {
      theme: "stripe",
      variables: {
        colorPrimary: "#3b82f6", // Match the blue button color
      },
    },
    paymentMethodCreation: "manual",
    paymentMethodConfiguration: "pmc_1NlnOAGJVwkKJPNnLAIsGdgT",
  };
  return (
    <Elements stripe={stripePromise} options={options}>
      <PaymentForm amount={amount} customerId={customerId} />
    </Elements>
  );
}
