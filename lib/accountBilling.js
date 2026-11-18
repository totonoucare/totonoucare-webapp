// Older Checkout links were issued before the app started tracking deletion requests.
// Reconcile them directly with Stripe, including sessions completed during deletion.
export async function stopAccountBilling({ stripe, userId, product, rows, now = Date.now() }) {
  const ids = new Set();
  const belongs = obj => obj?.metadata?.supabase_user_id === userId && obj.metadata.product === product;
  for (const row of rows) {
    if (row.stripe_livemode === false) continue;
    if (!row.stripe_subscription_id && row.status !== "canceled") {
      throw new Error("Unresolved legacy billing identity");
    }
    if (row.stripe_subscription_id) ids.add(row.stripe_subscription_id);
  }

  // An open Checkout Session expires within 24h. Include completed sessions
  // from the same window so a delayed webhook or search index cannot hide a subscription.
  const created = { gte: Math.floor(now / 1000) - 48 * 3600 };
  for await (const session of stripe.checkout.sessions.list({ created, limit: 100 })) {
    if (session.mode !== "subscription" || !belongs(session)) continue;
    let current = session;
    if (current.status === "open") {
      try {
        current = await stripe.checkout.sessions.expire(session.id);
      } catch (error) {
        current = await stripe.checkout.sessions.retrieve(session.id);
        if (current.status === "open") throw error;
      }
    }
    if (current.subscription) ids.add(current.subscription);
  }

  for await (const sub of stripe.subscriptions.search({
    query: "metadata['supabase_user_id']:'" + userId + "' AND metadata['product']:'" + product + "'",
    limit: 100,
  })) ids.add(sub.id);

  // Validate ownership of every stored subscription before canceling any of them.
  const active = [];
  for (const id of ids) {
    const sub = await stripe.subscriptions.retrieve(id);
    if (!belongs(sub) || !sub.livemode) throw new Error("Billing identity mismatch");
    if (!["canceled", "incomplete_expired"].includes(sub.status)) active.push(id);
  }
  for (const id of active) {
    const result = await stripe.subscriptions.cancel(id, { prorate: false, invoice_now: false });
    if (result.status !== "canceled") throw new Error("Cancellation not confirmed");
  }
}
