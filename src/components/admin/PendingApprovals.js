// src/components/admin/PendingApprovals.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Modal, Row, Col, Image, Alert, ButtonGroup } from 'react-bootstrap';
import axios from '../../api/axiosConfig';
import ToastMessage from '../ToastMessage';
import LoadingSpinner from '../LoadingSpinner';

/**
 * PendingApprovals
 *
 * Props:
 * - items: array of items (may contain pending/approved/rejected states)
 * - type: 'artist' | 'track' | 'event' (affects endpoints/text)
 * - onDone: optional callback run after a successful approve/reject/undo
 * - renderMeta: optional function(item) -> string
 *
 * Behavior:
 * - Keeps approved/rejected visible and allows Undo.
 * - Adds a filter row: Pending / Approved / Rejected / All
 */
export default function PendingApprovals({ items = [], type = 'item', onDone, renderMeta }) {
  const [local, setLocal] = useState(items || []);
  const [confirm, setConfirm] = useState({ show: false, id: null, action: null, item: null });
  const [rejectReason, setRejectReason] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', variant: 'success', delay: 3500 });
  const [filter, setFilter] = useState('pending'); // pending|approved|rejected|all

  const toastTimerRef = useRef(null);

  useEffect(() => {
    setLocal(items || []);
  }, [items]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const showToast = (message, variant = 'success', delay = 3500) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ show: true, message, variant, delay });
    toastTimerRef.current = setTimeout(() => setToast(t => ({ ...t, show: false })), delay + 200);
  };

  // backend helpers
  const backendBase = (() => {
    try {
      return (axios && axios.defaults && axios.defaults.baseURL) || process.env.REACT_APP_API_URL || 'http://localhost:3001';
    } catch {
      return process.env.REACT_APP_API_URL || 'http://localhost:3001';
    }
  })().replace(/\/$/, '');

  const resolveToBackend = (raw) => {
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) return raw;
    if (raw.startsWith('/')) return `${backendBase}${raw}`;
    if (raw.startsWith('uploads/')) return `${backendBase}/${raw}`;
    return `${backendBase}/uploads/${raw}`;
  };

  const openConfirm = (action, item) => {
    setError(null);
    setRejectReason('');
    setConfirm({ show: true, id: item.id, action, item });
  };
  const closeConfirm = () => setConfirm({ show: false, id: null, action: null, item: null });

  const plural = type === 'artist' ? 'artists' : type === 'track' ? 'tracks' : type === 'event' ? 'events' : `${type}s`;
  const baseUrl = `/admin/pending/${plural}`;

  // utility: update item in local list
  const updateLocalStatus = (id, updates) => {
    setLocal(prev => prev.map(i => (i.id === id ? { ...i, ...updates } : i)));
  };

  // counts for filter tabs
  const counts = React.useMemo(() => {
    const out = { pending: 0, approved: 0, rejected: 0, all: 0 };
    (local || []).forEach(i => {
      const approved = !!i.is_approved;
      const rejected = !!i.is_rejected;
      if (approved) out.approved += 1;
      if (rejected) out.rejected += 1;
      if (!approved && !rejected) out.pending += 1;
      out.all += 1;
    });
    return out;
  }, [local]);

  const filtered = React.useMemo(() => {
    if (!local) return [];
    if (filter === 'all') return local;
    if (filter === 'pending') return local.filter(i => !i.is_approved && !i.is_rejected);
    if (filter === 'approved') return local.filter(i => !!i.is_approved);
    if (filter === 'rejected') return local.filter(i => !!i.is_rejected);
    return local;
  }, [local, filter]);

  const handleApprove = async () => {
    if (!confirm.id) return closeConfirm();
    setBusyId(confirm.id);
    setError(null);
    try {
      const res = await axios.post(`${baseUrl}/${confirm.id}/approve`);
      const now = new Date().toISOString();
      updateLocalStatus(confirm.id, {
        is_approved: true,
        is_rejected: false,
        approved_at: now,
        rejected_at: null,
        rejection_reason: null,
        ...(res.data && (res.data.event || res.data.track || res.data.artist) ? (res.data.event || res.data.track || res.data.artist) : {})
      });
      showToast(`${capitalize(type)} approved`, 'success');
      if (typeof onDone === 'function') onDone({ action: 'approve', type, id: confirm.id });
    } catch (err) {
      console.error('approve error', err);
      setError(err?.response?.data?.error || err.message || 'Approve failed');
      showToast(err?.response?.data?.error || err.message || 'Approve failed', 'danger', 5000);
    } finally {
      setBusyId(null);
      closeConfirm();
    }
  };

  const handleReject = async () => {
    if (!confirm.id) return closeConfirm();
    setBusyId(confirm.id);
    setError(null);
    try {
      const res = await axios.post(`${baseUrl}/${confirm.id}/reject`, { reason: rejectReason });
      if (res.data && res.data.deleted) {
        // server deleted the record — remove locally
        setLocal(prev => prev.filter(i => i.id !== confirm.id));
        showToast(`${capitalize(type)} rejected and deleted`, 'success');
      } else {
        const now = new Date().toISOString();
        updateLocalStatus(confirm.id, {
          is_rejected: true,
          is_approved: false,
          rejected_at: now,
          rejection_reason: rejectReason || null
        });
        showToast(`${capitalize(type)} rejected`, 'success');
      }
      if (typeof onDone === 'function') onDone({ action: 'reject', type, id: confirm.id });
    } catch (err) {
      console.error('reject error', err);
      setError(err?.response?.data?.error || err.message || 'Reject failed');
      showToast(err?.response?.data?.error || err.message || 'Reject failed', 'danger', 5000);
    } finally {
      setBusyId(null);
      closeConfirm();
    }
  };

  const handleUndo = async (item) => {
    if (!item || !item.id) return;
    const id = item.id;
    setBusyId(id);
    setError(null);
    try {
      const res = await axios.post(`${baseUrl}/${id}/undo`);
      if (res.data && (res.data.success || res.status === 200)) {
        // server persisted undo — update to neutral
        updateLocalStatus(id, {
          is_approved: false,
          is_rejected: false,
          approved_at: null,
          rejected_at: null,
          rejection_reason: null,
          ...(res.data.event || res.data.track || res.data.artist ? (res.data.event || res.data.track || res.data.artist) : {})
        });
        showToast(`${capitalize(type)} reverted to pending (server)`, 'success');
        if (typeof onDone === 'function') onDone({ action: 'undo', type, id });
      } else {
        // unexpected response, fallback local
        updateLocalStatus(id, {
          is_approved: false,
          is_rejected: false,
          approved_at: null,
          rejected_at: null,
          rejection_reason: null
        });
        showToast(`${capitalize(type)} reverted to pending (local)`, 'warning');
        if (typeof onDone === 'function') onDone({ action: 'undo_local', type, id });
      }
    } catch (err) {
      const status = err?.response?.status;
      if (status === 404 || status === 501) {
        updateLocalStatus(id, {
          is_approved: false,
          is_rejected: false,
          approved_at: null,
          rejected_at: null,
          rejection_reason: null
        });
        showToast(
          `${capitalize(type)} reverted locally — server undo endpoint not found. Implement POST ${baseUrl}/${id}/undo to persist.`,
          'warning',
          8000
        );
        if (typeof onDone === 'function') onDone({ action: 'undo_local', type, id });
      } else {
        console.error('undo error', err);
        setError(err?.response?.data?.error || err.message || 'Undo failed');
        showToast(err?.response?.data?.error || err.message || 'Undo failed', 'danger', 5000);
      }
    } finally {
      setBusyId(null);
      closeConfirm();
    }
  };

  function capitalize(s) {
    if (!s) return s;
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function renderPreview(it) {
    if (type === 'track') {
      const artworkUrl = it.preview_artwork ? resolveToBackend(it.preview_artwork) : null;
      const audioUrl = (it.previewUrl || it.preview_url || it.file_url) ? resolveToBackend(it.previewUrl || it.preview_url || it.file_url) : null;
      return (
        <div className="d-flex align-items-center mb-2">
          {artworkUrl && <Image src={artworkUrl} rounded width={80} height={80} className="me-3" />}
          {audioUrl ? <audio controls src={audioUrl} className="me-3" /> : null}
          <div>
            <div><strong>{it.artist || it.artist_name || it.artist_display_name || ''}</strong></div>
            <div className="text-muted small">{it.genre || it.release_date || ''}</div>
          </div>
        </div>
      );
    }

    if (type === 'artist') {
      const photo = it.photoUrl ? resolveToBackend(it.photoUrl) : (it.photo ? resolveToBackend(it.photo) : null);
      return (
        <div className="d-flex align-items-center mb-2">
          {photo ? <Image src={photo} roundedCircle width={64} height={64} className="me-3" /> : null}
          <div>
            <div><strong>{it.displayName || it.name || it.display_name || ''}</strong></div>
            <div className="text-muted small">{it.district_name || it.district || ''}</div>
          </div>
        </div>
      );
    }

    if (type === 'event') {
      const img = it.image_url ? resolveToBackend(it.image_url) : null;
      let artistName = '';
      if (!it) artistName = '';
      else if (typeof it.artist === 'string') artistName = it.artist;
      else if (it.artist && typeof it.artist === 'object') {
        artistName = it.artist.display_name || it.artist.displayName || it.artist.name || (it.artist.user && it.artist.user.username) || '';
      } else {
        artistName = it.artist_name || it.artist_display_name || '';
      }

      return (
        <div className="d-flex align-items-start mb-2">
          {img ? <Image src={img} rounded width={120} height={80} className="me-3" /> : null}
          <div>
            <div><strong>{it.title}</strong></div>
            <div className="text-muted small">{artistName} — {it.district || it.district_name || ''}</div>
            <div className="text-muted small">{it.event_date ? new Date(it.event_date).toLocaleString() : ''}</div>
          </div>
        </div>
      );
    }

    return null;
  }

  if (!local || local.length === 0) return <p>No pending approvals</p>;

  return (
    <div>
      <ToastMessage
        show={toast.show}
        onClose={() => setToast(prev => ({ ...prev, show: false }))}
        message={toast.message}
        variant={toast.variant}
        delay={toast.delay}
        position="top-end"
      />

      {error && <Alert variant="danger" onClose={() => setError(null)} dismissible>{error}</Alert>}

      {/* Filter tabs */}
      <div className="mb-3 d-flex align-items-center justify-content-between">
        <ButtonGroup>
          <Button variant={filter === 'pending' ? 'primary' : 'outline-primary'} onClick={() => setFilter('pending')}>
            Pending <span className="badge bg-light text-dark ms-2">{counts.pending}</span>
          </Button>
          <Button variant={filter === 'approved' ? 'primary' : 'outline-primary'} onClick={() => setFilter('approved')}>
            Approved <span className="badge bg-light text-dark ms-2">{counts.approved}</span>
          </Button>
          <Button variant={filter === 'rejected' ? 'primary' : 'outline-primary'} onClick={() => setFilter('rejected')}>
            Rejected <span className="badge bg-light text-dark ms-2">{counts.rejected}</span>
          </Button>
          <Button variant={filter === 'all' ? 'primary' : 'outline-primary'} onClick={() => setFilter('all')}>
            All <span className="badge bg-light text-dark ms-2">{counts.all}</span>
          </Button>
        </ButtonGroup>

        <div className="text-muted small">Showing <strong>{filter}</strong></div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-4 text-muted">No {filter} {plural} to show.</div>
      ) : (
        filtered.map(it => {
          const isApproved = !!it.is_approved;
          const isRejected = !!it.is_rejected;
          const statusText = isApproved ? 'Approved' : (isRejected ? 'Rejected' : 'Pending');

          return (
            <Card className="mb-3" key={it.id}>
              <Card.Body>
                <Row>
                  <Col md={9}>
                    <Card.Title className="d-flex align-items-center justify-content-between">
                      <span>{it.displayName || it.title || it.name}</span>
                      <small className={`badge ${isApproved ? 'bg-success' : (isRejected ? 'bg-danger' : 'bg-secondary')}`} style={{ padding: '0.35em 0.6em' }}>
                        {statusText}
                      </small>
                    </Card.Title>

                    {renderPreview(it)}

                    <Card.Text className="mb-1">
                      {it.bio || it.description || it.previewText || ''}
                    </Card.Text>

                    {renderMeta && <small className="text-muted">{renderMeta(it)}</small>}

                    <div className="mt-2 text-muted small">
                      {it.approved_at ? <>Approved: {new Date(it.approved_at).toLocaleString()}{it.approved_by ? ` by #${it.approved_by}` : ''}<br/></> : null}
                      {it.rejected_at ? <>Rejected: {new Date(it.rejected_at).toLocaleString()}{it.rejected_by ? ` by #${it.rejected_by}` : ''}<br/></> : null}
                      {it.rejection_reason ? <>Reason: {it.rejection_reason}<br/></> : null}
                    </div>
                  </Col>

                  <Col md={3} className="d-flex flex-column align-items-end justify-content-between">
                    <div className="w-100 d-flex justify-content-end gap-2">
                      <Button
                        variant="success"
                        onClick={() => openConfirm('approve', it)}
                        disabled={busyId === it.id || isApproved}
                      >
                        {busyId === it.id && confirm.action === 'approve' ? <LoadingSpinner inline size="sm" /> : (isApproved ? 'Approved' : 'Approve')}
                      </Button>

                      <Button
                        variant="danger"
                        onClick={() => openConfirm('reject', it)}
                        disabled={busyId === it.id || isRejected}
                      >
                        {busyId === it.id && confirm.action === 'reject' ? <LoadingSpinner inline size="sm" /> : (isRejected ? 'Rejected' : 'Reject')}
                      </Button>
                    </div>

                    <div className="w-100 d-flex justify-content-end gap-2 mt-2">
                      {(isApproved || isRejected) ? (
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          onClick={() => openConfirm('undo', it)}
                          disabled={busyId === it.id}
                        >
                          {busyId === it.id && confirm.action === 'undo' ? <LoadingSpinner inline size="sm" /> : 'Undo'}
                        </Button>
                      ) : null}
                    </div>

                    <div className="w-100 text-end text-muted small mt-3">
                      Submitted: {it.submittedAt || it.created_at || it.createdAt || '—'}
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          );
        })
      )}

      {/* Approve modal */}
      <Modal show={confirm.show && confirm.action === 'approve'} onHide={() => closeConfirm()} centered>
        <Modal.Header closeButton>
          <Modal.Title>Approve {type}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to approve <strong>{confirm.item?.displayName || confirm.item?.title || confirm.item?.name}</strong>?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => closeConfirm()}>Cancel</Button>
          <Button variant="success" onClick={handleApprove} disabled={busyId === confirm.id}>
            {busyId === confirm.id ? <LoadingSpinner inline size="sm" /> : 'Approve'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Reject modal */}
      <Modal show={confirm.show && confirm.action === 'reject'} onHide={() => closeConfirm()} centered>
        <Modal.Header closeButton>
          <Modal.Title>Reject {type}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div>Are you sure you want to reject <strong>{confirm.item?.displayName || confirm.item?.title || confirm.item?.name}</strong>?</div>
          <div className="mt-3">
            <label className="form-label">Reason (optional)</label>
            <textarea className="form-control" rows="3" value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => closeConfirm()}>Cancel</Button>
          <Button variant="danger" onClick={handleReject} disabled={busyId === confirm.id}>
            {busyId === confirm.id ? <LoadingSpinner inline size="sm" /> : 'Reject'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Undo modal */}
      <Modal show={confirm.show && confirm.action === 'undo'} onHide={() => closeConfirm()} centered>
        <Modal.Header closeButton>
          <Modal.Title>Revert {type}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to revert <strong>{confirm.item?.displayName || confirm.item?.title || confirm.item?.name}</strong> to pending status?
          <div className="mt-2 text-muted small">
            This will attempt a server-side undo (POST {baseUrl}/&lt;id&gt;/undo). If the server doesn't support undo, the UI will revert locally.
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => closeConfirm()}>Cancel</Button>
          <Button variant="outline-secondary" onClick={() => handleUndo(confirm.item)} disabled={busyId === confirm.id}>
            {busyId === confirm.id ? <LoadingSpinner inline size="sm" /> : 'Revert to pending'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}