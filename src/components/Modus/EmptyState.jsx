import React from 'react';
import ModusIcon from './ModusIcon';

const EmptyState = ({ icon = 'info', title, body, action, className = '' }) => (
  <div className={`text-center text-muted py-4 px-3 ${className}`.trim()}>
    <ModusIcon name={icon} size="40px" extraClasses="text-secondary opacity-50 mb-2" />
    {title ? <p className="fw-semibold mb-1 text-body">{title}</p> : null}
    {body ? <p className="small mb-0">{body}</p> : null}
    {action ? <div className="mt-3">{action}</div> : null}
  </div>
);

export default EmptyState;
