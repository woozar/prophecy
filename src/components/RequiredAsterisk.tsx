'use client';

import { memo } from 'react';

export const RequiredAsterisk = memo(function RequiredAsterisk() {
  return (
    <>
      <span
        aria-hidden="true"
        className="ml-1 text-violet-300 drop-shadow-[0_0_4px_rgba(139,92,246,1),0_0_8px_rgba(139,92,246,0.9),0_0_16px_rgba(139,92,246,0.6),0_0_24px_rgba(167,139,250,0.4)]"
      >
        *
      </span>
      <span className="sr-only">(Pflichtfeld)</span>
    </>
  );
});
