(function () {
  const catalog = window.TOP_AGENT_CATALOG;

  if (!catalog || !Array.isArray(catalog.agents)) {
    throw new Error("Catalog data is missing.");
  }

  const state = {
    query: "",
    category: "All",
    selectedTiers: new Set(["foundation", "specialist"]),
    selectedModes: new Set(),
    selectedSandboxModes: new Set(),
    selectedSlug: catalog.agents[0]?.slug || "",
    compareSlugs: [],
    page: "dashboard",
    viewerMode: "list",
    sort: "rank"
  };

  const presetDefinitions = [
    { label: "Featured 20", apply: () => { state.selectedTiers = new Set(["foundation", "specialist"]); } },
    { label: "All library", apply: () => { state.selectedTiers = new Set(); } },
    { label: "Build", apply: () => { state.selectedModes = new Set(["implement"]); } },
    { label: "Review", apply: () => { state.selectedModes = new Set(["review"]); } },
    { label: "Debug", apply: () => { state.selectedModes = new Set(["diagnose"]); } },
    { label: "Write-capable", apply: () => { state.selectedSandboxModes = new Set(["workspace-write"]); } }
  ];

  const elements = {
    heroStats: document.getElementById("heroStats"),
    panelTitle: document.getElementById("panelTitle"),
    panelCopy: document.getElementById("panelCopy"),
    resultsMeta: document.getElementById("resultsMeta"),
    searchInput: document.getElementById("searchInput"),
    clearFiltersButton: document.getElementById("clearFiltersButton"),
    menuLinks: [...document.querySelectorAll("[data-page]")],
    presetFilters: document.getElementById("presetFilters"),
    categoryFilters: document.getElementById("categoryFilters"),
    tierFilters: document.getElementById("tierFilters"),
    modeFilters: document.getElementById("modeFilters"),
    sandboxFilters: document.getElementById("sandboxFilters"),
    sortSelect: document.getElementById("sortSelect"),
    viewerStatus: document.getElementById("viewerStatus"),
    viewerContent: document.getElementById("viewerContent")
  };

  function resetFilters() {
    state.query = "";
    state.category = "All";
    state.selectedTiers = new Set();
    state.selectedModes = new Set();
    state.selectedSandboxModes = new Set();
    state.viewerMode = "list";
    state.sort = "rank";
    elements.searchInput.value = "";
    elements.sortSelect.value = "rank";
  }

  function applyPagePreset(page) {
    state.page = page;
    if (page === "featured") {
      state.selectedTiers = new Set(["foundation", "specialist"]);
      state.viewerMode = "list";
    } else if (page === "library") {
      state.selectedTiers = new Set();
      state.viewerMode = "list";
    } else if (page === "compare") {
      state.viewerMode = state.compareSlugs.length === 2 ? "compare" : "list";
    } else {
      state.viewerMode = "list";
    }
  }

  function slugToAgent(slug) {
    return catalog.agents.find((agent) => agent.slug === slug) || null;
  }

  function matchesSetFilter(agentValues, selectedSet) {
    if (!selectedSet.size) {
      return true;
    }
    return agentValues.some((value) => selectedSet.has(value));
  }

  function getFilteredAgents() {
    const query = state.query.trim().toLowerCase();
    const agents = catalog.agents.filter((agent) => {
      const categoryMatch = state.category === "All" || agent.categoryLabel === state.category;
      const queryMatch = !query || agent.searchText.includes(query);

      return (
        categoryMatch &&
        queryMatch &&
        (!state.selectedTiers.size || state.selectedTiers.has(agent.tier)) &&
        matchesSetFilter(agent.modeTags, state.selectedModes) &&
        (!state.selectedSandboxModes.size || state.selectedSandboxModes.has(agent.sandboxMode))
      );
    });

    const sorters = {
      rank: (a, b) => {
        if (a.featured && b.featured) {
          return a.featuredRank - b.featuredRank;
        }
        if (a.featured !== b.featured) {
          return a.featured ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      },
      name: (a, b) => a.name.localeCompare(b.name),
      category: (a, b) => a.categoryLabel.localeCompare(b.categoryLabel) || a.name.localeCompare(b.name),
      write: (a, b) => Number(b.writeCapable) - Number(a.writeCapable) || a.name.localeCompare(b.name)
    };

    return agents.sort(sorters[state.sort]);
  }

  function getCategoryValues() {
    return ["All", ...catalog.filters.categories];
  }

  function getCompareCopy() {
    if (state.compareSlugs.length === 0) {
      return "Pick up to two agents to compare.";
    }
    if (state.compareSlugs.length === 1) {
      const agent = slugToAgent(state.compareSlugs[0]);
      return `${agent?.name ?? state.compareSlugs[0]} is queued. Add one more agent to enable compare mode.`;
    }
    const names = state.compareSlugs.map((slug) => slugToAgent(slug)?.name ?? slug);
    return `${names[0]} and ${names[1]} are ready to compare.`;
  }

  function ensureSelection() {
    const visible = getFilteredAgents();
    if (!visible.length) {
      state.selectedSlug = "";
      return;
    }
    if (!visible.some((agent) => agent.slug === state.selectedSlug)) {
      state.selectedSlug = visible[0].slug;
    }
  }

  function setDetailMode(slug) {
    state.selectedSlug = slug;
    state.viewerMode = "detail";
  }

  function openCompareMode() {
    if (state.compareSlugs.length === 2) {
      state.viewerMode = "compare";
    }
  }

  function getActiveViewSummary() {
    const parts = [];
    if (state.category !== "All") {
      parts.push(`Category: ${state.category}`);
    }
    if (state.selectedTiers.size) {
      parts.push(`Tier: ${[...state.selectedTiers].join(", ")}`);
    }
    if (state.selectedModes.size) {
      parts.push(`Mode: ${[...state.selectedModes].join(", ")}`);
    }
    if (state.selectedSandboxModes.size) {
      parts.push(`Sandbox: ${[...state.selectedSandboxModes].join(", ")}`);
    }
    if (state.query.trim()) {
      parts.push(`Search: ${state.query.trim()}`);
    }
    return parts.length ? parts.join(" • ") : "All library filters are open.";
  }

  function getActiveViewTags() {
    const tags = [];
    if (state.selectedTiers.size) {
      tags.push(...[...state.selectedTiers]);
    }
    if (state.selectedModes.size) {
      tags.push(...[...state.selectedModes]);
    }
    if (state.selectedSandboxModes.size) {
      tags.push(...[...state.selectedSandboxModes]);
    }
    if (state.category !== "All") {
      tags.push(state.category);
    }
    return tags;
  }

  function getPanelMeta() {
    if (state.page === "featured") {
      return {
        title: "Featured 20",
        copy: "A faster view of the curated starter set."
      };
    }
    if (state.page === "library") {
      return {
        title: "Full Library",
        copy: "Browse all indexed agents with the current filters."
      };
    }
    if (state.page === "compare") {
      return {
        title: "Compare Queue",
        copy: "Shape the queue and open compare mode when two agents are ready."
      };
    }
    return {
      title: "Dashboard",
      copy: "Search, filter, and shape the library from here."
    };
  }

  function createChip(label, active, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `chip${active ? " active" : ""}`;
    button.textContent = label;
    button.addEventListener("click", onClick);
    return button;
  }

  function renderHero() {
    const stats = [
      { label: "Library agents", value: catalog.agents.length },
      { label: "Featured picks", value: catalog.featuredAgentCount },
      { label: "Write-capable", value: catalog.agents.filter((agent) => agent.writeCapable).length },
      { label: "Categories", value: catalog.filters.categories.length }
    ];

    elements.heroStats.innerHTML = "";
    stats.forEach((stat) => {
      const card = document.createElement("div");
      card.className = "stat-card";
      card.innerHTML = `<span class="stat-label">${stat.label}</span><strong class="stat-value">${stat.value}</strong>`;
      elements.heroStats.appendChild(card);
    });
  }

  function renderMenu() {
    elements.menuLinks.forEach((button) => {
      const active = button.getAttribute("data-page") === state.page;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  function renderPresets() {
    elements.presetFilters.innerHTML = "";
    presetDefinitions.forEach((preset) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "chip";
      button.textContent = preset.label;
      button.setAttribute("aria-label", `Apply ${preset.label} preset`);
      button.addEventListener("click", () => {
        resetFilters();
        preset.apply();
        render();
      });
      elements.presetFilters.appendChild(button);
    });
  }

  function renderCategoryFilters() {
    elements.categoryFilters.innerHTML = "";
    getCategoryValues().forEach((category) => {
      const chip = createChip(category, state.category === category, () => {
        state.category = category;
        render();
      });
      chip.setAttribute("aria-pressed", String(state.category === category));
      elements.categoryFilters.appendChild(chip);
    });
  }

  function renderSetFilter(container, values, selectedSet) {
    container.innerHTML = "";
    values.forEach((value) => {
      const chip = createChip(value, selectedSet.has(value), () => {
        if (selectedSet.has(value)) {
          selectedSet.delete(value);
        } else {
          selectedSet.add(value);
        }
        render();
      });
      chip.setAttribute("aria-pressed", String(selectedSet.has(value)));
      container.appendChild(chip);
    });
  }

  function toggleCompare(slug) {
    const index = state.compareSlugs.indexOf(slug);
    if (index >= 0) {
      state.compareSlugs.splice(index, 1);
      return;
    }
    if (state.compareSlugs.length >= 2) {
      state.compareSlugs.shift();
    }
    state.compareSlugs.push(slug);
  }

  function renderResults() {
    const agents = getFilteredAgents();
    ensureSelection();
    const panelMeta = getPanelMeta();
    elements.panelTitle.textContent = panelMeta.title;
    elements.panelCopy.textContent = panelMeta.copy;
    elements.resultsMeta.textContent = `${agents.length} result${agents.length === 1 ? "" : "s"}`;
  }

  function renderAgentCard(agent) {
    const topTags = [
      agent.featured ? `#${agent.featuredRank}` : "Library",
      agent.categoryLabel,
      agent.featured ? "Featured" : "Extended"
    ]
      .map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`)
      .join("");

    const focusTags = [...agent.modeTags.slice(0, 2), agent.writeCapable ? "Can edit" : "Read-only"]
      .filter(Boolean)
      .map((tag) => `<span class="chip">${escapeHtml(tag)}</span>`)
      .join("");

    return `
      <article class="agent-card${agent.slug === state.selectedSlug ? " is-selected" : ""}${state.compareSlugs.includes(agent.slug) ? " is-compared" : ""}">
        <div class="agent-topline">
          <div>
            <p class="meta-kicker">${escapeHtml(agent.categoryLabel)}</p>
            <h3 class="agent-name">${escapeHtml(agent.name)}</h3>
          </div>
          <div class="tag-row">${topTags}</div>
        </div>
        <p class="agent-description">${escapeHtml(agent.description)}</p>
        <div class="tag-row">${focusTags}</div>
        <p class="agent-note"><strong>${agent.featured ? "Why it made the cut" : "Catalog note"}:</strong> ${escapeHtml(agent.whyPicked)}</p>
        <div class="card-actions">
          <button class="card-action" type="button" data-open="${escapeHtml(agent.slug)}">Open</button>
          <button class="card-action${state.compareSlugs.includes(agent.slug) ? " is-active" : ""}" type="button" data-compare="${escapeHtml(agent.slug)}">
            ${state.compareSlugs.includes(agent.slug) ? "Remove compare" : "Add compare"}
          </button>
        </div>
      </article>
    `;
  }

  function renderMetricCard(title, copy) {
    return `
      <div class="metric-card">
        <span class="metric-title">${escapeHtml(title)}</span>
        <div class="metric-copy">${escapeHtml(copy)}</div>
      </div>
    `;
  }

  function renderDetailSection(title, items) {
    return `
      <section class="detail-section">
        <p class="section-kicker">${escapeHtml(title)}</p>
        <ul class="detail-list">
          ${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
        </ul>
      </section>
    `;
  }

  function renderSingleAgent(agent) {
    const modeSummary = agent.modeTags.length ? agent.modeTags.join(", ") : "No enriched mode tags yet";
    const surfaceSummary = agent.surfaceTags.length ? agent.surfaceTags.join(", ") : "No enriched surface tags yet";

    elements.viewerContent.innerHTML = `
      <div class="viewer-header">
        <div>
          <p class="meta-kicker">${escapeHtml(agent.categoryLabel)}</p>
          <h2 class="style-title">${escapeHtml(agent.name)}</h2>
        </div>
        <span class="pill">${escapeHtml(agent.featured ? `Featured #${agent.featuredRank}` : "Extended library")}</span>
      </div>

      <div class="detail-card">
        <div class="detail-toolbar">
          <div>
            <p class="section-kicker">Agent summary</p>
            <p class="detail-copy">${escapeHtml(agent.description)}</p>
          </div>
          <div class="detail-actions">
            <button class="ghost-button" type="button" id="backToBrowseButton">Back to browser</button>
            <a class="viewer-anchor" href="../${escapeAttribute(agent.sourcePath)}" target="_blank" rel="noreferrer">Open TOML</a>
            <button class="ghost-button" type="button" id="copyPromptButton">Copy delegate prompt</button>
          </div>
        </div>

        <div class="metric-grid">
          ${renderMetricCard("Status", agent.featured ? `Featured top 20 (#${agent.featuredRank})` : "Extended library")}
          ${renderMetricCard("Sandbox", agent.sandboxMode)}
          ${renderMetricCard("Model", agent.model)}
          ${renderMetricCard("Reasoning", agent.reasoningEffort)}
          ${renderMetricCard("Modes", modeSummary)}
          ${renderMetricCard("Surfaces", surfaceSummary)}
        </div>

        <div class="resource-links">
          ${agent.related.map((slug) => {
            const related = slugToAgent(slug);
            return related
              ? `<button class="chip" type="button" data-related="${escapeHtml(related.slug)}">${escapeHtml(related.name)}</button>`
              : "";
          }).join("")}
        </div>
      </div>

      <div class="detail-grid summary-shell">
        <div class="detail-stack">
          <section class="detail-section">
            <p class="section-kicker">${escapeHtml(agent.featured ? "Why this one" : "Catalog position")}</p>
            <p class="detail-copy">${escapeHtml(agent.whyPicked)}</p>
            <p class="detail-copy"><strong>Use carefully:</strong> ${escapeHtml(agent.watchFor)}</p>
            <pre class="mono-box">${escapeHtml(agent.delegatePrompt)}</pre>
            <p class="preview-caption">Delegate prompt generated from the source description so you can hand this off quickly.</p>
          </section>

          ${renderDetailSection("Focus areas", agent.focusAreas.slice(0, 8))}
          ${renderDetailSection("Quality checks", agent.qualityChecks.slice(0, 8))}
        </div>

        <div class="detail-stack">
          ${renderDetailSection("Return contract", agent.returnShape)}
          ${renderDetailSection("Working mode", agent.workingMode)}
        </div>
      </div>
    `;

    const copyPromptButton = document.getElementById("copyPromptButton");
    const backToBrowseButton = document.getElementById("backToBrowseButton");
    backToBrowseButton?.addEventListener("click", () => {
      state.viewerMode = "list";
      render();
    });
    copyPromptButton?.addEventListener("click", () => {
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(agent.delegatePrompt);
      }
    });

    elements.viewerContent.querySelectorAll("[data-related]").forEach((button) => {
      button.addEventListener("click", () => {
        setDetailMode(button.getAttribute("data-related"));
        render();
      });
    });
  }

  function renderCompareSelect(agent, slotIndex) {
    const options = catalog.agents.map((candidate) => {
      const selected = candidate.slug === agent.slug ? "selected" : "";
      return `<option value="${escapeAttribute(candidate.slug)}" ${selected}>${escapeHtml(candidate.name)}</option>`;
    }).join("");

    return `
      <label class="slot-select">
        <span class="sr-only">Select agent ${slotIndex + 1}</span>
        <select class="select-input" data-slot="${slotIndex}">
          ${options}
        </select>
      </label>
    `;
  }

  function renderCompareSlot(agent, slotIndex) {
    return `
      <section class="compare-slot">
        <div class="compare-header">
          <div>
            <p class="section-kicker">Slot ${slotIndex + 1}</p>
            <h3>${escapeHtml(agent.name)}</h3>
          </div>
          <span class="chip">${escapeHtml(agent.featured ? `#${agent.featuredRank}` : agent.categoryLabel)}</span>
        </div>

        <div class="compare-selection-row">
          ${renderCompareSelect(agent, slotIndex)}
        </div>

        <div class="metric-grid">
          ${renderMetricCard("Tier", agent.tier)}
          ${renderMetricCard("Sandbox", agent.sandboxMode)}
          ${renderMetricCard("Model", agent.model)}
        </div>

        <section class="detail-section">
          <p class="section-kicker">Why use it</p>
          <p class="detail-copy">${escapeHtml(agent.whyPicked)}</p>
        </section>

        ${renderDetailSection("Focus", agent.focusAreas.slice(0, 5))}
        ${renderDetailSection("Checks", agent.qualityChecks.slice(0, 5))}
      </section>
    `;
  }

  function renderCompareView() {
    const left = slugToAgent(state.compareSlugs[0]);
    const right = slugToAgent(state.compareSlugs[1]);

    if (!left || !right) {
      renderSingleAgent(slugToAgent(state.selectedSlug) || catalog.agents[0]);
      return;
    }

    elements.viewerContent.innerHTML = `
      <div class="viewer-header">
        <div>
          <p class="meta-kicker">Side-by-side compare</p>
          <h2 class="style-title">Compare two agents before you delegate</h2>
        </div>
        <span class="pill">${escapeHtml(`${left.slug} vs ${right.slug}`)}</span>
      </div>

      <div class="detail-card">
        <div class="detail-toolbar">
          <div>
            <p class="section-kicker">Compare mode</p>
            <p class="detail-copy">Swap either slot to compare specialties, operating instructions, and sandbox posture.</p>
          </div>
          <div class="detail-actions">
            <button class="ghost-button" type="button" id="exitCompareButton">Exit compare</button>
          </div>
        </div>

        <div class="compare-grid">
          ${renderCompareSlot(left, 0)}
          ${renderCompareSlot(right, 1)}
        </div>
      </div>
    `;

    document.getElementById("exitCompareButton")?.addEventListener("click", () => {
      state.compareSlugs = [];
      setDetailMode(left.slug);
      render();
    });

    elements.viewerContent.querySelectorAll("[data-slot]").forEach((select) => {
      select.addEventListener("change", () => {
        const slotIndex = Number(select.getAttribute("data-slot"));
        const nextSlug = select.value;
        const otherIndex = slotIndex === 0 ? 1 : 0;
        if (state.compareSlugs[otherIndex] === nextSlug) {
          state.compareSlugs[otherIndex] = state.compareSlugs[slotIndex];
        }
        state.compareSlugs[slotIndex] = nextSlug;
        openCompareMode();
        render();
      });
    });
  }

  function renderBrowseView() {
    const agents = getFilteredAgents();
    if (!agents.length) {
      elements.viewerContent.innerHTML = `
        <div class="detail-card">
          <p class="section-kicker">Browse view</p>
          <p class="detail-copy">No agents match the current filters. Clear a few filters to continue browsing.</p>
        </div>
      `;
      return;
    }

    elements.viewerContent.innerHTML = `
      <div class="viewer-header">
        <div>
          <p class="meta-kicker">${escapeHtml(getPanelMeta().title)}</p>
          <h2 class="style-title">Agent Browser</h2>
        </div>
        <span class="pill">${agents.length} visible</span>
      </div>

      <div class="browse-stack">
        <div class="active-bar">
          <div>
            <p class="compare-label">Active view</p>
            <p class="compare-copy">${escapeHtml(getActiveViewSummary())}</p>
          </div>
          <div class="active-tags">
            ${getActiveViewTags().map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("") || '<span class="tag">All library</span>'}
          </div>
        </div>

        <div class="compare-bar">
          <div>
            <p class="compare-label">Compare queue</p>
            <p class="compare-copy">${escapeHtml(getCompareCopy())}</p>
          </div>
          <div class="compare-actions">
            <button class="ghost-button" type="button" id="inlineClearCompare"${state.compareSlugs.length ? "" : " disabled"}>Reset</button>
            <button class="primary-button" type="button" id="inlineOpenCompare"${state.compareSlugs.length === 2 ? "" : " disabled"}>Open compare</button>
          </div>
        </div>

        <div class="card-grid" id="viewerResultsGrid">
          ${agents.map((agent) => renderAgentCard(agent)).join("")}
        </div>
      </div>
    `;

    document.getElementById("inlineClearCompare")?.addEventListener("click", () => {
      state.compareSlugs = [];
      state.viewerMode = "list";
      render();
    });

    document.getElementById("inlineOpenCompare")?.addEventListener("click", () => {
      openCompareMode();
      render();
    });

    elements.viewerContent.querySelectorAll("[data-open]").forEach((button) => {
      button.addEventListener("click", () => {
        setDetailMode(button.getAttribute("data-open"));
        render();
      });
    });

    elements.viewerContent.querySelectorAll("[data-compare]").forEach((button) => {
      button.addEventListener("click", () => {
        toggleCompare(button.getAttribute("data-compare"));
        render();
      });
    });
  }

  function renderViewer() {
    const selectedAgent = slugToAgent(state.selectedSlug) || getFilteredAgents()[0] || catalog.agents[0];
    if (!selectedAgent) {
      elements.viewerStatus.classList.remove("hidden");
      elements.viewerStatus.innerHTML = "<strong>No agent available.</strong><div class=\"viewer-note\">Widen the filters to continue browsing.</div>";
      elements.viewerContent.innerHTML = "";
      return;
    }

    elements.viewerStatus.classList.add("hidden");
    elements.viewerStatus.innerHTML = "";

    if (state.viewerMode === "compare" && state.compareSlugs.length === 2) {
      renderCompareView();
    } else if (state.viewerMode === "list") {
      renderBrowseView();
    } else {
      renderSingleAgent(selectedAgent);
    }
  }

  function render() {
    renderHero();
    renderMenu();
    renderPresets();
    renderCategoryFilters();
    renderSetFilter(elements.tierFilters, catalog.filters.tiers, state.selectedTiers);
    renderSetFilter(elements.modeFilters, catalog.filters.modes, state.selectedModes);
    renderSetFilter(elements.sandboxFilters, catalog.filters.sandboxModes, state.selectedSandboxModes);
    renderResults();
    renderViewer();
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function escapeAttribute(value) {
    return escapeHtml(value);
  }

  elements.searchInput.addEventListener("input", (event) => {
    state.query = event.target.value;
    render();
  });

  elements.clearFiltersButton.addEventListener("click", () => {
    resetFilters();
    applyPagePreset("dashboard");
    render();
  });

  elements.sortSelect.addEventListener("change", (event) => {
    state.sort = event.target.value;
    render();
  });

  elements.menuLinks.forEach((button) => {
    button.addEventListener("click", () => {
      applyPagePreset(button.getAttribute("data-page"));
      render();
    });
  });

  render();
})();
