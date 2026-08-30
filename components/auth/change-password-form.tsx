"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { changePasswordAction, logoutAction } from "@/app/actions/auth";

const INPUT_CLASS =
  "block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

export default function ChangePasswordForm({ forced }: { forced: boolean }) {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData();
    formData.set("currentPassword", currentPassword);
    formData.set("newPassword", newPassword);
    formData.set("confirmPassword", confirmPassword);

    const result = await changePasswordAction(formData);
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
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5" htmlFor="currentPassword">
          Current password
        </label>
        <input
          id="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          placeholder="The password you signed in with"
          className={INPUT_CLASS}
          style={{ outline: "none" }}
        />
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5" htmlFor="newPassword">
          New password
        </label>
        <input
          id="newPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="At least 8 characters"
          className={INPUT_CLASS}
          style={{ outline: "none" }}
        />
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5" htmlFor="confirmPassword">
          Confirm new password
        </label>
        <input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Type it again"
          className={INPUT_CLASS}
          style={{ outline: "none" }}
        />
      </div>

      {error && (
        <div
          className="flex items-center gap-2 rounded-xl border px-4 py-3 text-sm"
          style={{ background: "#fef2f2", borderColor: "#fecaca", color: "#dc2626" }}
          role="alert"
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl text-sm font-semibold text-white py-3 transition-all disabled:opacity-60"
        style={{
          background: loading ? "#818cf8" : "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)",
          boxShadow: loading ? "none" : "0 4px 14px 0 rgba(79,70,229,0.35)",
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "Saving…" : forced ? "Set password & continue →" : "Update password"}
      </button>

      {forced && (
        <button
          type="button"
          onClick={() => logoutAction()}
          className="w-full text-center text-xs text-slate-400 hover:text-slate-600 transition-colors"
        >
          Sign out instead
        </button>
      )}
    </form>
  );
}
