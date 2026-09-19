import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const text=await fs.readFile(new URL('../lib/radar_v1/careMovementImages.js',import.meta.url),'utf8');
const {getCareMovementImage}=await import('data:text/javascript;base64,'+Buffer.from(text).toString('base64'));
test('all eighteen care movements resolve to valid WebP assets with dimensions',async()=>{
 const catalog=await fs.readFile(new URL('../lib/radar_v1/careRules/dailyCareV2.js',import.meta.url),'utf8');
 const names=[...catalog.matchAll(/id: "(line-[^"]+)",\s+line_id:/g)].map(match=>match[1]);
 assert.equal(names.length,18);
 for(const id of names){const asset=getCareMovementImage(id);assert.match(asset.src,/\.webp$/);assert.ok(asset.width>0&&asset.height>0);const bytes=await fs.readFile(new URL('../public'+asset.src,import.meta.url));assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP');}
 const files=await fs.readdir(new URL('../public/care-movements/',import.meta.url));
 for(const file of files.filter(x=>x.endsWith('.svg'))){const id=file.slice(0,-4);const asset=getCareMovementImage(id);await fs.access(new URL('../public'+asset.src,import.meta.url));}
});
