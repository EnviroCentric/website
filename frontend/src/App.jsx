import './index.css';
import {
  Routes,
  Route,
} from "react-router-dom";
import Home from './pages/Home';
import UserManagement from './pages/UserManagement';
import ProfileUpdate from './pages/ProfileUpdate';
import Profile from './pages/Profile';
import RoleManagement from './pages/RoleManagement';
import AccessManagement from './pages/AccessManagement';
import Navbar from './components/Navbar';
import { ThemeProvider } from './context/ThemeContext';
import { useTheme } from './context/ThemeContext';
import { useEffect } from 'react';
import { AuthProvider } from './contexts/AuthContext';

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
          <Route path="/user-management" element={<UserManagement />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/update" element={<ProfileUpdate />} />
          <Route path="/role-management" element={<RoleManagement />} />
          <Route path="/access-management" element={<AccessManagement />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
