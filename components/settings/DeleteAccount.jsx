"use client";
import { useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { clearPendingDiagnosisAttach } from "@/lib/pendingDiagnosisAttach";
import { clearCheckDraft } from "@/lib/checkRegistration";
import { clearTemporaryResult } from "@/lib/guestExperienceClient";

export default function DeleteAccount({ user, authedFetch }) {
  const dialog = useRef(null);
  const lock = useRef(false);
  const [available, setAvailable] = useState(null);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function open() {
    setError(""); setConfirm(""); setAvailable(null);
    dialog.current.showModal();
    try {
      const response = await authedFetch("/api/account");
      setAvailable(response.available);
    } catch { setError("退会手続きを読み込めませんでした。閉じてもう一度お試しください。"); }
  }
  async function remove(event) {
    event.preventDefault();
    if (lock.current || confirm !== "削除する" || !available) return;
    lock.current = true; setBusy(true); setError("");
    try {
      await authedFetch("/api/account", { method: "DELETE", body: JSON.stringify({ account: user.id, confirm }) });
    } catch (e) {
      setError(e.message); setBusy(false); lock.current = false; return;
    }
    clearTemporaryResult(); clearPendingDiagnosisAttach(); clearCheckDraft();
    try {
      localStorage.removeItem("mibyo-care-navi-shelf-v1");
      sessionStorage.removeItem("mibyo_email_pending");
      sessionStorage.removeItem("mibyo-care-navi-rakuten-cache-v7-food-therapy");
    } catch {}
    try { await supabase.auth.signOut({ scope: "local" }); } finally { window.location.replace("/"); }
  }
  return <div className="mt-4 border-t border-[#E5EBE7] pt-3">
    <button type="button" onClick={open} className="min-h-[44px] text-sm font-semibold text-[#954D41] underline underline-offset-4">アカウントを削除</button>
    <dialog ref={dialog} aria-labelledby="delete-account-heading" onCancel={e => { if (busy) e.preventDefault(); }}
      className="m-auto max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-[400px] overflow-auto rounded-[24px] p-6 text-[#273D34] shadow-xl backdrop:bg-black/40">
      <h2 id="delete-account-heading" className="text-xl font-bold">アカウントの削除</h2>
      <p className="mt-1 break-all text-sm text-[#52695D]">{user.email}</p>
      <p className="my-4 text-sm leading-6">保存したトリセツ、体調記録、AI分析、相談履歴を削除します。削除後の復元はできません。月額プランをご利用中の場合は、退会と同時に解約します。</p>
      <form onSubmit={remove}>
        {available === true && <label className="block text-sm font-bold">続けるには「削除する」と入力してください
          <input className="mt-2 w-full rounded-xl border border-[#C1D0C5] px-3 py-3" value={confirm} disabled={busy}
            onChange={e => setConfirm(e.target.value)} autoComplete="off" />
        </label>}
        {available === null && !error && <p role="status">設定を確認中…</p>}
        {available === false && <p className="rounded-xl bg-[#EDF3EE] p-3 text-sm">この環境は動作確認用です。退会手続きは本番サイトの設定から行えます。</p>}
        {error && <p className="mt-3 text-sm text-[#963F35]" role="alert">{error}</p>}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" autoFocus disabled={busy} onClick={() => dialog.current.close()} className="min-h-[44px] rounded-xl border px-4 font-bold">閉じる</button>
          {available === true && <button disabled={confirm !== "削除する" || busy}
            className="min-h-[44px] rounded-xl bg-[#8F4038] px-4 font-bold text-white disabled:opacity-40">{busy ? "削除中…" : "退会して削除する"}</button>}
        </div>
      </form>
    </dialog>
  </div>;
}
