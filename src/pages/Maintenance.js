import React from 'react';
import { Container, Row, Col, Button } from 'react-bootstrap';

export default function Maintenance() {
  return (
    <Container className="py-5 text-center">
      <Row>
        <Col>
          <h1 className="display-3 mb-4">🔧 Under Maintenance</h1>
          <p className="lead mb-4">
            BackyardBeats is currently undergoing scheduled maintenance. We'll be back shortly!
          </p>
          <Button variant="success" href="/" disabled>
            Refresh
          </Button>
          <div className="mt-4 small text-muted">
            If you're an administrator, please log in to disable maintenance mode.
          </div>
        </Col>
      </Row>
    </Container>
  );
}