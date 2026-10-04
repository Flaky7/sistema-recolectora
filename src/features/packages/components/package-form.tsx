"use client";

import { useState } from "react";

import { FileUpload } from "@/components/file-upload";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import {
  BazaarPicker,
  type PickedBazaar,
} from "@/features/orders/components/bazaar-picker";
import { BUCKETS, UNIDENTIFIED_FOLDER } from "@/lib/uploads/paths";

import { registerPackage } from "../actions";
import type { PackageResult } from "../service";

export type SavedPackage = PackageResult & { folio: number | null };

/**
 * Photo (camera), source bazaar and note; one big Save button usable with one hand
 * (constitution IV). If saving fails, everything typed stays so the collector can retry.
 */
export function PackageForm({
  customerId,
  orderId,
  onSaved,
}: {
  customerId: string | null;
  orderId: string | null;
  onSaved: (saved: SavedPackage) => void;
}) {
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [bazaar, setBazaar] = useState<PickedBazaar[]>([]);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);

  async function save() {
    setError(null);
    setFieldErrors({});
    if (!photoPath) {
      setFieldErrors({ photoPath: ["Toma la foto del paquete."] });
      return;
    }
    setSaving(true);
    const picked = bazaar[0];
    const result = await registerPackage({
      customerId: customerId ?? undefined,
      orderId: orderId ?? undefined,
      bazaarId: picked?.bazaarId,
      bazaarName: picked?.bazaarId ? undefined : picked?.bazaarName,
      note,
      photoPath,
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      setFieldErrors(result.fieldErrors ?? {});
      return;
    }
    onSaved(result.data);
  }

  return (
    <div className="space-y-5">
      <FileUpload
        bucket={BUCKETS.packagePhotos}
        folder={customerId ?? UNIDENTIFIED_FOLDER}
        kind="image"
        capture
        label="Tomar foto del paquete"
        desktopLabel="Subir foto del paquete"
        value={photoPath}
        onChange={setPhotoPath}
        error={fieldErrors.photoPath?.[0]}
      />
      <BazaarPicker
        value={bazaar}
        onChange={setBazaar}
        multiple={false}
        label="¿De qué bazar viene?"
        error={fieldErrors.bazaarName?.[0] ?? fieldErrors.bazaarId?.[0]}
      />
      <Field>
        <FieldLabel htmlFor="package-note">Nota (opcional)</FieldLabel>
        <Textarea
          id="package-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={2}
          maxLength={500}
          placeholder="Por ejemplo: caja dañada"
        />
      </Field>
      {error ? (
        <p
          role="alert"
          className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm"
        >
          {error}
        </p>
      ) : null}
      <Button
        type="button"
        size="touch"
        className="h-14 w-full text-lg"
        onClick={save}
        disabled={saving}
      >
        {saving ? "Guardando…" : "Guardar paquete"}
      </Button>
    </div>
  );
}
