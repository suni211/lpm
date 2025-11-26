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
import Ranked from './pages/Ranked';
import SoloRank from './pages/SoloRank';
import Auction from './pages/Auction';
import League from './pages/League';
import Cards from './pages/Cards';
import Fusion from './pages/Fusion';
import Training from './pages/Training';
import Facility from './pages/Facility';
import './styles/theme.css';
import './styles/global-pages.css';
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
            <Route path="/ranked" element={<Ranked />} />
            <Route path="/solo-rank" element={<SoloRank />} />
            <Route path="/auction" element={<Auction />} />
            <Route path="/league" element={<League />} />
            <Route path="/cards" element={<Cards />} />
            <Route path="/fusion" element={<Fusion />} />
            <Route path="/training" element={<Training />} />
            <Route path="/facility" element={<Facility />} />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
