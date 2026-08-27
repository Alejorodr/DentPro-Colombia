import nextPlugin from "@next/eslint-plugin-next";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import globals from "globals";

export default [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "dist/**",
      "tests/prisma-client/**",
      "tests/.tmp/**",
      ".agents/**",
      ".claude/**",
    ],
  },
  {
    files: ["**/*.{js,jsx,ts,tsx}"] ,
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      "@next/next": nextPlugin,
      "@typescript-eslint": tsPlugin,
      "react-hooks": reactHooksPlugin,
    },
    rules: {
      ...(nextPlugin.configs?.["core-web-vitals"]?.rules ?? {}),
      ...(tsPlugin.configs?.recommended?.rules ?? {}),
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "@next/next/no-page-custom-font": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_", "caughtErrorsIgnorePattern": "^_" },
      ],
    },
  },
  {
    // Static design-system kit/demo artifacts are not App Router runtime code.
    files: ["design-system/ui_kits/**/*.jsx"],
    rules: {
      "@next/next/no-img-element": "off",
    },
  },
];
