import Hero from './components/Hero';
import Footer from './components/Footer';
import GuildsButton from './components/dashboard/GuildsButtons';
import InnerContent from './components/InnerContent';

function App() {
    return (
        <div className="Main">
            <header>
                <Hero className="w-full" />
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
