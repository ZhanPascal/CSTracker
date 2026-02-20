import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ProfileSection from './pages/ProfileSection';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/profile_section" element={<ProfileSection />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
