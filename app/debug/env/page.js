export default function EnvDebugPage() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return (
    <div style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1>Env Debug</h1>
      <p>NEXT_PUBLIC_SUPABASE_URL: {url ? "OK" : "MISSING"}</p>
      <p>NEXT_PUBLIC_SUPABASE_ANON_KEY: {key ? "OK" : "MISSING"}</p>
      <p style={{ marginTop: 12, fontSize: 12, opacity: 0.7 }}>
        ※ 値そのものは表示していません
      </p>
    </div>
  );
}
