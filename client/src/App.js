import Footer from './components/layout/Footer';
import GuildsButton from './components/dashboard/GuildsButtons';
import Navmenu from './components/layout/Navmenu';
import InnerContent from './components/dashboard/InnerContent';

function App() {
    return (
        <div className="Main">
            <header>
                <Navmenu />
            </header>

            <main>
                <InnerContent className="ct-section">
                    <div>
                        <GuildsButton />
                    </div>
                </InnerContent>
            </main>

            <Footer />
        </div>
    );
}

export default App;
