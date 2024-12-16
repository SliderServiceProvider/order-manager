"use client"
import OrderForm from '@/components/place-order/OrderForm';
import React from 'react'
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";

const stripePublicKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePmcKey = process.env.NEXT_PUBLIC_STRIPE_PMC_KEY;

if (!stripePublicKey) {
  throw new Error("Stripe public key is not defined");
}

const stripePromise = loadStripe(stripePublicKey);

export default function page() {
  return (
    <Elements stripe={stripePromise}>
      <OrderForm deliveryType="cod" />
    </Elements>
  );
}
