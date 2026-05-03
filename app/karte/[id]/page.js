import { Suspense } from "react";
import KarteClient from "./KarteClient";

function KarteLoadingFallback() {
  return (
    <div className="min-h-screen bg-[#f7f7f1] px-6 py-20 text-center">
      <div className="mx-auto max-w-[680px] rounded-[34px] border border-[#d9e3dc] bg-white p-8 shadow-sm">
        <div className="mx-auto mb-5 h-12 w-12 animate-pulse rounded-full bg-[#dfeee8]" />
        <p className="text-[16px] font-black text-[#64748b]">カルテを読み込み中です。</p>
      </div>
    </div>
  );
}

export default function PersonalKartePage() {
  return (
    <Suspense fallback={<KarteLoadingFallback />}>
      <KarteClient />
    </Suspense>
  );
}
