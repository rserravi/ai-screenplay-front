// eslint.config.js
import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import reactPlugin from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import eslintConfigPrettier from "eslint-config-prettier";

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    ignores: [
      "dist",
      "build",
      "node_modules",
      ".husky",
      "coverage",
      "**/*.d.ts",
    ],
  },

  // JS/TS base
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        project: false, // si usas tsconfig.eslint.json, cámbialo a true y apunta al archivo
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
      react: reactPlugin,
      "react-hooks": reactHooks,
    },
    settings: {
      react: { version: "detect" },
    },
    rules: {
      ...js.configs.recommended.rules,
      ...reactPlugin.configs.recommended.rules,
      ...reactPlugin.configs["jsx-runtime"].rules,

      // TypeScript (suave y práctico en front)
      "@typescript-eslint/consistent-type-imports": ["warn", { prefer: "type-imports" }],
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],

      // React & hooks
      "react/prop-types": "off",
      "react/jsx-no-target-blank": ["warn", { allowReferrer: true }],
      ...reactHooks.configs.recommended.rules,

      // Estilo general
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-debugger": "warn",
    },
  },

  // Desactiva reglas que chocan con Prettier
  eslintConfigPrettier,
];
