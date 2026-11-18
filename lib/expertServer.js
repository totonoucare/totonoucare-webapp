import { supabaseServer as db } from "@/lib/supabaseServer";

export const operatorMatches = id => Boolean(id && id === process.env.EXPERT_ADMIN_USER_ID);
export function expertSpace() {
  const space = process.env.EXPERT_SPACE;
  if (!["test", "live"].includes(space)) throw new Error("EXPERT_SPACE");
  return space;
}
export function monthStartJst(date = new Date()) {
  const month = new Date(date.getTime() + 9 * 3600000).toISOString().slice(0, 7);
  return new Date(month + "-01T00:00:00+09:00").toISOString();
}

export async function deliverExpertNotices(threadId) {
  const space = expertSpace();
  let rows = db.from("expert_messages_v127").select("id,thread_id,turn,expert_threads_v127!inner(space,turns)")
    .eq("expert_threads_v127.space", space).in("turn", [1, 3]).is("notified_at", null)
    .order("created_at").limit(threadId ? 2 : 12);
  if (threadId) rows = rows.eq("thread_id", threadId);
  const { data, error } = await rows;
  if (error) throw error;
  for (const m of data) {
    if (m.turn === m.expert_threads_v127.turns) {
      const origin = process.env.EXPERT_APP_URL;
      if (!process.env.RESEND_API_KEY || !process.env.EXPERT_MAIL_FROM || !origin) throw new Error("mail_config");
      const link = new URL("/expert/manage", origin);
      link.searchParams.set("thread", m.thread_id);
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST", signal: AbortSignal.timeout(6000),
        headers: { Authorization: "Bearer " + process.env.RESEND_API_KEY,
          "Content-Type": "application/json", "Idempotency-Key": "expert-" + m.id },
        body: JSON.stringify({ from: process.env.EXPERT_MAIL_FROM, to: ["totonoucare@gmail.com"],
          subject: (space === "test" ? "【テスト】" : "") + "未病レーダーに質問が届きました",
          text: "相談管理で内容を確認して返信してください。\n\n" + link.href }),
      });
      if (!response.ok) throw new Error("mail_delivery");
    }
    const result = await db.from("expert_messages_v127").update({ notified_at: new Date().toISOString() }).eq("id", m.id);
    if (result.error) throw result.error;
  }
  return data.length;
}
