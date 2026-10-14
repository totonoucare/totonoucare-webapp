const SCENES = new Set(["general", "desk", "screen", "carry", "sleep"]);
const preferenceKey = userId => `mibyo_lifestyle_scene_v97:${userId || "guest"}`;

export function readLifestyleScenePreference(storage, userId) {
  try {
    const value = storage?.getItem(preferenceKey(userId));
    return SCENES.has(value) ? value : "general";
  } catch { return "general"; }
}

export function saveLifestyleScenePreference(storage, userId, value) {
  if (!SCENES.has(value)) return;
  try { storage?.setItem(preferenceKey(userId), value); } catch { /* Selection still works. */ }
}
