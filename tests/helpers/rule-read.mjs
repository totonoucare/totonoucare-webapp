// Legacy tests load dailyCareV2 as a data URL. Resolve its standalone food module
// here so the tests exercise the same production import instead of a test stub.
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
export * from 'node:fs/promises';
export async function readFile(file,options){
 let source=await fs.readFile(file,options);
 const name=file instanceof URL?fileURLToPath(file):String(file);
 if(typeof source==='string'&&['dailyCareV2.js','foodIngredientRules.js','foodTcm.js','drinkRules.js'].includes(path.basename(name))){
  for(const file of ['foodCombinationRecipes','foodExplanations','foodTcm','drinkExplanations','drinkRules','lifestyleCandidatesV97']){
   for(const quote of ['"',"'"]){
    const specifier='from '+quote+'./'+file+quote;
    if(!source.includes(specifier))continue;
    const dependency=await readFile(path.join(path.dirname(name),file+'.js'),'utf8');
    source=source.replaceAll(specifier,'from "data:text/javascript;base64,'+Buffer.from(dependency).toString('base64')+'"');
   }
  }
 }
 return source;
}
export default {...fs,readFile};
