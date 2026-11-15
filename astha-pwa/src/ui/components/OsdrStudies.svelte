<script lang="ts">
  // NASA OSDR reference studies explorer — offline snapshot (issue #7, UI-10, HU-05 offline path).
  // Bundled locally at build time; zero network requests. Includes offline search + explorer modal.
  import HudIcon from './HudIcon.svelte';

  interface Study { accession: string; organism: string | null; title?: string; mission?: string | null; flightProgram?: string | null; assays?: string[] }
  let studies = $state<Study[] | null>(null);
  let showAll = $state(false);
  let modalOpen = $state(false);
  let query = $state('');

  async function load() {
    if (studies) return;
    const { default: snap } = await import('../../data/osdr_studies.json');
    studies = snap.studies as Study[];
  }

  function openModal() {
    void load();
    modalOpen = true;
  }

  function onKeyDown(ev: KeyboardEvent) {
    if (ev.key === 'Escape' && modalOpen) modalOpen = false;
  }

  const filtered = $derived.by(() => {
    const list = studies ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((s) =>
      [s.accession, s.title ?? '', s.mission ?? '', s.flightProgram ?? '', ...(s.assays ?? [])]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  });

  const detailed = $derived(filtered.filter((s) => s.title));
  const others = $derived(filtered.filter((s) => !s.title));
</script>

<svelte:window onkeydown={onKeyDown} />

<details class="panel osdr" ontoggle={(e) => { if ((e.currentTarget as HTMLDetailsElement).open) void load(); }}>
  <summary class="label">NASA OSDR reference studies · offline snapshot</summary>
  {#if !studies}
    <p class="muted">Loading local snapshot…</p>
  {:else}
    <div class="osdr-bar">
      <p class="muted small">{studies.length} human-related studies indexed locally. Reference only: not used for triage.</p>
      <button type="button" class="btn" onclick={openModal}>Open OSDR Explorer ({studies.length})</button>
    </div>
    <ul class="list">
      {#each detailed as s (s.accession)}
        <li>
          <strong class="num">{s.accession}</strong> · {s.title}
          <span class="unit">{[s.mission, s.flightProgram, s.assays?.join(', ')].filter(Boolean).join(' · ')}</span>
        </li>
      {/each}
    </ul>
    <button type="button" class="btn" aria-expanded={showAll} onclick={() => (showAll = !showAll)}>
      {showAll ? 'Hide' : 'Show'} {others.length} more accessions
    </button>
    {#if showAll}<p class="ids num">{others.map((s) => s.accession).join(' · ')}</p>{/if}
  {/if}
</details>

{#if modalOpen}
  <div class="osdr-layer">
    <button type="button" class="osdr-scrim" aria-label="Close NASA OSDR Explorer" onclick={() => (modalOpen = false)}></button>
    <div class="osdr-modal panel stack" role="dialog" aria-modal="true" aria-labelledby="osdr-h" tabindex="-1">
      <header class="osdr-head">
        <div>
          <h2 id="osdr-h">NASA OSDR Offline Reference Explorer</h2>
          <span class="label">{filtered.length} matching studies · 0 network requests</span>
        </div>
        <button type="button" class="btn icon" aria-label="Close OSDR modal" onclick={() => (modalOpen = false)}>
          <HudIcon name="x" size={18} />
        </button>
      </header>
      <label class="stack">
        <span class="label">Filter offline repository (accession, mission, assay, keyword)</span>
        <input
          type="search"
          class="osdr-search"
          bind:value={query}
          placeholder="e.g. Inspiration4, OSD-574, RNA, SANS…"
          aria-label="Filter NASA OSDR studies"
        />
      </label>
      <div class="osdr-scroll">
        <ul class="list">
          {#each filtered as s (s.accession)}
            <li class="study-row">
              <strong class="num">{s.accession}</strong>
              {#if s.title} · {s.title}{:else} · <span class="muted">Human analog metadata accession</span>{/if}
              <span class="unit">{[s.organism, s.mission, s.flightProgram, s.assays?.join(', ')].filter(Boolean).join(' · ') || 'Local index entry'}</span>
            </li>
          {:else}
            <li class="muted">No bundled OSDR studies match “{query}”.</li>
          {/each}
        </ul>
      </div>
    </div>
  </div>
{/if}

<style>
  .osdr { margin-top: var(--gap); }
  summary { cursor: pointer; min-height: var(--touch); display: flex; align-items: center; }
  .osdr-bar { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
  .list { list-style: none; margin: 8px 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
  .list .unit { display: block; }
  .ids { font-size: 0.875rem; color: var(--text-muted); overflow-wrap: anywhere; }
  .small { font-size: 0.875rem; }
  .osdr-layer { position: fixed; inset: 0; z-index: 65; display: grid; place-items: center; padding: 16px; }
  .osdr-scrim { position: fixed; inset: 0; border: 0; padding: 0; margin: 0; background: rgba(2, 6, 14, 0.72); backdrop-filter: blur(3px); cursor: pointer; }
  .osdr-modal { position: relative; z-index: 1; width: min(820px, 95vw); max-height: 88vh; display: flex; flex-direction: column; background: var(--space-900); border: 2px solid var(--accent); padding: 18px; }
  .osdr-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; padding-bottom: 10px; border-bottom: 1px solid var(--border); }
  .osdr-head h2 { margin: 0 0 2px; font-size: 1.1rem; }
  .osdr-search { min-height: var(--touch); padding: 8px 12px; border: 1px solid var(--border-strong); border-radius: var(--radius-btn); background: var(--space-800); color: var(--text); font: inherit; }
  .osdr-scroll { overflow: auto; flex: 1; padding-right: 4px; }
  .study-row { padding: 8px 10px; border: 1px solid var(--border); border-radius: var(--radius-btn); background: var(--space-800); }
</style>
