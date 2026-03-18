// src/components/Navbar.jsx
import React, { useContext, useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Navbar as RBNavbar, Nav as RBNav, Container as RBContainer, NavDropdown, Image } from 'react-bootstrap';
import { AuthContext } from '../context/AuthContext';
import LogoutConfirmModal from './LogoutConfirmModal';
import ToastMessage from './ToastMessage';

// icons
import { FaHome, FaCalendarAlt, FaMusic, FaTools, FaSignInAlt, FaUserPlus } from 'react-icons/fa';

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const [showLogout, setShowLogout] = useState(false);
  const [processingLogout, setProcessingLogout] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', variant: 'success' });
  const [expanded, setExpanded] = useState(false);

  const navRef = useRef(null);

  async function handleConfirmLogout() {
    setProcessingLogout(true);
    try {
      await logout();
      try { sessionStorage.removeItem('bb_user'); sessionStorage.removeItem('bb_token'); } catch {}
      setShowLogout(false);
      setToast({ show: true, message: 'You have signed out', variant: 'success' });
      setExpanded(false);
      navigate('/login', { replace: true });
    } catch {
      setToast({ show: true, message: 'Could not sign out. Try again.', variant: 'danger' });
    } finally {
      setProcessingLogout(false);
    }
  }

  function handleCancelLogout() { setShowLogout(false); }

  const userDisplay = user?.displayName || user?.username || '';

  // Close navbar when clicking outside it (on small screens when expanded)
  useEffect(() => {
    function handleDocClick(e) {
      if (!expanded) return;
      if (navRef.current && !navRef.current.contains(e.target)) {
        setExpanded(false);
      }
    }
    document.addEventListener('click', handleDocClick, true);
    return () => document.removeEventListener('click', handleDocClick, true);
  }, [expanded]);

  return (
    <>
      <ToastMessage show={toast.show} onClose={() => setToast(s => ({ ...s, show: false }))} message={toast.message} variant={toast.variant} />

      <div ref={navRef}>
        <RBNavbar bg="success" variant="dark" expand="lg" sticky="top" expanded={expanded} onToggle={setExpanded} className="shadow-soft">
          <RBContainer>
            <RBNavbar.Brand as={Link} to="/" onClick={() => setExpanded(false)}>BackyardBeats</RBNavbar.Brand>
            <RBNavbar.Toggle aria-controls="navbar-nav" />
            <RBNavbar.Collapse id="navbar-nav">
              <RBNav className="ms-auto">
                <RBNav.Link as={Link} to="/" onClick={() => setExpanded(false)}><FaHome className="me-1" />Home</RBNav.Link>
                <RBNav.Link as={Link} to="/events" onClick={() => setExpanded(false)}><FaCalendarAlt className="me-1" />Events</RBNav.Link>
                <RBNav.Link as={Link} to="/music" onClick={() => setExpanded(false)}><FaMusic className="me-1" />Music</RBNav.Link>

                {user?.role === 'admin' && (
                  <RBNav.Link as={Link} to="/admin" onClick={() => setExpanded(false)}><FaTools className="me-1" />Admin</RBNav.Link>
                )}

                {user?.role === 'artist' && (
                  <>
                    <RBNav.Link as={Link} to="/artist/dashboard" onClick={() => setExpanded(false)}><FaMusic className="me-1" />My Dashboard</RBNav.Link>
                    {!user?.has_profile && (
                      <RBNav.Link as={Link} to="/onboard" onClick={() => setExpanded(false)}>Onboard</RBNav.Link>
                    )}
                  </>
                )}

                {user?.role === 'fan' && (
                  <RBNav.Link as={Link} to="/fan/dashboard" onClick={() => setExpanded(false)}>My Dashboard</RBNav.Link>
                )}

                {user ? (
                  <NavUserDropdown
                    user={user}
                    display={userDisplay}
                    onLogout={() => { setShowLogout(true); setExpanded(false); }}
                    onCloseNav={() => setExpanded(false)}
                  />
                ) : (
                  <>
                    <RBNav.Link as={Link} to="/login" onClick={() => setExpanded(false)}><FaSignInAlt className="me-1" />Login</RBNav.Link>
                    <RBNav.Link as={Link} to="/register" onClick={() => setExpanded(false)}><FaUserPlus className="me-1" />Register</RBNav.Link>
                  </>
                )}
              </RBNav>
            </RBNavbar.Collapse>
          </RBContainer>
        </RBNavbar>
      </div>

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

function NavUserDropdown({ user, display, onLogout, onCloseNav }) {
  const avatarUrl = user?.photo_url || user?.photo || null;
  const avatarSrc = avatarUrl && /^https?:\/\//i.test(avatarUrl) ? avatarUrl : (avatarUrl ? `${process.env.REACT_APP_API_URL?.replace(/\/$/, '') || ''}/${avatarUrl}` : null);

  // For artists, show "Profile" only if they have completed onboarding (has_profile)
  // For non‑artists, always show "Profile"
  const showProfile = user?.role !== 'artist' || user?.has_profile;

  // Determine profile link destination
  let profilePath = '/profile';
  if (user?.role === 'artist' && user?.artist_id) {
    profilePath = `/artist/${user.artist_id}`;
  }

  return (
    <NavDropdown align="end" title={
      <span className="d-inline-flex align-items-center">
        {avatarSrc ? (
          <Image src={avatarSrc} roundedCircle style={{ width: 30, height: 30, objectFit: 'cover', marginRight: 8 }} />
        ) : (
          <div style={{
            width: 30, height: 30, borderRadius: '50%', background: '#fff', display: 'inline-block', marginRight: 8, textAlign: 'center',
            lineHeight: '30px', color: '#198754', fontWeight: '700'
          }}>
            {String(display || 'U').charAt(0).toUpperCase()}
          </div>
        )}
        <span className="small">{display}</span>
      </span>
    } id="user-dropdown">
      {showProfile && (
        <NavDropdown.Item as={Link} to={profilePath} onClick={() => onCloseNav?.()}>
          Profile
        </NavDropdown.Item>
      )}
      <NavDropdown.Divider />
      <NavDropdown.Item as="button" onClick={() => { onCloseNav?.(); onLogout?.(); }}>
        Logout
      </NavDropdown.Item>
    </NavDropdown>
  );
}