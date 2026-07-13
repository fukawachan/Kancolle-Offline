export const GENERATED_DATA_ARTIFACTS = Object.freeze([
  {
    id: "master",
    domain: "master",
    artifact: "src/master/generated-data.ts",
    generator: "scripts/generate-master-data.cjs",
    command: ["node", "scripts/generate-master-data.cjs"],
    codeInputs: ["scripts/generate-master-data.cjs", "scripts/lib/frozen-source.mjs"]
  },
  {
    id: "quest",
    domain: "quest",
    artifact: "src/master/quest-data.generated.ts",
    generator: "scripts/generate-quest-data.mjs",
    command: ["node", "scripts/generate-quest-data.mjs"],
    codeInputs: ["scripts/generate-quest-data.mjs", "scripts/lib/frozen-source.mjs", "src/master/generated-data.ts"]
  },
  {
    id: "expedition",
    domain: "expedition",
    artifact: "src/master/expedition-data.ts",
    generator: "scripts/generate-expedition-data.mjs",
    command: ["node", "scripts/generate-expedition-data.mjs"],
    codeInputs: ["scripts/generate-expedition-data.mjs", "scripts/lib/frozen-source.mjs"]
  },
  {
    id: "shop",
    domain: "shop",
    artifact: "src/master/shop-data.ts",
    generator: "scripts/generate-shop-data.mjs",
    command: ["node", "scripts/generate-shop-data.mjs"],
    codeInputs: ["scripts/generate-shop-data.mjs", "scripts/lib/frozen-source.mjs"]
  },
  {
    id: "sortie",
    domain: "sortie",
    artifact: "src/master/sortie-data.generated.json",
    generator: "scripts/generate-sortie-data.mjs",
    command: ["node", "scripts/generate-sortie-data.mjs"],
    codeInputs: ["scripts/generate-sortie-data.mjs", "scripts/lib/frozen-source.mjs"]
  },
  {
    id: "routing",
    domain: "routing",
    artifact: "src/master/routing-data.generated.json",
    generator: "scripts/generate-routing-data.mjs",
    command: ["node_modules/.bin/tsx", "scripts/generate-routing-data.mjs"],
    codeInputs: [
      "scripts/generate-routing-data.mjs",
      "scripts/lib/frozen-source.mjs",
      "src/master/routing.ts",
      "src/master/routing-data.ts"
    ]
  },
  {
    id: "map-progress",
    domain: "map-progress",
    artifact: "src/master/map-progress-data.generated.json",
    generator: "scripts/generate-map-progress-data.mjs",
    command: ["node", "scripts/generate-map-progress-data.mjs"],
    codeInputs: ["scripts/generate-map-progress-data.mjs", "scripts/lib/frozen-source.mjs"]
  },
  {
    id: "arsenal",
    domain: "arsenal",
    artifact: "src/master/arsenal-data.generated.json",
    generator: "scripts/generate-arsenal-data.mjs",
    command: ["node", "scripts/generate-arsenal-data.mjs"],
    codeInputs: ["scripts/generate-arsenal-data.mjs", "scripts/lib/frozen-source.mjs"]
  },
  {
    id: "improvement",
    domain: "improvement",
    artifact: "src/master/improvement-data.generated.json",
    generator: "scripts/generate-improvement-data.mjs",
    command: ["node", "scripts/generate-improvement-data.mjs"],
    codeInputs: ["scripts/generate-improvement-data.mjs", "scripts/lib/frozen-source.mjs"]
  }
]);
