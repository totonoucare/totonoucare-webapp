"""Deterministic movement schematics. Arrows show actions, not meridian paths."""
from pathlib import Path
from html import escape
OUT=Path(__file__).resolve().parents[1]/'public/care-movements'
INK='#61536D'; ACC='#9C739F'; SKIN='#F6E9DE'; MINT='#DDEDE7'
def path(d,stroke=INK,width=4,fill='none',extra=''):
 return f'<path d="{d}" stroke="{stroke}" stroke-width="{width}" fill="{fill}" stroke-linecap="round" stroke-linejoin="round" {extra}/>'
def text(x,y,s,size=18):return f'<text x="{x}" y="{y}" fill="{INK}" font-size="{size}" font-family="sans-serif" text-anchor="middle">{escape(s)}</text>'
def arrow(d):return path(d,ACC,5,extra='marker-end="url(#arrow)"')
def spot(x,y):return f'<circle cx="{x}" cy="{y}" r="20" fill="{MINT}"/>'
def hand(x,y,angle=0,scale=1):
 return f'<g transform="translate({x} {y}) rotate({angle}) scale({scale})">'+path('M-10 20 L-13 2 Q-18 -10 -13 -13 Q-10 -15 -5 -2 L-7 -26 Q-7 -32 -3 -32 Q1 -32 1 -26 L2 -10 L3 -31 Q4 -36 8 -34 L10 -11 L12 -28 Q14 -33 18 -29 L18 -7 L20 -19 Q24 -23 26 -17 L25 5 Q24 18 14 23 Z',INK,2,SKIN)+'</g>'
def torso(back=False):
 return '<circle cx="240" cy="65" r="26" fill="'+SKIN+'" stroke="'+INK+'" stroke-width="3"/>'+path('M226 91 L226 105 Q201 110 189 124 L202 230 L278 230 L291 124 Q279 110 254 105 L254 91',fill='#F5F0F7')+path('M192 126 Q176 163 177 207 M289 126 Q307 163 303 207',width=17,stroke=SKIN)+ (path('M240 113 L240 218',width=2,stroke='#C4B1C9') if back else path('M211 120 L233 125 M247 125 L270 120',width=2,stroke='#C4B1C9'))
def seat():return path('M175 202 L296 202 M186 205 L186 257 M284 205 L284 257',stroke='#ABBEB6',width=5)
def arm(kind):
 # Elbow at left, wrist and open hand at right. View labels distinguish surfaces.
 body=path('M78 126 Q140 112 290 132 L318 121 L326 96 Q330 87 336 94 L334 120 L352 94 Q358 86 362 94 L350 124 L374 106 Q383 101 384 109 L362 134 L389 126 Q399 125 396 133 L366 150 Q350 163 320 158 L291 170 Q141 185 78 174 Z',fill=SKIN)
 body+=path('M94 132 Q107 147 94 167',width=2)
 if kind=='outer':
  body+=arrow('M284 150 Q206 147 125 151')+text(236,57,'手の甲を上へ')+text(103,224,'ひじへ')+text(319,224,'手首から')+hand(224,116,75,.8)
 elif kind=='thumb':
  body+=arrow('M117 129 Q208 120 304 131')+text(236,57,'手のひらを上へ')+text(105,224,'ひじの内側から')+text(340,224,'親指側へ')+hand(224,94,75,.8)
 else:
  body+=path('M333 139 Q343 133 351 140',width=2)+arrow('M121 150 L297 150')+text(236,57,'手のひらを上へ')+text(105,224,'ひじの内側から')+text(335,224,'手首の中央へ')+hand(222,115,75,.8)
 return body+text(240,270,'反対の手で軽くなでる · 左右3回',17)
def seated_side(leg='down'):
 b='<circle cx="180" cy="67" r="24" fill="'+SKIN+'" stroke="'+INK+'" stroke-width="3"/>'+path('M175 97 L172 164 Q190 174 238 174',width=26,stroke='#E5DCEB')+path('M175 104 L200 151 L235 155',width=12,stroke=SKIN)+path('M156 107 L156 190 L242 190 M163 191 L163 257 M233 192 L233 257',stroke='#A9BEB5',width=4)
 b+=path('M238 174 L'+('306 146 L329 153' if leg=='up' else '246 236 L278 239'),width=17,stroke=SKIN)
 return b
