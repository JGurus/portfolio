<script>
  import { fade } from 'svelte/transition';
</script>

<header transition:fade>
  <h2 class="isotipo"><a href="#home">G</a><span>uru's</span></h2>
  <nav>
    <ul>
      <a href="#about"><li>About me</li></a>
      <a href="#skills"><li>Skills</li></a>
      <a href="#proyects"><li>Proyects</li></a>
      <a href="#contact"><li>Contact</li></a>
    </ul>
  </nav>
</header>

<style>
  header {
    height: 7rem;
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: fixed;
    background-color: white;
    z-index: 10;
  }

  .isotipo {
    margin-left: 2rem;
    font-size: 4rem;
    font-weight: 400;
    background: linear-gradient(0deg, var(--roza) 0%, var(--celeste) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .isotipo > span {
    display: none;
  }

  header nav {
    margin-right: 7rem;
    align-self: flex-end;
    margin-bottom: 1rem;
  }

  header ul {
    display: flex;
  }
  .isotipo,
  li {
    -webkit-user-select: none;
  }

  nav a {
    display: block;
    color: var(--gris);
    font-size: 1rem;
    margin-left: 27px;
  }
</style>
