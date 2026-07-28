"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { loginAction } from "@/app/actions/auth";

const DEMO_ACCOUNTS = [
  { email: "admin@school.edu", role: "Admin" },
  { email: "teacher@school.edu", role: "Teacher" },
  { email: "counselor@school.edu", role: "Counselor" },
  { email: "principal@school.edu", role: "Principal" },
];

const ROLE_COLORS: Record<string, string> = {
  Admin:     "#4f46e5",
  Teacher:   "#0891b2",
  Counselor: "#059669",
  Principal: "#d97706",
};

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

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

      {/* Demo accounts */}
      <div className="mt-6">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-3">
          Quick access — demo accounts
        </p>
        <div className="grid grid-cols-2 gap-2">
          {DEMO_ACCOUNTS.map((a) => (
            <button
              key={a.email}
              type="button"
              onClick={() => {
                setEmail(a.email);
                setPassword(`${a.role.toLowerCase()}123`);
                setError(null);
              }}
              className="flex flex-col items-start rounded-xl px-3 py-2.5 text-left transition-all hover:scale-[1.02]"
              style={{
                background: "#fff",
                border: "1px solid #e2e8f0",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              }}
            >
              <span
                className="text-[10px] font-bold uppercase tracking-wide mb-0.5"
                style={{ color: ROLE_COLORS[a.role] ?? "#4f46e5" }}
              >
                {a.role}
              </span>
              <span className="text-[11px] text-slate-500 truncate w-full">{a.email}</span>
            </button>
          ))}
        </div>
      </div>
    </form>
  );
}
