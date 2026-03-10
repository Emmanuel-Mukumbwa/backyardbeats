// File: src/components/LoadingSpinner.jsx
import React from 'react';
import { Spinner } from 'react-bootstrap';
import PropTypes from 'prop-types';

/**
 * LoadingSpinner - tiny wrapper so you can swap spinner style in one place
 * usage:
 *   <LoadingSpinner size="sm" /> or <LoadingSpinner />
 *   <LoadingSpinner inline /> (renders inline span)
 */
export default function LoadingSpinner({ size = 'md', inline = false }) {
  const spinner = <Spinner animation="border" role="status" size={size === 'sm' ? 'sm' : undefined} style={size === 'lg' ? { width: '2rem', height: '2rem' } : undefined}><span className="visually-hidden">Loading...</span></Spinner>;
  return inline ? <span className="align-middle">{spinner}</span> : <div className="d-flex justify-content-center align-items-center">{spinner}</div>;
}

LoadingSpinner.propTypes = {
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  inline: PropTypes.bool,
};