import Link from "next/link";

import CopyRedirectButton from "./CopyRedirectButton";

const getFirstValue = (value: string | string[] | undefined) => {
  if (!value) {
    return undefined;
  }
  if (Array.isArray(value)) {
    return value.find((item) => item && item.length > 0);
  }
  return value.length > 0 ? value : undefined;
};

const deriveRedirectUri = (searchParams: Record<string, string | string[] | undefined>) => {
  const candidateKeys = ["redirect_uri", "callbackUrl", "url"] as const;
  for (const key of candidateKeys) {
    const candidate = getFirstValue(searchParams[key]);
    if (candidate) {
      return candidate;
    }
  }
  return undefined;
};

type AuthErrorPageProps = {
  searchParams: Record<string, string | string[] | undefined>;
};

const AuthErrorPage = ({ searchParams }: AuthErrorPageProps) => {
  const error = getFirstValue(searchParams.error);
  const errorDescription = getFirstValue(searchParams.error_description);
  const redirectUri = deriveRedirectUri(searchParams);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-black px-6 py-12 text-slate-100">
      <div className="w-full max-w-xl space-y-6 rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
        <div>
          <h1 className="text-2xl font-semibold">Login failed — redirect mismatch</h1>
          <p className="mt-2 text-sm text-slate-300">
            GitHub redirected back to a URL that is not registered in your OAuth application. Copy the URL below into GitHub →
            Settings → Developer settings → OAuth Apps → Authorization callback URL, or set
            <code className="ml-1 rounded bg-black/50 px-1 py-0.5 text-xs">NEXTAUTH_URL</code> to your canonical domain before
            redeploying.
          </p>
        </div>

        <div className="space-y-2 rounded-lg border border-white/10 bg-black/30 p-4 text-sm">
          <div className="font-semibold text-slate-200">Debug details</div>
          <div className="text-slate-300">
            <span className="font-medium text-slate-200">error:</span> {error ? String(error) : "unknown"}
          </div>
          <div className="text-slate-300">
            <span className="font-medium text-slate-200">error_description:</span> {errorDescription ? String(errorDescription) : "n/a"}
          </div>
          <div className="text-slate-300">
            <span className="font-medium text-slate-200">redirect_uri:</span> {redirectUri ?? "not provided"}
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {redirectUri ? <CopyRedirectButton redirectUri={redirectUri} /> : null}
          <Link
            href="https://github.com/settings/developers"
            className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400"
          >
            Open GitHub OAuth settings
          </Link>
        </div>

        <div className="space-y-2 rounded-lg border border-white/10 bg-black/40 p-4 text-sm text-slate-300">
          <p className="font-semibold text-slate-100">How to fix</p>
          <ol className="list-decimal space-y-1 pl-4">
            <li>
              Copy the exact redirect URL shown above and paste it into **Authorization callback URL** inside your GitHub OAuth
              App (GitHub → Settings → Developer settings → OAuth Apps → Edit).
            </li>
            <li>Set <code className="rounded bg-black/50 px-1 py-0.5 text-xs">NEXTAUTH_URL</code> to your production domain and redeploy.</li>
            <li className="text-slate-400">
              Optional: configure a separate OAuth App or additional callbacks for preview / localhost environments.
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default AuthErrorPage;
