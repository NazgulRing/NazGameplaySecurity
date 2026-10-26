import '../../styles/navmenu.css';
import Logo from '../../assets/Logo.png';

function Navmenu() {
    return (
        <nav className="nav-menu">
            <div className="header-left">
                <img src={Logo} alt="NazGameplay" className="nav-logo" />
            </div>
            <div className="header-center color-primary">
                <h1>NazServerSecurityBot</h1>
            </div>
            <div className="header-right">
                <a
                    className="discord-button"
                    href="discord.gg/your-invite-link"
                    target="_blank"
                    rel="noopener noreferrer">
                    Join Discord
                </a>
            </div>
        </nav>
    );
}

export default Navmenu;
