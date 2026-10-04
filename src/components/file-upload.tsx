"use client";

import { CameraIcon, FileTextIcon, Loader2Icon, XIcon } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import type { Bucket } from "@/lib/uploads/paths";
import { uploadFile, UploadError, type UploadKind } from "@/lib/uploads/upload";
import { cn } from "@/lib/utils";

type Props = {
  bucket: Bucket;
  folder: string;
  kind: UploadKind;
  /** File-name prefix, e.g. the document type. */
  prefix?: string;
  /** Opens the rear camera directly on phones (research R8). */
  capture?: boolean;
  /** Text of the button, e.g. "Tomar foto del paquete". */
  label: string;
  /** Uploaded path, or null when there is no file yet. */
  value: string | null;
  onChange: (path: string | null) => void;
  /** Shown when the form marks this field as invalid. */
  error?: string;
  disabled?: boolean;
  className?: string;
};

type Preview = { url: string | null; name: string };

/**
 * Picks a file (or takes a photo), compresses it and uploads it to Storage before the form is
 * sent; the form only receives the path (research R9). Keeps the preview so the user sees what
 * was uploaded and can replace it.
 */
export function FileUpload({
  bucket,
  folder,
  kind,
  prefix,
  capture = false,
  label,
  value,
  onChange,
  error,
  disabled,
  className,
}: Props) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (preview?.url) URL.revokeObjectURL(preview.url);
    };
  }, [preview]);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      const path = await uploadFile(file, { bucket, folder, kind, prefix });
      setPreview({
        url: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
        name: file.name,
      });
      onChange(path);
    } catch (cause) {
      setUploadError(
        cause instanceof UploadError
          ? cause.message
          : "No se pudo subir el archivo. Intenta de nuevo.",
      );
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function clear() {
    setPreview(null);
    onChange(null);
  }

  const message = uploadError ?? error;
  const accept =
    kind === "image"
      ? "image/jpeg,image/png,image/webp"
      : "image/jpeg,image/png,image/webp,application/pdf";

  return (
    <div className={cn("space-y-2", className)}>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={accept}
        capture={capture ? "environment" : undefined}
        className="sr-only top-0 left-0"
        disabled={disabled || uploading}
        onChange={(event) => handleFile(event.target.files?.[0])}
      />

      {value && preview ? (
        <div className="bg-muted/40 flex items-center gap-3 rounded-lg border p-2">
          {preview.url ? (
            // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
            <img
              src={preview.url}
              alt="Vista previa"
              className="size-16 rounded-md object-cover"
            />
          ) : (
            <FileTextIcon className="text-muted-foreground size-10" aria-hidden />
          )}
          <span className="min-w-0 flex-1 truncate text-sm">{preview.name}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            onClick={clear}
            disabled={disabled || uploading}
            aria-label="Quitar archivo"
          >
            <XIcon />
          </Button>
        </div>
      ) : null}

      <Button
        type="button"
        variant={value ? "outline" : "secondary"}
        size="touch"
        className="w-full"
        disabled={disabled || uploading}
        aria-invalid={Boolean(message)}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? (
          <Loader2Icon className="animate-spin" aria-hidden />
        ) : (
          <CameraIcon aria-hidden />
        )}
        {uploading ? "Subiendo…" : value ? "Cambiar archivo" : label}
      </Button>

      {value && !preview ? (
        <p className="text-muted-foreground text-sm">Archivo listo.</p>
      ) : null}
      {message ? (
        <p role="alert" className="text-destructive text-sm">
          {message}
        </p>
      ) : null}
    </div>
  );
}
