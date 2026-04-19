"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { EmployeeFormState } from "@/app/actions/employees";

type EmployeeDefaults = {
  fullName?: string;
  email?: string;
  department?: string;
  title?: string;
  salary?: number;
  status?: "ACTIVE" | "ON_LEAVE" | "TERMINATED";
};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : label}
    </Button>
  );
}

export function EmployeeForm({
  action,
  defaults,
  submitLabel = "Save",
}: {
  action: (prev: EmployeeFormState, fd: FormData) => Promise<EmployeeFormState>;
  defaults?: EmployeeDefaults;
  submitLabel?: string;
}) {
  const [state, formAction] = useActionState<EmployeeFormState, FormData>(
    action,
    {}
  );

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="fullName">Full name</Label>
          <Input
            id="fullName"
            name="fullName"
            required
            defaultValue={defaults?.fullName ?? ""}
          />
          {state.fieldErrors?.fullName && (
            <p className="text-xs text-[var(--destructive)]">
              {state.fieldErrors.fullName}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            defaultValue={defaults?.email ?? ""}
          />
          {state.fieldErrors?.email && (
            <p className="text-xs text-[var(--destructive)]">
              {state.fieldErrors.email}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="department">Department</Label>
          <Input
            id="department"
            name="department"
            required
            defaultValue={defaults?.department ?? ""}
          />
          {state.fieldErrors?.department && (
            <p className="text-xs text-[var(--destructive)]">
              {state.fieldErrors.department}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            name="title"
            required
            defaultValue={defaults?.title ?? ""}
          />
          {state.fieldErrors?.title && (
            <p className="text-xs text-[var(--destructive)]">
              {state.fieldErrors.title}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="salary">Annual salary (USD)</Label>
          <Input
            id="salary"
            name="salary"
            type="number"
            min={0}
            required
            defaultValue={defaults?.salary ?? 0}
          />
          {state.fieldErrors?.salary && (
            <p className="text-xs text-[var(--destructive)]">
              {state.fieldErrors.salary}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            name="status"
            defaultValue={defaults?.status ?? "ACTIVE"}
            className="flex h-9 w-full rounded-md border border-[var(--input)] bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          >
            <option value="ACTIVE">Active</option>
            <option value="ON_LEAVE">On leave</option>
            <option value="TERMINATED">Terminated</option>
          </select>
        </div>
      </div>

      {state.error && (
        <p className="text-sm text-[var(--destructive)]">{state.error}</p>
      )}

      <div className="flex items-center gap-3">
        <SubmitButton label={submitLabel} />
      </div>
    </form>
  );
}
