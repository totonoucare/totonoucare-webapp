import { NextResponse } from "next/server";
import { requireUser } from "@/lib/requireUser";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getStripeServer } from "@/lib/stripe";
import { stripeModeFromSecret } from "@/lib/stripeMode";
import { RECORDS_SUBSCRIPTION_PRODUCT } from "@/lib/records/policy";
import { stopAccountBilling } from "@/lib/accountBilling";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const live = () => process.env.EXPERT_SPACE === "live" && stripeModeFromSecret() === "live";
const json = (data, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });

export async function GET() {
  return json({ available: live() });
}

export async function DELETE(req) {
  const { user } = await requireUser(req);
  if (!user) return json({ error: "ログインし直してください。" }, 401);
  if (!live()) return json({ error: "退会手続きは本番サイトの設定から行えます。" }, 409);
  const body = await req.json().catch(() => null);
  if (body?.confirm !== "削除する" || body.account !== user.id) {
    return json({ error: "削除するアカウントを確認してください。" }, 400);
  }
  const admin = createAdminClient();
  let billingChecked = false;
  try {
    const lock = await admin.from("account_deletions_v129").upsert({ user_id: user.id }, { ignoreDuplicates: true });
    if (lock.error) throw lock.error;
    const { data, error } = await admin.from("entitlements")
      .select("status,stripe_subscription_id,stripe_livemode").eq("user_id", user.id)
      .eq("source", "stripe").eq("product", RECORDS_SUBSCRIPTION_PRODUCT);
    if (error) throw error;
    await stopAccountBilling({ stripe: getStripeServer(), userId: user.id, rows: data, product: RECORDS_SUBSCRIPTION_PRODUCT });
    billingChecked = true;
    const deleted = await admin.auth.admin.deleteUser(user.id);
    if (deleted.error) throw deleted.error;
    return json({ ok: true });
  } catch (error) {
    console.error("[account.delete]", error.code || error.name || "failed", billingChecked ? "auth" : "billing");
    return json({ error: billingChecked
      ? "請求の停止を確認しました。アカウント削除を完了できなかったため、もう一度お試しください。"
      : "請求状況の確認が完了していません。時間をおいてもう一度お試しください。" }, 503);
  }
}
