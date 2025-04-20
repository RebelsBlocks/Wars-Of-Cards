import React, { useEffect, useState } from 'react';

/**
 * Komponent bufora dla gesture area na urządzeniach mobilnych
 * Zapewnia dodatkową przestrzeń na dole ekranu, aby zapobiec
 * zakrywaniu zawartości przez gesture bar (iOS) lub navigation bar (Android)
 * Dodatkowe dostosowanie dla przeglądarki Brave
 */
export const GestureAreaBuffer: React.FC = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isBrave, setIsBrave] = useState(false);

  useEffect(() => {
    // Sprawdź, czy jesteśmy na urządzeniu mobilnym
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    // Sprawdź czy to przeglądarka Brave
    const checkIfBrave = async () => {
      // Brave browser has a specific navigator.brave object
      const isBraveBrowser = (navigator as any).brave !== undefined;
      setIsBrave(isBraveBrowser);
    };

    // Sprawdź przy pierwszym renderowaniu
    checkIfMobile();
    checkIfBrave();

    // Nasłuchuj na zmiany rozmiaru okna
    window.addEventListener('resize', checkIfMobile);
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  if (!isMobile) return null;

  // Użyj większej wysokości dla przeglądarki Brave
  const heightMultiplier = isBrave ? 3 : 1.33;

  return (
    <div 
      style={{
        height: `calc(var(--safe-area-padding-bottom) * ${heightMultiplier})`,
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
