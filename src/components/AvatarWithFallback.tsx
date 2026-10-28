import React, { useState } from 'react';
import { PhoneCall } from 'lucide-react';

interface AvatarWithFallbackProps {
  src?: string;
  alt: string;
  initials: string;
  sizeClass?: string;
}

export const AvatarWithFallback: React.FC<AvatarWithFallbackProps> = ({
  src,
  alt,
  initials,
  sizeClass = 'w-11 h-11',
}) => {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`${sizeClass} rounded-full bg-slate-900 text-slate-100 flex items-center justify-center font-semibold text-xs shrink-0 select-none border border-slate-800`}
        aria-label={alt}
      >
        {initials ? initials.slice(0, 2).toUpperCase() : <PhoneCall className="w-4 h-4" />}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`${sizeClass} rounded-full object-cover shrink-0 border border-slate-200 bg-slate-100`}
    />
  );
};
