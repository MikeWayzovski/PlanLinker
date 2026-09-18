import React from 'react';

const SectionCard = ({ title, description, children, className = '' }) => (
  <section className={`card border-0 shadow-sm ${className}`.trim()}>
    {(title || description) ? (
      <div className="card-header">
        {title ? <h2 className="h6 mb-0">{title}</h2> : null}
        {description ? <p className="small text-muted mb-0 mt-1">{description}</p> : null}
      </div>
    ) : null}
    <div className="card-body d-flex flex-column gap-3">{children}</div>
  </section>
);

export default SectionCard;
