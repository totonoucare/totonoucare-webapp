  // LP（ログイン前）などで使われるコンパクトな使用イメージ表示
  if (compact) {
    return (
      <div className="rounded-[32px] border border-[var(--ring)] bg-white p-2 shadow-[0_22px_48px_-24px_rgba(77,111,85,0.25)]">
        {/* 高さを320pxにして配置の余裕を確保 */}
        <div className="relative h-[320px] overflow-hidden rounded-[26px] bg-[#fdfefc] ring-1 ring-inset ring-black/5">
          {/* 背景: 洗練版（はみ出し溶け込みデザイン） */}
          <svg viewBox="0 0 320 320" className="absolute inset-0 h-full w-full" aria-hidden="true">
             <circle cx="30" cy="250" r="180" fill="#eef4eb" fillOpacity="0.5" />
             <circle cx="30" cy="250" r="100" fill="#eef4eb" fillOpacity="0.3" />
          </svg>

          {/* 1. 左上：診断結果のイメージカード */}
          <div className="absolute left-4 top-6 w-[190px] rounded-[22px] bg-white p-4 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.12)] ring-1 ring-black/5 z-20 transition-all hover:shadow-[0_16px_40px_-8px_rgba(0,0,0,0.16)]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">体質診断結果</span>
              <StatusChip label="短期集中型" tone="warn" />
            </div>
            <div className="mt-2 text-sm font-black text-slate-900 leading-tight">アクセル優位 × 余力小</div>
            <div className="mt-3 flex gap-1.5">
              <span className="rounded-md bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-500 ring-1 ring-inset ring-slate-200/50">血虚</span>
              <span className="rounded-md bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-500 ring-1 ring-inset ring-slate-200/50">気滞</span>
            </div>
          </div>

          {/* 2. 右側中央：予報のイメージカード */}
          <div className="absolute right-4 top-[120px] w-[170px] rounded-[22px] bg-white/90 backdrop-blur-md p-4 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.12)] ring-1 ring-black/5 z-10 transition-all hover:shadow-[0_16px_40px_-8px_rgba(0,0,0,0.16)]">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">体調予報</div>
            <div className="mt-1 text-sm font-black text-slate-900">明日：気圧上昇</div>
            <div className="mt-3 flex items-end justify-between">
              <div className="text-[11px] font-bold leading-tight text-slate-500">崩れやすさ<br /><span className="text-xl font-black text-rose-600">6</span> <span className="text-[10px] text-slate-300">/ 10</span></div>
              <div className="h-8 w-16 bg-rose-50 rounded-lg flex items-center justify-center">
                 <svg viewBox="0 0 40 20" className="w-10 h-5">
                    <path d="M0 15 Q 10 5, 20 12 T 40 5" fill="none" stroke="#e11d48" strokeWidth="2.5" strokeLinecap="round" />
                 </svg>
              </div>
            </div>
          </div>

          {/* 3. 左下：キャラクター */}
          <div className="absolute left-[-8px] bottom-[-8px] scale-[0.8] origin-bottom-left z-30 transition-transform hover:scale-[0.82]">
            <HeroGuideBot compact message="まずは体質チェックから！" bubbleSide="right" />
          </div>

          {/* 4. 装飾ラベルは削除しました */}
        </div>
      </div>
    );
  }
