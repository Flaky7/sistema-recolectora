"use client";

import { FileSearchIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { getBazaarDocumentUrls } from "../actions";

/** Asks for a fresh 10-minute link only when tapped (FR-026). */
export function ViewDocumentButton({
  bazaarId,
  documentId,
  label = "Ver",
}: {
  bazaarId: string;
  documentId: string;
  label?: string;
}) {
  const [loading, setLoading] = useState(false);

  async function open() {
    const tab = window.open("about:blank", "_blank");
    setLoading(true);
    const result = await getBazaarDocumentUrls(bazaarId);
    setLoading(false);
    const url = result.ok ? result.data.find((d) => d.documentId === documentId)?.signedUrl : null;
    if (!url) {
      tab?.close();
      toast.error(result.ok ? "No encontramos el archivo." : result.error);
      return;
    }
    if (tab) tab.location.href = url;
    else window.location.href = url;
  }

  return (
    <Button type="button" variant="outline" size="lg" onClick={open} disabled={loading}>
      <FileSearchIcon aria-hidden />
      {loading ? "Abriendo…" : label}
    </Button>
  );
}
