import './App.css';
import { HashRouter as Router, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ContactPage from './pages/ContactPage';
import ProjectsPage from './pages/ProjectsPage';
import AboutPage from './pages/AboutPage';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/layout/NavBar';
import UnderMaintanance from './pages/UnderMaintenance';
import { useState, useEffect } from 'react';
import MyFooter from './components/layout/MyFooter';
import Loading from './pages/LoadingPage';

function App() {
  return (
    <Router basename={import.meta.env.BASE_URL}>
      <InnerApp />
    </Router>
  )
}

function InnerApp() {
  const [nextRoute, setNextRoute] = useState(null); // New state for delayed route
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (nextRoute !== null) {
      navigate("/loading")
      const timer = setTimeout(() => {
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
      <div className='font-grotesk '>
        {/* Navbar */}
        <Navbar onNavigate={handleNavigate} />


        {/* Main Content */}
        <div id="animation-wrapper" className={`transition-opacity duration-500 ease-out`}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/contact/" element={<ContactPage />} />
            <Route path="/projects/" element={<UnderMaintanance />} />
            <Route path="/about/" element={<AboutPage />} />
            <Route path="/loading" element={<Loading />} />
          </Routes>
        </div>
        <MyFooter />
      </div>
    </ThemeProvider>
  );
}

export default App;
