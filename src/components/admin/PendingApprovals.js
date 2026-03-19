// src/components/admin/PendingApprovals.jsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Card,
  Button,
  Modal,
  Image,
  Alert,
  ButtonGroup,
  Badge,
  Stack,
  Dropdown,
  Form
} from 'react-bootstrap';
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
 * - Uses card layout on small screens for better readability.
 */
export default function PendingApprovals({ items = [], type = 'item', onDone, renderMeta }) {
  const [local, setLocal] = useState(items || []);
  const [confirm, setConfirm] = useState({ show: false, id: null, action: null, item: null });
  const [rejectReason, setRejectReason] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', variant: 'success', delay: 3500 });
  const [filter, setFilter] = useState('pending');

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

  const plural = type === 'artist' ? 'artists' : type === 'track' ? 'tracks' : type === 'event' ? 'events' : `${type}s`;
  const baseUrl = `/admin/pending/${plural}`;

  const updateLocalStatus = (id, updates) => {
    setLocal(prev => prev.map(i => (i.id === id ? { ...i, ...updates } : i)));
  };

  const counts = useMemo(() => {
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

  const filtered = useMemo(() => {
    if (!local) return [];
    if (filter === 'all') return local;
    if (filter === 'pending') return local.filter(i => !i.is_approved && !i.is_rejected);
    if (filter === 'approved') return local.filter(i => !!i.is_approved);
    if (filter === 'rejected') return local.filter(i => !!i.is_rejected);
    return local;
  }, [local, filter]);

  const openConfirm = (action, item) => {
    setError(null);
    setRejectReason('');
    setConfirm({ show: true, id: item.id, action, item });
  };

  const closeConfirm = () => setConfirm({ show: false, id: null, action: null, item: null });

  function capitalize(s) {
    if (!s) return s;
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function renderPreview(it) {
    if (type === 'track') {
      const artworkUrl = it.preview_artwork ? resolveToBackend(it.preview_artwork) : null;
      const audioUrl = (it.previewUrl || it.preview_url || it.file_url)
        ? resolveToBackend(it.previewUrl || it.preview_url || it.file_url)
        : null;

      return (
        <div className="d-flex align-items-start gap-3 mb-2">
          {artworkUrl ? (
            <Image
              src={artworkUrl}
              rounded
              width={72}
              height={72}
              style={{ objectFit: 'cover', flex: '0 0 auto' }}
              alt="Track artwork"
            />
          ) : null}

          <div className="flex-grow-1">
            <div className="fw-semibold">{it.artist || it.artist_name || it.artist_display_name || 'Unknown artist'}</div>
            <div className="text-muted small">{it.genre || it.release_date || 'No genre/date provided'}</div>
            {audioUrl ? (
              <audio controls src={audioUrl} className="w-100 mt-2" />
            ) : null}
          </div>
        </div>
      );
    }

    if (type === 'artist') {
      const photo = it.photoUrl ? resolveToBackend(it.photoUrl) : (it.photo ? resolveToBackend(it.photo) : null);
      return (
        <div className="d-flex align-items-start gap-3 mb-2">
          {photo ? (
            <Image
              src={photo}
              roundedCircle
              width={64}
              height={64}
              style={{ objectFit: 'cover', flex: '0 0 auto' }}
              alt="Artist avatar"
            />
          ) : null}

          <div className="flex-grow-1">
            <div className="fw-semibold">{it.displayName || it.name || it.display_name || 'Unnamed artist'}</div>
            <div className="text-muted small">{it.district_name || it.district || 'No district provided'}</div>
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
        <div className="d-flex align-items-start gap-3 mb-2">
          {img ? (
            <Image
              src={img}
              rounded
              width={96}
              height={72}
              style={{ objectFit: 'cover', flex: '0 0 auto' }}
              alt="Event"
            />
          ) : null}

          <div className="flex-grow-1">
            <div className="fw-semibold">{it.title || 'Untitled event'}</div>
            <div className="text-muted small">
              {artistName || 'Unknown artist'}
              {it.district || it.district_name ? ` — ${it.district || it.district_name}` : ''}
            </div>
            <div className="text-muted small">
              {it.event_date ? new Date(it.event_date).toLocaleString() : 'No date provided'}
            </div>
          </div>
        </div>
      );
    }

    return null;
  }

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
      const msg = err?.response?.data?.error || err.message || 'Approve failed';
      setError(msg);
      showToast(msg, 'danger', 5000);
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
      const msg = err?.response?.data?.error || err.message || 'Reject failed';
      setError(msg);
      showToast(msg, 'danger', 5000);
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
        const msg = err?.response?.data?.error || err.message || 'Undo failed';
        setError(msg);
        showToast(msg, 'danger', 5000);
      }
    } finally {
      setBusyId(null);
      closeConfirm();
    }
  };

  if (!local || local.length === 0) return <p className="text-muted mb-0">No pending approvals</p>;

  return (
    <div className="pending-approvals">
      <style>{`
        .pending-approvals .approval-card {
          border-radius: 1rem;
          box-shadow: 0 0.125rem 0.5rem rgba(0,0,0,.06);
          border: 0;
        }
        .pending-approvals .approval-preview {
          border-top: 1px solid rgba(0,0,0,.08);
          padding-top: 0.75rem;
          margin-top: 0.75rem;
        }
        .pending-approvals .filter-bar {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          padding-bottom: 0.25rem;
        }
        .pending-approvals .filter-bar .btn {
          white-space: nowrap;
        }
        .pending-approvals .mobile-actions .btn {
          width: 100%;
        }
      `}</style>

      <ToastMessage
        show={toast.show}
        onClose={() => setToast(prev => ({ ...prev, show: false }))}
        message={toast.message}
        variant={toast.variant}
        delay={toast.delay}
        position="top-end"
      />

      {error && (
        <Alert variant="danger" onClose={() => setError(null)} dismissible className="mb-3">
          {error}
        </Alert>
      )}

      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2 mb-3">
        <div className="text-muted small">
          Showing <strong>{filter}</strong> {plural}
        </div>

        <Dropdown className="d-md-none w-100">
          <Dropdown.Toggle variant="outline-primary" className="w-100">
            Filter: {capitalize(filter)}
          </Dropdown.Toggle>
          <Dropdown.Menu className="w-100">
            <Dropdown.Item active={filter === 'pending'} onClick={() => setFilter('pending')}>
              Pending ({counts.pending})
            </Dropdown.Item>
            <Dropdown.Item active={filter === 'approved'} onClick={() => setFilter('approved')}>
              Approved ({counts.approved})
            </Dropdown.Item>
            <Dropdown.Item active={filter === 'rejected'} onClick={() => setFilter('rejected')}>
              Rejected ({counts.rejected})
            </Dropdown.Item>
            <Dropdown.Item active={filter === 'all'} onClick={() => setFilter('all')}>
              All ({counts.all})
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
      </div>

      <div className="mb-3 d-none d-md-flex align-items-center justify-content-between filter-bar">
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

        <div className="text-muted small">
          Showing <strong>{filter}</strong>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-4 text-muted">No {filter} {plural} to show.</div>
      ) : (
        <Stack gap={3}>
          {filtered.map(it => {
            const isApproved = !!it.is_approved;
            const isRejected = !!it.is_rejected;
            const statusText = isApproved ? 'Approved' : (isRejected ? 'Rejected' : 'Pending');

            return (
              <Card className="approval-card" key={it.id}>
                <Card.Body className="p-3 p-md-4">
                  <div className="d-flex flex-column flex-md-row justify-content-between align-items-start gap-2 mb-2">
                    <div className="flex-grow-1">
                      <div className="d-flex align-items-center gap-2 flex-wrap">
                        <Card.Title className="mb-0">
                          {it.displayName || it.title || it.name || 'Untitled'}
                        </Card.Title>
                        <Badge bg={isApproved ? 'success' : isRejected ? 'danger' : 'secondary'}>
                          {statusText}
                        </Badge>
                      </div>
                      <div className="text-muted small mt-1">
                        ID #{it.id}
                      </div>
                    </div>

                    <div className="text-muted small text-md-end">
                      {it.approved_at ? (
                        <div>Approved: {new Date(it.approved_at).toLocaleString()}</div>
                      ) : null}
                      {it.rejected_at ? (
                        <div>Rejected: {new Date(it.rejected_at).toLocaleString()}</div>
                      ) : null}
                    </div>
                  </div>

                  <div className="approval-preview">
                    {renderPreview(it)}
                  </div>

                  <Card.Text className="mb-2 mt-3">
                    {it.bio || it.description || it.previewText || 'No description available.'}
                  </Card.Text>

                  {renderMeta && (
                    <div className="small text-muted mb-2">{renderMeta(it)}</div>
                  )}

                  <div className="text-muted small mb-3">
                    {it.rejection_reason ? <>Reason: {it.rejection_reason}</> : null}
                  </div>

                  <div className="d-none d-md-flex justify-content-end gap-2 flex-wrap">
                    <Button
                      variant="success"
                      onClick={() => openConfirm('approve', it)}
                      disabled={busyId === it.id || isApproved}
                    >
                      {busyId === it.id && confirm.action === 'approve'
                        ? <LoadingSpinner inline size="sm" />
                        : (isApproved ? 'Approved' : 'Approve')}
                    </Button>

                    <Button
                      variant="danger"
                      onClick={() => openConfirm('reject', it)}
                      disabled={busyId === it.id || isRejected}
                    >
                      {busyId === it.id && confirm.action === 'reject'
                        ? <LoadingSpinner inline size="sm" />
                        : (isRejected ? 'Rejected' : 'Reject')}
                    </Button>

                    {(isApproved || isRejected) && (
                      <Button
                        variant="outline-secondary"
                        onClick={() => openConfirm('undo', it)}
                        disabled={busyId === it.id}
                      >
                        {busyId === it.id && confirm.action === 'undo'
                          ? <LoadingSpinner inline size="sm" />
                          : 'Undo'}
                      </Button>
                    )}
                  </div>

                  <div className="mobile-actions d-md-none mt-3">
                    <Stack gap={2}>
                      <Button
                        variant="success"
                        onClick={() => openConfirm('approve', it)}
                        disabled={busyId === it.id || isApproved}
                      >
                        {isApproved ? 'Approved' : 'Approve'}
                      </Button>

                      <Button
                        variant="danger"
                        onClick={() => openConfirm('reject', it)}
                        disabled={busyId === it.id || isRejected}
                      >
                        {isRejected ? 'Rejected' : 'Reject'}
                      </Button>

                      {(isApproved || isRejected) && (
                        <Button
                          variant="outline-secondary"
                          onClick={() => openConfirm('undo', it)}
                          disabled={busyId === it.id}
                        >
                          Undo
                        </Button>
                      )}
                    </Stack>
                  </div>
                </Card.Body>
              </Card>
            );
          })}
        </Stack>
      )}

      {/* Approve modal */}
      <Modal show={confirm.show && confirm.action === 'approve'} onHide={closeConfirm} centered fullscreen="sm-down">
        <Modal.Header closeButton>
          <Modal.Title>Approve {type}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to approve{' '}
          <strong>{confirm.item?.displayName || confirm.item?.title || confirm.item?.name}</strong>?
        </Modal.Body>
        <Modal.Footer className="d-flex flex-column flex-sm-row gap-2">
          <Button variant="secondary" onClick={closeConfirm} className="w-100 w-sm-auto">
            Cancel
          </Button>
          <Button variant="success" onClick={handleApprove} disabled={busyId === confirm.id} className="w-100 w-sm-auto">
            {busyId === confirm.id ? <LoadingSpinner inline size="sm" /> : 'Approve'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Reject modal */}
      <Modal show={confirm.show && confirm.action === 'reject'} onHide={closeConfirm} centered fullscreen="sm-down">
        <Modal.Header closeButton>
          <Modal.Title>Reject {type}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div>
            Are you sure you want to reject{' '}
            <strong>{confirm.item?.displayName || confirm.item?.title || confirm.item?.name}</strong>?
          </div>
          <Form.Group className="mt-3">
            <Form.Label>Reason (optional)</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Explain why this item was rejected"
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer className="d-flex flex-column flex-sm-row gap-2">
          <Button variant="secondary" onClick={closeConfirm} className="w-100 w-sm-auto">
            Cancel
          </Button>
          <Button variant="danger" onClick={handleReject} disabled={busyId === confirm.id} className="w-100 w-sm-auto">
            {busyId === confirm.id ? <LoadingSpinner inline size="sm" /> : 'Reject'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Undo modal */}
      <Modal show={confirm.show && confirm.action === 'undo'} onHide={closeConfirm} centered fullscreen="sm-down">
        <Modal.Header closeButton>
          <Modal.Title>Revert {type}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to revert{' '}
          <strong>{confirm.item?.displayName || confirm.item?.title || confirm.item?.name}</strong> to pending status?
          <div className="mt-2 text-muted small">
            This will try the server-side undo endpoint first and fall back to a local update if needed.
          </div>
        </Modal.Body>
        <Modal.Footer className="d-flex flex-column flex-sm-row gap-2">
          <Button variant="secondary" onClick={closeConfirm} className="w-100 w-sm-auto">
            Cancel
          </Button>
          <Button
            variant="outline-secondary"
            onClick={() => handleUndo(confirm.item)}
            disabled={busyId === confirm.id}
            className="w-100 w-sm-auto"
          >
            {busyId === confirm.id ? <LoadingSpinner inline size="sm" /> : 'Revert to pending'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}