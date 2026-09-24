// Conservative eligibility: current account age, not creation-to-confirmation interval.
export function isLikelyNewSupabaseUser(user,{now=Date.now(),windowHours=24}={}){
 if(!user?.id)return false;
 const created=Date.parse(user.created_at||'');
 const confirmed=Date.parse(user.email_confirmed_at||user.confirmed_at||user.last_sign_in_at||'');
 const age=now-created;
 return Number.isFinite(created)&&Number.isFinite(confirmed)&&age>=0&&age<=windowHours*3600000&&confirmed>=created&&confirmed<=now;
}
