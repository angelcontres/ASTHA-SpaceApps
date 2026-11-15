<script lang="ts">
  // NASA OSDR reference studies — offline snapshot (issue #7, HU-05 offline path). Bundled at build time from
  // data/nasa_osdr_api_human_studies.json; loaded lazily when opened. No network request is ever made.
  interface Study { accession: string; organism: string | null; title?: string; mission?: string | null; flightProgram?: string | null; assays?: string[] }
  let studies = $state<Study[] | null>(null);
  let showAll = $state(false);

  async function load() {
    if (studies) return;
    const { default: snap } = await import('../../data/osdr_studies.json');
    studies = snap.studies as Study[];
  }
  const detailed = $derived((studies ?? []).filter((s) => s.title));
  const others = $derived((studies ?? []).filter((s) => !s.title));
</script>

<details class="panel osdr" ontoggle={(e) => { if ((e.currentTarget as HTMLDetailsElement).open) void load(); }}>
  <summary class="label">NASA OSDR reference studies · offline snapshot</summary>
  {#if !studies}
    <p class="muted">Loading local snapshot…</p>
  {:else}
    <p class="muted small">{studies.length} human-related studies indexed locally. Reference only: not used for triage.</p>
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

<style>
  .osdr { margin-top: var(--gap); }
  summary { cursor: pointer; min-height: var(--touch); display: flex; align-items: center; }
  .list { list-style: none; margin: 8px 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
  .list .unit { display: block; }
  .ids { font-size: 0.875rem; color: var(--text-muted); overflow-wrap: anywhere; }
  .small { font-size: 0.875rem; }
</style>
