import { NextResponse } from "next/server";
import { getStripeServer } from "@/lib/stripe";
import {
  syncStripeCheckoutSession,
  syncStripeInvoice,
  syncStripeSubscription,
} from "@/lib/stripeSubscription";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const stripe = getStripeServer();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      return NextResponse.json(
        { error: "STRIPE_WEBHOOK_SECRET is not set" },
        { status: 500 }
      );
    }

    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 }
      );
    }

    const body = await req.text();

    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (error) {
      console.error("[stripe.webhook.verify]", error);
      return NextResponse.json(
        { error: `Webhook Error: ${error.message}` },
        { status: 400 }
      );
    }

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          await syncStripeCheckoutSession(event.data.object, {
            ignoreOtherProduct: true,
          });
          break;
        }

        case "customer.subscription.updated":
        case "customer.subscription.created":
        case "customer.subscription.deleted": {
          await syncStripeSubscription(event.data.object, {
            ignoreOtherProduct: true,
          });
          break;
        }

        case "invoice.paid":
        case "invoice.payment_failed":
        case "invoice.payment_action_required": {
          await syncStripeInvoice(event.data.object, {
            ignoreOtherProduct: true,
          });
          break;
        }

        default: {
          console.log("[stripe.webhook] unhandled event:", event.type);
          break;
        }
      }

      return NextResponse.json({ received: true });
    } catch (error) {
      console.error("[stripe.webhook.handle]", error);
      return NextResponse.json(
        { error: error?.message || "Webhook handler failed" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[stripe.webhook.fatal]", error);
    return NextResponse.json(
      { error: error?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
