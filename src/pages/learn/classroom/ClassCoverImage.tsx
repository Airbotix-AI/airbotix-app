import { useState, type ReactNode } from 'react';

import { COVER_GRAD, type CoverColor } from './classCover';

interface ClassCoverImageProps {
  src: string | null;
  emoji: string;
  color: CoverColor;
  className: string;
  imageClassName?: string;
  done?: boolean;
  children?: ReactNode;
}

export function ClassCoverImage({
  src,
  emoji,
  color,
  className,
  imageClassName = 'h-full w-full object-cover',
  done = false,
  children,
}: ClassCoverImageProps) {
  const [failed, setFailed] = useState(false);
  const showImage = !!src && !failed;

  return (
    <div
      className={`${className} ${showImage ? '' : COVER_GRAD[color]} ${
        done ? 'saturate-50' : ''
      }`}
    >
      {showImage ? (
        <img src={src} alt="" className={imageClassName} onError={() => setFailed(true)} />
      ) : (
        <span>{emoji}</span>
      )}
      {children}
    </div>
  );
}
