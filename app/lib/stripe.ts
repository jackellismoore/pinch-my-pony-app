// app/lib/stripe.ts
import Stripe from "stripe";

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (stripeInstance) return stripeInstance;

  // Prefer STRIPE_SECRET_KEY (what you have), but allow STRIPE_SECRET_KEY as fallback if needed
  const key = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;

  if (!key) {
    throw new Error("Missing STRIPE_SECRET_KEY in environment");
  }

  // Do NOT pass apiVersion if TypeScript complains – Stripe will default to the SDK’s pinned version
  stripeInstance = new Stripe(key);

  return stripeInstance;
}