import React, { useEffect, useState } from 'react';

const parseHref = (href) => {
  try {
    return new URL(href, typeof window !== 'undefined' ? window.location.href : 'https://plan-linker.vercel.app');
  } catch {
    return null;
  }
};

const isTrimbleApiUrl = (href) => {
  const parsed = parseHref(href);
  return Boolean(parsed && /\.connect\.trimble\.com$/i.test(parsed.hostname) && parsed.pathname.includes('/tc/api/'));
};

const readToken = async (getToken) => {
  if (typeof getToken !== 'function') return '';
  try {
    return (await getToken()) || '';
  } catch {
    return '';
  }
};

/**
 * Connect API thumbnails need a Bearer token (fetch → blob).
 * `resources.connect.trimble.com` is a CDN: fetch + Authorization triggers a
 * CORS preflight the host rejects. Those URLs render as a plain img instead.
 */
const AuthImage = ({ src, alt = '', className = '', getToken, fallback = null }) => {
  const [objectUrl, setObjectUrl] = useState('');
  const [loadFailed, setLoadFailed] = useState(false);
  const useDirectImg = Boolean(src) && !isTrimbleApiUrl(src);

  useEffect(() => {
    if (!src || useDirectImg) return undefined;

    let cancelled = false;
    let createdUrl = '';

    const load = async () => {
      try {
        const token = await readToken(getToken);
        if (!token) throw new Error('Missing access token for Trimble Connect thumbnail.');
        const response = await fetch(src, { headers: { Authorization: `Bearer ${token}` } });
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
  }, [src, getToken, useDirectImg]);

  if (!src || loadFailed) return fallback;
  if (useDirectImg) {
    return <img src={src} alt={alt} className={className} onError={() => setLoadFailed(true)} />;
  }
  if (!objectUrl) return fallback;
  return <img src={objectUrl} alt={alt} className={className} />;
};

export default AuthImage;
