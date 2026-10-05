"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button, Spinner } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/toast";

export function DeleteCaseButton({ caseId }: { caseId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    setBusy(true);
    const res = await fetch(`/api/cases/${caseId}`, { method: "DELETE" });
    if (res.ok) {
      toast("Case deleted", "info");
      router.push("/dashboard/cases");
      router.refresh();
    } else {
      setBusy(false);
      toast("Couldn't delete the case. Try again.", "error");
    }
  }

  return (
    <>
      <Button variant="danger" size="sm" onClick={() => setOpen(true)}>
        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Delete case
      </Button>
      <Modal open={open} onClose={() => !busy && setOpen(false)} title="Delete this case?">
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
          The case and its letter will be gone for good. Your landlord isn&apos;t notified either way.
        </p>
        <div className="mt-7 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
            Keep it
          </Button>
          <Button variant="ink" onClick={handleDelete} disabled={busy} className="!bg-[var(--stamp)] !text-white">
            {busy ? <Spinner /> : <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />} Delete
          </Button>
        </div>
      </Modal>
    </>
  );
}
