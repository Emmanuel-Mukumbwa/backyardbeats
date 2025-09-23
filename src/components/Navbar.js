import React from 'react';
import { Link } from 'react-router-dom';
import { Navbar as RBNavbar, Nav as RBNav, Container as RBContainer } from 'react-bootstrap';

// Default-export a component named Navbar so App.jsx can import `Navbar` normally.
export default function Navbar() {
  return (
    <RBNavbar bg="success" variant="dark" expand="lg">
      <RBContainer>
        <RBNavbar.Brand as={Link} to="/">BackyardBeats</RBNavbar.Brand>
        <RBNavbar.Toggle aria-controls="navbar-nav" />
        <RBNavbar.Collapse id="navbar-nav">
          <RBNav className="ms-auto">
            <RBNav.Link as={Link} to="/events">Events</RBNav.Link>
            <RBNav.Link as={Link} to="/login">Login</RBNav.Link>
            <RBNav.Link as={Link} to="/register">Register</RBNav.Link>
          </RBNav>
        </RBNavbar.Collapse>
      </RBContainer>
    </RBNavbar>
  );
}
