const TRANSIENT_STATUS_CODES = new Set([500, 502, 503, 504, 522, 524, 525, 544]);

export const RADAR_UPSTREAM_UNAVAILABLE_CODE =
  "RADAR_DATA_TEMPORARILY_UNAVAILABLE";
export const RADAR_UPSTREAM_UNAVAILABLE_MESSAGE =
  "予報データの保存先に一時的につながりにくくなっています。少し待ってから、もう一度お試しください。";

function errorText(error) {
  if (!error) return "";
  if (typeof error === "string") return error;
  return String(
    error?.message || error?.details || error?.hint || error?.code || ""
  );
}

function errorStatus(error) {
  const value = Number(
    error?.status || error?.statusCode || error?.httpStatusCode || error?.code
  );
  return Number.isFinite(value) ? value : null;
}

export function isTransientRadarUpstreamError(error) {
  const status = errorStatus(error);
  if (status != null && TRANSIENT_STATUS_CODES.has(status)) return true;

  const text = errorText(error).toLowerCase();
  return [
    "connection timed out",
    "connection timeout",
    "error code 522",
    "error code 524",
    "error code 525",
    "database timeout",
    "gateway timeout",
    "service unavailable",
    "upstream connect error",
    "<!doctype html",
    "cf-error-details",
  ].some((needle) => text.includes(needle));
}

export class RadarUpstreamUnavailableError extends Error {
  constructor(operation, cause = null) {
    super(RADAR_UPSTREAM_UNAVAILABLE_MESSAGE);
    this.name = "RadarUpstreamUnavailableError";
    this.code = RADAR_UPSTREAM_UNAVAILABLE_CODE;
    this.status = 503;
    this.retryable = true;
    this.operation = operation || "radar_upstream";
    this.causeCode = cause?.code || cause?.status || cause?.statusCode || null;
  }
}

function defaultSleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runSupabaseOperationWithFastRetry(
  operation,
  {
    label = "radar_supabase_operation",
    maxAttempts = 2,
    retryDelayMs = 350,
    maxFirstAttemptMs = 4000,
    sleep = defaultSleep,
    now = () => Date.now(),
  } = {}
) {
  const attempts = Math.max(1, Math.min(2, Number(maxAttempts) || 1));

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const startedAt = now();
    let result;

    try {
      result = await operation(attempt);
    } catch (error) {
      if (!isTransientRadarUpstreamError(error)) throw error;

      const elapsed = Math.max(0, now() - startedAt);
      const canRetry =
        attempt + 1 < attempts && elapsed <= maxFirstAttemptMs;
      if (!canRetry) throw new RadarUpstreamUnavailableError(label, error);

      await sleep(retryDelayMs);
      continue;
    }

    const upstreamError = result?.error || null;
    if (!upstreamError || !isTransientRadarUpstreamError(upstreamError)) {
      return result;
    }

    const elapsed = Math.max(0, now() - startedAt);
    const canRetry = attempt + 1 < attempts && elapsed <= maxFirstAttemptMs;
    if (!canRetry) {
      throw new RadarUpstreamUnavailableError(label, upstreamError);
    }

    await sleep(retryDelayMs);
  }

  throw new RadarUpstreamUnavailableError(label);
}

export function toPublicRadarApiError(error) {
  if (
    error?.code === RADAR_UPSTREAM_UNAVAILABLE_CODE ||
    isTransientRadarUpstreamError(error)
  ) {
    return {
      status: 503,
      payload: {
        ok: false,
        error: RADAR_UPSTREAM_UNAVAILABLE_MESSAGE,
        code: RADAR_UPSTREAM_UNAVAILABLE_CODE,
        retryable: true,
      },
    };
  }

  return {
    status: 500,
    payload: {
      ok: false,
      error:
        "予報の取得に失敗しました。時間をおいて、もう一度お試しください。",
      code: "RADAR_FORECAST_FAILED",
      retryable: true,
    },
  };
}

export function summarizeRadarServerError(error) {
  if (
    error?.code === RADAR_UPSTREAM_UNAVAILABLE_CODE ||
    isTransientRadarUpstreamError(error)
  ) {
    return {
      name: error?.name || "RadarUpstreamError",
      code: error?.code || RADAR_UPSTREAM_UNAVAILABLE_CODE,
      status: error?.status || errorStatus(error) || 503,
      operation: error?.operation || null,
      retryable: true,
    };
  }

  const text = errorText(error).replace(/\s+/g, " ").slice(0, 300);
  return {
    name: error?.name || "Error",
    code: error?.code || null,
    status: error?.status || errorStatus(error),
    message: text,
  };
}
