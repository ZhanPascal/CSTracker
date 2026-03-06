import { NavLink } from 'react-router-dom';
import './Navbar.css';

export default function Navbar() {
  return (
    <nav className="navbar">
      <NavLink to="/" className="navbar-brand">CSTracker</NavLink>
      <div className="navbar-links">
        <NavLink to="/profile_section" className={({ isActive }) => 'navbar-link' + (isActive ? ' active' : '')}>
          Profil
        </NavLink>
        <NavLink to="/tournaments" className={({ isActive }) => 'navbar-link' + (isActive ? ' active' : '')}>
          Tournois
        </NavLink>
      </div>
    </nav>
  );
}
