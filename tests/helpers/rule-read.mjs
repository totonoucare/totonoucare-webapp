// Legacy tests load dailyCareV2 as a data URL. Resolve its standalone food module
// here so the tests exercise the same production import instead of a test stub.
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
export * from 'node:fs/promises';
export async function readFile(file,options){
 let source=await fs.readFile(file,options);
 const name=file instanceof URL?fileURLToPath(file):String(file);
 if(typeof source==='string'&&path.basename(name)==='dailyCareV2.js'){
  const dependency=await fs.readFile(path.join(path.dirname(name),'foodTcm.js'),'utf8');
  source=source.replace('from "./foodTcm"','from "data:text/javascript;base64,'+Buffer.from(dependency).toString('base64')+'"');
 }
 return source;
}
export default {...fs,readFile};
