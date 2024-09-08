import './App.css';
import { HashRouter as Router, Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import Contact from './pages/Contact';
import Projects from './pages/Projects';
import About from './pages/About';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/NavBar';

function App() {
  return (
    <>
      <ThemeProvider>
        <div className='font-grotesk'>
        <Router basename={import.meta.env.BASE_URL}>
            <Navbar />
          <Routes>
            <Route path="/" element={<Home />}/>
            <Route path="/contact/" element={<Contact />}/>
            <Route path="/projects/" element={<Projects />}/>
            <Route path="/about/" element={<About />}/>
          </Routes>

        </Router>
        </div>

      </ThemeProvider>
    </>
  );
}

export default App;
