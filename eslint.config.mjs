import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // The service-role client bypasses RLS. Only account deletion may use it (research R16).
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "cn",
              message:
                "Usa cn de @/lib/utils. El registro de shadcn/ui a veces instala el paquete externo 'cn'; no lo uses.",
            },
            {
              name: "@/lib/supabase/admin",
              message:
                "El cliente con service role solo se usa en src/features/account-deletion/ (research R16).",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/features/account-deletion/**", "src/lib/supabase/admin.ts"],
    rules: { "no-restricted-imports": "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated or non-source folders:
    "src/lib/supabase/database.types.ts",
    "playwright-report/**",
    "test-results/**",
    "specs/**",
    ".specify/**",
    ".claude/**",
  ]),
]);

export default eslintConfig;
