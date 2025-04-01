import './index.css';
import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";
import Home from './Home';
import { AuthProvider } from "@galvanize-inc/jwtdown-for-react";
import Navbar from './components/Navbar';
import { ThemeProvider } from './context/ThemeContext';
import { useTheme } from './context/ThemeContext';
import { useEffect } from 'react';

function AppContent() {
  const { isDarkMode } = useTheme();
  
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);
  
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-200">
      <Navbar />
      <main className="pt-16 pb-6 min-h-[calc(100vh-4rem)] bg-white dark:bg-gray-900">
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider baseUrl={import.meta.env.VITE_API_URL}>
      <ThemeProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
