import React, { useState, useEffect } from 'react';
import { Tabs, Tab, Card, Button, Table, Alert, Modal, Form, Row, Col, Badge } from 'react-bootstrap';

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [pendingArtists, setPendingArtists] = useState([]);
  const [pendingEvents, setPendingEvents] = useState([]);
  const [pendingTracks, setPendingTracks] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [settings, setSettings] = useState({ siteName: 'BackyardBeats', maintenanceMode: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals
  const [showUserModal, setShowUserModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userForm, setUserForm] = useState({ displayName: '', email: '', role: '', banned: false });

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    setLoading(true);
    setError(null);
    try {
      // Mock data
      setUsers([
        { id: 1, username: 'fan1', email: 'fan1@example.com', role: 'fan', banned: false, displayName: 'Fan One' },
        { id: 2, username: 'artist1', email: 'artist1@example.com', role: 'artist', banned: false, displayName: 'Artist One' },
        { id: 3, username: 'admin1', email: 'admin1@example.com', role: 'admin', banned: false, displayName: 'Admin One' }
      ]);
      setPendingArtists([
        { id: 1, displayName: 'New Artist', email: 'newartist@example.com', bio: 'New artist bio', submittedAt: '2023-11-01' }
      ]);
      setPendingEvents([
        { id: 1, title: 'New Event', description: 'Event description', event_date: '2023-12-01', artist: 'Artist One', district: 'Lilongwe' }
      ]);
      setPendingTracks([
        { id: 1, title: 'New Track', artist: 'Artist One', genre: 'Hip Hop', submittedAt: '2023-11-01', previewUrl: '/tracks/sample.mp3' },
        { id: 2, title: 'Another Track', artist: 'Artist Two', genre: 'Reggae', submittedAt: '2023-11-02', previewUrl: '/tracks/sample2.mp3' }
      ]);
      setRatings([
        { id: 1, artist: 'Artist One', reviewer: 'Fan One', stars: 5, comment: 'Great!', createdAt: '2023-11-01' },
        { id: 2, artist: 'Artist Two', reviewer: 'Fan Two', stars: 2, comment: 'Not good', createdAt: '2023-11-05' }
      ]);
      setAnalytics({
        totalUsers: 150,
        totalArtists: 25,
        totalEvents: 10,
        userGrowth: '+15%',
        engagementRate: '78%'
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleUserAction = (user, action) => {
    if (action === 'edit') {
      setSelectedUser(user);
      setUserForm({ displayName: user.displayName, email: user.email, role: user.role, banned: user.banned });
      setShowUserModal(true);
    } else if (action === 'ban') {
      setUsers(users.map(u => u.id === user.id ? { ...u, banned: !u.banned } : u));
    }
  };

  const handleUserSubmit = (e) => {
    e.preventDefault();
    setUsers(users.map(u => u.id === selectedUser.id ? { ...u, ...userForm } : u));
    setShowUserModal(false);
    setSelectedUser(null);
  };

  const approveArtist = (id) => {
    setPendingArtists(pendingArtists.filter(a => a.id !== id));
    alert('Artist approved');
  };

  const rejectArtist = (id) => {
    setPendingArtists(pendingArtists.filter(a => a.id !== id));
    alert('Artist rejected');
  };

  const approveTrack = (id) => {
    setPendingTracks(pendingTracks.filter(t => t.id !== id));
    alert('Track approved');
  };

  const rejectTrack = (id) => {
    setPendingTracks(pendingTracks.filter(t => t.id !== id));
    alert('Track rejected');
  };

  const approveEvent = (id) => {
    setPendingEvents(pendingEvents.filter(e => e.id !== id));
    alert('Event approved');
  };

  const rejectEvent = (id) => {
    setPendingEvents(pendingEvents.filter(e => e.id !== id));
    alert('Event rejected');
  };

  const moderateRating = (id, action) => {
    if (action === 'delete') {
      setRatings(ratings.filter(r => r.id !== id));
      alert('Rating deleted');
    }
  };

  const handleSettingsSubmit = (e) => {
    e.preventDefault();
    setSettings({ ...settings });
    setShowSettingsModal(false);
    alert('Settings updated');
  };

  if (loading) return <div className="text-center py-5">Loading dashboard...</div>;
  if (error) return <Alert variant="danger">{error}</Alert>;

  return (
    <div>
      <h2 className="mb-4">Admin Dashboard</h2>
      <Tabs defaultActiveKey="users" id="admin-dashboard-tabs">
        <Tab eventKey="users" title="User Management">
          <div className="mt-3">
            <Table striped>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id}>
                    <td>{user.id}</td>
                    <td>{user.username}</td>
                    <td>{user.email}</td>
                    <td><Badge bg={user.role === 'admin' ? 'danger' : user.role === 'artist' ? 'success' : 'primary'}>{user.role}</Badge></td>
                    <td>{user.banned ? <Badge bg="danger">Banned</Badge> : <Badge bg="success">Active</Badge>}</td>
                    <td>
                      <Button size="sm" onClick={() => handleUserAction(user, 'edit')}>Edit</Button>
                      <Button size="sm" variant={user.banned ? 'success' : 'danger'} onClick={() => handleUserAction(user, 'ban')}>
                        {user.banned ? 'Unban' : 'Ban'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Tab>

        <Tab eventKey="artists" title="Artist Approval">
          <div className="mt-3">
            <h5>Pending Artist Approvals</h5>
            {pendingArtists.length === 0 ? <p>No pending approvals</p> : (
              pendingArtists.map(artist => (
                <Card key={artist.id} className="mb-3">
                  <Card.Body>
                    <Card.Title>{artist.displayName}</Card.Title>
                    <Card.Text>{artist.bio}</Card.Text>
                    <small className="text-muted">Submitted: {artist.submittedAt}</small>
                    <div className="mt-2">
                      <Button variant="success" onClick={() => approveArtist(artist.id)}>Approve</Button>
                      <Button variant="danger" onClick={() => rejectArtist(artist.id)}>Reject</Button>
                    </div>
                  </Card.Body>
                </Card>
              ))
            )}
          </div>
        </Tab>

        <Tab eventKey="tracks" title="Track Approval">
          <div className="mt-3">
            <h5>Pending Track Approvals</h5>
            {pendingTracks.length === 0 ? <p>No pending approvals</p> : (
              pendingTracks.map(track => (
                <Card key={track.id} className="mb-3">
                  <Card.Body>
                    <Card.Title>{track.title}</Card.Title>
                    <Card.Text>Artist: {track.artist} | Genre: {track.genre}</Card.Text>
                    <small className="text-muted">Submitted: {track.submittedAt}</small>
                    <div className="mt-2">
                      <audio controls src={track.previewUrl} className="me-3"></audio>
                      <Button variant="success" onClick={() => approveTrack(track.id)}>Approve</Button>
                      <Button variant="danger" onClick={() => rejectTrack(track.id)}>Reject</Button>
                    </div>
                  </Card.Body>
                </Card>
              ))
            )}
          </div>
        </Tab>

        <Tab eventKey="events" title="Event Approval">
          <div className="mt-3">
            <h5>Pending Event Approvals</h5>
            {pendingEvents.length === 0 ? <p>No pending approvals</p> : (
              pendingEvents.map(event => (
                <Card key={event.id} className="mb-3">
                  <Card.Body>
                    <Card.Title>{event.title}</Card.Title>
                    <Card.Text>{event.description}</Card.Text>
                    <small className="text-muted">Date: {event.event_date} | Artist: {event.artist} | District: {event.district}</small>
                    <div className="mt-2">
                      <Button variant="success" onClick={() => approveEvent(event.id)}>Approve</Button>
                      <Button variant="danger" onClick={() => rejectEvent(event.id)}>Reject</Button>
                    </div>
                  </Card.Body>
                </Card>
              ))
            )}
          </div>
        </Tab>

        <Tab eventKey="moderation" title="Content Moderation">
          <div className="mt-3">
            <h5>Moderate Ratings & Comments</h5>
            <Table striped>
              <thead>
                <tr>
                  <th>Artist</th>
                  <th>Reviewer</th>
                  <th>Rating</th>
                  <th>Comment</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {ratings.map(rating => (
                  <tr key={rating.id}>
                    <td>{rating.artist}</td>
                    <td>{rating.reviewer}</td>
                    <td>{'★'.repeat(rating.stars)}</td>
                    <td>{rating.comment}</td>
                    <td>{rating.createdAt}</td>
                    <td>
                      <Button size="sm" variant="danger" onClick={() => moderateRating(rating.id, 'delete')}>Delete</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Tab>

        <Tab eventKey="analytics" title="Analytics">
          <div className="mt-3">
            <Row>
              <Col md={3}>
                <Card>
                  <Card.Body>
                    <Card.Title>Total Users</Card.Title>
                    <h3>{analytics.totalUsers}</h3>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={3}>
                <Card>
                  <Card.Body>
                    <Card.Title>Total Artists</Card.Title>
                    <h3>{analytics.totalArtists}</h3>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={3}>
                <Card>
                  <Card.Body>
                    <Card.Title>Total Events</Card.Title>
                    <h3>{analytics.totalEvents}</h3>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={3}>
                <Card>
                  <Card.Body>
                    <Card.Title>User Growth</Card.Title>
                    <h3>{analytics.userGrowth}</h3>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
            <Card className="mt-3">
              <Card.Body>
                <Card.Title>Engagement Rate</Card.Title>
                <h3>{analytics.engagementRate}</h3>
              </Card.Body>
            </Card>
          </div>
        </Tab>

        <Tab eventKey="settings" title="System Settings">
          <div className="mt-3">
            <Button onClick={() => setShowSettingsModal(true)}>Edit Settings</Button>
            <Card className="mt-3">
              <Card.Body>
                <p><strong>Site Name:</strong> {settings.siteName}</p>
                <p><strong>Maintenance Mode:</strong> {settings.maintenanceMode ? 'Enabled' : 'Disabled'}</p>
              </Card.Body>
            </Card>
          </div>
        </Tab>
      </Tabs>

      {/* User Edit Modal */}
      <Modal show={showUserModal} onHide={() => setShowUserModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Edit User</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleUserSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Display Name</Form.Label>
              <Form.Control type="text" value={userForm.displayName} onChange={e => setUserForm({...userForm, displayName: e.target.value})} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control type="email" value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Role</Form.Label>
              <Form.Select value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value})}>
                <option value="fan">Fan</option>
                <option value="artist">Artist</option>
                <option value="admin">Admin</option>
              </Form.Select>
            </Form.Group>
            <Form.Check type="checkbox" label="Banned" checked={userForm.banned} onChange={e => setUserForm({...userForm, banned: e.target.checked})} />
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowUserModal(false)}>Cancel</Button>
            <Button type="submit">Save</Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Settings Modal */}
      <Modal show={showSettingsModal} onHide={() => setShowSettingsModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>System Settings</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSettingsSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Site Name</Form.Label>
              <Form.Control type="text" value={settings.siteName} onChange={e => setSettings({...settings, siteName: e.target.value})} required />
            </Form.Group>
            <Form.Check type="checkbox" label="Maintenance Mode" checked={settings.maintenanceMode} onChange={e => setSettings({...settings, maintenanceMode: e.target.checked})} />
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowSettingsModal(false)}>Cancel</Button>
            <Button type="submit">Save</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
}
