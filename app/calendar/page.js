import RecordsPageClient from "@/components/records/RecordsPageClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function CalendarPage() {
  return <RecordsPageClient initialTab="record" />;
}