items={}
def add(id,title,content):
 svg=f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 300" role="img" aria-labelledby="title desc"><title id="title">{escape(title)}</title><desc id="desc">動作を示す模式図。紫の矢印は動かす向き、緑は手を当てる場所。</desc><defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 1 L9 5 L0 9" fill="none" stroke="{ACC}" stroke-width="2"/></marker></defs><rect width="480" height="300" rx="22" fill="#FCFAFD"/>{content}</svg>'''
 (OUT/(id+'.svg')).write_text(svg)
 items[id]=title
add('line-lung-li-clavicle-stroke','鎖骨の下を胸の中央側から肩先へなでる',torso()+arrow('M245 136 Q268 134 286 139')+hand(246,153,-50,.7)+text(114,133,'鎖骨の下',17)+path('M160 138 L218 134',width=1)+text(240,273,'中央側 → 肩先 · 左右3回'))
add('line-lung-li-chest-breath','椅子に座り胸に手を置いて6呼吸',seat()+torso()+spot(240,151)+hand(235,155,-20,.8)+text(112,144,'胸の中央',17)+path('M151 146 L213 150',width=1)+text(240,273,'肩を上げずに · ゆっくり6呼吸'))
add('line-lung-li-thumb-forearm-stroke','前腕の親指側をひじから手首へなでる',arm('thumb'))
add('line-heart-si-little-finger-stroke','肩の下から手首の小指側へなでる',path('M109 87 Q132 62 157 86 L236 146 L338 169 L355 158 L370 161 L387 182 Q394 194 381 200 L352 204 L328 199 L218 180 Z',fill=SKIN)+arrow('M145 101 L228 163 L330 190')+hand(239,134,65,.8)+text(115,49,'肩の下から')+text(339,242,'小指側へ')+text(210,274,'反対の手で · 左右3回',17))
add('line-heart-si-scapula-contact','肩甲骨の外側へ届く範囲で手を当てる',torso(True)+path('M210 136 L227 149 L215 172 M271 136 L254 149 L266 172',stroke='#C4B1C9',width=2)+spot(275,162)+hand(275,166,25,.7)+text(113,59,'背中側',17)+text(369,154,'脇の後ろ',17)+path('M320 156 L296 162',width=1)+text(240,270,'反対の手で、届く範囲に · 3呼吸',17))
add('line-heart-si-shoulder-roll','肩を後ろへ小さく5回回す',seated_side()+arrow('M208 107 C224 83 198 78 193 97 C187 121 213 130 220 112')+text(322,100,'後ろへ小さく',17)+text(240,274,'肩をすくめず · 5回'))
add('line-kidney-bl-low-back-contact','腰の左右へ手のひらを当てる',torso(True)+spot(216,204)+spot(264,204)+hand(211,207,-20,.65)+hand(260,207,20,.65)+text(114,59,'背中側',17)+text(240,273,'押し込まず · 10秒'))
add('line-kidney-bl-calf-stroke','ふくらはぎの後ろを膝下から足首へなでる',path('M213 66 Q258 64 262 87 Q275 114 255 170 L240 213 L276 226 Q288 241 272 245 L211 242 Q195 236 204 211 L208 170 Q182 115 202 84 Z',fill=SKIN)+arrow('M225 104 Q216 149 222 205')+hand(266,152,-35,.8)+text(99,91,'膝の下',17)+text(106,217,'足首へ',17)+text(354,112,'後ろ側',17)+text(240,273,'椅子に座って · 左右5回'))
add('line-kidney-bl-toe-lift','かかとを床につけてつま先を上げる',path('M164 65 L172 216 Q176 236 197 239 L294 239 Q310 229 294 222 L215 204 L210 65',fill=SKIN)+path('M172 219 Q174 235 196 235 L281 188 Q296 179 287 172 L218 197',stroke=ACC,width=3,extra='stroke-dasharray="6 5"')+path('M112 246 L342 246',stroke='#AFBFB7',width=3)+arrow('M320 226 Q327 201 308 177')+spot(181,235)+text(130,273,'かかとは床に',17)+text(291,52,'椅子に座って5回',17))
add('line-liver-gb-side-breath','脇腹に手を当てて左右5呼吸',seat()+torso()+spot(281,178)+hand(280,179,20,.75)+text(359,178,'脇腹',17)+text(240,273,'手に触れる動きを感じる · 左右5呼吸',17))
add('line-liver-gb-outer-thigh-stroke','腰骨の下から膝の外側へなでる',path('M105 99 Q107 65 144 69 L286 119 Q312 137 299 177 L286 237 L248 237 L249 172 L132 153 Q99 143 105 99 Z',fill=SKIN)+arrow('M142 102 L278 146')+hand(215,104,60,.8)+text(123,48,'腰骨の下から',17)+text(351,157,'膝の外側へ',17)+text(240,273,'椅子に座って · 左右5回'))
add('line-liver-gb-side-bend','座って上体を左右へ小さく倒す',seat()+torso()+path('M206 226 L197 258 M274 226 L283 258',width=20,stroke=SKIN)+arrow('M224 39 Q187 25 161 52')+arrow('M256 39 Q293 25 319 52')+hand(207,230,0,.6)+hand(267,230,0,.6)+text(240,287,'両手は太もも · 左右3回',17))
add('line-spleen-st-abdominal-breath','あお向けで膝を立てお腹に手を置いて6呼吸','<circle cx="89" cy="185" r="25" fill="'+SKIN+'" stroke="'+INK+'" stroke-width="3"/>'+path('M119 200 L239 200 L293 130 L344 216 L369 220',width=24,stroke='#E5DCEB')+path('M120 174 Q161 161 207 180 L239 185',width=22,stroke='#E5DCEB')+spot(202,179)+hand(200,172,70,.65)+path('M47 237 L412 237',stroke='#AFBFB7',width=3)+text(208,113,'おへその上',17)+text(355,103,'膝を立てる',17)+text(240,277,'手の上下を感じながら · 6呼吸',17))
add('line-spleen-st-shin-stroke','すねの外側を膝の少し下から足首へなでる',path('M209 63 Q236 48 258 67 L255 183 L262 224 Q266 239 251 243 L210 243 Q197 239 202 224 L213 185 Z',fill=SKIN)+path('M232 91 L230 213',width=2,stroke='#C4B1C9')+arrow('M248 95 L247 210')+hand(279,149,-30,.8)+text(132,95,'膝の少し下',17)+text(337,213,'足首へ',17)+text(240,273,'すねの外側 · 左右5回'))
add('line-spleen-st-knee-extension','座って片脚の膝をゆっくり伸ばして戻す',seated_side('up')+path('M238 174 L246 236 L278 239',stroke='#C4B1C9',width=9,extra='stroke-dasharray="6 6"')+arrow('M287 215 Q323 194 326 169')+text(331,99,'伸ばして戻す',17)+text(240,278,'椅子へ深く座って · 左右5回',17))
add('line-pc-sj-outer-forearm-stroke','前腕の手の甲側を手首からひじへなでる',arm('outer'))
add('line-pc-sj-inner-forearm-stroke','前腕の手のひら側をひじから手首へなでる',arm('inner'))
add('line-pc-sj-wrist-circle','ひじを体の横へつけて手首を小さく回す',torso()+path('M183 167 L171 136 M299 167 L311 136',width=13,stroke=SKIN)+hand(165,122,-10,.75)+hand(305,122,10,.75)+arrow('M130 94 C106 103 113 135 141 139')+arrow('M350 94 C376 103 368 135 341 139')+text(240,273,'外回し・内回し · 左右各3回',17))
assert len(items)==18
print(f'Generated {len(items)} movement diagrams')
