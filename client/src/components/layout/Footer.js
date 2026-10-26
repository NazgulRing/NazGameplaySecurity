import '../../styles/footer.css';
import '../../styles/variables.css';
import '../../styles/utility.css';
import logotxt from '../../assets/logotxt1.png';
const Footer = () => {
    return (
        <footer className="footer">
            <div className="footer-container">
                <div className="footer-left">
                    <div className="footer-logo">
                        <img src={logotxt} alt="NazServers Logo" />
                    </div>
                    <div className="footer-text">
                        <p>© 2024 NazServers. All rights reserved.</p>
                    </div>
                </div>
                <div className="footer-right">
                    <h5>Kontakt</h5>
                    <a href="mailto:nazservers@gmail.com">
                        nazservers@gmail.com
                    </a>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
