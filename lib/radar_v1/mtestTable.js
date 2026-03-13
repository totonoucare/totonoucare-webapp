// lib/radar_v1/mtestTable.js

/**
 * M-Test 24-point base table
 *
 * A: upper front   = lung_li   (金)
 * B: upper back    = heart_si  (火)
 * C: upper lateral = pc_sj     (火)
 * D: lower front   = spleen_st (土)
 * E: lower back    = kidney_bl (水)
 * F: lower lateral = liver_gb  (木)
 *
 * Each block has 4 candidate points.
 * Mother/child selection will be handled later.
 */

export const MTEST_BLOCKS = {
  A: {
    block: "A",
    line: "lung_li",
    label: "上肢前面",
    element: "metal",
    points: [
      { code: "LU9", name_ja: "太淵", meridian: "lu", role_hint: "mother_or_child" },
      { code: "LU5", name_ja: "尺沢", meridian: "lu", role_hint: "mother_or_child" },
      { code: "LI11", name_ja: "曲池", meridian: "li", role_hint: "mother_or_child" },
      { code: "LI2", name_ja: "二間", meridian: "li", role_hint: "mother_or_child" },
    ],
  },

  B: {
    block: "B",
    line: "heart_si",
    label: "上肢後面",
    element: "fire",
    points: [
      { code: "HT9", name_ja: "少衝", meridian: "ht", role_hint: "mother_or_child" },
      { code: "HT7", name_ja: "神門", meridian: "ht", role_hint: "mother_or_child" },
      { code: "SI3", name_ja: "後渓", meridian: "si", role_hint: "mother_or_child" },
      { code: "SI8", name_ja: "小海", meridian: "si", role_hint: "mother_or_child" },
    ],
  },

  C: {
    block: "C",
    line: "pc_sj",
    label: "上肢側面",
    element: "fire",
    points: [
      { code: "PC9", name_ja: "中衝", meridian: "pc", role_hint: "mother_or_child" },
      { code: "PC7", name_ja: "大陵", meridian: "pc", role_hint: "mother_or_child" },
      { code: "TE3", name_ja: "中渚", meridian: "te", role_hint: "mother_or_child" },
      { code: "TE10", name_ja: "天井", meridian: "te", role_hint: "mother_or_child" },
    ],
  },

  D: {
    block: "D",
    line: "spleen_st",
    label: "下肢前面",
    element: "earth",
    points: [
      { code: "SP2", name_ja: "大都", meridian: "sp", role_hint: "mother_or_child" },
      { code: "SP5", name_ja: "商丘", meridian: "sp", role_hint: "mother_or_child" },
      { code: "ST41", name_ja: "解渓", meridian: "st", role_hint: "mother_or_child" },
      { code: "ST45", name_ja: "厲兌", meridian: "st", role_hint: "mother_or_child" },
    ],
  },

  E: {
    block: "E",
    line: "kidney_bl",
    label: "下肢後面",
    element: "water",
    points: [
      { code: "KI7", name_ja: "復溜", meridian: "ki", role_hint: "mother_or_child" },
      { code: "KI1", name_ja: "湧泉", meridian: "ki", role_hint: "mother_or_child" },
      { code: "BL67", name_ja: "至陰", meridian: "bl", role_hint: "mother_or_child" },
      { code: "BL65", name_ja: "束骨", meridian: "bl", role_hint: "mother_or_child" },
    ],
  },

  F: {
    block: "F",
    line: "liver_gb",
    label: "下肢側面",
    element: "wood",
    points: [
      { code: "LR8", name_ja: "曲泉", meridian: "lr", role_hint: "mother_or_child" },
      { code: "LR2", name_ja: "行間", meridian: "lr", role_hint: "mother_or_child" },
      { code: "GB43", name_ja: "侠渓", meridian: "gb", role_hint: "mother_or_child" },
      { code: "GB38", name_ja: "陽輔", meridian: "gb", role_hint: "mother_or_child" },
    ],
  },
};

export const LINE_TO_BLOCK = {
  lung_li: "A",
  heart_si: "B",
  pc_sj: "C",
  spleen_st: "D",
  kidney_bl: "E",
  liver_gb: "F",
};

export function getMtestBlockByLine(line) {
  const blockKey = LINE_TO_BLOCK[line];
  if (!blockKey) return null;
  return MTEST_BLOCKS[blockKey] || null;
}
