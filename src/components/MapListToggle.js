import React from 'react';
import { ButtonGroup, Button } from 'react-bootstrap';

export default function MapListToggle({ view, setView }) {
  return (
    <div className="d-flex justify-content-end mb-2">
      <ButtonGroup>
        <Button variant={view === 'map' ? 'success' : 'light'} onClick={() => setView('map')}>Map</Button>
        <Button variant={view === 'list' ? 'success' : 'light'} onClick={() => setView('list')}>List</Button>
      </ButtonGroup>
    </div>
  );
}
