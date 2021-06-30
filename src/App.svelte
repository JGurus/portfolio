<script>
  import Intro from './components/Intro.svelte';
  import Home from './pages/Home.svelte';
  let intro = true;
  setTimeout(() => {
    intro = false;
  }, 7000);
</script>

{#if intro}
  <Intro />
{:else}<Home />{/if}

<!-- <Home /> -->

<style>
</style>
