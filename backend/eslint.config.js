import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import globals from "globals";

export default [
  { ignores: ["node_modules/", "coverage/", "uploads/"] },
  js.configs.recommended,
  prettier,
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: { ...globals.node },
    },
    rules: {
      "no-console": "off",
      "no-unused-vars": ["error", { argsIgnorePattern: "^_|^next$|^req$|^res$" }],
      eqeqeq: ["error", "smart"],
      "prefer-const": "error",
    },
  },
];
