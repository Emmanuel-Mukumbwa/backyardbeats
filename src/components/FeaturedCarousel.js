// src/components/FeaturedCarousel.js
import React from 'react';
import { Card } from 'react-bootstrap';

export default function FeaturedCarousel({ items }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="d-flex overflow-auto py-2 mb-3" style={{gap:12, paddingBottom:6}}>
      {items.map(it => (
        <Card key={it.id} className="featured-carousel-card shadow-soft">
          <Card.Img variant="top" src={it.photoUrl || it.photo_url || '/assets/placeholder.png'} style={{height:140, objectFit:'cover'}} />
          <Card.Body className="p-2">
            <Card.Title style={{fontSize:14}} className="mb-1">{it.displayName || it.display_name}</Card.Title>
            <Card.Text className="small text-muted mb-2">{(it.genres && it.genres.join) ? it.genres.join(', ') : (it.genres || '')}</Card.Text>
            <a href={`/artist/${it.id}`} className="btn btn-sm btn-success">View</a>
          </Card.Body>
        </Card>
      ))}
    </div>
  );
}