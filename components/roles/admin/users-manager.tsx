"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  createUserAction,
  suspendUserAction,
  reactivateUserAction,
  resetPasswordAction,
} from "@/app/actions/admin/users";
import type { Role, UserStatus } from "@prisma/client";
import type { Pagination } from "@/lib/pagination";
import { PaginationBar } from "@/components/shell/pagination-bar";
import PageHeader from "@/components/shell/page-header";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

type UserRow = {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: UserStatus;
  createdAt: string;
  assignmentCount: number;
};

type RoleFilter = "ALL" | Role;

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Admin",
  TEACHER: "Teacher",
  COUNSELOR: "Counselor",
  PRINCIPAL: "Principal",
};

export default function UsersManager({
  users,
  currentRole,
  currentSearch,
  pagination,
}: {
  users: UserRow[];
  currentRole: RoleFilter;
  currentSearch: string | null;
  pagination: Pagination;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filterHref = (role: RoleFilter) => {
    const params = new URLSearchParams();
    if (role !== "ALL") params.set("role", role);
    if (currentSearch) params.set("q", currentSearch);
    const qs = params.toString();
    return qs ? `/admin/users?${qs}` : "/admin/users";
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        label="System Administration"
        title="User management"
        description="Create staff accounts, suspend access, reset passwords, and manage teacher assignments. All mutations are audited."
        actions={
          <button
            onClick={() => setIsModalOpen(true)}
            data-tour="add-staff-btn"
            className="rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-all"
            style={{ background: "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)" }}
          >
            + Add User
          </button>
        }
      />

      {isModalOpen && <CreateUserCard onClose={() => setIsModalOpen(false)} />}

      <section className="rounded-2xl border border-slate-200 bg-white p-6" data-tour="admin-users-table">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Accounts</h2>
              <p className="mt-1 text-sm text-slate-600">
                {pagination.total.toLocaleString()} matching
                {currentRole !== "ALL" ? ` ${ROLE_LABELS[currentRole]}` : ""}
                {currentSearch ? ` · search "${currentSearch}"` : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(["ALL", "ADMIN", "TEACHER", "COUNSELOR", "PRINCIPAL"] as const).map((r) => (
                <Link
                  key={r}
                  href={filterHref(r)}
                  prefetch={false}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                    currentRole === r
                      ? "border-indigo-500 bg-indigo-50 text-indigo-900"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {r === "ALL" ? "All" : ROLE_LABELS[r]}
                </Link>
              ))}
            </div>
          </div>
          <form method="GET" action="/admin/users" className="flex flex-wrap items-center gap-2">
            {currentRole !== "ALL" && <input type="hidden" name="role" value={currentRole} />}
            <input
              type="search"
              name="q"
              defaultValue={currentSearch ?? ""}
              placeholder="Search name or email…"
              className="min-w-[16rem] flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
            >
              Search
            </button>
            {currentSearch && (
              <Link
                href={currentRole === "ALL" ? "/admin/users" : `/admin/users?role=${currentRole}`}
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 hover:bg-slate-50"
              >
                Clear search
              </Link>
            )}
          </form>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Email</th>
                <th className="px-3 py-2 font-medium">Role</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Assignments</th>
                <th className="px-3 py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-slate-100">
                  <td className="px-3 py-3 font-medium text-slate-900">{u.name}</td>
                  <td className="px-3 py-3 text-slate-600">{u.email}</td>
                  <td className="px-3 py-3 text-slate-700">{ROLE_LABELS[u.role]}</td>
                  <td className="px-3 py-3">
                    <StatusBadge status={u.status} />
                  </td>
                  <td className="px-3 py-3 text-slate-700">
                    {u.role === "TEACHER" ? (
                      <Link href={`/admin/users/${u.id}`} className="text-indigo-700 underline-offset-2 hover:underline">
                        {u.assignmentCount} assignment{u.assignmentCount === 1 ? "" : "s"}
                      </Link>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <UserRowActions user={u} />
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td className="px-3 py-6 text-center text-sm text-slate-500" colSpan={6}>
                    No users match this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4">
          <PaginationBar
            pagination={pagination}
            basePath="/admin/users"
            forwardParams={{
              role: currentRole === "ALL" ? undefined : currentRole,
              q: currentSearch ?? undefined,
            }}
          />
        </div>
      </section>
    </div>
  );
}

function StatusBadge({ status }: { status: UserStatus }) {
  const tone =
    status === "ACTIVE"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : "bg-amber-50 text-amber-700 border-amber-200";
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${tone}`}>
      {status === "ACTIVE" ? "Active" : "Suspended"}
    </span>
  );
}

function CreateUserCard({ onClose }: { onClose: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setError(null);
    startTransition(async () => {
      const r = await createUserAction(fd);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      form.reset();
      onClose();
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/45 flex items-center justify-center p-4">
      {/* Backdrop click to close */}
      <div className="absolute inset-0" onClick={onClose} />

      <section className="relative z-10 bg-white rounded-3xl border border-slate-200 p-7 max-w-lg w-full shadow-2xl flex flex-col gap-5">
        {/* Close Button */}
        <button
          onClick={onClose}
          type="button"
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-650 transition-colors"
          aria-label="Close modal"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex items-center gap-4">
          <div className="h-10 w-10 shrink-0 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 leading-tight">Create a new user</h2>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              Staff credentials stored securely. Share details with the user out-of-band.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <Field label="Name" htmlFor="cu-name">
            <input
              id="cu-name"
              name="name"
              required
              maxLength={120}
              placeholder="e.g. John Doe"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all placeholder:text-slate-400"
            />
          </Field>
          <Field label="Email" htmlFor="cu-email">
            <input
              id="cu-email"
              name="email"
              type="email"
              required
              placeholder="name@school.edu"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all placeholder:text-slate-400"
            />
          </Field>
          <Field label="Role" htmlFor="cu-role">
            <Select
              name="role"
              defaultValue="TEACHER"
            >
              <SelectTrigger className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all w-full flex items-center justify-between">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TEACHER">Teacher</SelectItem>
                <SelectItem value="COUNSELOR">Counselor</SelectItem>
                <SelectItem value="PRINCIPAL">Principal</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Initial password (min 8)" htmlFor="cu-pw">
            <input
              id="cu-pw"
              name="password"
              type="text"
              required
              minLength={8}
              maxLength={128}
              placeholder="••••••••"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-mono focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all placeholder:text-slate-400"
            />
          </Field>

          <div className="md:col-span-2 flex flex-col gap-3 mt-3 border-t border-slate-100 pt-4">
            {error && <p className="text-xs text-red-650 font-bold" role="alert">{error}</p>}
            <div className="flex gap-2.5 justify-end w-full">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 bg-white px-4.5 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending}
                className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white disabled:opacity-60 transition-all"
              >
                {pending ? "Creating…" : "Create user"}
              </button>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function UserRowActions({ user }: { user: UserRow }) {
  const [pending, startTransition] = useTransition();
  const [resetPw, setResetPw] = useState("");
  const [showReset, setShowReset] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSuspendToggle = () => {
    setError(null);
    const fd = new FormData();
    fd.set("userId", user.id);
    startTransition(async () => {
      const r =
        user.status === "ACTIVE" ? await suspendUserAction(fd) : await reactivateUserAction(fd);
      if (!r.ok) setError(r.error);
    });
  };

  const handleReset = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (resetPw.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setError(null);
    const fd = new FormData();
    fd.set("userId", user.id);
    fd.set("password", resetPw);
    startTransition(async () => {
      const r = await resetPasswordAction(fd);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setResetPw("");
      setShowReset(false);
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setShowReset((s) => !s)}
          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          Reset password
        </button>
        <button
          type="button"
          onClick={handleSuspendToggle}
          disabled={pending}
          className={`rounded-lg px-2.5 py-1 text-xs font-medium transition disabled:opacity-60 ${
            user.status === "ACTIVE"
              ? "border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
              : "border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
          }`}
        >
          {user.status === "ACTIVE" ? "Suspend" : "Reactivate"}
        </button>
      </div>
      {showReset && (
        <form onSubmit={handleReset} className="mt-1 flex items-center gap-2">
          <input
            type="text"
            value={resetPw}
            onChange={(e) => setResetPw(e.target.value)}
            placeholder="New password (min 8)"
            minLength={8}
            className="w-44 rounded-lg border border-slate-200 px-2 py-1 text-xs font-mono"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {pending ? "…" : "Save"}
          </button>
        </form>
      )}
      {error && <p className="text-xs text-red-700">{error}</p>}
    </div>
  );
}
