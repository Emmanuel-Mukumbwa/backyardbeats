// src/components/admin/SupportPanel.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Table,
  Button,
  Badge,
  Modal,
  Form,
  Spinner,
  Row,
  Col,
  InputGroup,
  ListGroup,
  Card,
  Stack
} from 'react-bootstrap';
import axios from '../../api/axiosConfig';
import ToastMessage from '../ToastMessage';
import LoadingSpinner from '../LoadingSpinner';

export default function SupportPanel() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState('');
  const [status, setStatus] = useState('');
  const [filterStatus, setFilterStatus] = useState('pending');
  const [searchQ, setSearchQ] = useState('');
  const [sending, setSending] = useState(false);
  const [files, setFiles] = useState([]);
  const fileInputRef = useRef(null);

  const [toast, setToast] = useState({ show: false, message: '', variant: 'success' });

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get('/support/admin', {
        params: { limit: 100, status: filterStatus, q: searchQ }
      });
      setTickets(res.data.tickets || []);
    } catch (err) {
      console.error('fetchTickets', err);
      setToast({ show: true, message: 'Failed to load tickets', variant: 'danger' });
    } finally {
      setLoading(false);
    }
  }, [filterStatus, searchQ]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  async function openTicket(t) {
    try {
      setSelected(null);
      setMessages([]);
      setStatus('');
      const res = await axios.get(`/support/admin/${t.id}`);
      setSelected(res.data.ticket || t);
      setMessages(res.data.messages || []);
      setStatus((res.data.ticket && res.data.ticket.status) || '');
    } catch (err) {
      console.error('openTicket', err);
      setToast({ show: true, message: 'Failed to open ticket', variant: 'danger' });
    }
  }

  function onFilesChange(e) {
    const incoming = Array.from(e.target.files || []);
    setFiles(prev => [...prev, ...incoming]);
    if (fileInputRef.current) fileInputRef.current.value = null;
  }

  function removeFile(idx) {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  }

  async function sendReply() {
    if (!reply && files.length === 0) {
      setToast({ show: true, message: 'Reply text or attachment required', variant: 'warning' });
      return;
    }
    if (!selected) return;

    setSending(true);
    try {
      const form = new FormData();
      form.append('body', reply);
      files.forEach(f => form.append('attachments', f));

      await axios.post(`/support/admin/${selected.id}/reply`, form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setReply('');
      setFiles([]);
      await openTicket(selected);
      await fetchTickets();
      setToast({ show: true, message: 'Reply sent', variant: 'success' });
    } catch (err) {
      console.error('sendReply', err);
      setToast({ show: true, message: 'Failed to send reply', variant: 'danger' });
    } finally {
      setSending(false);
    }
  }

  async function changeStatus(s) {
    if (!selected) return;
    try {
      await axios.post(`/support/admin/${selected.id}/status`, { status: s });
      setStatus(s);
      setMessages(prev => [
        ...prev,
        {
          id: `sys-${Date.now()}`,
          sender_role: 'system',
          body: `Status changed to "${s}" by admin`,
          created_at: new Date().toISOString()
        }
      ]);
      await fetchTickets();
      setToast({ show: true, message: `Marked ${s}`, variant: 'success' });
    } catch (err) {
      console.error('changeStatus', err);
      setToast({ show: true, message: 'Failed to change status', variant: 'danger' });
    }
  }

  const statusBadge = (s) => {
    const bg =
      s === 'open' ? 'success' :
      s === 'pending' ? 'warning' :
      s === 'resolved' ? 'secondary' :
      s === 'spam' ? 'danger' :
      'secondary';

    return (
      <Badge bg={bg} pill className="text-capitalize">
        {s || 'unknown'}
      </Badge>
    );
  };

  const ticketMeta = (t) => (
    <div className="small text-muted">
      <div><strong>Type:</strong> {t.type || '—'}</div>
      <div><strong>User:</strong> {t.user_username || t.user_email || t.user_id || '—'}</div>
      <div>
        <strong>Target:</strong>{' '}
        {t.target_type && t.target_type !== 'none' ? `${t.target_type}:${t.target_id}` : '—'}
      </div>
      <div><strong>Updated:</strong> {t.updated_at ? new Date(t.updated_at).toLocaleString() : '—'}</div>
    </div>
  );

  return (
    <div className="p-3">
      <style>{`
        .support-panel .ticket-card {
          border-radius: 1rem;
          box-shadow: 0 0.125rem 0.5rem rgba(0,0,0,.06);
        }
        .support-panel .ticket-subject {
          font-weight: 600;
          line-height: 1.25;
        }
        .support-panel .message-list {
          max-height: 350px;
          overflow-y: auto;
        }
        .support-panel .message-bubble {
          border-radius: 1rem;
        }
        @media (max-width: 767.98px) {
          .support-panel .filters-row > * {
            width: 100%;
          }
        }
      `}</style>

      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2 mb-3">
        <div>
          <h4 className="mb-1">Support Tickets</h4>
          <div className="text-muted small">
            Review tickets, reply to users, and update ticket status.
          </div>
        </div>
        <Button variant="secondary" onClick={fetchTickets}>
          Refresh
        </Button>
      </div>

      <Row className="g-2 mb-3 filters-row">
        <Col xs={12} md="auto">
          <Form.Select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="open">Open</option>
            <option value="resolved">Resolved</option>
            <option value="spam">Spam</option>
            <option value="closed">Closed</option>
          </Form.Select>
        </Col>
        <Col xs={12} md>
          <InputGroup>
            <Form.Control
              placeholder="Search subject or body..."
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
            />
            <Button onClick={fetchTickets} variant="outline-secondary">
              Search
            </Button>
          </InputGroup>
        </Col>
      </Row>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          {/* Desktop table */}
          <div className="d-none d-md-block">
            <Table hover responsive className="align-middle">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Subject</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>User</th>
                  <th>Target</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map(t => (
                  <tr key={t.id}>
                    <td>{t.id}</td>
                    <td style={{ maxWidth: 300 }}>{t.subject}</td>
                    <td>{t.type}</td>
                    <td>{statusBadge(t.status)}</td>
                    <td>{t.user_username || t.user_email || t.user_id}</td>
                    <td>{t.target_type && t.target_type !== 'none' ? `${t.target_type}:${t.target_id}` : '-'}</td>
                    <td>{t.updated_at ? new Date(t.updated_at).toLocaleString() : '—'}</td>
                    <td>
                      <Button size="sm" onClick={() => openTicket(t)}>Open</Button>
                    </td>
                  </tr>
                ))}
                {tickets.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center text-muted py-4">
                      No tickets
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="d-md-none">
            {tickets.length === 0 ? (
              <Card className="ticket-card border-0">
                <Card.Body className="text-center text-muted py-4">
                  No tickets
                </Card.Body>
              </Card>
            ) : (
              <Stack gap={3}>
                {tickets.map(t => (
                  <Card key={t.id} className="ticket-card border-0">
                    <Card.Body className="p-3">
                      <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                        <div>
                          <div className="ticket-subject">{t.subject || 'Untitled ticket'}</div>
                          <div className="small text-muted">Ticket #{t.id}</div>
                        </div>
                        <div>{statusBadge(t.status)}</div>
                      </div>

                      {ticketMeta(t)}

                      <div className="pt-3 mt-3 border-top">
                        <Button className="w-100" size="sm" onClick={() => openTicket(t)}>
                          Open Ticket
                        </Button>
                      </div>
                    </Card.Body>
                  </Card>
                ))}
              </Stack>
            )}
          </div>
        </>
      )}

      <Modal
        size="lg"
        fullscreen="sm-down"
        show={!!selected}
        onHide={() => setSelected(null)}
        centered
        scrollable
      >
        <Modal.Header closeButton>
          <Modal.Title>
            Ticket #{selected?.id} — {selected?.subject}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Row className="g-3 mb-3">
            <Col xs={12} md={4}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body>
                  <div className="small text-muted mb-1">Status</div>
                  <div>{statusBadge(status)}</div>
                </Card.Body>
              </Card>
            </Col>
            <Col xs={12} md={4}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body>
                  <div className="small text-muted mb-1">From</div>
                  <div>{selected?.user_username || selected?.user_email || selected?.user_id || '—'}</div>
                </Card.Body>
              </Card>
            </Col>
            <Col xs={12} md={4}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body>
                  <div className="small text-muted mb-1">Ticket ID</div>
                  <div>#{selected?.id}</div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {selected?.targetSnapshot && (
            <Card className="mb-3 border-0 shadow-sm">
              <Card.Body>
                <strong>Target:</strong> {selected.targetSnapshot.type} —{' '}
                {selected.targetSnapshot.title || selected.targetSnapshot.id}
                {selected.targetSnapshot.extra?.event_date && (
                  <div className="text-muted small mt-1">
                    {selected.targetSnapshot.extra.event_date}
                  </div>
                )}
              </Card.Body>
            </Card>
          )}

          <div className="mb-2 fw-semibold">Messages</div>
          <div className="message-list">
            {messages.length === 0 ? (
              <div className="text-muted text-center py-4">No messages yet</div>
            ) : (
              messages.map(m => (
                <div
                  key={m.id}
                  className={`border rounded p-3 my-2 message-bubble ${m.sender_role === 'admin' ? 'bg-light' : ''}`}
                >
                  <div className="d-flex justify-content-between align-items-center gap-2 mb-2">
                    <small className="text-muted text-capitalize">
                      {m.sender_role || 'unknown'} • {m.created_at ? new Date(m.created_at).toLocaleString() : '—'}
                    </small>
                  </div>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{m.body}</div>

                  {m.attachments && m.attachments.length > 0 && (
                    <ListGroup className="mt-3">
                      {m.attachments.map(a => (
                        <ListGroup.Item key={a.id}>
                          <a href={a.path} target="_blank" rel="noreferrer">
                            {a.filename || a.path}
                          </a>
                        </ListGroup.Item>
                      ))}
                    </ListGroup>
                  )}
                </div>
              ))
            )}
          </div>

          <Form.Group className="mt-3">
            <Form.Label>Reply</Form.Label>
            <Form.Control
              as="textarea"
              rows={4}
              placeholder="Type your reply — be concise and polite. You can attach screenshots or files if helpful."
              value={reply}
              onChange={e => setReply(e.target.value)}
            />
          </Form.Group>

          <Form.Group className="mt-3">
            <Form.Label>Attachments</Form.Label>
            <Form.Control type="file" multiple ref={fileInputRef} onChange={onFilesChange} />
            <Form.Text className="text-muted d-block mt-1">
              These attachments will be included with your reply.
            </Form.Text>

            {files.length > 0 && (
              <ListGroup className="mt-2">
                {files.map((f, i) => (
                  <ListGroup.Item key={i} className="d-flex justify-content-between align-items-center gap-2">
                    <div className="text-truncate" style={{ maxWidth: '75%' }}>{f.name}</div>
                    <Button size="sm" variant="outline-danger" onClick={() => removeFile(i)}>
                      Remove
                    </Button>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            )}
          </Form.Group>

          {selected?.attachments && selected.attachments.length > 0 && (
            <div className="mt-3">
              <strong>Ticket attachments</strong>
              <ListGroup className="mt-2">
                {selected.attachments.map(a => (
                  <ListGroup.Item key={a.id}>
                    <a href={a.path} target="_blank" rel="noreferrer">
                      {a.filename || a.path}
                    </a>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            </div>
          )}
        </Modal.Body>

        <Modal.Footer className="d-flex flex-column flex-sm-row gap-2">
          <Button
            variant="secondary"
            className="w-100 w-sm-auto"
            onClick={() => changeStatus('resolved')}
          >
            Mark Resolved
          </Button>
          <Button
            variant="danger"
            className="w-100 w-sm-auto"
            onClick={() => changeStatus('spam')}
          >
            Mark Spam
          </Button>
          <Button
            className="w-100 w-sm-auto"
            onClick={sendReply}
            disabled={sending || (!reply && files.length === 0)}
          >
            {sending ? (
              <>
                <Spinner size="sm" animation="border" className="me-2" />
                Sending...
              </>
            ) : (
              'Send Reply'
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      <ToastMessage
        show={toast.show}
        onClose={() => setToast(s => ({ ...s, show: false }))}
        message={toast.message}
        variant={toast.variant}
      />
    </div>
  );
}