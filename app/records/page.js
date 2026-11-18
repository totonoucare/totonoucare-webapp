import { redirect } from "next/navigation";
import RecordsPageClient from "@/components/records/RecordsPageClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function RecordsPage({ searchParams }) {
  const rawTab = String(searchParams?.tab || "record");
  if (rawTab === "expert") redirect("/expert");
  const tab = ["record", "analysis", "consult"].includes(rawTab)
    ? rawTab
    : "record";
  const initialLivePrompt = String(searchParams?.prompt || "").slice(0, 240);
  const checkout = ["success", "cancel"].includes(String(searchParams?.checkout || ""))
    ? String(searchParams.checkout)
    : "";
  const checkoutSessionId = String(searchParams?.session_id || "").slice(0, 255);
  return (
    <RecordsPageClient
      initialTab={tab}
      initialLivePrompt={initialLivePrompt}
      initialCheckoutStatus={checkout}
      initialCheckoutSessionId={checkoutSessionId}
    />
  );
}
