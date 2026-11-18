import Link from "next/link";

const tabs = [
  { key: "record", label: "記録", href: "/records" },
  { key: "analysis", label: "AI分析", href: "/records?tab=analysis" },
  { key: "expert", label: "専門家に聞く", href: "/expert" },
];

export default function RecordsTabs({ value, onSelect }) {
  return <nav aria-label="記録・相談" style={{ top: "var(--app-header-height, 66px)" }}
    className="sticky z-30 rounded-2xl bg-[#F7FAF6]/95 py-2 backdrop-blur">
    <div className="grid grid-cols-3 gap-1 rounded-2xl bg-[#E8F0EB] p-1">
      {tabs.map(({ key, label, href }) => <Link key={key} href={href} scroll={false}
        onClick={event => {
          if (!onSelect || key === "expert" || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
          event.preventDefault();
          onSelect(key);
        }}
        aria-current={value === key ? "page" : undefined}
        className={"grid min-h-[44px] place-items-center rounded-xl px-1 text-center text-[13px] font-bold " +
          (value === key ? "bg-white text-[#215B49] shadow-sm ring-1 ring-[#CDDDD3]" : "text-[#52695E]")}>
        {label}
      </Link>)}
    </div>
  </nav>;
}
