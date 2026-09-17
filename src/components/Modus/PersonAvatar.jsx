import React from 'react';

const initialsOf = (person) => {
  const first = person?.firstName?.charAt(0) || '';
  const last = person?.lastName?.charAt(0) || '';
  const fallback = person?.email?.charAt(0) || '?';
  return (first + last || fallback).toUpperCase();
};

const PersonAvatar = ({ person, size = 32, className = '', title }) => {
  const dimension = `${size}px`;
  return (
    <span
      className={`rounded-circle bg-primary text-white fw-semibold d-inline-flex align-items-center justify-content-center flex-shrink-0 ${className}`.trim()}
      style={{ width: dimension, height: dimension, fontSize: `${Math.round(size * 0.38)}px` }}
      title={title}
      aria-hidden="true"
    >
      {initialsOf(person)}
    </span>
  );
};

export default PersonAvatar;
