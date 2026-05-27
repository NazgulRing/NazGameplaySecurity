import "../styles/footer.css";
import "../styles/variables.css";
import "../styles/utility.css";
const Footer = () => {
  return(
  <footer className='footer'>
    <div className="footer-container">
      <div className="footer-left">
        <h4>NazServers</h4>
      </div>
      <div className="footer-contact">
        <h5>Kontakt</h5>
        <a href="mailto:matasmyh@hotmail.no">matasmyh@hotmail.no</a>
        <a href="tel:97325492">97325492</a>
      </div>
    </div>
  </footer>
  )
}

export default Footer;