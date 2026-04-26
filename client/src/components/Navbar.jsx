import { NavLink } from 'react-router-dom'
import { Home, Users, LayoutDashboard, Settings, GraduationCap } from 'lucide-react'

export default function Navbar() {
  return (
    <nav className="navbar" id="main-navbar">
      <div className="navbar-inner">
        <NavLink to="/" className="navbar-brand">
          <GraduationCap size={28} />
          AttendEase
        </NavLink>
        <ul className="navbar-links">
          <li>
            <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}>
              <Home size={18} />
              Home
            </NavLink>
          </li>
          <li>
            <NavLink to="/enrollment" className={({ isActive }) => isActive ? 'active' : ''}>
              <Users size={18} />
              Students
            </NavLink>
          </li>
          <li>
            <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'active' : ''}>
              <LayoutDashboard size={18} />
              Dashboard
            </NavLink>
          </li>
          <li>
            <NavLink to="/setup" className={({ isActive }) => isActive ? 'active' : ''}>
              <Settings size={18} />
              Setup
            </NavLink>
          </li>
        </ul>
      </div>
    </nav>
  )
}
