<script>
  let html = 'images/html5.svg',
    css = 'images/css3.svg',
    js = 'images/javascript.svg',
    svg = 'images/svg.svg',
    angular = 'images/angular.svg',
    svelt = 'images/svelte.svg',
    react = 'images/react.svg',
    vue = 'images/vuedotjs.svg',
    node = 'images/nodedotjs.svg',
    python = 'images/python.svg',
    dotnet = 'images/dotnet.svg',
    java = 'images/java.svg',
    go = 'images/go.svg',
    ai = 'images/adobeillustrator.svg',
    ps = 'images/adobephotoshop.svg',
    xd = 'images/adobexd.svg',
    figma = 'images/figma.svg',
    ae = 'images/adobeaftereffects.svg',
    pr = 'images/adobepremierepro.svg',
    au = 'images/adobeaudition.svg',
    pt = 'images/protools.svg';
</script>

<section id="skills">
  <div class="frontend-container">
    <h4>Frontend</h4>
    <div>
      <img src={html} alt="html5" />
      <img src={css} alt="css3" />
      <img src={js} alt="javascript" />
      <img src={svg} alt="svg" />
      <img src={angular} alt="angular" />
      <img src={svelt} alt="svelte" />
      <img src={react} alt="react" />
      <img src={vue} alt="vue" />
    </div>
  </div>
  <div class="backend-container">
    <h4>Backend</h4>
    <div>
      <img src={node} alt="node" />
      <img src={python} alt="python" />
      <img src={dotnet} alt="dotnet" />
      <img src={java} alt="java" />
      <img src={go} alt="go" />
    </div>
  </div>
  <div class="design-container">
    <h4>Design & Others</h4>
    <div>
      <img src={ai} alt="adobe illustrator" />
      <img src={ps} alt="adobe photoshop" />
      <img src={xd} alt="adobe xd" />
      <img src={figma} alt="figma" />
      <img src={ae} alt="adobe after effects" />
      <img src={pr} alt="adobe premiere" />
      <img src={au} alt="adobe audition" />
      <img src={pt} alt="protools" />
    </div>
  </div>
</section>

<style>
  #skills {
    height: 100vh;
    display: grid;
    grid-template-areas:
      'header header'
      'frontend backend'
      'design design';
    grid-template-rows: 7em 1fr 0.5fr;
    grid-template-columns: 0.5fr 0.5fr;
  }
  .frontend-container {
    grid-area: frontend;
  }
  .backend-container {
    grid-area: backend;
  }
  .design-container {
    grid-area: design;
  }
  .frontend-container,
  .backend-container,
  .design-container {
    display: grid;
    grid-template-rows: 0.25fr 1fr;
  }
  .frontend-container > div {
    padding: 0 4rem;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    justify-items: center;
  }
  .backend-container > div {
    padding: 0 4rem;
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    justify-items: center;
  }
  .design-container > div {
    padding: 0 8rem;
    display: grid;
    grid-template-columns: repeat(8, 1fr);
  }
  h4 {
    font-size: 3rem;
    font-weight: 400;
    color: var(--celeste);
    text-align: center;
    margin-bottom: 3rem;
  }
</style>
