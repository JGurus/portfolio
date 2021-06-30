<script>
  import { fade } from 'svelte/transition';
  import Header from '../components/Header.svelte';
  import ToDown from '../components/ToDown.svelte';
  import About from '../components/About.svelte';
  import Skills from '../components/Skills.svelte';
  import Proyects from '../components/Proyects.svelte';
  import Contact from '../components/Contact.svelte';
</script>

<Header />

<section id="home" transition:fade>
  <div class="name-container">
    <h1>Joel Gurumendi</h1>
    <h3>Full Stack Developer</h3>
  </div>
  <a href="#about" class="to-down-container"><ToDown /></a>
</section>

<About />

<Skills />

<Proyects />

<Contact />

<style>
  #home {
    padding-top: 7rem;
    height: calc(100vh - 7rem);
  }
  h1,
  h3 {
    -webkit-user-select: none;
  }
  .name-container {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }

  .name-container > h1 {
    font-size: 5rem;
  }
  .name-container > h3 {
    font-size: 2.5rem;
  }
  .name-container > h1,
  .name-container > h3 {
    font-weight: 400;
    text-align: end;
    line-height: 1.5;
  }
  .to-down-container {
    position: absolute;
    top: 85%;
    right: 1rem;
  }
</style>
