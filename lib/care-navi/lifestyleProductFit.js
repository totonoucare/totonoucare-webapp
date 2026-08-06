const ROLE_MATCHERS = {
  forearm_support: (text) => /(アームレスト|肘置き|ひじ置き|前腕)/i.test(text),
  carry_support: (text) => /(キャリー|カート|リュック|バッグ)/i.test(text),
  reach_support: (text) => /(作業台|昇降台|机上台|卓上.*台|デスク.*ラック|卓上.*トレー|デスク.*トレー|作業.*トレー|踏み台|ピックアップ)/i.test(text),
  sitting_support: (text) => /(フットレスト|足台|座面|ランバー|腰当て|クッション)/i.test(text),
  reduce_light: (text) => /(間接照明|デスクライト|卓上ライト|ライト|ランプ|調光)/i.test(text),
  leg_support: (text) => /(足枕|脚枕|膝下|フットレスト|クッション)/i.test(text),
  sleep_environment: (text) => /(膝枕|抱き枕|枕|クッション|横向き)/i.test(text),
  reduce_sound: (text) => /(耳栓|遮音|イヤーマフ)/i.test(text),
  visual_layout: (text) => /(デスクオーガナイザー|オーガナイザー|卓上収納|デスク収納|スマホ.*スタンド|タブレット.*スタンド|リモコン.*収納|小物.*トレー)/i.test(text),
  screen_height: (text) => {
    const isViewingSupport = /(スマホ|スマートフォン|タブレット|ノートパソコン|ノートPC|パソコン|モニター|ディスプレイ|書見台|ブックスタンド|読書台|読書|書籍|ブック)/i.test(text);
    const isStand = /(スタンド|書見台|ブックスタンド|読書台|モニター台|机上台|パソコン台|PC台)/i.test(text);
    return isViewingSupport && isStand;
  },
};

export function matchesLifestyleProductRole(text, role) {
  const source = String(text || "");
  const matcher = ROLE_MATCHERS[String(role || "")];
  return matcher ? matcher(source) : true;
}

export const LIFESTYLE_PRODUCT_ROLE_KEYS = Object.freeze(Object.keys(ROLE_MATCHERS));
