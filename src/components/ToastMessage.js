import React from 'react';
import { Toast, ToastContainer } from 'react-bootstrap';
import PropTypes from 'prop-types';

/**
 * ToastMessage - lightweight toast wrapper
 * usage: <ToastMessage show={show} onClose={...} message="..." variant="success" />
 */
export default function ToastMessage({ show, onClose, message, variant = 'success', delay = 3000, position = 'top-end' }) {
  // map variant to bg
  const bg = variant === 'danger' ? 'danger' : (variant === 'warning' ? 'warning' : 'success');

  // translate position to container props
  const posMap = {
    'top-end': { position: 'fixed', top: 12, right: 12, zIndex: 1080 },
    'bottom-end': { position: 'fixed', bottom: 12, right: 12, zIndex: 1080 },
  };

  const style = posMap[position] || posMap['top-end'];

  return (
    <ToastContainer style={style}>
      <Toast show={show} onClose={onClose} bg={bg} autohide={!!delay} delay={delay}>
        <Toast.Header>
          <strong className="me-auto">{variant === 'danger' ? 'Error' : 'Success'}</strong>
        </Toast.Header>
        <Toast.Body className="text-white">{message}</Toast.Body>
      </Toast>
    </ToastContainer>
  );
}

ToastMessage.propTypes = {
  show: PropTypes.bool,
  onClose: PropTypes.func,
  message: PropTypes.string,
  variant: PropTypes.oneOf(['success', 'danger', 'warning']),
  delay: PropTypes.number,
  position: PropTypes.string,
};
