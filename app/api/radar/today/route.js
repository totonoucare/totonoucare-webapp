// app/api/radar/today/route.js
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
  return data || { lat: 34.7025, lon: 135.4959 }; // fallback: 大阪駅付近
}

async function getLatestConstitutionProfile(userId) {
  const { data, error } = await supabaseServer
    .from("constitution_profiles")
    .select(
      [
        "user_id",
        "symptom_focus",
        "core_code",
        "sub_labels",
        "computed",
        "updated_at",
      ].join(",")
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

function avg(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  const vals = arr.map(Number).filter(Number.isFinite);
  if (vals.length === 0) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

/**
 * baselineは「days」だけ使う（confidence用）
 * daily_external_factors が無いユーザーもいるので段階fallback
 */
async function getBaselineDays(userId) {
  const fetchN = async (n) => {
    const { data, error } = await supabaseServer
      .from("daily_external_factors")
      .select("date, pressure, temp, humidity")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(n);

    if (error) throw error;
    return data || [];
  };

  const rows14 = await fetchN(14);
  const p14 = avg(rows14.map((r) => r.pressure));
  const t14 = avg(rows14.map((r) => r.temp));
  const h14 = avg(rows14.map((r) => r.humidity));
  const ok14 = [p14, t14, h14].filter((x) => x != null).length;

  if (ok14 >= 2) return Math.min(rows14.length, 14);

  const rows7 = rows14.length >= 7 ? rows14.slice(0, 7) : await fetchN(7);
  const p7 = avg(rows7.map((r) => r.pressure));
  const t7 = avg(rows7.map((r) => r.temp));
  const h7 = avg(rows7.map((r) => r.humidity));
  const ok7 = [p7, t7, h7].filter((x) => x != null).length;

  if (ok7 >= 2) return Math.min(rows7.length, 7);

  const rows2 = rows14.length >= 2 ? rows14.slice(0, 2) : await fetchN(2);
  const p2 = avg(rows2.map((r) => r.pressure));
  const t2 = avg(rows2.map((r) => r.temp));
  const h2 = avg(rows2.map((r) => r.humidity));
  const ok2 = [p2, t2, h2].filter((x) => x != null).length;

  if (ok2 >= 1) return Math.min(rows2.length, 2);

  return 0;
}

export async function GET(req) {
  try {
    const { user, error } = await requireUser(req);
    if (!user) return NextResponse.json({ error }, { status: 401 });

    const date = jstDateString(new Date());
    const loc = await getPrimaryLocation(user.id);

    const profile = await getLatestConstitutionProfile(user.id);
    if (!profile) {
      return NextResponse.json({
        data: {
          date,
          has_profile: false,
          message: "体質データがありません。先に体質チェックを行ってください。",
        },
      });
    }

    const baselineDays = await getBaselineDays(user.id);

    // Open-Meteo
    const meteo = await fetchOpenMeteo({ lat: loc.lat, lon: loc.lon });
    const hourly = meteo?.hourly || {};

    const pkg = computeTodayRiskPackage({
      hourly,
      dateStrJST: date,
      profile,
      baselineDays,
    });

    const core = getCoreLabel(profile?.core_code);
    const subTitles = getSubLabels(profile?.sub_labels || [])
      .map((x) => x?.title)
      .filter(Boolean);

    const focusLabel = SYMPTOM_LABELS?.[profile?.symptom_focus] || null;

    return NextResponse.json({
      data: {
        date,
        location: { lat: loc.lat, lon: loc.lon },

        profile: {
          symptom_focus: profile?.symptom_focus || null,
          symptom_label: focusLabel,
          core_code: profile?.core_code || null,
          core_title: core?.title || null,
          core_short: core?.short || null,
          sub_labels: (profile?.sub_labels || []).slice(0, 3),
          sub_titles: subTitles,
        },

        hero: pkg.hero,
        timeline: pkg.timeline,

        explain: pkg.explain, // short text only
        debug: process.env.NODE_ENV === "development" ? pkg.debug : undefined,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
