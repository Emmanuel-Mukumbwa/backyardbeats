//src/components/Hero.js
import React from 'react';
import { Row, Col, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
//import './Hero.css'; // optional local styles; main styles are in src/styles/custom.css

export default function Hero() {
  return (
    <section className="bb-hero mb-4" aria-labelledby="hero-heading">
      <Row className="g-0 align-items-center">
        {/* Image column */}
        <Col xs={12} md={6} className="hero-image-col">
          <div
            className="hero-image"
            role="img"
            aria-label="Local Malawian artists performing"
            style={{ backgroundImage: `url('/assets/background1.jpg')` }}
          >
            <div className="hero-overlay" />
          </div>
        </Col>

        {/* Text column */}
        <Col xs={12} md={6} className="p-4">
          <div className="hero-content">
            <h1 id="hero-heading" className="hero-title mb-2">BackyardBeats — Malawi’s home for local music</h1>
            <p className="lead hero-subtext mb-3">
              Discover songs, events and artists from across Malawi — listen, follow and book local talent. Support creators in your district and help homegrown music reach new ears.
            </p>

            <div className="d-flex gap-2">
              <Button as={Link} to="/orientation" variant="success">Get Started</Button>
              <Button as={Link} to="/events" variant="outline-secondary">Browse Events</Button>
            </div>

          </div>
        </Col>
      </Row>
    </section>
  );
}
 