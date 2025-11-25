import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import CreateTeam from './pages/CreateTeam';
import Dashboard from './pages/Dashboard';
import Gacha from './pages/Gacha';
import Roster from './pages/Roster';
import Match from './pages/Match';
import Admin from './pages/Admin';
import Posting from './pages/Posting';
import Achievements from './pages/Achievements';
import Sponsors from './pages/Sponsors';
import Fandom from './pages/Fandom';
import './App.css';

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="app">
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/create-team" element={<CreateTeam />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/gacha" element={<Gacha />} />
            <Route path="/roster" element={<Roster />} />
            <Route path="/match" element={<Match />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/posting" element={<Posting />} />
            <Route path="/achievements" element={<Achievements />} />
            <Route path="/sponsors" element={<Sponsors />} />
            <Route path="/fandom" element={<Fandom />} />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
