import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix default icon path for CRA
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

export default function MapView({ artists = [], center = [-13.9626,33.7741], zoom = 6, onMarkerClick }) {
  useEffect(() => {
    // placeholder for future cluster init
  }, []);

  return (
    <MapContainer center={center} zoom={zoom} style={{ height: "320px", width: "100%" }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
      />

      {artists.map(a => (
        <Marker key={a.id} position={[a.lat, a.lng]} eventHandlers={{
          click: () => onMarkerClick && onMarkerClick(a)
        }}>
          <Popup>
            <div style={{minWidth:150}}>
              <strong>{a.displayName}</strong><br />
              <small>{a.genres?.join(', ')}</small><br />
              <a href={`/artist/${a.id}`}>View Profile</a>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
