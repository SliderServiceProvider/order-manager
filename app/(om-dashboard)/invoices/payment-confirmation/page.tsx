"use client";
import { useEffect, useState } from "react";
import { useStripe, Elements } from "@stripe/react-stripe-js";
import { stripePromise } from "@/utils/stripe";// Update the path as needed
import { useSearchParams } from "next/navigation";
import { PaymentIntent } from "@stripe/stripe-js";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";
import "../payment-confirmation/payment-success.css";

const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp * 1000); // Convert seconds to milliseconds
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short", // 'short' for abbreviated month like "Nov"
    day: "numeric",
  }).format(date);

  const formattedTime = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: true, // 12-hour format with AM/PM
  }).format(date);

  return `${formattedDate} at ${formattedTime}`;
};



function PaymentConfirmation() {
  const stripe = useStripe();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("loading");
  const [amount, setAmount] = useState(0);
  const [message, setMessage] = useState("");
  const [timeStamp, setTimeStamp] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  // Define the paymentSuccess function to call the backend
  const paymentSuccess = async (paymentIntent: PaymentIntent) => {
    try {
      const formData = {
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
      };
      setAmount(paymentIntent.amount / 100);
      setTimeStamp(paymentIntent.created);
      // Use api.post to send the request to your backend
      const response = await api.post(
        "/order-manager/invoice/paymentSuccess",
        formData
      );

      if (response.status !== 200) {
        throw new Error("Failed to record payment success.");
      }
      console.log("Payment recorded successfully:", response.data);
    } catch (error: any) {
      console.error("Error recording payment:", error.message);
    }
  };

  useEffect(() => {
    // Retrieve the payment_intent_client_secret from URL search params
    const clientSecret = searchParams.get("payment_intent_client_secret");

    if (!stripe || !clientSecret) return;

    // Check the PaymentIntent status
    stripe.retrievePaymentIntent(clientSecret).then(({ paymentIntent }) => {
      if (paymentIntent) {
        switch (paymentIntent.status) {
          case "succeeded":
            setStatus("success");
            setMessage("Thank you! Your payment was successful.");
            paymentSuccess(paymentIntent); // Call paymentSuccess on success
            break;
          case "processing":
            setStatus("processing");
            setMessage("Your payment is processing.");
            break;
          case "requires_payment_method":
            setStatus("failed");
            setMessage(
              "Payment failed. Please try again with a different payment method."
            );
            break;
          default:
            setStatus("unknown");
            setMessage("Something went wrong. Please contact support.");
            break;
        }
      } else {
        setStatus("error");
        setMessage("Unable to retrieve payment details.");
      }
    });
  }, [stripe, searchParams]);

  useEffect(() => {
    // Simulate a delay before showing the success message
    const timer = setTimeout(() => setIsVisible(true), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="payment-confirmation">
      <div className="flex items-center justify-center">
        <div
          className={`transition-opacity duration-500 ${
            isVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          <Card className="w-[350px] fade-in-scale">
            <CardHeader>
              <CardTitle className="text-center text-2xl font-bold text-green-600">
                Payment Successful!
              </CardTitle>
              <CardDescription className="text-center">
                Your transaction has been processed.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <div className="rounded-full bg-green-100 p-3 mb-4 check-circle">
                <Check
                  className="w-12 h-12 text-green-600 check-icon"
                  strokeWidth={3}
                />
              </div>
              <p className="text-center mb-4">
                Thank you for your payment. You will receive a confirmation
                message shortly.
              </p>
              <Button className="w-full text-black">
                <Link href="/invoices">Return to Invoices</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
      {/* <div>
        <div className="flex flex-col items-center justify-start min-h-screen bg-gray-50 dark:bg-gray-900 lg:mt-20">
          <div className="max-w-md w-full space-y-6 p-6 bg-white rounded-lg shadow-lg dark:bg-gray-800">
            <div className="flex flex-col items-center">
              <CircleCheckIcon />
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50 mt-4">
                Payment Confirmation
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-2">{message}</p>
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6 space-y-6">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">
                  Amount Paid:
                </span>
                <span className="font-medium text-gray-900 dark:text-gray-50">
                  {`AED ${amount}`}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">
                  Date &amp; Time:
                </span>
                <span className="font-medium text-gray-900 dark:text-gray-50">
                  {formatTimestamp(timeStamp)}
                </span>
              </div>
            </div>
            <div className="flex justify-center">
              <Button variant="link">
                <Link
                  href={`/my-invoice`}
                  className="text-white"
                  prefetch={false}
                >
                  View Invoice History
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div> */}
    </div>
  );
}

// Wrap PaymentConfirmation in Elements for access to Stripe context
export default function PaymentConfirmationPage() {
  return (
    <Elements stripe={stripePromise}>
      <PaymentConfirmation />
    </Elements>
  );
}

function CircleCheckIcon() {
  return (
    <svg
      className="text-green-500 h-16 w-16"
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
