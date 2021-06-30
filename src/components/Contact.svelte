<script>
  let logo = 'images/logotipo.svg',
    linkedin = 'images/linkedin.svg',
    github = 'images/github.svg',
    gmail = 'images/gmail.svg',
    whatsaap = 'images/whatsapp.svg';
</script>

<footer id="contact">
  <img src={logo} alt="logotipo" />
  <div>
    <img src={linkedin} alt="linkedin" />
    <img src={github} alt="github" />
    <img src={gmail} alt="gmail" />
    <img src={whatsaap} alt="whatsapp" />
  </div>
</footer>

<style>
  #contact {
    height: 7rem;
    background-color: white;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 7rem;
  }
  #contact > div {
    width: 30%;
    display: flex;
    justify-content: space-between;
  }
</style>
