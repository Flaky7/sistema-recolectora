import type { FieldValues, Path, UseFormSetError } from "react-hook-form";

import type { ActionResult } from "@/lib/action-result";

/**
 * Shows the server's field errors next to each field. Returns the general message when the
 * error is not tied to a field, so the form can show it in a toast or alert.
 */
export function applyActionErrors<T extends FieldValues>(
  result: Extract<ActionResult<unknown>, { ok: false }>,
  setError: UseFormSetError<T>,
): string | null {
  const entries = Object.entries(result.fieldErrors ?? {});
  for (const [name, messages] of entries) {
    if (messages[0]) {
      setError(name as Path<T>, { type: "server", message: messages[0] });
    }
  }
  return entries.length > 0 && result.code === "VALIDATION" ? null : result.error;
}
