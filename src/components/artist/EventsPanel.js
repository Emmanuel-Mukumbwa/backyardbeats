import React, { useEffect, useState } from 'react';
import { Table, Button, Image, Badge } from 'react-bootstrap';
import { FaCalendarAlt, FaEdit, FaTrash } from 'react-icons/fa';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import axios from '../../api/axiosConfig';

export default function EventsPanel({
  events = [],
  onEdit,
  onDelete,
  resolveEventImage = () => null,
  districtsMap = () => null, // can be a function(id) or an object map { id: name }
  supportUrl = '/support'
}) {
  const navigate = useNavigate();
  const [ticketsMap, setTicketsMap] = useState({});

  // safe getter for district name - supports function or object map
  const getDistrictName = (districtId) => {
    if (districtId === null || typeof districtId === 'undefined' || districtId === '') return null;
    try {
      if (typeof districtsMap === 'function') {
        return districtsMap(districtId) || null;
      }
      if (typeof districtsMap === 'object' && districtsMap !== null) {
        return districtsMap[districtId] || districtsMap[String(districtId)] || null;
      }
    } catch (e) {
      // fall through
    }
    return null;
  };

  useEffect(() => {
    let mounted = true;
    async function loadUserTickets() {
      try {
        const res = await axios.get('/support', { params: { limit: 200 } });
        if (!mounted) return;
        const t = res.data.tickets || [];
        const map = {};
        for (const ticket of t) {
          if (ticket.target_type && ticket.target_type !== 'none' && ticket.target_id) {
            const key = `${ticket.target_type}:${String(ticket.target_id)}`;
            if (!map[key]) map[key] = ticket;
            else {
              const prev = new Date(map[key].updated_at).getTime();
              const cur = new Date(ticket.updated_at).getTime();
              if (cur >= prev) map[key] = ticket;
            }
          }
        }
        setTicketsMap(map);
      } catch (e) {
        // ignore
      }
    }
    loadUserTickets();
    return () => { mounted = false; };
  }, []);

  const renderStatusBadge = (ev) => {
    if (ev.is_approved) return <Badge bg="success" className="me-2">Approved</Badge>;
    if (ev.is_rejected) return <Badge bg="danger" className="me-2">Rejected</Badge>;
    return <Badge bg="warning" text="dark" className="me-2">Pending</Badge>;
  };

  const formatDate = (value) => {
    if (!value) return '-';
    try {
      const d = new Date(value);
      if (isNaN(d.getTime())) return '-';
      return d.toLocaleDateString();
    } catch (e) {
      return '-';
    }
  };

  const safeEvents = Array.isArray(events) ? events : [];

  function handleViewTicket(ticket) {
    if (!ticket) return;
    // navigate with query param to open My Tickets and deep-link the ticket
    navigate(`/support?openTicket=${ticket.id}`);
  }

  function openAppealForEvent(ev) {
    const existingFiles = [];
    try {
      const img = resolveEventImage ? resolveEventImage(ev) : null;
      if (img) {
        existingFiles.push({ url: img, filename: `${(ev.title || 'event').replace(/\s+/g, '_')}.jpg` });
      }
    } catch (e) {
      // ignore
    }

    const subject = `Appeal: ${ev.title || 'untitled event'}`;
    const body = `Hi support,\n\nMy event "${ev.title || 'untitled'}" was rejected.${ev.rejection_reason ? `\n\nRejection reason: ${ev.rejection_reason}` : ''}\n\nPlease review the decision.\n\nThanks.`;

    const prefill = {
      subject,
      body,
      type: 'appeal',
      targetType: 'event',
      targetId: String(ev.id),
      includeTargetFile: false,
      existingFiles
    };

    navigate('/support', { state: { prefill } });
  }

  return (
    <div className="mt-3">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <div />
        <div className="small text-muted">Create and manage upcoming gigs</div>
      </div>

      <Table striped hover responsive>
        <thead>
          <tr>
            <th style={{ width: 80 }}>Image</th>
            <th>Title</th>
            <th>Date</th>
            <th>District</th>
            <th>Venue</th>
            <th style={{ width: 200 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {safeEvents.length > 0 ? safeEvents.map(ev => {
            const itemStatus = ev && ev.is_approved ? 'approved' : (ev && ev.is_rejected ? 'rejected' : 'pending');
            const imgSrc = resolveEventImage ? resolveEventImage(ev) : null;
            const districtName = (ev && (ev.district_name || getDistrictName(ev.district_id))) || (ev && ev.district_id ? String(ev.district_id) : null);

            // row highlight for rejected / pending
            const rowClass = itemStatus === 'rejected' ? 'table-danger' : (itemStatus === 'pending' ? 'table-warning' : '');

            const ticketKey = `event:${String(ev && ev.id)}`;
            const ticket = ticketsMap[ticketKey];

            return (
              <tr key={ev && ev.id} className={rowClass}>
                <td className="align-middle">
                  {imgSrc ? (
                    <a href={imgSrc} target="_blank" rel="noreferrer">
                      <Image
                        src={imgSrc}
                        rounded
                        style={{ width: 64, height: 64, objectFit: 'cover' }}
                        alt={ev && (ev.title || 'Event image')}
                        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent((ev && ev.title) || 'Event')}&background=eee&color=777&size=128`; }}
                      />
                    </a>
                  ) : (
                    <div style={{ width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f3f5', color: '#6c757d', borderRadius: 6 }}>
                      <FaCalendarAlt />
                    </div>
                  )}
                </td>

                <td className="align-middle">
                  <div><strong>{(ev && ev.title) || 'Untitled event'}</strong></div>
                  <div className="mt-1">
                    {renderStatusBadge(ev || {})}
                    {!ev?.is_approved && !ev?.is_rejected && <small className="text-muted">Visible to you until approved</small>}
                  </div>

                  {ev && ev.is_rejected && ev.rejection_reason && (
                    <div className="mt-1"><small className="text-danger">Reason: {ev.rejection_reason}</small></div>
                  )}

                  <div className="mt-1">
                    {ev && ev.is_rejected && ticket && (
                      <Button size="sm" variant="outline-primary" onClick={() => handleViewTicket(ticket)}>View ticket</Button>
                    )}
                    {ev && ev.is_rejected && !ticket && (
                      <Button size="sm" variant="link" onClick={() => openAppealForEvent(ev)}>Contact support</Button>
                    )}
                  </div>
                </td>

                <td className="align-middle">{formatDate(ev && ev.event_date)}</td>

                <td className="align-middle">{districtName || '-'}</td>

                <td className="align-middle">{(ev && ev.venue) || '-'}</td>

                <td className="align-middle">
                  <div className="d-flex gap-2">
                    <Button size="sm" variant="outline-primary" onClick={() => onEdit && onEdit(ev)}>
                      <FaEdit className="me-1" /> Edit
                    </Button>

                    {ev && ev.is_rejected && (
                      <Button size="sm" variant="outline-primary" onClick={() => openAppealForEvent(ev)}>
                        Appeal
                      </Button>
                    )}

                    <Button size="sm" variant="outline-danger" onClick={() => onDelete && onDelete(ev && ev.id)}>
                      <FaTrash className="me-1" /> Delete
                    </Button>
                  </div>
                </td>
              </tr>
            );
          }) : (
            <tr>
              <td colSpan={6} className="text-center text-muted">No events yet — create your first event.</td>
            </tr>
          )}
        </tbody>
      </Table>
    </div>
  );
}

EventsPanel.propTypes = { 
  events: PropTypes.array,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  resolveEventImage: PropTypes.func,
  districtsMap: PropTypes.oneOfType([PropTypes.func, PropTypes.object]),
  supportUrl: PropTypes.string
};