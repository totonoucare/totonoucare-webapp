// Reference preview: reuse the guest home forecast API for Tokyo tomorrow.
export function tomorrowJstDate(now = Date.now()) {
  return new Date(now + 9 * 3600000 + 86400000).toISOString().slice(0, 10);
}
export function forecastExampleDateLabel(date) {
  const [, month, day] = date.split('-');
  return `${Number(month)}/${Number(day)}`;
}
export async function loadSignupForecastPreview(signal, now = Date.now()) {
  const date = tomorrowJstDate(now);
  const response = await fetch(`/api/radar/v1/forecast/public?lat=35.68944&lon=139.69167&date=${date}`, { signal, credentials: "omit", cache: "no-store" });
  if (!response.ok) throw new Error('preview_unavailable');
  const bundle = await response.json();
  const score = bundle?.forecast?.score_display_0_10 ?? bundle?.forecast?.score_precise_0_10 ?? bundle?.forecast?.score_0_10;
  if (!bundle?.ok || bundle.target_date !== date || typeof score !== 'number' || !Number.isFinite(score) || score < 0 || score > 10 || ![0, 1, 2].includes(bundle.forecast.signal)) throw new Error('preview_invalid');
  return bundle;
}
export function observeForecastPreview(element, report) {
  if (!element || typeof IntersectionObserver === 'undefined') return () => {};
  let visible = false, reported = false;
  const maybeReport = () => {
    if (visible && !reported && document.visibilityState === 'visible') {
      reported = true;
      report();
      observer.disconnect();
    }
  };
  const observer = new IntersectionObserver((entries) => {
    visible = entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= 0.5);
    maybeReport();
  }, { threshold: 0.5 });
  observer.observe(element);
  document.addEventListener('visibilitychange', maybeReport);
  return () => { observer.disconnect(); document.removeEventListener('visibilitychange', maybeReport); };
}
