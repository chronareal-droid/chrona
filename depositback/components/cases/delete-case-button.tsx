"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteCaseButton({ caseId }: { caseId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    if (!confirm("Delete this case and its letter? This can't be undone.")) return;
    setBusy(true);
    const res = await fetch(`/api/cases/${caseId}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/dashboard/cases");
      router.refresh();
    } else {
      setBusy(false);
      alert("Couldn't delete the case. Please try again.");
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={busy}
      className="text-xs text-[var(--muted)] transition-colors hover:text-red-600 disabled:opacity-50"
    >
      {busy ? "Deleting…" : "Delete case"}
    </button>
  );
}
