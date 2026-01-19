export default function Home() {
  return (
    <div className="grid">
      <div className="card">
        <h1>ととのうケアナビ（Web）</h1>
        <p>
          体質チェックから、未病のセルフケア習慣まで。<br />
          LINEとは別に、水面下で開発中のWebアプリです。
        </p>

        <div className="row" style={{ marginTop: 16 }}>
          <a className="btn primary" href="/check">
            体質チェックを始める
          </a>
          <a className="btn" href="/signup">
            登録して使う
          </a>
        </div>
      </div>
    </div>
  );
}
