import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const configPath = path.join(repoRoot, "catalog", "source", "top-agents.config.json");
const categoriesRoot = path.join(repoRoot, "categories");
const outputDir = path.join(repoRoot, "catalog", "data");

const categoryLabels = {
  "01-core-development": "Core Development",
  "02-language-specialists": "Language Specialists",
  "03-infrastructure": "Infrastructure",
  "04-quality-security": "Quality & Security",
  "05-data-ai": "Data & AI",
  "06-developer-experience": "Developer Experience",
  "07-specialized-domains": "Specialized Domains",
  "08-business-product": "Business & Product",
  "09-meta-orchestration": "Meta Orchestration",
  "10-research-analysis": "Research & Analysis",
  "11-ai-governance-safety": "AI Governance & Safety",
  "12-platform-engineering-idp": "Platform Engineering & IDP",
  "13-llmops-evals-observability": "LLMOps, Evals & Observability"
};

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return walk(fullPath);
    }
    return entry.name.endsWith(".toml") ? [fullPath] : [];
  });
}

function extractQuoted(text, key) {
  const match = text.match(new RegExp(`^${key} = "([^"]*)"`, "m"));
  if (!match) {
    throw new Error(`Missing ${key}`);
  }
  return match[1];
}

function extractBlock(text, key) {
  const match = text.match(new RegExp(`${key} = """([\\s\\S]*?)"""`, "m"));
  if (!match) {
    throw new Error(`Missing block ${key}`);
  }
  return match[1].replace(/\r/g, "").trim();
}

function parseSections(block) {
  const lines = block.split("\n");
  const sections = {};
  let current = "Summary";
  sections[current] = [];

  for (const line of lines) {
    const trimmed = line.trimEnd();
    const heading = trimmed.match(/^([A-Za-z][A-Za-z /&-]+):$/);
    if (heading) {
      current = heading[1];
      sections[current] = [];
      continue;
    }
    if (trimmed.trim()) {
      sections[current].push(trimmed.trim());
    }
  }

  return sections;
}

function cleanList(lines) {
  return (lines || []).map((line) => line.replace(/^[-0-9.]+\s*/, "").trim());
}

function sentenceCase(value) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildSearchText(agent) {
  return [
    agent.name,
    agent.description,
    agent.whyPicked,
    agent.watchFor,
    ...agent.modeTags,
    ...agent.surfaceTags,
    ...agent.workflowTags,
    ...agent.languageTags,
    ...agent.focusAreas,
    ...agent.qualityChecks
  ]
    .join(" ")
    .toLowerCase();
}

const curatedConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
const featuredBySlug = new Map(curatedConfig.agents.map((entry) => [entry.slug, entry]));
const allTomls = walk(categoriesRoot);

const agents = allTomls
  .map((sourcePath) => {
    const slug = path.basename(sourcePath, ".toml");
    const raw = fs.readFileSync(sourcePath, "utf8");
    const instructions = extractBlock(raw, "developer_instructions");
    const sections = parseSections(instructions);
    const categoryKey = path.basename(path.dirname(sourcePath));
    const focusAreas = cleanList(sections["Focus on"]);
    const qualityChecks = cleanList(sections["Quality checks"] || sections["Implementation checks"]);
    const returnShape = cleanList(sections["Return"]);
    const workingMode = cleanList(sections["Working mode"]);
    const featuredEntry = featuredBySlug.get(slug);
    const name = extractQuoted(raw, "name");
    const description = extractQuoted(raw, "description");

    const agent = {
      slug,
      name,
      description,
      model: extractQuoted(raw, "model"),
      reasoningEffort: extractQuoted(raw, "model_reasoning_effort"),
      sandboxMode: extractQuoted(raw, "sandbox_mode"),
      categoryKey,
      categoryLabel: categoryLabels[categoryKey] || sentenceCase(categoryKey),
      sourcePath: path.relative(repoRoot, sourcePath).replace(/\\/g, "/"),
      focusAreas,
      qualityChecks,
      returnShape,
      workingMode,
      delegatePrompt: `Use ${slug} when ${description.replace(/^Use when a task needs /i, "").replace(/^Use when /i, "").replace(/\.$/, "")}.`,
      instructionsPreview: instructions.split("\n").slice(0, 8).join("\n"),
      featured: Boolean(featuredEntry),
      featuredRank: featuredEntry?.rank ?? null,
      tier: featuredEntry?.tier ?? "extended",
      modeTags: featuredEntry?.modeTags ?? [],
      surfaceTags: featuredEntry?.surfaceTags ?? [],
      workflowTags: featuredEntry?.workflowTags ?? [],
      languageTags: featuredEntry?.languageTags ?? [],
      whyPicked: featuredEntry?.whyPicked ?? "Included in the wider library for browsing and future curation.",
      watchFor:
        featuredEntry?.watchFor ??
        "This agent is not in the featured top 20 yet, so treat it as part of the broader catalog rather than a default recommendation.",
      related: featuredEntry?.related ?? []
    };

    agent.searchText = buildSearchText(agent);
    agent.writeCapable = agent.sandboxMode === "workspace-write";

    return agent;
  })
  .sort((a, b) => {
    if (a.featured && b.featured) {
      return a.featuredRank - b.featuredRank;
    }
    if (a.featured !== b.featured) {
      return a.featured ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });

const catalog = {
  title: "Codex Agent Library",
  subtitle: "A browsable library of the full repository, with a curated featured top 20 starter set.",
  generatedAt: new Date().toISOString(),
  sourceRepository: "awesome-codex-subagents",
  selectionPrinciples: curatedConfig.selectionPrinciples,
  featuredAgentCount: curatedConfig.agents.length,
  filters: {
    tiers: [...new Set(agents.map((agent) => agent.tier))],
    categories: [...new Set(agents.map((agent) => agent.categoryLabel))],
    modes: [...new Set(agents.flatMap((agent) => agent.modeTags))],
    surfaces: [...new Set(agents.flatMap((agent) => agent.surfaceTags))],
    workflows: [...new Set(agents.flatMap((agent) => agent.workflowTags))],
    languages: [...new Set(agents.flatMap((agent) => agent.languageTags))],
    sandboxModes: [...new Set(agents.map((agent) => agent.sandboxMode))],
    models: [...new Set(agents.map((agent) => agent.model))]
  },
  agents
};

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(
  path.join(outputDir, "top-agents.json"),
  `${JSON.stringify(catalog, null, 2)}\n`
);
fs.writeFileSync(
  path.join(outputDir, "top-agents.js"),
  `window.TOP_AGENT_CATALOG = ${JSON.stringify(catalog, null, 2)};\n`
);

console.log(`Built catalog for ${agents.length} agents with ${curatedConfig.agents.length} featured picks.`);
