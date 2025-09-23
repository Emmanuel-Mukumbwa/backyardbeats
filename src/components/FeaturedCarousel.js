import React from 'react';
import { Card } from 'react-bootstrap';

export default function FeaturedCarousel({ items }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="d-flex overflow-auto py-2 mb-3" style={{gap:12}}>
      {items.map(it => (
        <Card key={it.id} style={{minWidth:220, maxWidth:220}} className="shadow-sm">
          <Card.Img variant="top" src={it.photoUrl || '/assets/placeholder.png'} style={{height:120, objectFit:'cover'}} />
          <Card.Body className="p-2">
            <Card.Title style={{fontSize:14}}>{it.displayName}</Card.Title>
            <Card.Text className="small mb-1">{it.genres?.join(', ')}</Card.Text>
            <a href={`/artist/${it.id}`} className="btn btn-sm btn-success">View</a>
          </Card.Body>
        </Card>
      ))}
    </div>
  );
}
