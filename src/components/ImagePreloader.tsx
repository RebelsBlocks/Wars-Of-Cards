import React, { useEffect } from 'react';

// Lista obrazów do preładowania
const imagesToPreload = [
  '/card_back.png',
  '/card_front.png',
  '/card_joker_front.png',
  '/YOU_WON_THE_WAR.png',
  '/YOU_LOST_THE_WAR.png',
  '/Profile_back.png',
  '/logo_load.png',
  '/logo_transparent.png',
  '/Play.png',
  '/Messages.png',
  '/Brief.png',
  '/Profile.png',
  '/newwarorder.png',
  '/blackjack.png',
  '/mobilethemelogo.png'
];

const ImagePreloader = () => {
  useEffect(() => {
    // Licznik załadowanych obrazów
    let loadedCount = 0;
    const totalImages = imagesToPreload.length;

    // Preładuj wszystkie obrazy w tle
    imagesToPreload.forEach(src => {
      const img = new Image();
      
      // Dodaj event listenery dla monitorowania
      img.onload = () => {
        loadedCount++;
        if (process.env.NODE_ENV === 'development') {
          console.log(`[Preloader] Loaded ${loadedCount}/${totalImages}: ${src}`);
        }
        if (loadedCount === totalImages) {
          if (process.env.NODE_ENV === 'development') {
            console.log('[Preloader] All images preloaded successfully!');
          }
        }
      };
      
      img.onerror = () => {
        loadedCount++;
        if (process.env.NODE_ENV === 'development') {
          console.error(`[Preloader] Failed to load image: ${src}`);
        }
      };
      
      // Rozpocznij ładowanie obrazu
      img.src = src;
    });
  }, []);

  // Komponent nie renderuje niczego
  return null;
};

export default ImagePreloader; 
