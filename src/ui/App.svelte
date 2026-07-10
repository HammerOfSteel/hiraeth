<script lang="ts">
  // App.svelte — root Svelte UI overlay
  // All UI sub-components are mounted here. The canvas sits behind this element.
</script>

<!-- placeholder — will grow as Phase 6 (UI) is implemented -->
<div class="hud-root">
  <slot />
</div>

<style>
  .hud-root {
    width: 100%;
    height: 100%;
    position: relative;
    color: #f0ede8;
  }
</style>
