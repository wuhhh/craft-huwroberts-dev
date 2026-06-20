import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores(["dist/**", "node_modules/**", "src/public/**", "vendor/**", "web/**"]),
  js.configs.recommended,
  ...tseslint.configs.recommended,
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
