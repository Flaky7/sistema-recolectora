import { z } from "zod";

import { email, password } from "@/lib/validation/messages";

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Escribe tu contraseña."),
  next: z.string().optional(),
});
export type SignInInput = z.input<typeof signInSchema>;

export const requestPasswordResetSchema = z.object({ email });
export type RequestPasswordResetInput = z.input<
  typeof requestPasswordResetSchema
>;

export const updatePasswordSchema = z
  .object({
    password,
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });
export type UpdatePasswordInput = z.input<typeof updatePasswordSchema>;
