import { createAdminClient } from "@/lib/supabaseAdmin";

export function normalizePushSubscription(raw) {
  const endpoint = String(raw?.endpoint || "").trim();
  const p256dh = String(raw?.keys?.p256dh || raw?.p256dh || "").trim();
  const auth = String(raw?.keys?.auth || raw?.auth || "").trim();
  const expirationTime = raw?.expirationTime ?? raw?.expiration_time ?? null;

  if (!endpoint) throw new Error("Push subscription endpoint is required");
  if (!p256dh) throw new Error("Push subscription keys.p256dh is required");
  if (!auth) throw new Error("Push subscription keys.auth is required");

  return {
    endpoint,
    p256dh,
    auth,
    expiration_time: expirationTime ? new Date(expirationTime).toISOString() : null,
  };
}

export async function upsertPushSubscription({ userId, subscription, userAgent }) {
  if (!userId) throw new Error("upsertPushSubscription: userId is required");
  const supabase = createAdminClient();
  const normalized = normalizePushSubscription(subscription);

  const row = {
    user_id: userId,
    endpoint: normalized.endpoint,
    p256dh: normalized.p256dh,
    auth: normalized.auth,
    expiration_time: normalized.expiration_time,
    user_agent: userAgent || null,
    is_active: true,
    last_error: null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("push_subscriptions")
    .upsert(row, { onConflict: "endpoint" })
    .select("*")
    .single();

  if (error) throw new Error(`upsertPushSubscription failed: ${error.message}`);

  await upsertNotificationSettings({
    userId,
    enabled: true,
    nightEnabled: true,
    morningEnabled: true,
    minScore: 6,
  });

  return data;
}

export async function deactivatePushSubscriptionByEndpoint({ userId, endpoint, reason }) {
  if (!endpoint) return null;
  const supabase = createAdminClient();

  let query = supabase
    .from("push_subscriptions")
    .update({
      is_active: false,
      last_error: reason || null,
      updated_at: new Date().toISOString(),
    })
    .eq("endpoint", endpoint);

  if (userId) query = query.eq("user_id", userId);

  const { data, error } = await query.select("*");
  if (error) throw new Error(`deactivatePushSubscriptionByEndpoint failed: ${error.message}`);
  return data || [];
}

export async function getActivePushSubscriptions({ userId }) {
  if (!userId) throw new Error("getActivePushSubscriptions: userId is required");
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(`getActivePushSubscriptions failed: ${error.message}`);
  return data || [];
}

export async function upsertNotificationSettings({
  userId,
  enabled,
  nightEnabled,
  morningEnabled,
  minScore,
}) {
  if (!userId) throw new Error("upsertNotificationSettings: userId is required");
  const supabase = createAdminClient();

  const row = {
    user_id: userId,
    updated_at: new Date().toISOString(),
  };
  if (typeof enabled === "boolean") row.enabled = enabled;
  if (typeof nightEnabled === "boolean") row.night_enabled = nightEnabled;
  if (typeof morningEnabled === "boolean") row.morning_enabled = morningEnabled;
  if (Number.isFinite(Number(minScore))) row.min_score = Math.max(0, Math.min(10, Math.round(Number(minScore))));

  const { data, error } = await supabase
    .from("notification_settings")
    .upsert(row, { onConflict: "user_id" })
    .select("*")
    .single();

  if (error) throw new Error(`upsertNotificationSettings failed: ${error.message}`);
  return data;
}

export async function getNotificationSettings({ userId }) {
  if (!userId) throw new Error("getNotificationSettings: userId is required");
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("notification_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(`getNotificationSettings failed: ${error.message}`);
  return data || null;
}

export async function getNotificationTargets({ kind, limit = 25, userId = null }) {
  const supabase = createAdminClient();
  const enabledColumn = kind === "night" ? "night_enabled" : "morning_enabled";

  let query = supabase
    .from("notification_settings")
    .select("*")
    .eq("enabled", true)
    .eq(enabledColumn, true)
    .order("updated_at", { ascending: false })
    .limit(Math.max(1, Math.min(100, Number(limit) || 25)));

  if (userId) query = query.eq("user_id", userId);

  const { data, error } = await query;
  if (error) throw new Error(`getNotificationTargets failed: ${error.message}`);
  return data || [];
}

export async function getNotificationLog({ userId, targetDate, kind }) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("notification_logs")
    .select("*")
    .eq("user_id", userId)
    .eq("target_date", targetDate)
    .eq("notification_type", kind)
    .maybeSingle();

  if (error) throw new Error(`getNotificationLog failed: ${error.message}`);
  return data || null;
}

export async function insertNotificationLog({
  userId,
  forecastId = null,
  targetDate,
  kind,
  score = null,
  status,
  payload = {},
  errorMessage = null,
}) {
  const supabase = createAdminClient();

  const row = {
    user_id: userId,
    forecast_id: forecastId,
    target_date: targetDate,
    notification_type: kind,
    score_0_10: Number.isFinite(Number(score)) ? Number(score) : null,
    status,
    payload,
    error_message: errorMessage,
    sent_at: status === "sent" ? new Date().toISOString() : null,
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("notification_logs")
    .insert(row)
    .select("*")
    .single();

  if (error) {
    if (String(error.code) === "23505") return null;
    throw new Error(`insertNotificationLog failed: ${error.message}`);
  }

  return data;
}
