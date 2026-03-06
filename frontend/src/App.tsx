import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProfileSection from './pages/ProfileSection';
import TournamentSection from './pages/TournamentSection';

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <div style={{ paddingTop: '60px' }}>
        <Routes>
          <Route path="/" element={<Navigate to="/profile_section" replace />} />
          <Route path="/profile_section" element={<ProfileSection />} />
          <Route path="/tournaments" element={<TournamentSection />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
