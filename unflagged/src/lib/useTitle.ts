import { useEffect } from 'react';

/** Sets the browser tab / bookmark title for the current page. */
export function useTitle(title: string): void {
  useEffect(() => {
    document.title = title;
  }, [title]);
}
