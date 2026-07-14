export function activeUrgentMessage(messages = []) {
  const rows = Array.isArray(messages) ? messages : [];
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    const row = rows[index];
    if (row?.role !== "assistant") continue;
    return row?.safety_level === "urgent" ? row : null;
  }
  return null;
}

export function showRoutinePrompts(messages = [], sending = false) {
  return !sending && !activeUrgentMessage(messages);
}
