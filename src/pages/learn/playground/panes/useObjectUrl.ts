import { useEffect, useMemo } from 'react';

import { dataUrlToBlob } from '@/pages/learn/code/codeApi';

/**
 * Render large asset bytes from a short-lived `blob:` object URL instead of a giant
 * `data:` URL string.
 *
 * A multi-MB `data:` URL is REFUSED by the DOM `<img>`/`<video>`/`<audio>` (Chrome
 * shows `blocked:other`) — even though the sandboxed game's Phaser loader tolerates
 * it, which is why a large uploaded asset renders in the game but its asset-viewer
 * thumbnail/preview break. A `blob:` URL loads reliably and is far cheaper (the
 * bytes aren't re-decoded from a megabytes-long attribute string on every render).
 *
 * A non-`data:` value (e.g. a CloudFront library URL) is returned unchanged. The
 * object URL is revoked when the content changes or the component unmounts.
 */
export function useObjectUrl(content: string): string {
  // Created synchronously so the very first paint already uses the blob URL (no
  // flash of the un-loadable data: URL). Revoked by the effect below.
  const url = useMemo(() => {
    if (!content.startsWith('data:')) return content;
    try {
      return URL.createObjectURL(dataUrlToBlob(content));
    } catch {
      return content; // malformed data URL → fall back (the <img> just fails)
    }
  }, [content]);

  useEffect(() => {
    if (url.startsWith('blob:')) return () => URL.revokeObjectURL(url);
    return undefined;
  }, [url]);

  return url;
}
