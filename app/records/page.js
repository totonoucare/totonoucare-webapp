import RecordsPageClient from "@/components/records/RecordsPageClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function RecordsPage({ searchParams }) {
  const rawTab = String(searchParams?.tab || "record");
  const tab = ["record", "analysis", "consult", "expert"].includes(rawTab)
    ? (rawTab === "expert" ? "consult" : rawTab)
    : "record";
  const initialLivePrompt = String(searchParams?.prompt || "").slice(0, 240);
  return <RecordsPageClient initialTab={tab} initialLivePrompt={initialLivePrompt} />;
}
