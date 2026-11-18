import test from "node:test";
import assert from "node:assert/strict";
import { stopAccountBilling } from "../lib/accountBilling.js";

function fixture() {
  const metadata = { product: "radar_subscription", supabase_user_id: "owner" };
  const sub = { id: "sub_owner", metadata, livemode: true, status: "active" };
  const session = { id: "cs_open", mode: "subscription", metadata, status: "open" };
  const canceled = [], expired = [];
  const stripe = {
    checkout: { sessions: {
      list: () => [session, { ...session, id: "cs_other", metadata: { ...metadata, supabase_user_id: "other" } }],
      expire: async id => { expired.push(id); return { status: "expired" }; },
      retrieve: async () => ({ status: "complete", subscription: sub.id }),
    } },
    subscriptions: {
      search: () => [sub], retrieve: async () => sub,
      cancel: async id => { canceled.push(id); sub.status = "canceled"; return sub; },
    },
  };
  return { stripe, sub, expired, canceled, run: () => stopAccountBilling({ stripe, rows: [], userId: "owner", product: metadata.product }) };
}

test("withdrawal reconciles an open, recently completed and previously canceled subscription", async () => {
  const f = fixture();
  f.stripe.checkout.sessions.expire = async () => { throw Error("already completed"); };
  await f.run(); await f.run();
  assert.deepEqual(f.canceled, ["sub_owner"]);
});

test("withdrawal only expires the owner's Checkout and validates all contracts before cancellation", async () => {
  const f = fixture();
  f.stripe.subscriptions.retrieve = async () => ({ ...f.sub, metadata: { supabase_user_id: "other" } });
  await assert.rejects(f.run(), /mismatch/);
  assert.deepEqual(f.expired, ["cs_open"]); assert.deepEqual(f.canceled, []);
});

test("an unconfirmed Stripe cancellation leaves the deletion pending", async () => {
  const f = fixture();
  f.stripe.subscriptions.cancel = async () => ({ status: "active" });
  await assert.rejects(f.run(), /not confirmed/);
});
