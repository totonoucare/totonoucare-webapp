import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import test from 'node:test';

test('モデル更新は今日以降に反映し、過去の保存予報と最新キャッシュを再生成しない', async () => {
  let source = await readFile(new URL('../lib/radar_v1/ensureForecastBundle.js',import.meta.url),'utf8');
  source = source.replace(/import\s+[\s\S]*?from\s+"[^"]+";\n/g,'');
  let generated = 0;
  let current = false;
  const version = 'current-test-model';
  globalThis.__v55CacheTest = {
    RADAR_FORECAST_MODEL_VERSION:version,
    getRadarConstitutionProfile:async()=>null,
    getForecastBundle:async()=>({forecast:{id:'saved',location_id:'osaka',vendor_meta:{forecast_model_setting:'v2',forecast_model_version:current?version:'old'}},care_plan:{id:'saved-care'}}),
    buildFastRadarBundle:async()=>{generated++;return {radarPlan:{},vendorMeta:{},normalized:{points:[{}]}};},
    saveForecast:async()=>({id:'new'}), saveCarePlan:async()=>({id:'new-care'}),
  };
  const prefix='const {RADAR_FORECAST_MODEL_VERSION,getRadarConstitutionProfile,getForecastBundle,buildFastRadarBundle,saveForecast,saveCarePlan}=globalThis.__v55CacheTest;\n';
  const module = await import('data:text/javascript;base64,'+Buffer.from(prefix+source).toString('base64'));
  delete globalThis.__v55CacheTest;
  const oldSetting=process.env.RADAR_FORECAST_MODEL_VERSION;
  process.env.RADAR_FORECAST_MODEL_VERSION='v2';
  try {
    const args={userId:'test-user',location:{id:'osaka'}};
    assert.equal((await module.ensureForecastBundle({...args,targetDate:'2000-01-01'})).cached,true);
    assert.equal(generated,0);
    assert.equal((await module.ensureForecastBundle({...args,targetDate:'2099-01-01'})).cached,false);
    assert.equal(generated,1);
    current=true;
    assert.equal((await module.ensureForecastBundle({...args,targetDate:'2099-01-01'})).cached,true);
    assert.equal(generated,1);
  } finally {
    if(oldSetting===undefined) delete process.env.RADAR_FORECAST_MODEL_VERSION;
    else process.env.RADAR_FORECAST_MODEL_VERSION=oldSetting;
  }
});
