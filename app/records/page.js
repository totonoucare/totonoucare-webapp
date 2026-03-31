import RecordsPageClient from "@/components/records/RecordsPageClient";

export default function RecordsPage({ searchParams }) {
  const tab = searchParams?.tab === "report" ? "report" : "calendar";
  return <RecordsPageClient initialTab={tab} />;
}
