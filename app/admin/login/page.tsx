import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin sign in — AI Bare Minimum Pack",
  robots: { index: false, follow: false },
};

function errorMessage(reason: string | undefined): string | null {
  if (reason === "wrong") return "That passcode was not right. Try again.";
  if (reason === "unconfigured") {
    return "Admin access is not configured on this deployment. Set APP_PASSCODE and redeploy.";
  }
  return null;
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string; next?: string }>;
}) {
  const { reason, next } = await searchParams;
  const message = errorMessage(reason);

  return (
    <main className="admin-login">
      <form className="admin-login-card" method="post" action="/api/admin/login">
        <h1 className="h3">Enter the admin passcode</h1>
        <p className="admin-login-help">
          This area lists every generated pack and its wizard answers. Access is
          restricted to a shared passcode.
        </p>

        <label className="field-label" htmlFor="passcode">
          Passcode
        </label>
        <input
          id="passcode"
          name="passcode"
          type="password"
          autoComplete="off"
          autoFocus
          required
          className="text-input admin-login-input"
        />
        <input type="hidden" name="next" value={next ?? "/admin"} />

        {message && (
          <p className="admin-login-error" role="alert">
            {message}
          </p>
        )}

        <button type="submit" className="button primary admin-login-submit">
          Sign in
        </button>
      </form>
    </main>
  );
}
