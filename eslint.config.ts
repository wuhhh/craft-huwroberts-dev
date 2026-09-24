import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores(["dist/**", "node_modules/**", "src/public/**", "vendor/**", "web/**"]),
  js.configs.recommended,
  ...tseslint.configs.recommended,
  // tsc (via vtsls + tsconfig's strict + noUnusedLocals/Params) already
  // reports the type-aware and unused-symbol diagnostics that
  // typescript-eslint's recommended set would otherwise duplicate. Strip
  // the type-aware rules, and also turn off no-unused-vars since tsc's
  // noUnusedLocals/noUnusedParameters cover it without a second diagnostic.
  tseslint.configs.disableTypeChecked,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    files: ["src/**/*.{js,ts}"],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    files: ["*.{js,cjs,mjs,mts,ts}", "config/**/*.{js,ts}"],
    languageOptions: {
      globals: globals.node,
    },
  },
]);
