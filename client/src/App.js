import Hero from './components/Hero';
import Footer from './components/Footer';
import InnerContent from './components/Content';

function App() {
  return (
    <div className="Main">
      <header>
        <Hero className="w-full"/>
      </header>
      <main>
        <InnerContent className="ct-section">
          <div></div>
        </InnerContent>
      </main>
      <Footer/>
    </div>
  );
}

export default App;
