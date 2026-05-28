import { getMtestPointsByLine } from "@/lib/radar_v1/mtestPointRepo";

const LINE_LABELS = {
  lung_li: "首〜腕外側ライン",
  heart_si: "肩甲骨〜腕内側ライン",
  pc_sj: "肩外側〜手の甲ライン",
  spleen_st: "お腹〜太もも前ライン",
  kidney_bl: "腰〜脚の後ろ側ライン",
  liver_gb: "体側〜脚の外側ライン",
};

const ROLE_LABELS = {
  mother: "支える側",
  child: "逃がす側",
};

const SIDE_HINTS = {
  lung_li: ["呼吸・鎖骨まわりのこわばりを拾う側", "首〜腕外側の詰まりを逃がす側"],
  heart_si: ["胸・腕内側の緊張を拾う側", "肩甲骨〜小指側の張りを逃がす側"],
  pc_sj: ["胸前〜手前側の緊張を拾う側", "肩外側〜手の甲側の張りを逃がす側"],
  spleen_st: ["お腹・内側の重さを支える側", "前もも〜すねの張りを逃がす側"],
  kidney_bl: ["腰・内側の冷えや余力を支える側", "背中〜脚後面の張りを逃がす側"],
  liver_gb: ["内側のこわばりを落ち着ける側", "体側〜脚外側の張りを逃がす側"],
};

function normalizeLineCandidate(line) {
  if (!line) return null;
  if (typeof line === "string") return line;
  return line.meridianCode || line.selected_line || line.code || null;
}

function unique(list) {
  return Array.from(new Set((list || []).filter(Boolean)));
}

function pointRegionLabel(point) {
  return point?.point_region || point?.meridian_code || point?.code || "セルフケア候補";
}

function buildCard({ point, line, sourceLabel }) {
  const role = ROLE_LABELS[point?.mtest_role] || "候補";
  const sideIndex = Number.isFinite(Number(point?.mtest_meridian_side)) ? Number(point.mtest_meridian_side) : 0;
  const sideHint = SIDE_HINTS[line]?.[sideIndex] || "動作負担チェックで見えたラインの候補";
  const lineLabel = LINE_LABELS[line] || line;

  return {
    type: "mtest_point",
    code: point?.code || null,
    title: `${point?.name_ja || point?.code || "ツボ候補"}${point?.reading_ja ? `（${point.reading_ja}）` : ""}`,
    risk: `${lineLabel}｜${role}`,
    reason: `${sourceLabel}として出やすい${lineLabel}のうち、${sideHint}として見返せる候補です。`,
    swap: `部位：${pointRegionLabel(point)}。実際に使う日は、今日・明日の予報ページで出る1点提案を優先してください。`,
    imagePath: point?.image_path || null,
    meridianCode: point?.meridian_code || null,
    line,
    block: point?.mtest_block || null,
    role: point?.mtest_role || null,
    sideIndex,
  };
}

export async function buildKartePlusMtestPointCards({ movement = {} } = {}) {
  const lineSources = [
    { line: normalizeLineCandidate(movement?.primary), sourceLabel: "主な負担ライン" },
    { line: normalizeLineCandidate(movement?.secondary), sourceLabel: "補助ライン" },
    { line: normalizeLineCandidate(movement?.symptomLine), sourceLabel: "今お困りの不調と関係しやすいライン" },
  ].filter((item) => item.line);

  const sourceByLine = new Map();
  for (const item of lineSources) {
    if (!sourceByLine.has(item.line)) sourceByLine.set(item.line, item.sourceLabel);
  }

  const lines = unique(lineSources.map((item) => item.line));
  const cards = [];

  for (const line of lines.slice(0, 2)) {
    try {
      const points = await getMtestPointsByLine({ line });
      const sorted = [...points].sort((a, b) => {
        const side = Number(a.mtest_meridian_side || 0) - Number(b.mtest_meridian_side || 0);
        if (side !== 0) return side;
        const roleOrder = { mother: 0, child: 1 };
        return (roleOrder[a.mtest_role] ?? 9) - (roleOrder[b.mtest_role] ?? 9);
      });

      for (const point of sorted.slice(0, 4)) {
        cards.push(buildCard({
          point,
          line,
          sourceLabel: sourceByLine.get(line) || "身体ライン",
        }));
      }
    } catch (error) {
      console.warn("[karte_plus.mtestPointCards] skipped:", error?.message || error);
    }
  }

  return cards.slice(0, 8);
}
