import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Gacha from './pages/Gacha';
import Roster from './pages/Roster';
import Match from './pages/Match';
import Admin from './pages/Admin';
import Posting from './pages/Posting';
import './App.css';

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="app">
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/gacha" element={<Gacha />} />
            <Route path="/roster" element={<Roster />} />
            <Route path="/match" element={<Match />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/posting" element={<Posting />} />
            {/* More routes will be added later */}
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
