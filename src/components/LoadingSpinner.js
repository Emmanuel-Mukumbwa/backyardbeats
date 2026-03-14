// used globally throughout the app, so we can easily change the look and feel of all spinners by changing this one component
import React from 'react';
import { Spinner } from 'react-bootstrap';
import PropTypes from 'prop-types';

/**
 * LoadingSpinner - tiny wrapper so you can swap spinner style in one place
 * usage:
 *   <LoadingSpinner size="sm" /> or <LoadingSpinner />
 *   <LoadingSpinner inline /> (renders inline span)
 */
export default function LoadingSpinner({ size = 'md', inline = false, ariaLabel = 'Loading' }) {
  const isSmall = size === 'sm';
  const isLarge = size === 'lg';

  const spinner = (
    <Spinner
      animation="border"
      role="status"
      size={isSmall ? 'sm' : undefined}
      style={isLarge ? { width: '2rem', height: '2rem' } : undefined}
      aria-label={ariaLabel}
    >
      <span className="visually-hidden">Loading...</span>
    </Spinner>
  ); 

  return inline ? <span className="align-middle">{spinner}</span> : <div className="d-flex justify-content-center align-items-center">{spinner}</div>;
}

LoadingSpinner.propTypes = {
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  inline: PropTypes.bool,
  ariaLabel: PropTypes.string,
};