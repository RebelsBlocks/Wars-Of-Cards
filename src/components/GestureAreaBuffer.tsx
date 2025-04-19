import React, { useEffect, useState } from 'react';

/**
 * Komponent bufora dla gesture area na urządzeniach mobilnych
 * Zapewnia dodatkową przestrzeń na dole ekranu, aby zapobiec
 * zakrywaniu zawartości przez gesture bar (iOS) lub navigation bar (Android)
 */
export const GestureAreaBuffer: React.FC = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Sprawdź, czy jesteśmy na urządzeniu mobilnym
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    // Sprawdź przy pierwszym renderowaniu
    checkIfMobile();

    // Nasłuchuj na zmiany rozmiaru okna
    window.addEventListener('resize', checkIfMobile);
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  if (!isMobile) return null;

  return (
    <div 
      style={{
        height: 'var(--safe-area-padding-bottom)',
        width: '100%',
        position: 'fixed',
        bottom: 0,
        left: 0,
        zIndex: 9999,
        pointerEvents: 'none',
        background: 'transparent'
      }} 
      aria-hidden="true" 
    />
  );
}; 