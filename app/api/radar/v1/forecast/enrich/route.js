// app/api/radar/v1/forecast/enrich/route.js
//
// 2026-05: 予報ページのAI補完は一時停止中。
// ケアカードは、体質×天気の予報ロジックから得た主因をもとに、
// UI側のルールベース文言を優先して表示する。
// ファイルは将来の再利用に備えて残すが、このrouteはGPT生成を行わない。

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonUtf8(payload, status = 200) {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export async function GET() {
  return jsonUtf8(
    {
      ok: false,
      disabled: true,
      error: "Forecast AI enrichment is temporarily disabled.",
      reason:
        "Care copy is currently served from rule-based UI logic. Re-enable this route only after the care policy design is finalized.",
    },
    410
  );
}
