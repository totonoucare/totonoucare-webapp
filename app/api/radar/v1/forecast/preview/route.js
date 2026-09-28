import { GET as readDiagnosis } from '@/app/api/diagnosis/v2/events/[id]/route';
import { fetchMetnoLocationForecast } from '@/lib/radar_v1/metnoClient';
import { normalizeMetnoForTargetDate } from '@/lib/radar_v1/metnoNormalize';
import { buildWeatherStressV2 } from '@/lib/radar_v1/weatherStressV2';
import { personalizeForecastV2 } from '@/lib/radar_v1/personalizeForecastV2';
import { enforcePublicApiRateLimit } from '@/lib/publicApiRateLimit';
import { tomorrowJstDate } from '@/lib/signupForecastPreview';
import { getCoreLabel } from '@/lib/diagnosis/v2/labels';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
const reply = (payload, status=200) => Response.json(payload, {status, headers:{'Cache-Control':'private, no-store'}});
export async function GET(req) {
  try {
    const limited = await enforcePublicApiRateLimit(req, {route:'radar_signup_preview',limit:30,windowSeconds:600});
    if (limited) return limited;
    const id = new URL(req.url).searchParams.get('result');
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id || '')) return reply({ok:false},400);
    // Reuse result-page access checks: guest cookie token OR authenticated owner.
    // A result ID alone never grants access. Recompute with the current diagnosis rules.
    const response = await readDiagnosis(req, {params:{id}});
    if (!response.ok) return reply({ok:false},response.status);
    const {data: result} = await response.json();
    if (!result?.computed?.core_code || result.retake_required) return reply({ok:false},409);
    const targetDate = tomorrowJstDate();
    const {data} = await fetchMetnoLocationForecast({lat:35.68944,lon:139.69167});
    const normalized = normalizeMetnoForTargetDate({metnoJson:data,targetDate,includePreviousNightBridge:true});
    if (!normalized.points.length) return reply({ok:false},503);
    const weatherStress = buildWeatherStressV2({points:normalized.points,previousNightBridgePoints:normalized.previousNightBridgePoints});
    const constitution = {...result.computed,computed:result.computed,answers:result.answers,symptom_focus:result.active_symptom_focus || result.symptom_focus};
    const forecast = personalizeForecastV2({weatherStress,constitution});
    return reply({ok:true,target_date:targetDate,core_code:result.computed.core_code,core_title:getCoreLabel(result.computed.core_code)?.title || '',forecast:{
      score_0_10:forecast.score_0_10,score_display_0_10:forecast.score_display_0_10,score_precise_0_10:forecast.score_precise_0_10,
      signal:forecast.signal,trigger_factors:forecast.trigger_factors,personal_main_trigger_exact:forecast.personal_main_trigger_exact,
      personal_secondary_trigger_exact:forecast.personal_secondary_trigger_exact,main_trigger:forecast.main_trigger,trigger_dir:forecast.trigger_dir,
    }});
  } catch { return reply({ok:false},503); }
}
