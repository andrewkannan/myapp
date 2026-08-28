'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an external service
    console.error("CLIENT BOUNDARY ERROR:", error);
  }, [error]);

  return (
    <div style={{ padding: '2rem', color: 'red' }}>
      <h2>Something went wrong!</h2>
      <p style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>{error.message}</p>
      <p style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>{error.stack}</p>
      <button onClick={() => reset()}>Try again</button>
    </div>
  );
}
