// A neutral welcome for everyday login. Check-start links keep CheckLoginWelcome.
export default function AppLoginWelcome() {
  return (
    <div className="relative -mx-6 -mt-6 isolate overflow-hidden border-b border-[#E4EDE3] bg-[#F5F9F2] px-6 pb-6 pt-7">
      <svg viewBox="0 0 220 220" className="pointer-events-none absolute -right-8 -top-16 -z-10 h-56 w-56 text-[#C5DCCD]/60" fill="none" aria-hidden="true">
        <circle cx="110" cy="110" r="80" stroke="currentColor" strokeWidth="1" />
        <circle cx="110" cy="110" r="107" stroke="currentColor" strokeWidth="1" />
        <path d="M30 110a80 80 0 0 1 40-69" stroke="#71AC90" strokeWidth="3" strokeLinecap="round" />
        <circle cx="30" cy="110" r="3.5" fill="#71AC90" fillOpacity=".7" />
        <path d="M190 110a80 80 0 0 1-24 57" stroke="#E2AA3B" strokeOpacity=".55" strokeWidth="3" strokeLinecap="round" />
        <circle cx="166" cy="167" r="4.5" fill="#E2AA3B" fillOpacity=".7" />
      </svg>
      <p className="flex items-center gap-2 text-[12px] font-bold tracking-[0.12em] text-[#63826E]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#D6A443]" />MIBYOU RADAR
      </p>
      <h1 className="mt-3 text-[28px] font-black leading-[1.55] tracking-tight text-[#24564C]">未病レーダーに<br />ログイン</h1>
      <p className="mt-5 text-[14px] font-medium leading-7 text-[#536B5E]">予報やケア、体調の記録を<br />ログインして確認できます。</p>
    </div>
  );
}
