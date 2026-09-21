export const SURVEYS = {
 result:{question:'体質チェックの結果で、自分の体調について気づきはありましたか？',options:[['discovery','新しい気づきがあった'],['organized','思い当たることを整理できた'],['none','あまりなかった']]},
 value:{question:'ここまで使って、いちばん役立ったのは？',options:[['forecast','体調に備える目安ができた'],['care','試したいケアが見つかった'],['understanding','自分の状態を整理できた'],['none','まだ役立つ実感はない']]},
 barrier:{question:'使い続けるうえで、いちばん気になるのは？',options:[['price','月額580円の料金'],['fit','自分に合っているか'],['variety','内容の変化が少ない'],['effort','見る・記録する手間'],['none','特にない']]},
};
export const GUIDE_IDS=['forecast','care','reflection'];
export const FEATURE_IDS=['forecast','care','record','analysis','consult','shop','feedback'];
export const dayKey=(time=Date.now())=>new Date(time+9*3600000).toISOString().slice(0,10);
export function summarizeExperience(rows=[],now=Date.now()){
 const map=Object.fromEntries(rows.map(r=>[r.event_key,r]));
 const visits=rows.filter(r=>r.event_key.startsWith('use:'));
 const days=[...new Set(visits.map(r=>r.event_key.split(':')[2]))].sort();
 return {map,activeDays:days.length,ageDays:days.length?Math.floor((Date.parse(dayKey(now))-Date.parse(days[0]))/86400000)+1:0,
 features:[...new Set(visits.map(r=>r.event_key.split(':')[1]))],lastSurveyAt:Math.max(0,...rows.filter(r=>r.event_key.startsWith('survey:')).map(r=>Date.parse(r.created_at)||0))};
}
export function surveyEligible(id,{rows=[],access={},now=Date.now()}={}){
 const s=summarizeExperience(rows,now);
 if(!Object.hasOwn(SURVEYS,id)||s.map[`survey:${id}`])return false;
 if(id==='result')return true;
 if(s.map[`use:feedback:${dayKey(now)}`])return false;
 if(!['beta','trial'].includes(access.mode)||s.ageDays<3||s.activeDays<3)return false;
 if(s.lastSurveyAt&&now-s.lastSurveyAt<2*86400000)return false;
 if(id==='value')return true;
 return access.mode==='trial'&&access.trial_days_remaining>0&&access.trial_days_remaining<=5;
}
export function isQuietExperiencePath(path){return !['/','/radar','/records','/care-navi'].includes(path);}
