import hero from '../assets/Background.png';
import logotxt from '../assets/logotxt.png';
import '../imports.js';
const Hero = () =>{
  return(
      <div className="w-full hero">
          <img src={hero} className="w-full hero-img" alt="hero" />
          <img className="hero-txt" src={logotxt} alt="herotxt"></img>
          </div>
  )
}

export default Hero;