<script>
  import { onMount } from 'svelte';
  import createPiling from './piling-example.js'

  let wrapper;

  onMount(() => {
    createPiling(wrapper);
  });
</script>

<div bind:this={wrapper} id="pilingjs-wrapper"></div>

<style>
#pilingjs-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}
</style>
