import React, { useEffect, useRef } from 'react';
import { Modal, Button } from 'react-bootstrap';
import PropTypes from 'prop-types';

/**
 * SuccessModal
 * Props:
 *  - show (bool)
 *  - title (string)
 *  - message (string|node)
 *  - primaryLabel (string) default "OK"
 *  - secondaryLabel (string|null)
 *  - onPrimary (func) optional
 *  - onSecondary (func) optional
 *  - onClose (func) receives reason: 'ok'|'secondary'|'auto'|'cancel'
 *  - autoCloseMs (number|null) optional (ms)
 *  - blocking (bool) if true disable Esc/backdrop close
 *  - size: 'sm'|'md'|'lg'
 *  - centered (bool)
 */
export default function SuccessModal({
  show,
  title = 'Success',
  message,
  primaryLabel = 'OK',
  secondaryLabel = null,
  onPrimary,
  onSecondary,
  onClose,
  autoCloseMs = null,
  blocking = false,
  size = 'md',
  centered = true,
}) {
  const timerRef = useRef(null);
  const okButtonRef = useRef(null);
  const reasonRef = useRef(null);

  // map size to bootstrap prop
  const bsSize = size === 'md' ? undefined : size;

  useEffect(() => {
    if (!show) return undefined;
    // move focus to primary button when opened
    setTimeout(() => {
      if (okButtonRef.current) okButtonRef.current.focus();
    }, 50);

    // auto-close if requested
    if (autoCloseMs && autoCloseMs > 0) {
      timerRef.current = setTimeout(() => {
        reasonRef.current = 'auto';
        if (onClose) onClose('auto');
      }, autoCloseMs);
    }
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [show, autoCloseMs, onClose]);

  function handlePrimary() {
    reasonRef.current = 'ok';
    if (onPrimary) onPrimary();
    if (onClose) onClose('ok');
  }

  function handleSecondary() {
    reasonRef.current = 'secondary';
    if (onSecondary) onSecondary();
    if (onClose) onClose('secondary');
  }

  function handleHide() {
    // hide via backdrop/Esc - if blocking, prevent
    if (blocking) return;
    reasonRef.current = 'cancel';
    if (onClose) onClose('cancel');
  }

  return (
    <Modal
      show={show}
      onHide={handleHide}
      size={bsSize}
      centered={centered}
      aria-labelledby="success-modal-title"
      backdrop={blocking ? 'static' : true}
      keyboard={!blocking}
      dialogClassName="modal-md"
    >
      <Modal.Header className="align-items-center border-0">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* check circle SVG icon */}
          <svg width="36" height="36" viewBox="0 0 16 16" fill="#28a745" aria-hidden focusable="false">
            <path fillRule="evenodd" d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM6.97 11.03a.75.75 0 0 0 1.06 0l4.243-4.243a.75.75 0 1 0-1.06-1.06L7.5 9.939 5.818 8.256a.75.75 0 1 0-1.06 1.06L6.97 11.03z"></path>
          </svg>
          <h5 id="success-modal-title" className="mb-0">{title}</h5>
        </div>
      </Modal.Header>

      <Modal.Body style={{ fontSize: '1rem', lineHeight: 1.5, maxHeight: '70vh', overflowY: 'auto' }}>
        {typeof message === 'string' ? <p className="mb-0">{message}</p> : message}
      </Modal.Body>

      <Modal.Footer className="border-0">
        {secondaryLabel && (
          <Button variant="outline-secondary" onClick={handleSecondary}>
            {secondaryLabel}
          </Button>
        )}
        <Button
          ref={okButtonRef}
          variant="success"
          onClick={handlePrimary}
        >
          {primaryLabel}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

SuccessModal.propTypes = {
  show: PropTypes.bool,
  title: PropTypes.string,
  message: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
  primaryLabel: PropTypes.string,
  secondaryLabel: PropTypes.string,
  onPrimary: PropTypes.func,
  onSecondary: PropTypes.func,
  onClose: PropTypes.func,
  autoCloseMs: PropTypes.number,
  blocking: PropTypes.bool,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  centered: PropTypes.bool,
};
