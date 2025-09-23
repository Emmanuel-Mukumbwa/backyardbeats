import React from 'react';
import { Card, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';

export default function ArtistCard({ artist, selected }) {
  const cardClass = selected ? 'mb-3 shadow-sm border-success' : 'mb-3 shadow-sm';
  return (
    <Card className={cardClass}>
      <Card.Img variant="top" src={artist.photoUrl || '/assets/placeholder.png'} style={{height:180, objectFit:'cover'}} />
      <Card.Body>
        <Card.Title>{artist.displayName}</Card.Title>
        <Card.Text className="small text-muted">{artist.genres?.join(', ')} • {artist.district}</Card.Text>
        <Card.Text>{artist.bio?.slice(0, 90)}{artist.bio?.length > 90 ? '...' : ''}</Card.Text>

        {artist.tracks && artist.tracks[0] && (
          <div className="mb-2">
            <audio controls preload="none" style={{ width: '100%' }}>
              <source src={artist.tracks[0].previewUrl} />
              Your browser does not support the audio element.
            </audio>
          </div>
        )}

        <div className="d-flex justify-content-between align-items-center">
          <Button as={Link} to={`/artist/${artist.id}`} variant="success" size="sm">View Profile</Button>
          <small className="text-muted">{artist.avgRating?.toFixed(1) || '—'} ★</small>
        </div>
      </Card.Body>
    </Card>
  );
}
