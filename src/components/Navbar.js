import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Navbar as RBNavbar, Nav as RBNav, Container as RBContainer } from 'react-bootstrap';
import { AuthContext } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <RBNavbar bg="success" variant="dark" expand="lg">
      <RBContainer>
        <RBNavbar.Brand as={Link} to="/">BackyardBeats</RBNavbar.Brand>
        <RBNavbar.Toggle aria-controls="navbar-nav" />
        <RBNavbar.Collapse id="navbar-nav">
          <RBNav className="ms-auto">
            <RBNav.Link as={Link} to="/">Home</RBNav.Link>
            <RBNav.Link as={Link} to="/events">Events</RBNav.Link>
            {user?.role === 'admin' && (
              <RBNav.Link as={Link} to="/admin">Admin</RBNav.Link>
            )}
            {user?.role === 'artist' && (
              <RBNav.Link as={Link} to="/artist/dashboard">My Dashboard</RBNav.Link>
            )}
            {user ? (
              <>
                <span className="navbar-text ms-3 me-2 small" style={{fontWeight:'bold'}}>
                  {user.displayName || user.username} <span className="badge bg-light text-dark">{user.role}</span>
                </span>
                <RBNav.Link as={Link} to="#" onClick={handleLogout}>Logout</RBNav.Link>
              </>
            ) : (
              <>
                <RBNav.Link as={Link} to="/login">Login</RBNav.Link>
                <RBNav.Link as={Link} to="/register">Register</RBNav.Link>
              </>
            )}
          </RBNav>
        </RBNavbar.Collapse>
      </RBContainer>
    </RBNavbar>
  );
}
