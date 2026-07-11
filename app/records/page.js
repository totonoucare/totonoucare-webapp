import RecordsPageClient from "@/components/records/RecordsPageClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function RecordsPage({ searchParams }) {
  const tab = ["record", "analysis", "expert"].includes(searchParams?.tab)
    ? searchParams.tab
    : "record";
  return <RecordsPageClient initialTab={tab} />;
}
