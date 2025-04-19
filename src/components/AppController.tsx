import React, { useState } from 'react';
import { MainLayout, MenuItem } from './MainLayout';
import { Brief } from './Brief';
import { Profile } from './Profile';
import { Messages } from './Messages';
import { Play } from './Play';

export function AppController() {
  const [activeView, setActiveView] = useState<MenuItem>('money');
  const [gameMode, setGameMode] = useState<string | null>(null);

  const handleMenuItemClick = (menuItem: MenuItem) => {
    setActiveView(menuItem);
    if (menuItem === 'play') {
      setGameMode(null);
    }
  };

  const content = (() => {
    switch (activeView) {
      case 'messages':
        return <Messages />;
      case 'money':
        return <Brief />;
      case 'profile':
        return <Profile />;
      case 'play':
        return <Play gameMode={gameMode} setGameMode={setGameMode} />;
      default:
        return <Messages />;
    }
  })();

  return (
    <MainLayout 
      onMenuItemClick={handleMenuItemClick} 
      activeMenuItem={activeView}
    >
      {content}
    </MainLayout>
  );
} 