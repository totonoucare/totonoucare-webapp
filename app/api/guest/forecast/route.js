import { NextResponse } from "next/server";
import { requireGuestExperience, guestForecast, currentGuestDates } from "@/lib/guestExperienceServer";
import { enforcePublicApiRateLimit } from "@/lib/publicApiRateLimit";
import { summarizeRadarServerError, toPublicRadarApiError } from "@/lib/radar_v1/upstreamResilience";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const reply = (body, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
async function handleForecastRequest(req) {
  try {
    const guest = await requireGuestExperience(req);
    const limited = await enforcePublicApiRateLimit(req, { route: "guest_forecast_v126", limit: 40, windowSeconds: 60 });
    if (limited) return limited;
    const p = new URL(req.url).searchParams;
    return reply(await guestForecast(req, guest, { targetDate: p.get("date") || currentGuestDates().today,
      cacheOnly: p.get("cache_only") === "1", force: p.get("force") === "1" }));
  } catch (error) {
    if (error.status) return reply({ ok: false, error: error.message, code: error.code }, error.status);
    console.error("/api/guest/forecast error:", summarizeRadarServerError(error));
    const safe = toPublicRadarApiError(error);
    return reply(safe.payload, safe.status);
  }
}

export { handleForecastRequest as GET, handleForecastRequest as POST };
