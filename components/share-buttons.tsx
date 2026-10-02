'use client';

import {useEffect, useState} from 'react';

type ShareButtonsProps = {
  slug: string;
  title: string;
  description: string;
  canonicalUrl: string;
  labels: {share:string; copyLink:string; linkCopied:string; shared:string; copyFailed:string};
};

export function ShareButtons({slug, title, description, canonicalUrl, labels}: ShareButtonsProps) {
  const [status, setStatus] = useState('');
  const [pageUrl, setPageUrl] = useState(canonicalUrl);

  useEffect(() => {
    setPageUrl(canonicalUrl || window.location.href);
  }, [canonicalUrl]);

  function getUrl() {
    return pageUrl || `/article/${slug}`;
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(getUrl());
      setStatus(labels.linkCopied);
    } catch {
      setStatus(labels.copyFailed);
    }
  }

  async function shareArticle() {
    const url = getUrl();
    if (!navigator.share) {
      await copyLink();
      return;
    }

    try {
      await navigator.share({title, text: description, url});
      setStatus(labels.shared);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      await copyLink();
    }
  }

  const encodedText = encodeURIComponent(`${title} — ${description}`);
  const encodedUrl = encodeURIComponent(pageUrl);

  return (
    <div className="share-tools" aria-label={labels.share}>
      <span className="share-label">{labels.share}</span>
      <button className="share-control share-primary" type="button" onClick={shareArticle}>
        {labels.share}
      </button>
      <a
        className="share-control"
        href={`https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`}
        target="_blank"
        rel="noreferrer"
      >
        X
      </a>
      <a
        className="share-control"
        href={`https://wa.me/?text=${encodedText}%20${encodedUrl}`}
        target="_blank"
        rel="noreferrer"
      >
        WhatsApp
      </a>
      <button className="share-control" type="button" onClick={copyLink}>
        {labels.copyLink}
      </button>
      <span className="share-status" role="status" aria-live="polite">
        {status}
      </span>
    </div>
  );
}
