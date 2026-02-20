import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // apiVersion omitted on purpose (avoids TS union/version mismatch)
});