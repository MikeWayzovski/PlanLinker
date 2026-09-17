import React from 'react';

const Spinner = ({ label, small = false, className = '' }) => (
  <div className={`d-flex align-items-center gap-2 text-muted ${className}`.trim()}>
    <div
      className={`spinner-border text-primary ${small ? 'spinner-border-sm' : ''}`.trim()}
      role="status"
      aria-hidden="true"
    />
    {label ? <span className="small">{label}</span> : null}
    <span className="visually-hidden">{label || 'Loading'}</span>
  </div>
);

export default Spinner;
