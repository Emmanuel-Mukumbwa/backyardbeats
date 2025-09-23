// File: src/pages/EventDetail.jsx
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from '../api/axiosConfig';
import { Card, Button } from 'react-bootstrap';

export default function EventDetail() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    axios.get(`/events/${id}`)
      .then(res => setEvent(res.data))
      .catch(() => setEvent(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div>Loading event...</div>;
  if (!event) return <div className="alert alert-warning">Event not found</div>;

  return (
    <Card>
      <Card.Body>
        <h3>{event.title}</h3>
        <div className="small text-muted">{event.district} • {new Date(event.event_date).toLocaleString()}</div>
        <p className="mt-3">{event.description}</p>
        {event.artist && <div className="mb-2">Artist: <Link to={`/artist/${event.artist.id}`}>{event.artist.displayName}</Link></div>}
        <div className="d-flex">
          <Button variant="success" className="me-2">RSVP / Book</Button>
          <Button variant="outline-secondary">Share</Button>
        </div>
      </Card.Body>
    </Card>
  );
}
