import {NextResponse} from 'next/server';
export const dynamic='force-dynamic';
export function GET(){
 return NextResponse.json({version:'v7.79.77',meta_tracking:'initial-document-pageview-only',pixel_id:'1506940704023332'},{headers:{'Cache-Control':'no-store'}});
}
