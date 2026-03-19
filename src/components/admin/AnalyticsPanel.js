// src/components/admin/AnalyticsPanel.jsx
import React from 'react';
import { Card, Row, Col, Table, Badge, Stack } from 'react-bootstrap';

export default function AnalyticsPanel({ analytics = {} }) {
  const {
    totalUsers,
    totalArtists,
    totalTracks,
    totalPlaylists,
    totalEvents,
    upcomingEvents,
    totalListens,
    uniqueListenersLast30,
    totalFavorites,
    avgRating,
    userGrowth,
    engagementRate,
    topArtistsByPlays = []
  } = analytics;

  const cardsFirstRow = [
    { title: 'Total Users', value: totalUsers },
    { title: 'Total Artists', value: totalArtists },
    { title: 'Total Tracks', value: totalTracks },
    { title: 'Total Playlists', value: totalPlaylists }
  ];

  const cardsSecondRow = [
    { title: 'Total Events', value: totalEvents },
    { title: 'Upcoming Events', value: upcomingEvents },
    { title: 'Total Listens', value: totalListens },
    { title: 'Unique Listeners (30d)', value: uniqueListenersLast30 }
  ];

  return (
    <div className="mt-3 analytics-panel">
      <style>{`
        .analytics-panel .metric-card {
          border: 0;
          border-radius: 1rem;
          box-shadow: 0 0.125rem 0.5rem rgba(0,0,0,.06);
          height: 100%;
        }

        .analytics-panel .metric-value {
          font-size: 1.75rem;
          line-height: 1.1;
          font-weight: 700;
        }

        .analytics-panel .section-card {
          border: 0;
          border-radius: 1rem;
          box-shadow: 0 0.125rem 0.5rem rgba(0,0,0,.06);
        }

        .analytics-panel .top-artist-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem 0;
          border-bottom: 1px solid rgba(0,0,0,.08);
        }

        .analytics-panel .top-artist-item:last-child {
          border-bottom: 0;
          padding-bottom: 0;
        }

        .analytics-panel .summary-row {
          display: grid;
          gap: .75rem;
        }

        @media (max-width: 767.98px) {
          .analytics-panel .metric-value {
            font-size: 1.5rem;
          }
        }
      `}</style>

      <Row className="g-3">
        {cardsFirstRow.map((c, i) => (
          <Col md={3} sm={6} xs={12} key={`r1-${i}`}>
            <Card className="metric-card">
              <Card.Body>
                <div className="text-muted small mb-1">{c.title}</div>
                <div className="metric-value">{c.value ?? '—'}</div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      <Row className="g-3 mt-0 mt-md-3">
        {cardsSecondRow.map((c, i) => (
          <Col md={3} sm={6} xs={12} key={`r2-${i}`}>
            <Card className="metric-card">
              <Card.Body>
                <div className="text-muted small mb-1">{c.title}</div>
                <div className="metric-value">{c.value ?? '—'}</div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      <Row className="g-3 mt-0 mt-md-3">
        <Col md={4} sm={12}>
          <Card className="section-card">
            <Card.Body>
              <Card.Title className="mb-2">User Growth</Card.Title>
              <div className="metric-value">{userGrowth ?? '—'}</div>
              <small className="text-muted d-block mt-2">
                Registrations in the last 30 days vs the previous 30 days.
              </small>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4} sm={12}>
          <Card className="section-card">
            <Card.Body>
              <Card.Title className="mb-2">Engagement Rate</Card.Title>
              <div className="metric-value">{engagementRate ?? '—'}</div>
              <small className="text-muted d-block mt-2">
                {uniqueListenersLast30 ?? 0} unique listeners in the last 30 days.
              </small>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4} sm={12}>
          <Card className="section-card">
            <Card.Body>
              <Card.Title className="mb-2">Favorites & Rating</Card.Title>
              <div className="metric-value mb-1">{totalFavorites ?? '—'}</div>
              <div className="text-muted">Favorites</div>
              <div className="mt-2">
                <Badge bg="warning" text="dark">
                  Avg rating: {avgRating !== null && avgRating !== undefined ? avgRating : '—'}
                </Badge>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="g-3 mt-0 mt-md-3">
        <Col md={8}>
          <Card className="section-card">
            <Card.Body>
              <Card.Title className="mb-3">Top artists (last 30 days by plays)</Card.Title>

              {topArtistsByPlays.length === 0 ? (
                <div className="text-muted py-3">No plays recorded in the last 30 days.</div>
              ) : (
                <>
                  <div className="d-none d-md-block">
                    <Table hover responsive size="sm" className="mb-0 align-middle">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Artist</th>
                          <th>Plays (30d)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topArtistsByPlays.map((a, idx) => (
                          <tr key={a.id || idx}>
                            <td>{idx + 1}</td>
                            <td>{a.name}</td>
                            <td>{a.plays}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>

                  <div className="d-md-none">
                    <Stack gap={0}>
                      {topArtistsByPlays.map((a, idx) => (
                        <div key={a.id || idx} className="top-artist-item">
                          <div>
                            <div className="fw-semibold">
                              {idx + 1}. {a.name}
                            </div>
                          </div>
                          <Badge bg="secondary">{a.plays} plays</Badge>
                        </div>
                      ))}
                    </Stack>
                  </div>
                </>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card className="section-card">
            <Card.Body>
              <Card.Title className="mb-3">Quick summary</Card.Title>
              <Stack gap={2}>
                <div><strong>Total listens:</strong> {totalListens ?? '—'}</div>
                <div><strong>Tracks:</strong> {totalTracks ?? '—'}</div>
                <div><strong>Playlists:</strong> {totalPlaylists ?? '—'}</div>
                <div><strong>Upcoming events:</strong> {upcomingEvents ?? '—'}</div>
                <div><strong>Total events:</strong> {totalEvents ?? '—'}</div>
                <div><strong>Total users:</strong> {totalUsers ?? '—'}</div>
                <div><strong>Total artists:</strong> {totalArtists ?? '—'}</div>
              </Stack>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
}