
import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Welcome from './pages/Welcome';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import RegisterItem from './pages/RegisterItem';
import Search from './pages/Search';
import Map from './pages/Map';
import Chat from './pages/Chat';
import Profile from './pages/Profile';
import EditProfile from './pages/EditProfile';
import Admin from './pages/Admin';
import RequireAuth from './components/RequireAuth';
import { Navigate } from 'react-router-dom';
import LoginSupabase from './pages/LoginSupabase';
import RegisterSupabase from './pages/RegisterSupabase';


function AppContent() {
  const { user, isAdmin } = useAuth();

  function RequireAdmin({ children }) {
    if (!user) return <Navigate to="/login" replace />;
    if (!isAdmin) return <Navigate to="/" replace />;
    return children;
  }

  return (
    <Routes>
      <Route path="/" element={<Welcome />} />
      <Route path="/welcome" element={<Welcome />} />
      <Route path="/home" element={<Home />} />
      <Route path="/login" element={<LoginSupabase />} />
      <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
      <Route path="/register-item" element={<RequireAuth><RegisterItem /></RequireAuth>} />
      <Route path="/search" element={<Search />} />
      <Route path="/admin" element={<RequireAdmin><Admin /></RequireAdmin>} />
      <Route path="/map" element={<Map />} />
      <Route path="/chat" element={<RequireAuth><Chat /></RequireAuth>} />
      <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
      <Route path="/profile/edit" element={<RequireAuth><EditProfile /></RequireAuth>} />
      <Route path="/register" element={<RegisterSupabase />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App
