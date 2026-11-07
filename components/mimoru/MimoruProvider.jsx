"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { GuideBotAvatar } from "@/components/illust/home/HeroGuideBot";
import { useLiveSupport, LiveSupportView } from "@/components/records/LiveSupportPanel";
import { trackJourney } from "@/lib/journeyClient";

const Context = createContext(null);
export const useMimoru = () => useContext(Context);

export default function MimoruProvider({ children }) {
  const [userId, setUserId] = useState(null);
  useEffect(() => {
    let alive = true;
    supabase?.auth.getSession().then(({ data }) => { if (alive) setUserId(data?.session?.user?.id || null); });
    const { data } = supabase?.auth.onAuthStateChange((_event, session) => { if (alive) setUserId(session?.user?.id || null); }) || {};
    return () => { alive = false; data?.subscription?.unsubscribe(); };
  }, []);
  return <MimoruSession key={userId || "signed-out"} userId={userId}>{children}</MimoruSession>;
}

function MimoruSession({ userId, children }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [inlineId, setInlineId] = useState(null);
  const [selected, setSelected] = useState(null);
  const [initialPrompt, setInitialPrompt] = useState("");
  const [viewport, setViewport] = useState(null);
  const restoreAllowed = useRef(true);
  const restoreContext = useCallback(value => { if (restoreAllowed.current && value) setSelected(value); restoreAllowed.current = false; }, []);
  const panelRef = useRef(null);
  const launcherRef = useRef(null);
  const aliveRef = useRef(true);
  useEffect(() => { aliveRef.current = true; return () => { aliveRef.current = false; }; }, []);
  const consumePrompt = useCallback(() => setInitialPrompt(""), []);
  const fetchData = useCallback(async (path, options = {}) => {
    const { data } = await supabase.auth.getSession();
    if (!userId || data?.session?.user?.id !== userId) throw new DOMException("Session changed", "AbortError");
    const response = await fetch(path, { ...options, cache: "no-store",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + data.session.access_token, ...(options.headers || {}) } });
    const json = await response.json().catch(() => ({}));
    if (!aliveRef.current) throw new DOMException("Session changed", "AbortError");
    if (!response.ok) throw Object.assign(new Error(json.error || "通信できませんでした。"), { code: json.code, status: response.status });
    return json.data ?? json;
  }, [userId]);
  const chat = useLiveSupport({ active: Boolean(userId && open), authedFetch: fetchData,
    initialPrompt, onConsumePrompt: consumePrompt, onRestoreContext: restoreContext, selectedContext: selected?.request || null });
  const openChat = useCallback((options = {}) => {
    if (!userId) return;
    if (options.context !== undefined) { restoreAllowed.current = false; setSelected(options.context); }
    if (options.prompt) setInitialPrompt(options.prompt);
    setInlineId(options.inlineId || null);
    setOpen(true);
    trackJourney("chat_open", { position: options.inlineId ? "care_inline" : "chat_bubble" });
  }, [userId]);
  const releaseInline = useCallback(id => setInlineId(current => current === id ? null : current), []);
  const closeChat = useCallback(() => {
    setOpen(false); setInlineId(null);
    requestAnimationFrame(() => launcherRef.current?.focus());
  }, []);
  useEffect(() => { if (open && inlineId) setInlineId(null); }, [pathname]); // Keep conversation while its source page changes.
  useEffect(() => {
    const update = () => {
      const v = window.visualViewport;
      const next = { top: v?.offsetTop || 0, height: v?.height || window.innerHeight };
      setViewport(current => current?.top === next.top && current?.height === next.height ? current : next);
    };
    update();
    window.visualViewport?.addEventListener("resize", update);
    window.visualViewport?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      window.visualViewport?.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);
  const floating = Boolean(userId && open && !inlineId);
  useEffect(() => {
    if (!floating) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKey = event => {
      if (event.key === "Escape") { event.preventDefault(); closeChat(); }
      if (event.key !== "Tab") return;
      const list = panelRef.current?.querySelectorAll('button:not([disabled]),textarea:not([disabled]),input:not([disabled]),a[href],summary,[tabindex="0"]');
      const visible = [...(list || [])].filter(el => el.getClientRects().length);
      if (!visible.length) return;
      if (event.shiftKey && document.activeElement === visible[0]) { event.preventDefault(); visible.at(-1).focus(); }
      else if (!event.shiftKey && document.activeElement === visible.at(-1)) { event.preventDefault(); visible[0].focus(); }
    };
    const frame = requestAnimationFrame(() => panelRef.current?.querySelector('[data-chat-close]')?.focus());
    document.addEventListener("keydown", handleKey);
    return () => { cancelAnimationFrame(frame); document.body.style.overflow = previousOverflow; document.removeEventListener("keydown", handleKey); };
  }, [floating, closeChat]);
  const visible = userId && !/^\/(login|signup|auth|check\/run|checkout)(\/|$)/.test(pathname);
  const panelHeight = viewport ? Math.min(700, Math.max(160, viewport.height - 28)) : 600;
  const value = { userId, open, inlineId, selected, chat, fetchData, openChat, closeChat, viewportHeight: viewport?.height,
    releaseInline, expandChat: () => setInlineId(null), clearContext: () => { restoreAllowed.current = false; setSelected(null); } };
  return <Context.Provider value={value}>
    {children}
    {visible && !open ? <button ref={launcherRef} type="button" onClick={() => openChat()}
      aria-label="ミモルに相談する" aria-haspopup="dialog"
      className="fixed right-4 z-[65] flex items-center gap-1 rounded-full bg-white py-1 pl-1 pr-4 text-[12px] font-black text-[#24564C] shadow-[0_8px_28px_rgba(36,86,76,0.22)] ring-1 ring-[#B6D8CF]"
      style={{ bottom: "calc(var(--app-bottom-tabs-height, calc(96px + env(safe-area-inset-bottom, 0px))) + 12px)" }}>
      <GuideBotAvatar mood="listening" className="h-12 w-12" /><span>ミモルに相談</span>
    </button> : null}
    {floating ? <>
      <div className="fixed inset-0 z-[110] bg-[#183E35]/15" onClick={closeChat} aria-hidden="true" />
      <section ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="mimoru-title"
        className="fixed left-3.5 right-3.5 z-[111] flex min-h-0 flex-col overflow-hidden rounded-[26px] bg-[#F7FAF6] shadow-[0_20px_70px_rgba(17,54,44,0.28)] ring-1 ring-[#CFE7DE] sm:left-auto sm:right-6 sm:w-[440px]"
        style={{ top: viewport ? viewport.top + Math.max(14, (viewport.height - panelHeight) / 2) : 14, height: panelHeight }}>
        <ChatHeader onClose={closeChat} />
        <ChatTarget />
        <LiveSupportView chat={chat} />
      </section>
    </> : null}
  </Context.Provider>;
}
function ChatHeader({ onClose, inline = false, onExpand }) {
  return <header className="flex shrink-0 items-center justify-between gap-2 border-b border-[#DCE8DD] bg-white px-3 py-2">
    <div className="flex min-w-0 items-center gap-1.5"><GuideBotAvatar mood="listening" className="h-10 w-10 shrink-0" />
      <div><div id={inline ? undefined : "mimoru-title"} className="text-[15px] font-black text-[#24564C]">ミモル</div>
        <div className="text-[10px] font-bold text-slate-500">体質と毎日のケアを相談</div></div></div>
    <div className="flex items-center gap-2">{onExpand ? <button type="button" onClick={onExpand} className="min-h-10 px-2 text-[12px] font-bold text-[#2F816E]">大きく開く</button> : null}
      <button data-chat-close type="button" aria-label="相談を閉じる" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full text-xl text-slate-500 hover:bg-[#EAF7F1]">×</button></div>
  </header>;
}
function ChatTarget() {
  const m = useMimoru();
  return m.selected ? <div className="flex shrink-0 items-start justify-between gap-2 border-b border-[#DCE8DD] bg-[#EAF7F1] px-3 py-2 text-[11px] font-bold leading-5 text-[#24564C]">
    <span>{m.selected.label}</span><button type="button" onClick={m.clearContext} className="shrink-0 underline underline-offset-2">対象を外す</button>
  </div> : null;
}
export function InlineMimoruChat({ id }) {
  const m = useMimoru();
  useEffect(() => () => m?.releaseInline(id), [id, m?.releaseInline]);
  if (!m?.open || m.inlineId !== id) return null;
  return <section aria-label="このケアについてミモルに相談" className="mt-3 flex h-[440px] w-full min-w-0 flex-col overflow-hidden rounded-[22px] bg-[#F7FAF6] text-left ring-1 ring-[#CFE7DE]"
    style={{ height: Math.min(440, Math.max(160, (m.viewportHeight || 468) - 28)) }} onClick={e => e.stopPropagation()}>
    <ChatHeader inline onClose={m.closeChat} onExpand={m.expandChat} /><ChatTarget /><LiveSupportView chat={m.chat} inline />
  </section>;
}

