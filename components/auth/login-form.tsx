"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { loginAction } from "@/app/actions/auth";
import type { DevAccountGroup } from "@/lib/dev-accounts";

export default function LoginForm({
  devAccountGroups = [],
}: {
  devAccountGroups?: DevAccountGroup[];
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showDevAccounts, setShowDevAccounts] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData();
    formData.set("email", email);
    formData.set("password", password);

    const result = await loginAction(formData);
    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }
    router.push(result.redirectTo);
    router.refresh();
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      {/* Email */}
      <div>
        <label
          className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5"
          htmlFor="email"
        >
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@school.edu"
          style={{
            outline: "none",
            transition: "border-color 0.15s, box-shadow 0.15s",
          }}
          className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />
      </div>

      {/* Password */}
      <div>
        <label
          className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5"
          htmlFor="password"
        >
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPass ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            style={{ outline: "none", transition: "border-color 0.15s, box-shadow 0.15s" }}
            className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-11 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
          <button
            type="button"
            onClick={() => setShowPass((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            aria-label={showPass ? "Hide password" : "Show password"}
          >
            {showPass ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div
          className="flex items-center gap-2 rounded-xl border px-4 py-3 text-sm"
          style={{ background: "#fef2f2", borderColor: "#fecaca", color: "#dc2626" }}
          role="alert"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl text-sm font-semibold text-white py-3 transition-all disabled:opacity-60"
        style={{
          background: loading
            ? "#818cf8"
            : "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)",
          boxShadow: loading ? "none" : "0 4px 14px 0 rgba(79,70,229,0.35)",
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            Signing in…
          </span>
        ) : (
          "Sign in →"
        )}
      </button>

      {devAccountGroups.length > 0 && (
        <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/60 px-4 py-3">
          <button
            type="button"
            onClick={() => setShowDevAccounts((v) => !v)}
            className="flex w-full items-center justify-between text-left"
            aria-expanded={showDevAccounts}
          >
            <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-700">
              <span className="rounded bg-amber-200 px-1.5 py-0.5 text-[10px] tracking-normal text-amber-900">
                DEV
              </span>
              Test accounts
            </span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-amber-600"
              style={{
                transform: showDevAccounts ? "rotate(180deg)" : "none",
                transition: "transform 0.15s",
              }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {showDevAccounts && (
            <div className="mt-3 space-y-4">
              {devAccountGroups.map((group) => (
                <div key={group.title}>
                  <p className="text-[11px] font-semibold text-amber-800">{group.title}</p>
                  <p className="text-[11px] text-amber-700/80">{group.hint}</p>
                  <ul className="mt-2 space-y-1">
                    {group.accounts.map((account) => (
                      <li key={account.email}>
                        <button
                          type="button"
                          onClick={() => {
                            setEmail(account.email);
                            setPassword(account.password);
                            setError(null);
                          }}
                          className="flex w-full items-center gap-2 rounded-lg border border-amber-200 bg-white px-2.5 py-1.5 text-left transition-colors hover:border-amber-400 hover:bg-amber-100/60"
                          title={`Fill ${account.email} / ${account.password}`}
                        >
                          <span className="w-[68px] shrink-0 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                            {account.role}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-xs text-slate-700">{account.email}</span>
                            <span className="block truncate text-[11px] text-slate-400">{account.label}</span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </form>
  );
}
