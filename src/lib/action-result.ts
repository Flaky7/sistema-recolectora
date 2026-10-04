import { z } from "zod";

/** Result of every Server Action (contracts/server-actions.md). */
export type ActionResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      /** Message in Spanish, ready to show to the user. */
      error: string;
      /** Machine-readable reason, e.g. CODE_REQUIRED or INCOMPLETE_PACKAGES. */
      code?: string;
      fieldErrors?: Record<string, string[]>;
    };

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function fail<T = never>(
  error: string,
  extra: { code?: string; fieldErrors?: Record<string, string[]> } = {},
): ActionResult<T> {
  return { ok: false, error, ...extra };
}

export function fromZodError<T = never>(error: z.ZodError): ActionResult<T> {
  const { fieldErrors } = z.flattenError(error);
  return fail("Revisa los datos marcados.", {
    code: "VALIDATION",
    fieldErrors: fieldErrors as Record<string, string[]>,
  });
}

/** Shape shared by Postgrest and Storage errors from supabase-js. */
export type DatabaseError = {
  code?: string;
  message: string;
  hint?: string | null;
};

const GENERIC_ERROR = "Ocurrió un error. Intenta de nuevo.";

/**
 * Translates database errors. Triggers raise P0001 with a Spanish message meant for the user;
 * RLS denials, unique and check violations get generic Spanish messages.
 */
export function fromDatabaseError<T = never>(
  error: DatabaseError,
): ActionResult<T> {
  switch (error.code) {
    case "P0001":
      return fail(error.message, error.hint ? { code: error.hint } : {});
    case "42501":
      return fail("No tienes permiso para hacer esto.", { code: "FORBIDDEN" });
    case "23505":
      return fail("Ya existe un registro con esos datos.", {
        code: "DUPLICATE",
      });
    case "23514":
    case "23502":
    case "22P02":
      return fail("Algún dato no es válido. Revisa el formulario.", {
        code: "INVALID",
      });
    case "PGRST116":
      return fail("No encontramos lo que buscas.", { code: "NOT_FOUND" });
    default:
      return fail(GENERIC_ERROR);
  }
}
