import "./globals.css";

export const metadata = {
  title: "ととのうケアナビ（Web）",
  description: "体質チェックから未病習慣まで。Webアプリ版プロトタイプ。"
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body>
        <div className="container">
          <header className="nav">
            <a href="/" className="btn ghost">ととのうケアナビ</a>
            <span className="badge">Web app prototype</span>
            <div style={{ marginLeft: "auto" }} className="row">
              <a className="btn" href="/check">体質チェック</a>
              <a className="btn" href="/signup">登録</a>
            </div>
          </header>

          <main>{children}</main>

          <footer className="small" style={{ padding: "28px 0" }}>
            ※ 水面下で開発中のWebアプリです
          </footer>
        </div>
      </body>
    </html>
  );
}
