"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell, { Module } from "@/components/layout/AppShell";
import Button from "@/components/ui/Button";
import { supabase } from "@/lib/supabaseClient";

const TYPE_OPTIONS = [
  { value: "bug", label: "バグ" },
  { value: "display", label: "表示崩れ" },
  { value: "copy", label: "文言の違和感" },
  { value: "care", label: "ケア内容の違和感" },
  { value: "idea", label: "改善アイデア" },
  { value: "other", label: "その他" },
];

const PAGE_OPTIONS = [
  { value: "home", label: "ホーム" },
  { value: "karte", label: "未病カルテ" },
  { value: "radar", label: "未病予報" },
  { value: "guide", label: "使い方ガイド" },
  { value: "settings", label: "設定" },
  { value: "other", label: "その他" },
];

function FieldLabel({ children }) {
  return <label className="mb-2 block text-[12px] font-extrabold text-slate-500">{children}</label>;
}

function SelectField({ value, onChange, options, disabled }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full rounded-[16px] bg-slate-50 px-4 py-3.5 text-sm font-extrabold text-slate-900 outline-none ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-[var(--accent)] disabled:opacity-60"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

function isProbablyEmail(value) {
  if (!value) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function FeedbackPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [type, setType] = useState("bug");
  const [page, setPage] = useState("radar");
  const [message, setMessage] = useState("");
  const [wantsReply, setWantsReply] = useState(false);
  const [contactEmail, setContactEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError("");
        if (!supabase) throw new Error("Supabaseの設定が読み込めませんでした。");
        const { data, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!cancelled) setUser(data?.user || null);
      } catch (e) {
        if (!cancelled) setError(e?.message || "ログイン状態を確認できませんでした。");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const trimmedMessage = message.trim();
  const trimmedContactEmail = contactEmail.trim();
  const canSubmit = useMemo(() => {
    if (!user || submitting) return false;
    if (trimmedMessage.length < 5) return false;
    if (wantsReply && !isProbablyEmail(trimmedContactEmail)) return false;
    return true;
  }, [submitting, trimmedContactEmail, trimmedMessage.length, user, wantsReply]);

  async function handleSubmit() {
    setNotice("");
    setError("");

    if (!supabase) {
      setError("Supabaseの設定が読み込めませんでした。");
      return;
    }
    if (!user) {
      setError("送信にはログインが必要です。");
      return;
    }
    if (trimmedMessage.length < 5) {
      setError("内容をもう少しだけ詳しく書いてください。");
      return;
    }
    if (wantsReply && !isProbablyEmail(trimmedContactEmail)) {
      setError("返信先メールアドレスの形式を確認してください。");
      return;
    }

    setSubmitting(true);
    try {
      const { error: insertError } = await supabase.from("app_feedback").insert({
        user_id: user.id,
        type,
        page,
        message: trimmedMessage,
        contact_email: wantsReply ? trimmedContactEmail || null : null,
        path: typeof window !== "undefined" ? window.location.pathname : "/feedback",
        user_agent: typeof window !== "undefined" ? window.navigator.userAgent : null,
      });
      if (insertError) throw insertError;

      setNotice("送信しました。改善の参考にします。ありがとうございます。");
      setMessage("");
      setWantsReply(false);
      setContactEmail("");
    } catch (e) {
      setError(e?.message || "送信できませんでした。少し時間をおいて再度お試しください。");
    } finally {
      setSubmitting(false);
    }
  }

  const headerLeft = (
    <button
      type="button"
      onClick={() => router.push("/settings")}
      className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-[11px] font-extrabold text-slate-700 shadow-sm ring-1 ring-[var(--ring)] active:scale-[0.99]"
    >
      ← 設定
    </button>
  );

  return (
    <AppShell title="バグ・改善点を報告" subtitle="使いにくさを送る" headerLeft={headerLeft}>
      <Module className="overflow-hidden border-none bg-transparent shadow-none ring-0">
        <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#DDEFE6] via-[#F7FBF8] to-white px-6 py-7 shadow-[0_18px_45px_rgba(37,95,79,0.12)] ring-1 ring-[#BFD9CC]/70">
          <div className="pointer-events-none absolute -right-10 -top-14 h-36 w-36 rounded-full bg-white/80 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-10 h-44 w-44 rounded-full bg-[#8DC7AD]/25 blur-3xl" />
          <div className="relative z-10">
            <div className="inline-flex items-center rounded-full bg-white/85 px-3.5 py-1.5 text-[10px] font-black uppercase tracking-widest text-[#255F4F] shadow-sm ring-1 ring-[#BFD9CC]/70 backdrop-blur-md">
              feedback
            </div>
            <div className="mt-5 text-[24px] font-black leading-[1.32] tracking-tight text-slate-900">
              気づいた違和感を、<br />そのまま送れます。
            </div>
            <div className="mt-3.5 text-[13px] font-bold leading-relaxed text-slate-700/90">
              表示崩れ、文言の違和感、ケア内容の気になる点などを教えてください。メールアドレスや名前は自動送信されません。
            </div>
          </div>
        </div>
      </Module>

      {error ? (
        <Module className="p-5 bg-[#fff7ed] ring-1 ring-orange-100">
          <div className="text-[13px] font-black leading-6 text-orange-800">{error}</div>
        </Module>
      ) : null}

      {notice ? (
        <Module className="p-5 bg-[#E2F1EA]/70 ring-1 ring-[#BFD9CC]/70">
          <div className="text-[13px] font-black leading-6 text-[#255F4F]">{notice}</div>
        </Module>
      ) : null}

      {!loading && !user ? (
        <Module className="p-5 bg-white ring-1 ring-[#D3E1D5] shadow-sm">
          <div className="text-[16px] font-black tracking-tight text-slate-900">ログインが必要です</div>
          <div className="mt-2 text-[12px] font-bold leading-6 text-slate-500">
            報告の送信はログイン中のユーザーに限定しています。スパム防止のため、内部ではログインIDだけ保存します。
          </div>
          <Button className="mt-4 w-full shadow-sm" onClick={() => router.push("/signup")}>
            ログインする
          </Button>
        </Module>
      ) : null}

      <Module className="p-5 bg-white ring-1 ring-[#D3E1D5] shadow-sm">
        <div className="text-[16px] font-black tracking-tight text-slate-900">報告内容</div>
        <div className="mt-1 text-[12px] font-bold leading-5 text-slate-500">
          体調相談や緊急症状の連絡ではなく、アプリの不具合・改善点の報告に使ってください。
        </div>

        <div className="mt-5 grid gap-4">
          <div>
            <FieldLabel>種別</FieldLabel>
            <SelectField value={type} onChange={setType} options={TYPE_OPTIONS} disabled={!user || submitting || loading} />
          </div>

          <div>
            <FieldLabel>該当ページ</FieldLabel>
            <SelectField value={page} onChange={setPage} options={PAGE_OPTIONS} disabled={!user || submitting || loading} />
          </div>

          <div>
            <FieldLabel>内容</FieldLabel>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 1200))}
              disabled={!user || submitting || loading}
              rows={7}
              placeholder="例：未病予報の食べるタブで、文が少し長く感じた / ツボ詳細の説明が分かりにくかった など"
              className="w-full resize-none rounded-[18px] bg-slate-50 px-4 py-3.5 text-sm font-bold leading-6 text-slate-900 outline-none ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-[var(--accent)] disabled:opacity-60"
            />
            <div className="mt-1.5 text-right text-[10px] font-extrabold text-slate-400">
              {message.length}/1200
            </div>
          </div>

          <label className="flex items-start gap-3 rounded-[18px] bg-[#E2F1EA]/55 p-4 ring-1 ring-[#BFD9CC]/70">
            <input
              type="checkbox"
              checked={wantsReply}
              onChange={(e) => setWantsReply(e.target.checked)}
              disabled={!user || submitting || loading}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-[var(--accent)] focus:ring-[var(--accent)]"
            />
            <span className="min-w-0">
              <span className="block text-[12px] font-black text-[#255F4F]">返信を希望する</span>
              <span className="mt-1 block text-[11px] font-bold leading-5 text-slate-600">
                通常は返信なしで受け取ります。必要な場合だけ、下に連絡先を入力してください。
              </span>
            </span>
          </label>

          {wantsReply ? (
            <div>
              <FieldLabel>返信先メールアドレス</FieldLabel>
              <input
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value.slice(0, 160))}
                disabled={!user || submitting || loading}
                inputMode="email"
                autoComplete="email"
                placeholder="example@example.com"
                className="w-full rounded-[16px] bg-slate-50 px-4 py-3.5 text-sm font-extrabold text-slate-900 outline-none ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-[var(--accent)] disabled:opacity-60"
              />
            </div>
          ) : null}
        </div>

        <Button onClick={handleSubmit} disabled={!canSubmit} className="mt-5 w-full shadow-sm">
          {submitting ? "送信中…" : "送信する"}
        </Button>
      </Module>
    </AppShell>
  );
}
