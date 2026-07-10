<script lang="ts">
  // App.svelte — root Svelte UI overlay
  // Phase 6 will grow this into a full HUD; for now: title bar only.
</script>

<div class="hud-root">
  <!-- Top bar: title + placeholder time/weather (populated in Phase 2 atmosphere) -->
  <header class="top-bar">
    <span class="title">hiraeth</span>
    <div class="right-cluster">
      <span class="time-slot">— — : — —</span>
    </div>
  </header>
</div>

<style>
  :global(*) {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  .hud-root {
    width: 100%;
    height: 100%;
    position: relative;
    pointer-events: none;   /* let clicks fall through to the canvas */
    user-select: none;
    color: #f0ede8;
    font-family: 'Palatino Linotype', 'Book Antiqua', Palatino, serif;
  }

  /* ── Top bar ─────────────────────────────────────────────────────────────── */
  .top-bar {
    position: absolute;
    top: 0; left: 0; right: 0;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding: 14px 20px 28px;
    /* Gradient so it fades into the scene rather than cutting hard */
    background: linear-gradient(
      to bottom,
      rgba(6, 10, 16, 0.60) 0%,
      rgba(6, 10, 16, 0.20) 70%,
      transparent 100%
    );
  }

  .title {
    font-size: 21px;
    font-style: italic;
    font-weight: 300;
    letter-spacing: 0.15em;
    color: #ede8df;
    text-shadow: 0 1px 6px rgba(0, 0, 0, 0.55);
  }

  /* ── Right-side info cluster ─────────────────────────────────────────────── */
  .right-cluster {
    display: flex;
    align-items: center;
    gap: 14px;
    padding-top: 4px;
  }

  .time-slot {
    font-family: 'Courier New', monospace;
    font-size: 11px;
    letter-spacing: 0.25em;
    color: rgba(240, 237, 232, 0.40);
    text-shadow: 0 1px 4px rgba(0, 0, 0, 0.40);
  }
</style>

