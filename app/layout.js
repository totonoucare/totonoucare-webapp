import "./globals.css";

export const metadata = {
  title: "未病レーダー",
  description: "体質チェック×天気で、今日を崩しにくくする。",
};

exportault function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <header className="border-b bg-white">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
            <div className="font-semibold">未病レーダー</div>
            <nav className="flex items-center gap-3 text-sm">
              <a className="hover:underline" href="/">
                ホーム
              </a>
              <a className="hover:underline" href="/check">
                体質チェック
              </a>
              <a className="hover:underline" href="/guide">
                ガイド
              </a>
              <a className="hover:underline" href="/radar">
                レーダー
              </a>
              <a className="hover:underline" href="/signup">
                登録
              </a>
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>

        <footer className="border-t bg-white">
          <div className="mx-auto max-w-3xl px-4 py-4 text-xs text-slate-500">
            ※ 水面下で開発中のWebアプリです
          </div>
        </footer>
      </body>
    </html>
  );
}
