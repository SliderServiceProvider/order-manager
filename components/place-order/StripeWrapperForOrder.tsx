"use client";

import React, {
  useState,
  forwardRef,
  useImperativeHandle,
  useRef,
} from "react";
import { loadStripe, StripeElementsOptions } from "@stripe/stripe-js";
import {
  Elements,
  useStripe,
  useElements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
} from "@stripe/react-stripe-js";

const stripePublicKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePmcKey = process.env.NEXT_PUBLIC_STRIPE_PMC_KEY;

if (!stripePublicKey) {
  throw new Error("Stripe public key is not defined");
}

const stripePromise = loadStripe(stripePublicKey);

export interface StripePaymentRef {
  validatePayment: () => Promise<{
    isValid: boolean;
    paymentMethod?: any;
  }>;
}

interface PaymentFormProps {
  amount: number;
}

const PaymentForm = forwardRef<StripePaymentRef, PaymentFormProps>(
  ({ amount }, ref) => {
    const stripe = useStripe();
    const elements = useElements();

    const [error, setError] = useState<{
      cardNumber?: string;
      cardExpiry?: string;
      cardCvc?: string;
    }>({});
    const [isProcessing, setIsProcessing] = useState(false);

    useImperativeHandle(ref, () => ({
      validatePayment: async () => {
        if (!stripe || !elements) {
          setError((prev) => ({
            ...prev,
            cardNumber: "Stripe.js has not loaded yet.",
          }));
          return { isValid: false };
        }

        setIsProcessing(true);
        setError({});

        const cardElement = elements.getElement(CardNumberElement);

        if (!cardElement) {
          setError((prev) => ({
            ...prev,
            cardNumber: "Card element not found",
          }));
          setIsProcessing(false);
          return { isValid: false };
        }

        try {
          const { error, paymentMethod } = await stripe.createPaymentMethod({
            type: "card",
            card: cardElement,
          });

          if (error) {
            setError((prev) => ({
              ...prev,
              cardNumber: error.message,
            }));
            setIsProcessing(false);
            return { isValid: false };
          }

          setIsProcessing(false);
          return {
            isValid: true,
            paymentMethod,
          };
        } catch (err: any) {
          setError((prev) => ({
            ...prev,
            cardNumber: err.message || "An unexpected error occurred",
          }));
          setIsProcessing(false);
          return { isValid: false };
        }
      },
    }));

    const elementStyles = {
      base: {
        color: "#32325d",
        fontFamily: '"Inter", sans-serif',
        fontSize: "16px",
        fontSmoothing: "antialiased",
        "::placeholder": {
          color: "#9ca3af",
        },
        padding: "12px", // Add padding for input fields
      },
      invalid: {
        color: "#e63946",
        iconColor: "#e63946",
      },
    };


    return (
      <div className="space-y-6">
        {/* Card Number Input */}
        <div className="mb-4 p-3 border rounded-lg focus-within:ring-2 focus-within:ring-primary focus-within:border-primary">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Card Number
          </label>
          <CardNumberElement options={{ style: elementStyles }} />
        </div>

        {/* Expiry Date and CVC */}
        <div className="mb-4 grid grid-cols-2 gap-6">
          <div className="p-3 border rounded-lg focus-within:ring-2 focus-within:ring-primary focus-within:border-primary">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Expiry Date
            </label>
            <CardExpiryElement options={{ style: elementStyles }} />
          </div>

          <div className="p-3 border rounded-lg focus-within:ring-2 focus-within:ring-primary focus-within:border-primary">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CVC
            </label>
            <CardCvcElement options={{ style: elementStyles }} />
          </div>
        </div>
      </div>
    );
  }
);

PaymentForm.displayName = "PaymentForm";

const StripeWrapperForOrder = forwardRef<StripePaymentRef, { amount: number }>(
  ({ amount }, ref) => {
    const options: StripeElementsOptions = {
      mode: "payment",
      amount: amount * 100,
      currency: "aed",
      appearance: {
        theme: "stripe",
        variables: {
          colorPrimary: "#3b82f6",
        },
      },
      paymentMethodCreation: "manual",
      paymentMethodConfiguration: stripePmcKey,
    };

    return (
      <Elements stripe={stripePromise} options={options}>
        <PaymentForm ref={ref} amount={amount} />
      </Elements>
    );
  }
);

StripeWrapperForOrder.displayName = "StripeWrapperForOrder";

export default StripeWrapperForOrder;
