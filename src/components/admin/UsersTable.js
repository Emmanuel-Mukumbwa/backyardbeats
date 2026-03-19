// src/components/admin/UsersTable.jsx
import React, { useMemo, useState } from 'react';
import {
  Table,
  Button,
  Badge,
  Modal,
  Card,
  Stack,
  Row,
  Col,
  ButtonGroup
} from 'react-bootstrap';

export default function UsersTable({
  users = [],
  onEdit,
  onToggleBan,
  onSoftDelete,
  onRestore,
  pagination = null
}) {
  const [confirm, setConfirm] = useState({ show: false, action: null, user: null });

  const openConfirm = (action, user) => setConfirm({ show: true, action, user });
  const closeConfirm = () => setConfirm({ show: false, action: null, user: null });

  const handleConfirm = async () => {
    const { action, user } = confirm;
    closeConfirm();
    if (!user) return;

    try {
      if (action === 'ban') {
        await onToggleBan?.(user, true);
      } else if (action === 'unban') {
        await onToggleBan?.(user, false);
      } else if (action === 'delete') {
        await onSoftDelete?.(user);
      } else if (action === 'restore') {
        await onRestore?.(user);
      }
    } catch {
      // parent handlers should handle errors
    }
  };

  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter(u => !u.deleted_at && !u.banned).length;
    const banned = users.filter(u => !u.deleted_at && u.banned).length;
    const deleted = users.filter(u => !!u.deleted_at).length;
    return { total, active, banned, deleted };
  }, [users]);

  const getRoleBadge = (role) => {
    const bg = role === 'admin' ? 'danger' : role === 'artist' ? 'success' : 'primary';
    return <Badge bg={bg} className="text-uppercase">{role || 'fan'}</Badge>;
  };

  const getStatusBadge = (u) => {
    if (u.deleted_at) return <Badge bg="secondary">Deleted</Badge>;
    if (u.banned) return <Badge bg="danger">Banned</Badge>;
    return <Badge bg="success">Active</Badge>;
  };

  const renderActions = (u) => {
    const isDeleted = !!u.deleted_at;
    const isBanned = !!u.banned;

    return (
      <Stack direction="horizontal" gap={2} className="flex-wrap">
        {!isDeleted ? (
          <>
            <Button size="sm" variant="outline-primary" onClick={() => onEdit?.(u)}>
              Edit
            </Button>
            <Button
              size="sm"
              variant={isBanned ? 'success' : 'danger'}
              onClick={() => openConfirm(isBanned ? 'unban' : 'ban', u)}
            >
              {isBanned ? 'Unban' : 'Ban'}
            </Button>
            <Button
              size="sm"
              variant="outline-danger"
              onClick={() => openConfirm('delete', u)}
            >
              Delete
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            variant="outline-primary"
            onClick={() => openConfirm('restore', u)}
          >
            Restore
          </Button>
        )}
      </Stack>
    );
  };

  return (
    <div className="mt-3">
      <style>{`
        .users-mobile-card {
          border-radius: 1rem;
          box-shadow: 0 0.125rem 0.5rem rgba(0,0,0,.06);
        }
        .users-mobile-meta {
          font-size: 0.875rem;
        }
      `}</style>

      <Row className="g-2 mb-3">
        <Col xs={6} md={3}>
          <Card className="shadow-sm border-0">
            <Card.Body className="p-3">
              <div className="small text-muted">Total</div>
              <div className="h5 mb-0">{stats.total}</div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={6} md={3}>
          <Card className="shadow-sm border-0">
            <Card.Body className="p-3">
              <div className="small text-muted">Active</div>
              <div className="h5 mb-0 text-success">{stats.active}</div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={6} md={3}>
          <Card className="shadow-sm border-0">
            <Card.Body className="p-3">
              <div className="small text-muted">Banned</div>
              <div className="h5 mb-0 text-danger">{stats.banned}</div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={6} md={3}>
          <Card className="shadow-sm border-0">
            <Card.Body className="p-3">
              <div className="small text-muted">Deleted</div>
              <div className="h5 mb-0 text-secondary">{stats.deleted}</div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Desktop table */}
      <div className="d-none d-md-block">
        <Table striped hover responsive className="align-middle">
          <thead>
            <tr>
              <th style={{ width: 70 }}>ID</th>
              <th>Username</th>
              <th>Email</th>
              <th style={{ width: 120 }}>Role</th>
              <th style={{ width: 120 }}>Status</th>
              <th style={{ width: 180 }}>Created</th>
              <th style={{ width: 260 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center text-muted py-4">
                  No users found
                </td>
              </tr>
            ) : (
              users.map(u => {
                const isDeleted = !!u.deleted_at;
                return (
                  <tr key={u.id} className={isDeleted ? 'table-secondary' : ''}>
                    <td>{u.id}</td>
                    <td className="fw-semibold">{u.username || '—'}</td>
                    <td>{u.email || '—'}</td>
                    <td>{getRoleBadge(u.role)}</td>
                    <td>{getStatusBadge(u)}</td>
                    <td>{u.created_at ? new Date(u.created_at).toLocaleString() : '—'}</td>
                    <td>{renderActions(u)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="d-md-none">
        {users.length === 0 ? (
          <Card className="users-mobile-card border-0">
            <Card.Body className="text-center text-muted py-4">
              No users found
            </Card.Body>
          </Card>
        ) : (
          <Stack gap={3}>
            {users.map(u => {
              const isDeleted = !!u.deleted_at;
              const isBanned = !!u.banned;

              return (
                <Card key={u.id} className="users-mobile-card border-0">
                  <Card.Body className="p-3">
                    <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                      <div>
                        <div className="fw-semibold">{u.username || 'Unnamed user'}</div>
                        <div className="users-mobile-meta text-muted">ID #{u.id}</div>
                      </div>
                      <div className="text-end">
                        {getStatusBadge(u)}
                      </div>
                    </div>

                    <div className="users-mobile-meta mb-2">
                      <div><span className="text-muted">Email:</span> {u.email || '—'}</div>
                      <div><span className="text-muted">Role:</span> {getRoleBadge(u.role)}</div>
                      <div><span className="text-muted">Created:</span> {u.created_at ? new Date(u.created_at).toLocaleString() : '—'}</div>
                    </div>

                    <div className="pt-2 border-top">
                      <Stack direction="vertical" gap={2}>
                        {!isDeleted ? (
                          <>
                            <ButtonGroup className="w-100">
                              <Button variant="outline-primary" onClick={() => onEdit?.(u)}>
                                Edit
                              </Button>
                              <Button
                                variant={isBanned ? 'success' : 'danger'}
                                onClick={() => openConfirm(isBanned ? 'unban' : 'ban', u)}
                              >
                                {isBanned ? 'Unban' : 'Ban'}
                              </Button>
                            </ButtonGroup>
                            <Button
                              variant="outline-danger"
                              onClick={() => openConfirm('delete', u)}
                              className="w-100"
                            >
                              Delete User
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="outline-primary"
                            onClick={() => openConfirm('restore', u)}
                            className="w-100"
                          >
                            Restore User
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
      </div>

      {/* confirmation modal */}
      <Modal show={confirm.show} onHide={closeConfirm} centered fullscreen="sm-down">
        <Modal.Header closeButton>
          <Modal.Title>
            {confirm.action === 'ban' && 'Ban user'}
            {confirm.action === 'unban' && 'Unban user'}
            {confirm.action === 'delete' && 'Delete user'}
            {confirm.action === 'restore' && 'Restore user'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {confirm.user ? (
            <div>
              Are you sure you want to <strong>{confirm.action}</strong>{' '}
              <strong>{confirm.user.username}</strong> (id: {confirm.user.id})?
              {confirm.action === 'delete' && (
                <div className="text-muted mt-2">
                  This will soft-delete the user and can be restored later.
                </div>
              )}
            </div>
          ) : null}
        </Modal.Body>
        <Modal.Footer className="d-flex flex-column flex-sm-row gap-2">
          <Button variant="secondary" onClick={closeConfirm} className="w-100 w-sm-auto">
            Cancel
          </Button>
          <Button
            variant={confirm.action === 'delete' ? 'danger' : 'primary'}
            onClick={handleConfirm}
            className="w-100 w-sm-auto"
          >
            Confirm
          </Button>
        </Modal.Footer>
      </Modal>

      {/* pagination controls */}
      {pagination && pagination.pages > 1 && (
        <Card className="mt-3 border-0 shadow-sm">
          <Card.Body className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2">
            <div className="text-muted">
              Page <strong>{pagination.page}</strong> of <strong>{pagination.pages}</strong>
            </div>
            <div className="d-flex gap-2 w-100 w-md-auto">
              <Button
                size="sm"
                variant="outline-secondary"
                className="flex-fill flex-md-grow-0"
                disabled={pagination.page <= 1}
                onClick={() => pagination.onPageChange(pagination.page - 1)}
              >
                Prev
              </Button>
              <Button
                size="sm"
                variant="outline-secondary"
                className="flex-fill flex-md-grow-0"
                disabled={pagination.page >= pagination.pages}
                onClick={() => pagination.onPageChange(pagination.page + 1)}
              >
                Next
              </Button>
            </div>
          </Card.Body>
        </Card>
      )}
    </div>
  );
}