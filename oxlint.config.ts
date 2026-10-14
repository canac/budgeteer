import base from "@canac/oxc-config/oxlint";
import { defineConfig } from "oxlint";

export default defineConfig({
  extends: [base],
  plugins: ["react", "vitest"],
  categories: {
    suspicious: "error",
    perf: "error",
  },
  rules: {
    "no-shadow": "off",
    "no-underscore-dangle": ["error", { allow: ["_sum"] }],
    "oxc/no-map-spread": "off",
    "react/react-in-jsx-scope": "off",
    "react/todo": "error",
  },
  overrides: [
    {
      files: ["**/*.test.ts", "**/*.test.tsx"],
      rules: { "unicorn/consistent-function-scoping": "off" },
    },
  ],
  settings: {
    vitest: { typecheck: false },
  },
});
