import React, { useEffect, useState } from 'react';

/**
 * Load a Trimble Connect thumbnail (or other authenticated image) with a Bearer token.
 * Falls back to the provided node when the URL is missing or the request fails.
 */
const AuthImage = ({ src, alt = '', className = '', getToken, fallback = null }) => {
  const [objectUrl, setObjectUrl] = useState('');
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    if (!src) return undefined;

    let cancelled = false;
    let createdUrl = '';

    const load = async () => {
      try {
        const token = typeof getToken === 'function' ? await getToken() : '';
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const response = await fetch(src, { headers });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob = await response.blob();
        const type = String(blob.type || '');
        if (type && !type.startsWith('image/') && type !== 'application/octet-stream') {
          throw new Error('Not an image');
        }
        createdUrl = URL.createObjectURL(blob);
        if (cancelled) {
          URL.revokeObjectURL(createdUrl);
          return;
        }
        setObjectUrl(createdUrl);
        setLoadFailed(false);
      } catch {
        if (!cancelled) setLoadFailed(true);
      }
    };

    load();

    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [src, getToken]);

  if (!src || loadFailed || !objectUrl) return fallback;
  return <img src={objectUrl} alt={alt} className={className} />;
};

export default AuthImage;
