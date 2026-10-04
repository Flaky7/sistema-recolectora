"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="es-MX">
      <body className="flex min-h-dvh flex-col items-center justify-center gap-4 p-4 text-center">
        <h1 className="text-xl font-semibold">Algo salió mal</h1>
        <p className="text-muted-foreground">
          Ocurrió un error inesperado. Ya quedó registrado; intenta de nuevo.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="bg-primary text-primary-foreground rounded-md px-4 py-2"
        >
          Reintentar
        </button>
      </body>
    </html>
  );
}
