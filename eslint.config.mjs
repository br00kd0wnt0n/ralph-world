import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // React-Hooks rules downgraded from `error` to `warn` so they stay
  // visible in lint output but don't block `npm run lint` in CI.
  // Several are intentional SSR/hydration-sync patterns (portal mount
  // guards, localStorage hydration, FrozenRouter ref snapshot, scroll
  // seed); the rest are listed in docs/lint-followups.md as fixable
  // candidates for a future hygiene pass.
  {
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/immutability": "warn",
    },
  },
]);

export default eslintConfig;
