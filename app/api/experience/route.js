import {NextResponse} from 'next/server';
import {requireUser} from '@/lib/requireUser';
import {supabaseServer} from '@/lib/supabaseServer';
import {getRecordsAccess} from '@/lib/records/access';
import {SURVEYS,GUIDE_IDS,FEATURE_IDS,dayKey,summarizeExperience,surveyEligible} from '@/lib/experience/policy';
export const dynamic='force-dynamic';
export const runtime='nodejs';
const reply=(data,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
async function context(user){
 const [events,access,records]=await Promise.all([
  supabaseServer.from('app_experience_events').select('event_key,payload,created_at').eq('user_id',user.id).or(`event_key.not.like.use:%,created_at.gte.${new Date(Date.now()-30*86400000).toISOString()}`).order('created_at',{ascending:false}).limit(3000),
  getRecordsAccess(user.id,{userCreatedAt:user.created_at}),
  supabaseServer.from('radar_reviews').select('target_date').eq('user_id',user.id).not('condition_level','is',null).gte('target_date',dayKey(Date.now()-6*86400000)).lte('target_date',dayKey()).limit(7),
 ]);
 if(events.error)throw events.error;
 return {rows:events.data||[],access,recordDays:records.error?0:new Set((records.data||[]).map(r=>r.target_date)).size};
}
export async function GET(req){
 const {user}=await requireUser(req);if(!user)return reply({error:'ログインが必要です'},401);
 try{return reply({data:await context(user)});}catch{return reply({error:'案内・回答機能を準備中です'},503);}
}
export async function POST(req){
 const {user}=await requireUser(req);if(!user)return reply({error:'ログインが必要です'},401);
 const b=await req.json().catch(()=>null);if(!b)return reply({error:'invalid request'},400);
 const now=Date.now();let key,payload={version:'v73'};
 if(b.type==='use'&&FEATURE_IDS.includes(b.id))key=`use:${b.id}:${dayKey(now)}`;
 else if(b.type==='milestone'&&['forecast','care_viewed','care_recorded'].includes(b.id)){key=`milestone:${b.id}`;payload.mode=b.mode==='tomorrow'?'tomorrow':'today';}
 else if(b.type==='guide'&&GUIDE_IDS.includes(b.id))key=`guide:${b.id}`;
 else if(b.type==='hardware'&&['pwa','push'].includes(b.id))key=`hardware:${b.id}:${dayKey(now)}`;
 else if(b.type==='survey'&&Object.hasOwn(SURVEYS,b.id)&&[...SURVEYS[b.id].options.map(x=>x[0]),'skip'].includes(b.answer)){
  try{
   const c=await context(user);const s=summarizeExperience(c.rows,now);
   if(s.map[`survey:${b.id}`])return reply({data:{saved:true}});
   if(!surveyEligible(b.id,{...c,now}))return reply({error:'回答期間外です'},409);
   key=`survey:${b.id}`;
   payload={...payload,answer:b.answer,period:c.access.mode,active_days:s.activeDays,usage_day:s.ageDays,features:s.features,trial_days_remaining:c.access.trial_days_remaining||0};
  }catch{return reply({error:'回答を保存できませんでした'},503);}
 }else return reply({error:'invalid request'},400);
 try{
  const {error}=await supabaseServer.from('app_experience_events').upsert({user_id:user.id,event_key:key,payload},{onConflict:'user_id,event_key',ignoreDuplicates:true});
  if(error)throw error;return reply({data:{saved:true}});
 }catch{return reply({error:'保存できませんでした'},503);}
}
