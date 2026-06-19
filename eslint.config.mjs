import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

const config = [
  {
    ignores: [
      "tps1-miniapp/**",
      "zalo-mini-app/**",
      "node_modules/**",
      ".next/**",
      "dist/**"
    ]
  },
  ...nextCoreWebVitals
];

export default config;
