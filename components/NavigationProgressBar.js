"use client";
import { useEffect, useState, useTransition } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export default function NavigationProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    // When the pathname or searchParams change, it means navigation has COMPLETED
    setIsNavigating(false);
  }, [pathname, searchParams]);

  // We can't easily detect "navigation start" in App Router without intercepting clicks
  // But we can use a small trick: listen for all anchor clicks
  useEffect(() => {
    const handleAnchorClick = (e) => {
      const target = e.target.closest('a');
      if (target && target.href && !target.href.includes('#') && !target.target) {
        const currentUrl = window.location.href;
        const newUrl = target.href;
        
        if (currentUrl !== newUrl) {
          setIsNavigating(true);
        }
      }
    };

    document.addEventListener('click', handleAnchorClick);
    return () => document.removeEventListener('click', handleAnchorClick);
  }, []);

  if (!isNavigating) return null;

  return (
    <div className="loading-bar-container">
      <div className="loading-bar-progress active"></div>
    </div>
  );
}
