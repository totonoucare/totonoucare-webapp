import { Suspense } from "react";
import AuthCallbackClient from "./AuthCallbackClient";

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-600">認証中…</div>}>
      <AuthCallbackClient />
    </Suspense>
  );
}
