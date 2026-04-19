"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteEmployee } from "@/app/actions/employees";

export function DeleteEmployeeButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant="destructive"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          if (confirm("Delete this employee? This cannot be undone.")) {
            await deleteEmployee(id);
          }
        })
      }
    >
      {pending ? "Deleting…" : "Delete"}
    </Button>
  );
}
