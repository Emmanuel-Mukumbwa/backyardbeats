import React, { useEffect, useRef } from 'react';
import { Modal, Button, Spinner } from 'react-bootstrap';
import PropTypes from 'prop-types';

/**
 * LogoutConfirmModal
 * Props:
 * - show
 * - onCancel
 * - onConfirm (async function allowed)
 * - unsavedChanges (bool) if true: backdrop static + Esc disabled
 * - processing (bool) show spinner on Logout
 * - title, description
 */
export default function LogoutConfirmModal({
  show,
  onCancel,
  onConfirm,
  unsavedChanges = false,
  processing = false,
  title = 'Confirm logout',
  description = 'Are you sure you want to sign out? Any unsaved changes on this page will be lost.',
}) {
  const cancelRef = useRef(null);

  useEffect(() => {
    if (show && cancelRef.current) {
      // focus Cancel by default
      setTimeout(() => cancelRef.current && cancelRef.current.focus(), 50);
    }
  }, [show]);

  function handleHide() {
    if (unsavedChanges) return; // block
    if (onCancel) onCancel();
  }

  async function handleConfirm() {
    if (onConfirm) {
      await onConfirm();
    }
  }

  return (
    <Modal
      show={show}
      onHide={handleHide}
      size="sm"
      aria-labelledby="logout-confirm-title"
      centered
      backdrop={unsavedChanges ? 'static' : true}
      keyboard={!unsavedChanges}
      dialogClassName="modal-sm"
    >
      <Modal.Header className="border-0">
        <Modal.Title id="logout-confirm-title">{title}</Modal.Title>
      </Modal.Header>

      <Modal.Body id="logout-confirm-desc">
        <p className="mb-0">{description}</p>
      </Modal.Body>

      <Modal.Footer className="border-0">
        <Button ref={cancelRef} variant="outline-secondary" onClick={onCancel} aria-disabled={processing}>
          Cancel
        </Button>
        <Button variant="danger" onClick={handleConfirm} disabled={processing} aria-pressed={processing}>
          {processing ? (<><Spinner animation="border" size="sm" className="me-2" />Signing out...</>) : 'Logout'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

LogoutConfirmModal.propTypes = {
  show: PropTypes.bool,
  onCancel: PropTypes.func,
  onConfirm: PropTypes.func,
  unsavedChanges: PropTypes.bool,
  processing: PropTypes.bool,
  title: PropTypes.string,
  description: PropTypes.string,
};
