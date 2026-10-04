"use client";

import { FileSearchIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { getPaymentProofUrl } from "../actions";

/** Asks for a fresh 10-minute signed link only when the collector taps (research R7). */
export function ViewProofButton({ paymentId }: { paymentId: string }) {
  const [loading, setLoading] = useState(false);

  async function open() {
    // Open the tab synchronously so phones do not block it as a pop-up.
    const tab = window.open("about:blank", "_blank");
    setLoading(true);
    const result = await getPaymentProofUrl(paymentId);
    setLoading(false);
    if (!result.ok) {
      tab?.close();
      toast.error(result.error);
      return;
    }
    if (tab) tab.location.href = result.data.signedUrl;
    else window.location.href = result.data.signedUrl;
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="touch"
      className="w-full"
      onClick={open}
      disabled={loading}
    >
      <FileSearchIcon aria-hidden />
      {loading ? "Abriendo…" : "Ver comprobante"}
    </Button>
  );
}
