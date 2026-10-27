// Both requests use the existing APIs and their guest-cookie/atomic-save contract.
// A failed attachment can be retried with eventId without creating another result.
export async function completeConstitutionCheck(
  { answers, accessToken, eventId = "", onCreated, onSaved },
  fetchImpl = fetch
) {
  if (!accessToken) {
    const error = new Error("ログインしてから、もう一度お試しください。");
    error.status = 401;
    throw error;
  }

  async function post(url, body) {
    const response = await fetchImpl(url, {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(json?.error || "体質結果を保存できませんでした。もう一度お試しください。");
      error.status = response.status;
      error.code = json?.code;
      throw error;
    }
    return json;
  }

  let id = eventId;
  if (!id) {
    const json = await post("/api/diagnosis/v2/submit", { answers });
    id = json?.data?.eventId || json?.data?.id;
    if (!id) throw new Error("体質結果を取得できませんでした。もう一度お試しください。");
    onCreated?.(id);
  }
  // Every completed check must be in the account's history before showing it.
  // The server auto-adopts only when no profile exists; rechecks just archive.
  await post(`/api/diagnosis/v2/events/${encodeURIComponent(id)}/attach`);
  onSaved?.(id);
  return id;
}
