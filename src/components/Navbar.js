// src/components/Navbar.jsx
import React, { useContext, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Navbar as RBNavbar, Nav as RBNav, Container as RBContainer } from 'react-bootstrap';
import { AuthContext } from '../context/AuthContext';
import LogoutConfirmModal from './LogoutConfirmModal';
import ToastMessage from './ToastMessage';

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const [showLogout, setShowLogout] = useState(false);
  const [processingLogout, setProcessingLogout] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', variant: 'success' });

  function handleLogoutClick(e) {
    e.preventDefault();
    setShowLogout(true);
  }

  async function handleConfirmLogout() {
    setProcessingLogout(true);
    try {
      // call context logout (should clear token/localStorage if implemented there)
      await logout();

      // ensure localStorage is cleared as well (safe-guard)
      try {
        localStorage.removeItem('bb_user');
        localStorage.removeItem('bb_token');
      } catch (storageErr) {
        // ignore storage errors
      }

      setShowLogout(false);
      setToast({ show: true, message: 'You have signed out', variant: 'success' });
      navigate('/login', { replace: true });
    } catch (err) {
      setToast({ show: true, message: 'Could not sign out. Try again.', variant: 'danger' });
    } finally {
      setProcessingLogout(false);
    }
  }

  function handleCancelLogout() {
    setShowLogout(false);
  }

  return (
    <>
      <ToastMessage show={toast.show} onClose={() => setToast(s => ({ ...s, show: false }))} message={toast.message} variant={toast.variant} />

      <RBNavbar bg="success" variant="dark" expand="lg">
        <RBContainer>
          <RBNavbar.Brand as={Link} to="/">BackyardBeats</RBNavbar.Brand>
          <RBNavbar.Toggle aria-controls="navbar-nav" />
          <RBNavbar.Collapse id="navbar-nav">
            <RBNav className="ms-auto">
              <RBNav.Link as={Link} to="/">Home</RBNav.Link>
              <RBNav.Link as={Link} to="/events">Events</RBNav.Link>

              {/* Show Admin link if admin */}
              {user?.role === 'admin' && (
                <RBNav.Link as={Link} to="/admin">Admin</RBNav.Link>
              )}

              {/* If user is artist, show dashboard link.
                  If artist hasn't completed profile yet, also show Onboard link */}
              {user?.role === 'artist' && (
                <>
                  <RBNav.Link as={Link} to="/artist/dashboard">My Dashboard</RBNav.Link>
                  {!user?.has_profile && (
                    <RBNav.Link as={Link} to="/onboard">Onboard</RBNav.Link>
                  )}
                </>
              )}

              {/* If user is fan, show dashboard link */}
              {user?.role === 'fan' && (
                <RBNav.Link as={Link} to="/fan/dashboard">My Dashboard</RBNav.Link>
              )}

              {user ? (
                <>
                  <span className="navbar-text ms-3 me-2 small" style={{fontWeight:'bold'}}>
                    {user.displayName || user.username} <span className="badge bg-light text-dark ms-2">{user.role}</span>
                  </span>
                  <RBNav.Link as={Link} to="#" onClick={handleLogoutClick}>Logout</RBNav.Link>
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

      <LogoutConfirmModal
        show={showLogout}
        onCancel={handleCancelLogout}
        onConfirm={handleConfirmLogout}
        unsavedChanges={false}
        processing={processingLogout}
      />
    </>
  );
}
