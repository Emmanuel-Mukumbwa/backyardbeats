// File: src/pages/Events.jsx
import React, { useEffect, useState } from 'react';
import axios from '../api/axiosConfig';
import { Card, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';

function EventCard({ event }) {
  return (
    <Card className="mb-3">
      <Card.Body>
        <div className="d-flex justify-content-between">
          <div>
            <h5>{event.title}</h5>
            <div className="small text-muted">{event.district} • {new Date(event.event_date).toLocaleDateString()}</div>
            <div className="mt-2">{event.description}</div>
          </div>
          <div className="text-end">
            <Link to={`/events/${event.id}`} className="btn btn-success">View</Link>
          </div>
        </div>
      </Card.Body>
    </Card>
  );
}

export default function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    axios.get('/events')
      .then(res => setEvents(res.data))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h2 className="mb-3">Upcoming Events</h2>
      {loading && <div>Loading events...</div>}
      {!loading && events.length === 0 && <div className="text-muted">No events listed yet.</div>}
      <div>
        {events.map(ev => <EventCard key={ev.id} event={ev} />)}
      </div>
    </div>
  );
}

