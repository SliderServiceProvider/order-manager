import { loadStripe } from "@stripe/stripe-js";

const stripePublicKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

if (!stripePublicKey) {
  throw new Error("Stripe public key is not defined");
}

export const stripePromise = loadStripe(stripePublicKey);
