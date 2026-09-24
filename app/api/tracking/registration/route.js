import {NextResponse} from 'next/server';
import {requireUser} from '@/lib/requireUser';
import {supabaseServer} from '@/lib/supabaseServer';
import {isLikelyNewSupabaseUser} from '@/lib/metaRegistration';
export const dynamic='force-dynamic';
export const runtime='nodejs';
const reply=(data,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function POST(req){
 try{
  const {user}=await requireUser(req);
  if(!user)return reply({send:false},401);
  if(!isLikelyNewSupabaseUser(user))return reply({send:false});
  // Unique key claims one dispatch attempt across tabs/devices; not a Meta receipt.
  const {data,error}=await supabaseServer.from('app_experience_events').upsert({user_id:user.id,event_key:'tracking:meta_registration:v75',payload:{version:'v75',status:'dispatch_claimed'}},{onConflict:'user_id,event_key',ignoreDuplicates:true}).select('event_key');
  if(error)return reply({send:false},503);
  return reply({send:Array.isArray(data)&&data.length===1});
 }catch{return reply({send:false},503);}
}
