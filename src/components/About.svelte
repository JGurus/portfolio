<section id="about">
  <div class="photo-container"><div class="photo" /></div>
  <div class="text-container">
    <p>
      Hi,<br /> I am a young enthusiast addicted to knowledge.<br />I like to
      teach and learn from others.<br /> Teamwork is my pasion<br /> Share and understand
      others blablateishon
    </p>
  </div>
</section>

<style>
  #about {
    height: 100vh;
    display: flex;
  }
  .photo-container {
    height: 100%;
    width: 50%;
    background-color: var(--celeste);
  }
  .photo {
    height: 50%;
    width: 50%;
    background-color: white;
    border-radius: 50%;
    margin-top: 7rem;
  }
  .text-container {
    height: 100%;
    width: 50%;
  }
  .photo-container,
  .text-container {
    display: flex;
    justify-content: center;
    align-items: center;
  }
  .text-container > p {
    margin-top: 7rem;
    width: 80%;
    font-size: 2rem;
  }
</style>
