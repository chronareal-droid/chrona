import nextConfig from "eslint-config-next";

const eslintConfig = [
  ...nextConfig,
  {
    rules: {
      // These are intentional synchronizations with external systems
      // (DOM classes, localStorage, cookies, route changes) — not
      // the cascading-render antipattern the rule targets.
      "react-hooks/set-state-in-effect": "off",
    },
  },
];

export default eslintConfig;
