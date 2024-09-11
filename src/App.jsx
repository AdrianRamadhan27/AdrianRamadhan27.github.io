import './App.css';
import { HashRouter as Router, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import Home from './pages/Home';
import Contact from './pages/Contact';
import Projects from './pages/Projects';
import About from './pages/About';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/NavBar';
import UnderMaintanance from './components/UnderMaintenance';
import { useState, useEffect } from 'react';
import { GiSkullCrossedBones } from 'react-icons/gi';

function InnerApp() {
  const [isAnimating, setIsAnimating] = useState(false);
  const [nextRoute, setNextRoute] = useState(null); // New state for delayed route
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (nextRoute !== null) {
      setIsAnimating(true); // Trigger animation
      const timer = setTimeout(() => {
        setIsAnimating(false); // End animation
        navigate(nextRoute);   // Finally navigate to the route
        setNextRoute(null);    // Reset the nextRoute
      }, 500); // Duration of the animation
      return () => clearTimeout(timer);
    }
  }, [nextRoute, navigate]);

  // Handle navigation
  const handleNavigate = (path) => {
    if (path !== location.pathname) {
      setNextRoute(path); // Set the next route, which will trigger the animation
    }
  };

  return (
    <ThemeProvider>
      <div className='relative font-grotesk dark:bg-gray-900 min-h-screen'>
        {/* Navbar */}
        <Navbar onNavigate={handleNavigate} />

        {/* Spinning Icon */}
        <div 
          className={`absolute inset-0 flex items-center justify-center transition-opacity duration-500 ${isAnimating ? 'opacity-100' : 'opacity-0'}`}
        >
          <GiSkullCrossedBones className={`text-gray-600 dark:text-gray-300 text-8xl ${isAnimating && 'animate-spin'}`} />
        </div>

        {/* Main Content */}
        <div id="animation-wrapper" className={`transition-opacity duration-500 ease-out ${isAnimating ? 'opacity-0' : 'opacity-100'}`}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/contact/" element={<UnderMaintanance />} />
            <Route path="/projects/" element={<UnderMaintanance />} />
            <Route path="/about/" element={<UnderMaintanance />} />
          </Routes>
        </div>
      </div>
    </ThemeProvider>
  );
}

export default InnerApp;
