import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import firebaseRulesPlugin from "@firebase/eslint-plugin-security-rules";

const compat = new FlatCompat({
  baseDirectory: dirname(fileURLToPath(import.meta.url)),
});

const eslintConfig = [
  {
    ignores: ["dist/**/*", ".next/**/*", ".next-dev/**/*"],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  firebaseRulesPlugin.configs["flat/recommended"],
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "react/no-unescaped-entities": "off",
      "@next/next/no-img-element": "off",
      "@next/next/no-page-custom-font": "off",
      "react-hooks/exhaustive-deps": "off",
    },
  },
];

export default eslintConfig;
