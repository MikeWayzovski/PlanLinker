import React from 'react';

const BreadcrumbNav = ({ items, onSelect }) => (
  <nav aria-label="Folder path">
    <ol className="breadcrumb mb-0 flex-nowrap overflow-auto">
      {items.map((crumb, index) => {
        const isLast = index === items.length - 1;
        return (
          <li
            key={crumb.id || crumb.label}
            className={`breadcrumb-item${isLast ? ' active' : ''}`}
            aria-current={isLast ? 'page' : undefined}
          >
            {isLast ? (
              crumb.label
            ) : (
              <button
                type="button"
                className="btn btn-link btn-sm p-0 align-baseline text-decoration-none"
                onClick={() => onSelect(crumb.id)}
              >
                {crumb.label}
              </button>
            )}
          </li>
        );
      })}
    </ol>
  </nav>
);

export default BreadcrumbNav;
