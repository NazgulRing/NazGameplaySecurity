import "../styles/hero.css";
import "../styles/variables.css";
import "../styles/utility.css";
import hero from '../assets/Background.png';
import logotxt from '../assets/logotxt.png';

const Hero = () =>{
  return(
    <section className='hero'>
      <img src={hero} className='hero-image' alt="heroimg"></img>
      <div className='hero-overlay'></div>
      <div className='hero-content'>
        <img src={logotxt} alt="NazServers" className='hero-logo'></img>
      </div>
    </section>

  )
}

export default Hero;