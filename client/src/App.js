import Hero from './components/hero';
import Footer from './components/footer';
import InnerContent from './components/innerContent';

function App() {
  return (
    <div className="Main">
      <header>
        <Hero className="w-full"/>
      </header>
      <main>
        <InnerContent className="ct-section"></InnerContent>
      </main>
      <Footer/>
    </div>
  );
}

export default App;
