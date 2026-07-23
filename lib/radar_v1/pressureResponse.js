const PRESSURE_EXACT_KEYS = new Set(["pressure_down", "pressure_up", "pressure_shift"]);

export function isPressureTrigger(value) {
  return PRESSURE_EXACT_KEYS.has(String(value || ""));
}

export function normalizePressureResponseDirection(value) {
  const direction = String(value || "").trim().toLowerCase();
  if (direction === "accel") return "accel";
  if (direction === "brake") return "brake";
  return "balanced";
}

function pressureResponseCandidates(source = null) {
  if (typeof source === "string") return [source];
  return [
    source?.pressure_response_direction,
    source?.response_direction,
    source?.responseDirection,
    source?.reaction_direction,
    source?.summary?.pressure_response_direction,
    source?.summary?.reaction_direction,
    source?.forecast?.pressure_response_direction,
    source?.forecast?.reaction_direction,
    source?.meta?.manifestation?.reaction_direction,
    source?.meta?.personalized_meta?.manifestation?.reaction_direction,
    source?.constitution_context?.manifestation?.reaction_direction,
  ];
}

/**
 * Returns null when an old snapshot has no response field. This is distinct
 * from an explicitly stored `balanced` response.
 */
export function readExplicitPressureResponseDirection(source = null) {
  const value = pressureResponseCandidates(source)
    .map((candidate) => String(candidate || "").trim().toLowerCase())
    .find((candidate) => ["accel", "brake", "balanced"].includes(candidate));
  return value || null;
}

export function hasExplicitPressureResponseDirection(source = null) {
  return readExplicitPressureResponseDirection(source) !== null;
}

export function readPressureResponseDirection(source = null) {
  return readExplicitPressureResponseDirection(source) || "balanced";
}

function readLegacyPhysicalPressureKey(exact, source = null) {
  const key = String(exact || "").trim();
  if (key === "pressure_down" || key === "pressure_up") return key;
  const direction = String(
    source?.physical_direction ||
    source?.physicalDirection ||
    source?.pressure_direction ||
    source?.direction ||
    source?.trigger_dir ||
    source?.summary?.pressure_direction ||
    source?.forecast?.pressure_direction ||
    ""
  ).toLowerCase();
  if (direction === "down") return "pressure_down";
  if (direction === "up") return "pressure_up";
  return "default";
}

/**
 * Canonical body-expression key. Pressure direction never decides this key.
 * Non-pressure events keep their physical event key because their absolute
 * environment and response meaning are already separated by the V2 model.
 */
export function getBodyResponseKey(exact, source = null) {
  const key = String(exact || "").trim();
  if (!isPressureTrigger(key)) return key || "default";
  const direction = readExplicitPressureResponseDirection(source);
  return direction ? `pressure_${direction}` : readLegacyPhysicalPressureKey(key, source);
}

/**
 * Compatibility projection for older care dictionaries. This projection is
 * selected from the body response, never from the physical pressure direction.
 */
export function getLegacyCareTriggerKey(exact, source = null) {
  const key = String(exact || "").trim();
  if (isPressureTrigger(key) && !hasExplicitPressureResponseDirection(source)) {
    return readLegacyPhysicalPressureKey(key, source);
  }
  const bodyKey = getBodyResponseKey(exact, source);
  if (bodyKey === "pressure_accel") return "pressure_up";
  if (bodyKey === "pressure_brake") return "pressure_down";
  if (bodyKey === "pressure_balanced") return "default";
  return bodyKey;
}

export function getPressureResponseCopy(direction) {
  const normalized = normalizePressureResponseDirection(direction);
  if (normalized === "accel") {
    return {
      short: "張り・力み",
      lead: "張りや力み、切り替えにくさとして表れやすい",
    };
  }
  if (normalized === "brake") {
    return {
      short: "重だるさ",
      lead: "重だるさや動き出しにくさとして表れやすい",
    };
  }
  return {
    short: "切り替えの疲れ",
    lead: "環境変化への適応疲れとして表れやすい",
  };
}

/**
 * Care dictionaries created before V2 use pressure_up / pressure_down as body
 * response aliases. Once a dictionary has been selected by response direction,
 * its prose must not accidentally claim that the physical pressure moved the
 * same way. Keep the physical direction in weather cards and factor labels;
 * neutralize it only inside body-expression and care prose.
 */
export function rewritePressureBodyCopy(value, source = null) {
  if (typeof value !== "string" || !hasExplicitPressureResponseDirection(source)) {
    return value;
  }

  return value
    .replace(/気圧が急(?:に)?下がる/g, "気圧が急に変わる")
    .replace(/気圧が急(?:に)?上がる/g, "気圧が急に変わる")
    .replace(/気圧が下がる/g, "気圧が変わる")
    .replace(/気圧が上がる/g, "気圧が変わる")
    .replace(/低気圧/g, "気圧変化")
    .replace(/高気圧/g, "気圧変化")
    .replace(/気圧低下/g, "気圧変化")
    .replace(/気圧上昇/g, "気圧変化");
}

export function rewritePressureBodyCopyDeep(value, source = null) {
  if (!hasExplicitPressureResponseDirection(source)) return value;
  if (typeof value === "string") return rewritePressureBodyCopy(value, source);
  if (Array.isArray(value)) {
    return value.map((item) => rewritePressureBodyCopyDeep(item, source));
  }
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      rewritePressureBodyCopyDeep(item, source),
    ])
  );
}
