import { requireUser } from "@/lib/requireUser";
import { supabaseServer as db } from "@/lib/supabaseServer";
import { getRecordsAccess } from "@/lib/records/access";
import { expertSpace, operatorMatches, monthStartJst, deliverExpertNotices } from "@/lib/expertServer";
export const dynamic = "force-dynamic";
const uuid = /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i;
const respond = (payload, status = 200) => Response.json(payload, { status, headers: { "Cache-Control": "private, no-store" } });
const problem = (text, status) => respond({ error: text }, status);
async function paid(user) {
  return (await getRecordsAccess(user.id, { userCreatedAt: user.created_at })).entitled;
}
export async function GET(req) {
  try {
    const { user } = await requireUser(req);
    if (!user) return problem("ログインしてください。", 401);
    const q = new URL(req.url).searchParams;
    const staff = operatorMatches(user.id);
    if (q.get("role") === "1") return respond({ staff });
    const manage = q.get("manage") === "1";
    if (manage && !staff) return problem("相談管理を開く権限がありません。", 403);
    const scope = () => {
      const rows = db.from("expert_threads_v127").select("id,turns,created_at,updated_at").eq("space",expertSpace());
      return manage ? rows : rows.eq("user_id",user.id);
    };
    if (q.has("thread")) {
      if (!uuid.test(q.get("thread"))) return problem("相談が見つかりません。",404);
      const thread = await scope().eq("id",q.get("thread")).maybeSingle();
      if (thread.error) throw thread.error;
      if (!thread.data) return problem("相談が見つかりません。",404);
      const messages = await db.from("expert_messages_v127").select("turn,body,created_at").eq("thread_id", thread.data.id).order("turn");
      if (messages.error) throw messages.error;
      return respond({ thread: thread.data, messages: messages.data });
    }
    let list = scope();
    if (manage && q.get("filter") !== "all") list = list.in("turns",[1,3]);
    const offset = Math.max(0,Math.trunc(Number(q.get("offset"))) || 0);
    const result = await list.order("updated_at",{ascending:manage && q.get("filter") !== "all"}).order("id").range(offset,offset+20);
    if (result.error) throw result.error;
    const threads = result.data.slice(0,20);
    // Include only the first user-written line in the inbox preview.
    if (threads.length) {
      const previews = await db.from("expert_messages_v127").select("thread_id,body").eq("turn",1).in("thread_id",threads.map(t => t.id));
      if (previews.error) throw previews.error;
      const titles = new Map(previews.data.map(m => [m.thread_id, m.body.split("\n")[0].slice(0,64)]));
      threads.forEach(t => { t.title = titles.get(t.id); });
    }
    let available = 0, entitled = false;
    if (!manage) {
      const count = await db.from("expert_threads_v127").select("id",{count:"exact",head:true}).eq("space",expertSpace()).eq("user_id",user.id).gte("created_at",monthStartJst());
      if (count.error) throw count.error;
      entitled = await paid(user);
      available = Math.max(0,2-count.count);
    }
    return respond({ threads, more:result.data.length>20, entitled, available, accepting:Boolean(process.env.EXPERT_ADMIN_USER_ID) });
  } catch { return problem("読み込めませんでした。少し待ってもう一度お試しください。",503); }
}
export async function POST(req) {
  try {
    const { user } = await requireUser(req);
    if (!user) return problem("ログインしてください。",401);
    const data = await req.json().catch(() => null);
    const body = typeof data?.body === "string" ? data.body.trim() : "";
    if (!body || [...body].length>1600 || !uuid.test(data?.requestId) || (data.thread != null && !uuid.test(data.thread)))
      return problem("本文を1〜1600文字で入力してください。",400);
    const staff = data.manage === true;
    if (staff && !operatorMatches(user.id)) return problem("相談管理を開く権限がありません。",403);
    if (!process.env.EXPERT_ADMIN_USER_ID) return problem("現在、相談受付の準備中です。",503);
    const result = await db.rpc("expert_send_v127",{p_space:expertSpace(),p_actor:user.id,p_staff:staff,
      p_expected:Number.isInteger(data.expectedTurns) ? data.expectedTurns : -1,
      p_paid: !staff && !data.thread && await paid(user),p_thread:data.thread || null,p_request:data.requestId,p_body:body});
    if (result.error) {
      const errors = { paid_required:[402,"月額プランで質問できます。"], month_limit:[409,"今月の相談枠を使い切りました。"],
        thread_missing:[404,"相談が見つかりません。"],turn_conflict:[409,"相談が更新されました。最新の返信をご確認ください。"],
        duplicate_request:[409,"送信内容を確認してください。"] };
      const entry = errors[result.error.message];
      if (entry) return problem(entry[1],entry[0]);
      throw result.error;
    }
    if (!staff) await deliverExpertNotices(result.data).catch(() => console.warn("expert notification pending"));
    return respond({ threadId:result.data });
  } catch { return problem("送信結果を確認できませんでした。同じ内容でもう一度お試しください。",503); }
}
