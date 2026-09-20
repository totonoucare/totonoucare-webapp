import { normalizeLifestyleShopActionKey, normalizeLifestyleShopItemRole } from "./lifestyleShopContext";
function careQueryRow(keyword, reason, tags = [], options = {}) { return {keyword, reason, tags, ...options}; }
const TOOL_LAYOUT_LIVE_QUERY_RULES = {
  "tool-arm-support": careQueryRow("デスク アームレスト 後付け", "腕の重さを机へ預け、首肩で腕を吊り続けにくくします。", ["腕を預ける", "首肩"], { productRole: "forearm_support" }),
  "tool-screen-height": careQueryRow("スマホ タブレット 書見台 スタンド 高さ調整", "画面や読み物を、首を大きく曲げずに見やすい高さへ寄せます。", ["見る高さ", "首肩"], { productRole: "screen_height" }),
  "tool-carry-distribution": careQueryRow("買い物 キャリー 軽量 折りたたみ", "片手や片肩へ重さを集めず、荷物を分けて運びやすくします。", ["荷物", "重さを分ける"], { productRole: "carry_support" }),
  "tool-work-height": careQueryRow("卓上 作業台 高さ調整", "よく使う物を、肩や腰を曲げ続けない距離へまとめやすくします。", ["作業の高さ", "手元"], { productRole: "reach_support" }),
  "tool-foot-support": careQueryRow("デスク フットレスト 高さ調整", "足裏を預ける場所を作り、太もも裏や腰だけで座り続けにくくします。", ["足裏", "座る"], { productRole: "sitting_support" }),
  "tool-light-zone": careQueryRow("間接照明 調光 卓上 ライト", "部屋全体を照らし続けず、必要な場所だけを見やすくします。", ["光を絞る", "目元"], { productRole: "reduce_light" }),
  "tool-back-support": careQueryRow("ランバーサポート クッション 薄型", "背もたれへ重さを分け、腰だけで座り続けにくくします。", ["背もたれ", "腰の支持"], { productRole: "sitting_support" }),
  "tool-leg-rest": careQueryRow("足枕 脚枕 低め", "横になる時に、膝下からふくらはぎまでを面で支えます。", ["脚を預ける", "休む姿勢"], { productRole: "leg_support" }),
  "tool-side-sleep-support": careQueryRow("膝枕 横向き クッション", "横向きで上側の脚を支え、腰のねじれを小さくしやすくします。", ["横向き", "膝の間"], { productRole: "sleep_environment" }),
  "tool-facing-layout": careQueryRow("デスク オーガナイザー スマホ スタンド", "よく見る物を身体の正面へ集め、頭を動かす回数を減らしやすくします。", ["正面へ集める", "見る位置"], { productRole: "visual_layout" }),
  "tool-sound-zone": careQueryRow("耳栓 遮音 やわらかい", "周囲の音が重なる場面で、耳へ入る刺激を減らしやすくします。", ["音を減らす", "刺激を絞る"], { productRole: "reduce_sound" }),
  "tool-bath-or-footbath": careQueryRow("入浴剤 無香料 炭酸 温浴", "入浴の時間を取りやすい日に、無理なく温まる選択肢を増やします。", ["入浴", "温浴"], { productRole: "bath_shift" }),
  "prep-evening-bath-or-footbath": careQueryRow("足湯 バケツ 保温 深型", "全身浴が負担な時も、足元を温める準備をしやすくします。", ["足湯", "温める"], { productRole: "bath_shift" }),
};

export const LIFESTYLE_ACTION_ROLE_QUERY_RULES = {
  "tool-work-height:screen_height": careQueryRow("タブレット 書見台 スタンド 高さ調整", "画面や読み物を上げ、前かがみでお腹を折りたたむ時間を減らしやすくします。", ["見る高さ", "手元"], { productRole: "screen_height" }),
};

export const LIFESTYLE_ACTION_LIVE_QUERY_RULES = {
  ...TOOL_LAYOUT_LIVE_QUERY_RULES,
};

export function lifestyleShopQuery(action, role) {
 const key=normalizeLifestyleShopActionKey(action), r=normalizeLifestyleShopItemRole(role);
 return LIFESTYLE_ACTION_ROLE_QUERY_RULES[`${key}:${r}`] || LIFESTYLE_ACTION_LIVE_QUERY_RULES[key] || null;
}
