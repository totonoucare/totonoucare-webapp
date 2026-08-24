const QUERY_TOKEN_EQUIVALENTS = [
  [/^ノンカフェイン$/, /(ノンカフェイン|カフェインレス|デカフェ)/i],
  [/^(しょうが|生姜|ジンジャー)$/, /(しょうが|生姜|ジンジャー)/i],
  [/^(はとむぎ|はとむぎ茶|ハトムギ|ハトムギ茶)$/, /(はとむぎ|ハトムギ)/i],
  [/^(黒豆|黒豆茶)$/, /黒豆/i],
  [/^(お茶|茶|ティー)$/, /(お茶|茶|ティー|tea)/i],
  [/^(お灸|灸)$/, /(お灸|灸|せんねん灸)/i],
  [/^(首肩|首・肩)$/, /(首|肩|首肩)/i],
  [/^(腰背中|腰・背中)$/, /(腰|背中)/i],
];

function keywordTokens(value) {
  return [...new Set(
    String(value || "")
      .normalize("NFKC")
      .split(/\s+/)
      .map((token) => token.replace(/^[・,、/]+|[・,、/]+$/g, "").trim())
      .filter(Boolean)
  )];
}

function matchesToken(text, token) {
  const source = String(text || "").normalize("NFKC");
  const equivalent = QUERY_TOKEN_EQUIVALENTS.find(([pattern]) => pattern.test(token));
  return equivalent ? equivalent[1].test(source) : source.toLowerCase().includes(token.toLowerCase());
}

export function matchesRakutenKeywordIntent(text, keyword) {
  const tokens = keywordTokens(keyword);
  if (!tokens.length) return false;

  const matchedCount = tokens.filter((token) => matchesToken(text, token)).length;
  // 「アイマスク 耳栓 睡眠」のような代替商品も一行に含むため全面ANDにはしない。
  // 一方、1語一致だけでは雑すぎるため、2語なら両方、3語以上なら半数
  // （最大3語）の一致を必須にする。
  const requiredCount = tokens.length <= 2
    ? tokens.length
    : Math.min(3, Math.ceil(tokens.length / 2));
  return matchedCount >= requiredCount;
}
