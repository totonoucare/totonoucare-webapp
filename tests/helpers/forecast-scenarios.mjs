import fs from 'node:fs/promises';
import {rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

export const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export async function createScenarioRunner(root = appRoot) {
  const cache = new Map();
  // File URLs avoid repeatedly embedding the shared care modules in data URLs.
  const temporary = await fs.mkdtemp(path.join(tmpdir(), 'mibyo-scenarios-'));
  process.once('exit', () => rmSync(temporary, {recursive:true, force:true}));
  async function moduleUrl(file) {
    file = path.resolve(file);
    if (!path.extname(file)) file += '.js';
    if (cache.has(file)) return cache.get(file);
    const targetPath = path.join(temporary, `${cache.size}.mjs`);
    const url = pathToFileURL(targetPath).href;
    cache.set(file, url);
    let source = await fs.readFile(file, 'utf8');
    for (const match of [...source.matchAll(/from\s+["']([^"']+)["']/g)]) {
      const name = match[1];
      if (!name.startsWith('.') && !name.startsWith('@/')) throw Error(`External import: ${name}`);
      const target = name.startsWith('@/') ? path.join(root, name.slice(2)) : path.resolve(path.dirname(file), name);
      source = source.replace(match[0], `from "${await moduleUrl(target)}"`);
    }
    await fs.writeFile(targetPath, source);
    return url;
  }
  const load = async file => import(await moduleUrl(path.join(root, file)));
  const {scoreDiagnosis} = await load('lib/diagnosis/v2/scoring.js');
  const {QUESTIONS_V2_BASE} = await load('lib/diagnosis/v2/questions.js');
  const {buildWeatherStressV2} = await load('lib/radar_v1/weatherStressV2.js');
  const {personalizeForecastV2} = await load('lib/radar_v1/personalizeForecastV2.js');
  const {buildRiskContext} = await load('lib/radar_v1/buildRiskContext.js');
  const ui = await load('app/radar/utils.js');
  const base = Object.fromEntries(QUESTIONS_V2_BASE.map(q => [q.key, 'rare']));
  const answers = {
    'A：気象感受性低め': {...base, env_sensitivity:'never', env_vectors:[], symptom_focus:'fatigue'},
    'B：疲労・冷え・湿気': {...base, fatigue_easy:'often', recovery_lag:'often', body_heaviness:'often', postmeal_burden:'often', cold_pattern:'often', movement_response:'more_tired', env_sensitivity:'often', env_vectors:['humidity_up','pressure_shift'], symptom_focus:'fatigue'},
    'C：緊張・熱・乾き': {...base, qi_obstruction:'often', stress_variability:'often', general_dryness:'often', dry_stool:'often', heat_pattern:'often', movement_response:'easier', env_sensitivity:'often', env_vectors:['dryness_up','pressure_shift'], symptom_focus:'fatigue'},
    'D：気象感受性高め・余力小': {...base, fatigue_easy:'almost_always', recovery_lag:'almost_always', env_sensitivity:'almost_always', env_vectors:['pressure_shift','temp_swing'], symptom_focus:'fatigue'},
  };
  const profiles = Object.entries(answers).map(([name, answer]) => ({name, answer, constitution:scoreDiagnosis(answer)}));
  function run(fn, index = 0, symptomFocus = 'fatigue', withCare = true) {
    const points = Array.from({length:24}, (_,h) => {
      const v = fn(h), temp = v.t ?? 24;
      return {ts:`2026-09-11T${String(h).padStart(2,'0')}:00:00+09:00`, temp_c:temp, pressure_hpa:v.p ?? 1012,
        humidity_pct:v.d == null ? (v.r ?? 55) : 100*Math.exp(17.27*v.d/(237.7+v.d)-17.27*temp/(237.7+temp)),
        ...(v.d == null ? {} : {dew_point_c:v.d})};
    });
    const weather = buildWeatherStressV2({points});
    const constitution = profiles[index].constitution;
    const f = personalizeForecastV2({weatherStress:weather, constitution});
    if (!withCare) return {score:Math.round(f.score_precise_0_10*10), weather, forecast:f};
    const risk = buildRiskContext({profile:constitution, weatherStress:weather, forecastModelVersion:'v2'});
    const forecast = {...f, target_date:'2026-09-11', computed:{forecast_snapshot:f, radar_plan_meta:{risk_context:risk}}, score_0_10:f.score_precise_0_10};
    const factors = ui.getForecastTriggerFactors(forecast);
    const care = ui.resolveDisplayedCarePlan({forecast, riskContext:risk, mode:'today', targetDate:'2026-09-11', symptomFocus});
    const comparison = {environmentalCautions:weather.environmental_cautions};
    return {profile:profiles[index].name, score:Math.round(f.score_precise_0_10*10), signal:f.signal,
      primary:f.personal_main_trigger_exact, lead:ui.getForecastModeLead(factors,f.signal,'today',symptomFocus,comparison),
      tomorrowLead:ui.getForecastModeLead(factors,f.signal,'tomorrow',symptomFocus,comparison),
      weather, forecast, care};
  }
  return {run, profiles, load};
}

export const ramp = (h,start,duration,amount) => amount*Math.max(0,Math.min(1,(h-start)/duration));
export const scenarios = [
  ['快適一定：24℃・55％・気圧一定',h=>({})],
  ['気圧小：6時間で2hPa低下',h=>({p:1012-ramp(h,8,6,2)})],
  ['気圧中：6時間で5hPa低下',h=>({p:1012-ramp(h,8,6,5)})],
  ['気圧大：6時間で10hPa低下',h=>({p:1012-ramp(h,8,6,10)})],
  ['気圧大：6時間で10hPa上昇',h=>({p:1012+ramp(h,8,6,10)})],
  ['緩やかな気圧低下：23時間で10hPa',h=>({p:1012-ramp(h,0,23,10)})],
  ['快適域内：20→26℃・湿度55％',h=>({t:20+ramp(h,6,6,6)})],
  ['温度上昇：24→32℃・湿度55％',h=>({t:24+ramp(h,6,6,8)})],
  ['温度改善：32→24℃・湿度55％',h=>({t:32-ramp(h,6,6,8)})],
  ['温度低下：24→12℃・湿度55％',h=>({t:24-ramp(h,12,6,12)})],
  ['蒸し暑さ一定：32℃・75％',h=>({t:32,r:75})],
  ['酷暑一定：40℃・40％',h=>({t:40,r:40})],
  ['寒冷一定：5℃・60％',h=>({t:5,r:60})],
  ['乾燥一定：24℃・25％',h=>({r:25})],
  ['湿度上昇：50→85％・24℃',h=>({r:50+ramp(h,8,6,35)})],
  ['複合：気圧10hPa低下＋24→32℃・75％',h=>({p:1012-ramp(h,8,6,10),t:24+ramp(h,6,6,8),r:75})],
  ['温度のみ上昇：24→32℃・露点14℃',h=>({t:24+ramp(h,6,6,8),d:14})],
  ['温度のみ低下：24→16℃・露点10℃',h=>({t:24-ramp(h,12,6,8),d:10})],
  ['日較差：20～28℃・露点14℃',h=>({t:24+4*Math.sin((h-9)/24*Math.PI*2),d:14})],
  ['蒸し暑さ一定：35℃・70％',h=>({t:35,r:70})],
  ['厳寒一定：−5℃・60％',h=>({t:-5,r:60})],
  ['高負荷複合：気圧15hPa低下＋30→38℃・70％',h=>({p:1012-ramp(h,8,6,15),t:30+ramp(h,6,6,8),r:70})],
];
