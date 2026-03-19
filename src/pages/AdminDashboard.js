// src/pages/AdminDashboard.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Tabs,
  Tab,
  Alert,
  Modal,
  Form,
  Button,
  Card,
  Row,
  Col,
  Dropdown,
  ButtonGroup,
  Stack,
  Badge
} from 'react-bootstrap';
import {
  FaPlus,
  FaEllipsisV,
  FaChartLine,
  FaUsers,
  FaCheckCircle,
  FaStar,
  FaCogs,
  FaHome
} from 'react-icons/fa';
import axios from '../api/axiosConfig';

import AnalyticsPanel from '../components/admin/AnalyticsPanel';
import UsersTable from '../components/admin/UsersTable';
import PendingApprovals from '../components/admin/PendingApprovals';
import RatingsModeration from '../components/admin/RatingsModeration';
import SupportPanel from '../components/admin/SupportPanel';
import SettingsPanel from '../components/admin/SettingsPanel';
import AddTrackModal from '../components/AddTrackModal';
import AddEventModal from '../components/AddEventModal';

import ToastMessage from '../components/ToastMessage';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmModal from '../components/ConfirmModal';

const STORAGE_KEY = 'admin_active_tab';

export default function AdminDashboard() {
  /* ---------------- STATE ---------------- */
  const [users, setUsers] = useState([]);
  const [usersMeta, setUsersMeta] = useState({ page: 1, pages: 1 });

  const [pendingArtists, setPendingArtists] = useState([]);
  const [pendingEvents, setPendingEvents] = useState([]);
  const [pendingTracks, setPendingTracks] = useState([]);

  const [ratings, setRatings] = useState([]);
  const [analytics, setAnalytics] = useState({});

  const [settings, setSettings] = useState({
    siteName: 'BackyardBeats',
    maintenanceMode: false
  });

  const [showAdminTrackModal, setShowAdminTrackModal] = useState(false);
  const [showAdminEventModal, setShowAdminEventModal] = useState(false);
  const [artistsList, setArtistsList] = useState([]);
  const [metaGenres, setMetaGenres] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showUserModal, setShowUserModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userForm, setUserForm] = useState({
    displayName: '',
    email: '',
    role: 'fan',
    banned: false
  });

  const [confirmState, setConfirmState] = useState({
    show: false,
    title: '',
    message: '',
    onConfirm: null,
    confirmText: 'Confirm',
    variant: 'danger'
  });

  const [globalToast, setGlobalToast] = useState({
    show: false,
    message: '',
    variant: 'success',
    delay: 4000,
    title: ''
  });

  const [activeTab, setActiveTab] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved || 'analytics';
    } catch {
      return 'analytics';
    }
  });

  const toastTimerRef = useRef(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, activeTab);
    } catch {
      /* ignore */
    }
  }, [activeTab]);

  /* ---------------- TOAST HELPER ---------------- */
  const showToast = useCallback((message, variant = 'success', delay = 4000, title = '') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);

    setGlobalToast({
      show: true,
      message,
      variant,
      delay,
      title
    });

    toastTimerRef.current = setTimeout(
      () => setGlobalToast(t => ({ ...t, show: false })),
      delay + 200
    );
  }, []);

  /* ---------------- DATA LOADING ---------------- */
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const endpoints = [
      { name: 'analytics', url: '/admin/analytics' },
      { name: 'pendingArtists', url: '/admin/pending/artists?include=all' },
      { name: 'pendingTracks', url: '/admin/pending/tracks?include=all' },
      { name: 'pendingEvents', url: '/admin/pending/events?include=all' },
      { name: 'settings', url: '/admin/settings' },
      { name: 'ratings', url: '/admin/ratings' }
    ];

    try {
      const results = await Promise.allSettled(endpoints.map(e => axios.get(e.url)));
      const failed = [];

      results.forEach((res, idx) => {
        const name = endpoints[idx].name;

        if (res.status === 'fulfilled') {
          const data = res.value.data;
          switch (name) {
            case 'analytics':
              if (data.analytics) setAnalytics(data.analytics);
              break;
            case 'pendingArtists':
              if (data.pending) setPendingArtists(data.pending);
              break;
            case 'pendingTracks':
              if (data.pending) setPendingTracks(data.pending);
              break;
            case 'pendingEvents':
              if (data.pending) setPendingEvents(data.pending);
              break;
            case 'settings':
              if (data.settings) setSettings(data.settings);
              break;
            case 'ratings':
              if (data.ratings) setRatings(data.ratings);
              break;
            default:
              break;
          }
        } else {
          failed.push(name);
          console.error(name, res.reason);
        }
      });

      if (failed.length) {
        const msg = `Failed loading: ${failed.join(', ')}`;
        setError(msg);
        showToast(msg, 'danger', 6000, 'Load error');
      }
    } catch (err) {
      console.error(err);
      const msg = err.message || 'Unexpected error';
      setError(msg);
      showToast(msg, 'danger', 6000, 'Load error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const fetchUsers = useCallback(async (page = 1, limit = 25, q = '') => {
    try {
      const res = await axios.get('/admin/users', { params: { page, limit, q } });
      setUsers(res.data.users || []);
      setUsersMeta(res.data.meta || {});
    } catch (err) {
      console.error('Failed loading users', err);
      const msg = 'Failed to load users';
      setError(msg);
      showToast(msg, 'danger');
    }
  }, [showToast]);

  const fetchArtistsAndGenres = useCallback(async () => {
    try {
      const [artistsRes, genresRes] = await Promise.allSettled([
        axios.get('/admin/artists?all=true'),
        axios.get('/meta/genres')
      ]);

      if (artistsRes.status === 'fulfilled') {
        setArtistsList(artistsRes.value.data.artists || []);
      } else {
        console.error('Failed to load artists', artistsRes.reason);
      }

      if (genresRes.status === 'fulfilled') {
        setMetaGenres(Array.isArray(genresRes.value.data) ? genresRes.value.data : []);
      } else {
        console.error('Failed to load genres', genresRes.reason);
      }
    } catch (err) {
      console.error('fetchArtistsAndGenres error', err);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
    fetchUsers();
    fetchArtistsAndGenres();

    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, [loadDashboardData, fetchUsers, fetchArtistsAndGenres]);

  /* ---------------- USER ACTIONS ---------------- */
  const handleBanToggle = async (user, ban) => {
    try {
      await axios.post(`/admin/users/${user.id}/ban`, { ban });
      fetchUsers(usersMeta.page || 1);
      showToast(`User ${ban ? 'banned' : 'unbanned'}`, 'success');
    } catch (err) {
      console.error(err);
      const msg = 'Failed to update user status';
      setError(msg);
      showToast(msg, 'danger');
    }
  };

  const promptSoftDelete = (user) => {
    setConfirmState({
      show: true,
      title: 'Delete user',
      message: `Are you sure you want to delete user "${user.username}"? This action can be undone via restore.`,
      onConfirm: () => handleSoftDeleteConfirmed(user),
      confirmText: 'Delete',
      variant: 'danger'
    });
  };

  const handleSoftDeleteConfirmed = async (user) => {
    try {
      await axios.delete(`/admin/users/${user.id}`);
      fetchUsers(usersMeta.page || 1);
      showToast('User deleted', 'success');
    } catch (err) {
      console.error(err);
      const msg = 'Failed to delete user';
      setError(msg);
      showToast(msg, 'danger');
    }
  };

  const handleRestore = async (user) => {
    try {
      await axios.post(`/admin/users/${user.id}/restore`);
      fetchUsers(usersMeta.page || 1);
      showToast('User restored', 'success');
    } catch (err) {
      console.error(err);
      const msg = 'Failed to restore user';
      setError(msg);
      showToast(msg, 'danger');
    }
  };

  const handleUserAction = (user, action) => {
    if (action === 'edit') {
      setSelectedUser(user);
      setUserForm({
        displayName: user.username || '',
        email: user.email || '',
        role: user.role || 'fan',
        banned: !!user.banned
      });
      setShowUserModal(true);
    } else if (action === 'delete') {
      promptSoftDelete(user);
    }
  };

  const handleUserSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      await axios.put(`/admin/users/${selectedUser.id}`, {
        displayName: userForm.displayName,
        email: userForm.email,
        role: userForm.role
      });

      if (userForm.banned !== selectedUser.banned) {
        await handleBanToggle(selectedUser, userForm.banned);
      }

      fetchUsers(usersMeta.page || 1);
      setShowUserModal(false);
      setSelectedUser(null);
      showToast('User updated', 'success');
    } catch (err) {
      console.error(err);
      const msg = 'Failed updating user';
      setError(msg);
      showToast(msg, 'danger');
    }
  };

  const moderateRating = async (id) => {
    try {
      await axios.delete(`/admin/ratings/${id}`);
      setRatings(prev => prev.filter(r => r.id !== id));
      showToast('Rating deleted', 'success');
    } catch (err) {
      console.error(err);
      const msg = 'Failed to delete rating';
      setError(msg);
      showToast(msg, 'danger');
    }
  };

  const handleSettingsSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/admin/settings', settings);
      setShowSettingsModal(false);
      const res = await axios.get('/admin/settings');
      if (res?.data?.settings) setSettings(res.data.settings);
      showToast('Settings saved', 'success');
    } catch (err) {
      console.error(err);
      const msg = 'Failed to update settings';
      setError(msg);
      showToast(msg, 'danger');
    }
  };

  const approvedOrLive = settings.maintenanceMode ? 'Maintenance' : 'Live';
  const approvalsCount = pendingArtists.length + pendingTracks.length + pendingEvents.length;
  const usersCount = usersMeta?.total ?? users.length;
  const ratingsCount = ratings.length;

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center py-5">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <style>{`
        .admin-dashboard .dashboard-header {
          gap: 1rem;
        }
        .admin-dashboard .dashboard-title {
          line-height: 1.1;
        }
        .admin-dashboard .dashboard-actions .btn {
          white-space: nowrap;
        }
        .admin-dashboard .summary-card {
          border: 0;
          box-shadow: 0 0.125rem 0.5rem rgba(0,0,0,.06);
          border-radius: 1rem;
          height: 100%;
        }
        .admin-dashboard .summary-icon {
          width: 42px;
          height: 42px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          background: rgba(25, 135, 84, 0.1);
          color: #198754;
        }
        .admin-dashboard .admin-tabs .nav-link {
          white-space: nowrap;
        }
        .admin-dashboard .admin-tabs {
          overflow-x: auto;
          overflow-y: hidden;
          flex-wrap: nowrap;
          -webkit-overflow-scrolling: touch;
        }
        .admin-dashboard .admin-tabs .nav-item {
          flex: 0 0 auto;
        }
        @media (max-width: 767.98px) {
          .admin-dashboard .dashboard-header {
            flex-direction: column;
            align-items: stretch !important;
          }
          .admin-dashboard .dashboard-actions {
            width: 100%;
          }
          .admin-dashboard .dashboard-actions .btn {
            width: 100%;
          }
          .admin-dashboard .dashboard-actions .btn + .btn {
            margin-top: 0.5rem;
          }
        }
      `}</style>

      <ToastMessage
        show={globalToast.show}
        onClose={() => setGlobalToast(prev => ({ ...prev, show: false }))}
        message={globalToast.message}
        variant={globalToast.variant}
        delay={globalToast.delay}
        title={globalToast.title}
        position="top-end"
      />

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)} className="mb-3">
          {error}
        </Alert>
      )}

      <div className="d-flex justify-content-between align-items-center dashboard-header mb-3">
        <div>
          <h2 className="mb-1 dashboard-title">Admin Dashboard</h2>
          <div className="text-muted small">
            Manage users, approvals, moderation, and system settings from one place.
          </div>
        </div>

        <div className="dashboard-actions">
          <div className="d-none d-md-inline">
            <Stack direction="horizontal" gap={2}>
              <Button variant="outline-secondary" size="sm" onClick={() => window.location.assign('/')} aria-label="Back to home">
                <FaHome className="me-1" /> Back to Home
              </Button>
              <Button variant="success" size="sm" onClick={() => setShowAdminTrackModal(true)}>
                <FaPlus className="me-1" /> Add Track
              </Button>
              <Button variant="outline-success" size="sm" onClick={() => setShowAdminEventModal(true)}>
                <FaPlus className="me-1" /> Add Event
              </Button>
            </Stack>
          </div>

          <div className="d-inline d-md-none">
            <Dropdown as={ButtonGroup} className="w-100">
              <Dropdown.Toggle variant="success" size="sm" className="w-100" id="admin-actions-dropdown" aria-label="Admin quick actions">
                <FaEllipsisV className="me-2" /> Quick Actions
              </Dropdown.Toggle>
              <Dropdown.Menu align="end" className="w-100">
                <Dropdown.Item onClick={() => window.location.assign('/')}>
                  <FaHome className="me-2" /> Back to Home
                </Dropdown.Item>
                <Dropdown.Item onClick={() => setShowAdminTrackModal(true)}>
                  <FaPlus className="me-2" /> Add Track
                </Dropdown.Item>
                <Dropdown.Item onClick={() => setShowAdminEventModal(true)}>
                  <FaPlus className="me-2" /> Add Event
                </Dropdown.Item>
                <Dropdown.Divider />
                <Dropdown.Item onClick={() => setActiveTab('settings')}>
                  <FaCogs className="me-2" /> System Settings
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </div>
        </div>
      </div>

      <Row className="g-3 mb-3">
        <Col xs={6} md={3}>
          <Card className="summary-card">
            <Card.Body className="p-3">
              <Stack direction="horizontal" gap={3}>
                <div className="summary-icon">
                  <FaUsers />
                </div>
                <div>
                  <div className="small text-muted">Users</div>
                  <div className="h5 mb-0">{usersCount}</div>
                </div>
              </Stack>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={6} md={3}>
          <Card className="summary-card">
            <Card.Body className="p-3">
              <Stack direction="horizontal" gap={3}>
                <div className="summary-icon">
                  <FaCheckCircle />
                </div>
                <div>
                  <div className="small text-muted">Approvals</div>
                  <div className="h5 mb-0">{approvalsCount}</div>
                </div>
              </Stack>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={6} md={3}>
          <Card className="summary-card">
            <Card.Body className="p-3">
              <Stack direction="horizontal" gap={3}>
                <div className="summary-icon">
                  <FaStar />
                </div>
                <div>
                  <div className="small text-muted">Ratings</div>
                  <div className="h5 mb-0">{ratingsCount}</div>
                </div>
              </Stack>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={6} md={3}>
          <Card className="summary-card">
            <Card.Body className="p-3">
              <Stack direction="horizontal" gap={3}>
                <div className="summary-icon">
                  <FaChartLine />
                </div>
                <div>
                  <div className="small text-muted">System</div>
                  <div className="h5 mb-0">{approvedOrLive}</div>
                </div>
              </Stack>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Tabs
        activeKey={activeTab}
        onSelect={(k) => {
          if (!k) return;
          setActiveTab(k);
          try {
            localStorage.setItem(STORAGE_KEY, k);
          } catch {
            /* ignore */
          }
        }}
        className="mb-3 admin-tabs"
        variant="pills"
        mountOnEnter
      >
        <Tab eventKey="analytics" title={<span><FaChartLine className="me-1" /> Analytics</span>}>
          <AnalyticsPanel analytics={analytics} />
        </Tab>

        <Tab
          eventKey="users"
          title={
            <span>
              <FaUsers className="me-1" /> User Management{' '}
              <Badge bg="secondary" className="ms-2">{users.length}</Badge>
            </span>
          }
        >
          <UsersTable
            users={users}
            onEdit={(u) => handleUserAction(u, 'edit')}
            onToggleBan={(u, ban) => handleBanToggle(u, ban)}
            onSoftDelete={(u) => handleSoftDeleteConfirmed(u)}
            onRestore={(u) => handleRestore(u)}
            onAction={(u, action) => handleUserAction(u, action)}
            pagination={{
              page: usersMeta.page,
              pages: usersMeta.pages,
              onPageChange: (p) => fetchUsers(p)
            }}
          />
        </Tab>

        <Tab
          eventKey="artists"
          title={
            <span>
              <FaCheckCircle className="me-1" /> Artist Approval{' '}
              <Badge bg="secondary" className="ms-2">{pendingArtists.length}</Badge>
            </span>
          }
        >
          <PendingApprovals
            items={pendingArtists}
            type="artist"
            onDone={() => loadDashboardData()}
          />
        </Tab>

        <Tab
          eventKey="tracks"
          title={
            <span>
              <FaCheckCircle className="me-1" /> Track Approval{' '}
              <Badge bg="secondary" className="ms-2">{pendingTracks.length}</Badge>
            </span>
          }
        >
          <PendingApprovals
            items={pendingTracks}
            type="track"
            onDone={() => loadDashboardData()}
          />
        </Tab>

        <Tab
          eventKey="events"
          title={
            <span>
              <FaCheckCircle className="me-1" /> Event Approval{' '}
              <Badge bg="secondary" className="ms-2">{pendingEvents.length}</Badge>
            </span>
          }
        >
          <PendingApprovals
            items={pendingEvents}
            type="event"
            onDone={() => loadDashboardData()}
          />
        </Tab>

        <Tab
          eventKey="moderation"
          title={
            <span>
              <FaStar className="me-1" /> Moderation{' '}
              <Badge bg="secondary" className="ms-2">{ratings.length}</Badge>
            </span>
          }
        >
          <RatingsModeration ratings={ratings} onDelete={moderateRating} />
        </Tab>

        <Tab eventKey="support" title={<span><FaUsers className="me-1" /> Support</span>}>
          <SupportPanel />
        </Tab>

        <Tab eventKey="settings" title={<span><FaCogs className="me-1" /> System Settings</span>}>
          <SettingsPanel settings={settings} onEdit={() => setShowSettingsModal(true)} />
        </Tab>
      </Tabs>

      {/* Admin modals for adding tracks/events */}
      <AddTrackModal
        show={showAdminTrackModal}
        onHide={() => setShowAdminTrackModal(false)}
        onSaved={() => {
          loadDashboardData();
          setShowAdminTrackModal(false);
        }}
        adminMode={true}
        artists={artistsList}
        genres={metaGenres.map(g => g.name)}
      />

      <AddEventModal
        show={showAdminEventModal}
        onHide={() => setShowAdminEventModal(false)}
        onSaved={() => {
          loadDashboardData();
          setShowAdminEventModal(false);
        }}
        adminMode={true}
        artists={artistsList}
        districts={[]}
      />

      {/* User edit modal */}
      <Modal
        show={showUserModal}
        onHide={() => setShowUserModal(false)}
        centered
        scrollable
        fullscreen="sm-down"
      >
        <Modal.Header closeButton>
          <Modal.Title>Edit User</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleUserSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Display Name</Form.Label>
              <Form.Control
                value={userForm.displayName}
                onChange={e => setUserForm({ ...userForm, displayName: e.target.value })}
                placeholder="Enter display name"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                value={userForm.email}
                onChange={e => setUserForm({ ...userForm, email: e.target.value })}
                placeholder="Enter email address"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Role</Form.Label>
              <Form.Select
                value={userForm.role}
                onChange={e => setUserForm({ ...userForm, role: e.target.value })}
              >
                <option value="fan">Fan</option>
                <option value="artist">Artist</option>
                <option value="admin">Admin</option>
              </Form.Select>
            </Form.Group>

            <Form.Check
              type="checkbox"
              label="Banned"
              checked={userForm.banned}
              onChange={e => setUserForm({ ...userForm, banned: e.target.checked })}
            />
          </Modal.Body>
          <Modal.Footer className="d-flex flex-column flex-sm-row gap-2">
            <Button variant="secondary" className="w-100 w-sm-auto" onClick={() => setShowUserModal(false)}>
              Cancel
            </Button>
            <Button type="submit" className="w-100 w-sm-auto">
              Save Changes
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Settings modal */}
      <Modal
        show={showSettingsModal}
        onHide={() => setShowSettingsModal(false)}
        centered
        scrollable
        fullscreen="sm-down"
      >
        <Modal.Header closeButton>
          <Modal.Title>System Settings</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSettingsSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Site Name</Form.Label>
              <Form.Control
                value={settings.siteName}
                onChange={e => setSettings({ ...settings, siteName: e.target.value })}
                placeholder="Enter site name"
              />
            </Form.Group>

            <Form.Check
              type="checkbox"
              label="Maintenance Mode"
              checked={settings.maintenanceMode}
              onChange={e => setSettings({ ...settings, maintenanceMode: e.target.checked })}
            />
          </Modal.Body>
          <Modal.Footer className="d-flex flex-column flex-sm-row gap-2">
            <Button variant="secondary" className="w-100 w-sm-auto" onClick={() => setShowSettingsModal(false)}>
              Cancel
            </Button>
            <Button type="submit" className="w-100 w-sm-auto">
              Save Settings
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Confirm modal */}
      <ConfirmModal
        show={confirmState.show}
        onHide={() => setConfirmState(prev => ({ ...prev, show: false }))}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        variant={confirmState.variant}
        onConfirm={() => {
          try {
            confirmState.onConfirm && confirmState.onConfirm();
          } catch (err) {
            console.error('confirm action failed', err);
            showToast('Action failed', 'danger');
          } finally {
            setConfirmState(prev => ({ ...prev, show: false }));
          }
        }}
      />
    </div>
  );
}