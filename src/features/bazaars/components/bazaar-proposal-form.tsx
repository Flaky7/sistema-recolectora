"use client";

import {
  ArrowDownIcon,
  ArrowUpIcon,
  ImagePlusIcon,
  Loader2Icon,
  PlusIcon,
  XIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { BUCKETS } from "@/lib/uploads/paths";
import { uploadFile, UploadError } from "@/lib/uploads/upload";

import { saveBazaarProposal, submitBazaarProposal } from "../actions";

export type ProposalPhoto = { path: string; url: string };

type Props = {
  bazaarId: string;
  defaults: { name: string; brands: string[]; linkUrl: string; photos: ProposalPhoto[] };
  /** "registration": saved as part of the first submission; "change": the approved bazaar
   * proposes a change and sends it for authorization (FR-029). */
  mode: "registration" | "change";
  onDone?: () => void;
};

/**
 * Name, brands as tags, link and 0 to 3 optional photos that can be removed and reordered.
 * Photos go to the private bucket; nothing is public until the collector authorizes (FR-030).
 */
export function BazaarProposalForm({ bazaarId, defaults, mode, onDone }: Props) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(defaults.name);
  const [brands, setBrands] = useState<string[]>(defaults.brands);
  const [brandDraft, setBrandDraft] = useState("");
  const [linkUrl, setLinkUrl] = useState(defaults.linkUrl);
  const [photos, setPhotos] = useState<ProposalPhoto[]>(defaults.photos);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string | null>(null);

  function addBrand() {
    const brand = brandDraft.trim();
    if (!brand) return;
    if (!brands.some((b) => b.toLowerCase() === brand.toLowerCase())) {
      setBrands([...brands, brand.slice(0, 40)]);
    }
    setBrandDraft("");
  }

  async function addPhoto(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const path = await uploadFile(file, {
        bucket: BUCKETS.bazaarPhotoSubmissions,
        folder: bazaarId,
        kind: "image",
      });
      setPhotos((current) => [...current, { path, url: URL.createObjectURL(file) }]);
    } catch (cause) {
      toast.error(cause instanceof UploadError ? cause.message : "No se pudo subir la foto.");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  function move(index: number, delta: number) {
    const next = [...photos];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item!);
    setPhotos(next);
  }

  async function save(sendForReview: boolean) {
    setError(null);
    setErrors({});
    setSaving(true);
    const result = await saveBazaarProposal({
      name,
      brands: brandDraft.trim() ? [...brands, brandDraft.trim()] : brands,
      linkUrl,
      photoPaths: photos.map((p) => p.path),
    });
    if (!result.ok) {
      setSaving(false);
      setErrors(result.fieldErrors ?? {});
      setError(result.code === "VALIDATION" ? "Revisa los datos marcados." : result.error);
      return;
    }
    setBrandDraft("");
    if (sendForReview) {
      const sent = await submitBazaarProposal();
      setSaving(false);
      if (!sent.ok) {
        setError(sent.error);
        return;
      }
      toast.success("Cambio enviado. Se publicará cuando la recolectora lo autorice.");
    } else {
      setSaving(false);
      toast.success("Datos públicos guardados.");
    }
    onDone?.();
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <Field data-invalid={Boolean(errors.name)}>
        <FieldLabel htmlFor="bazaar-name">Nombre del bazar</FieldLabel>
        <Input id="bazaar-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} aria-invalid={Boolean(errors.name)} />
        <FieldError>{errors.name?.[0]}</FieldError>
      </Field>

      <Field data-invalid={Boolean(errors.brands)}>
        <FieldLabel htmlFor="bazaar-brand">Marcas que manejas</FieldLabel>
        {brands.length > 0 ? (
          <ul className="flex flex-wrap gap-2" aria-label="Marcas agregadas">
            {brands.map((brand) => (
              <li key={brand}>
                <Badge variant="secondary" className="h-9 gap-1 pr-1 text-sm">
                  {brand}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setBrands(brands.filter((b) => b !== brand))}
                    aria-label={`Quitar ${brand}`}
                  >
                    <XIcon />
                  </Button>
                </Badge>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="flex gap-2">
          <Input
            id="bazaar-brand"
            value={brandDraft}
            onChange={(e) => setBrandDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addBrand();
              }
            }}
            placeholder="Escribe una marca y toca Agregar"
            maxLength={40}
            aria-invalid={Boolean(errors.brands)}
          />
          <Button type="button" variant="outline" size="touch" onClick={addBrand}>
            <PlusIcon aria-hidden />
            Agregar
          </Button>
        </div>
        <FieldError>{errors.brands?.[0]}</FieldError>
      </Field>

      <Field data-invalid={Boolean(errors.linkUrl)}>
        <FieldLabel htmlFor="bazaar-link">Link de tu página o perfil</FieldLabel>
        <Input
          id="bazaar-link"
          type="url"
          inputMode="url"
          value={linkUrl}
          onChange={(e) => setLinkUrl(e.target.value)}
          placeholder="https://www.facebook.com/tubazar"
          aria-invalid={Boolean(errors.linkUrl)}
        />
        <FieldError>{errors.linkUrl?.[0]}</FieldError>
      </Field>

      <Field>
        <FieldLabel>Fotos (opcionales, hasta 3)</FieldLabel>
        <FieldDescription>
          Las fotos son opcionales; los cambios se publican cuando la recolectora los autorice.
        </FieldDescription>
        {photos.length > 0 ? (
          <ol className="grid grid-cols-3 gap-2" aria-label="Fotos propuestas">
            {photos.map((photo, index) => (
              <li key={photo.path} className="space-y-1">
                {/* eslint-disable-next-line @next/next/no-img-element -- signed or local preview */}
                <img
                  src={photo.url}
                  alt={`Foto ${index + 1}`}
                  className="bg-muted aspect-square w-full rounded-lg object-cover"
                />
                <div className="flex justify-center gap-1">
                  <Button type="button" variant="ghost" size="icon-lg" disabled={index === 0} onClick={() => move(index, -1)} aria-label={`Mover foto ${index + 1} antes`}>
                    <ArrowUpIcon />
                  </Button>
                  <Button type="button" variant="ghost" size="icon-lg" disabled={index === photos.length - 1} onClick={() => move(index, 1)} aria-label={`Mover foto ${index + 1} después`}>
                    <ArrowDownIcon />
                  </Button>
                  <Button type="button" variant="ghost" size="icon-lg" onClick={() => setPhotos(photos.filter((p) => p.path !== photo.path))} aria-label={`Quitar foto ${index + 1}`}>
                    <XIcon />
                  </Button>
                </div>
              </li>
            ))}
          </ol>
        ) : null}
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          aria-label="Elegir foto del bazar"
          onChange={(e) => addPhoto(e.target.files?.[0])}
        />
        {photos.length < 3 ? (
          <Button type="button" variant="outline" size="touch" className="w-full" disabled={uploading} onClick={() => fileInput.current?.click()}>
            {uploading ? <Loader2Icon className="animate-spin" aria-hidden /> : <ImagePlusIcon aria-hidden />}
            {uploading ? "Subiendo…" : "Agregar foto"}
          </Button>
        ) : null}
      </Field>

      {error ? (
        <p role="alert" className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
          {error}
        </p>
      ) : null}

      {mode === "change" ? (
        <Button type="button" size="touch" className="w-full" onClick={() => save(true)} disabled={saving || uploading}>
          {saving ? "Enviando…" : "Enviar cambio a revisión"}
        </Button>
      ) : (
        <Button type="button" size="touch" className="w-full" onClick={() => save(false)} disabled={saving || uploading}>
          {saving ? "Guardando…" : "Guardar datos públicos"}
        </Button>
      )}
    </div>
  );
}
