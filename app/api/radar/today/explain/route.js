// app/api/radar/today/explain/route.js
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { requireUser } from "@/lib/requireUser";
import { jstDateString } from "@/lib/dateJST";
import { fetchOpenMeteo } from "@/lib/weather/openMeteo";

import { computeTodayRiskPackage } from "@/lib/radar/risk";
import { getCoreLabel, getSubLabels, SYMPTOM_LABELS } from "@/lib/diagnosis/v2/labels";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getPrimaryLocation(userId) {
  const { data, error } = await supabaseServer
    .from("user_locations")
    .select("lat, lon")
    .eq("user_id", userId)
    .eq("is_primary", true)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data || { lat: 34.7025, lon: 135.4959 };
}

async function getLatestConstitutionProfile(userId) {
  const { data, error } = await supabaseServer
    .from("constitution_profiles")
    .select("user_id,symptom_focus,core_code,sub_labels,computed,updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

async function getBaselineDays(userId) {
  const { data, error } = await supabaseServer
    .from("daily_external_factors")
    .select("date")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .limit(14);

  if (error) throw error;
  return (data || []).length;
}

export async function GET(req) {
  try {
    const { user, error } = await requireUser(req);
    if (!user) return NextResponse.json({ error }, { status: 401 });

    const date = jstDateString(new Date());
    const loc = await getPrimaryLocation(user.id);

    const profile = await getLatestConstitutionProfile(user.id);
    if (!profile) return NextResponse.json({ error: "no profile" }, { status: 400 });

    const baselineDays = await getBaselineDays(user.id);

    const meteo = await fetchOpenMeteo({ lat: loc.lat, lon: loc.lon });
    const hourly = meteo?.hourly || {};

    const pkg = computeTodayRiskPackage({
      hourly,
      dateStrJST: date,
      profile,
      baselineDays,
    });

    const core = getCoreLabel(profile?.core_code);
    const subTitles = getSubLabels(profile?.sub_labels || []).map((x) => x?.title).filter(Boolean);
    const focusLabel = SYMPTOM_LABELS?.[profile?.symptom_focus] || null;

    const hero = pkg.hero;
    const items = pkg.timeline || [];
    const peak = hero?.peak || {};

    const peakSlice =
      Number.isFinite(Number(peak?.start_idx)) && peak.start_idx >= 0
        ? items.slice(peak.start_idx, (peak.end_idx ?? peak.start_idx) + 1)
        : [];

    // ピーク帯の寄与合計
    const sum = peakSlice.reduce(
      (acc, it) => {
        acc.pressure += Number(it?.contrib?.pressure || 0);
        acc.temp += Number(it?.contrib?.temp || 0);
        acc.humidity += Number(it?.contrib?.humidity || 0);
        return acc;
      },
      { pressure: 0, temp: 0, humidity: 0 }
    );

    // ピーク帯で発火したイベント
    const events = [];
    for (const it of peakSlice) {
      for (const ev of (it?.events || [])) {
        events.push({ time: it?.time, ...ev });
      }
    }

    return NextResponse.json({
      data: {
        date,
        location: loc,

        profile: {
          symptom_focus: profile?.symptom_focus || null,
          symptom_label: focusLabel,
          core_code: profile?.core_code || null,
          core_title: core?.title || null,
          sub_labels: profile?.sub_labels || [],
          sub_titles: subTitles,
        },

        hero: pkg.hero,
        explain: pkg.explain,

        debug: {
          coverage: pkg.debug?.coverage,
          baselineDays: pkg.debug?.baselineDays,
          confidence: pkg.debug?.confidence,
          S_user: pkg.debug?.S || null,
          hero_raw: pkg.debug?.hero_raw || null,

          peak_contrib_sum: {
            pressure: Number(sum.pressure.toFixed(2)),
            temp: Number(sum.temp.toFixed(2)),
            humidity: Number(sum.humidity.toFixed(2)),
          },
          peak_events: events.slice(0, 50),
        },
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
