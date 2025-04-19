import { useNearWallet } from '@/contexts/NearWalletContext';
import styles from '../styles/MainLayout.module.css';
import { useState, useEffect } from 'react';
import { useTokenPrices } from '../components/TokenPrices';

export type MenuItem = 'money' | 'profile' | 'messages' | 'play';

export interface MainLayoutProps {
  children?: React.ReactNode;
  onMenuItemClick?: (menuItem: MenuItem) => void;
  activeMenuItem?: MenuItem;
}

export function MainLayout({ 
  children, 
  onMenuItemClick,
  activeMenuItem = 'money'
}: MainLayoutProps) {
  const wallet = useNearWallet();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { nearInUsdc, cransPerNear, isLoading } = useTokenPrices();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth > 768) {
        setIsSidebarOpen(true);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleMenuItemClick = (menuItem: MenuItem) => {
    if (onMenuItemClick) {
      onMenuItemClick(menuItem);
    }
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  };

  return (
    <div className={`${styles.mainContainer} ${isSidebarOpen ? styles.menuOpen : ''}`}>
      {isMobile && (
        <>
          <div className={styles.mobileHeader}>
            <button 
              className={`${styles.menuToggle} ${isSidebarOpen ? styles.active : ''}`}
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              aria-label="Toggle menu"
            >
              <span></span>
              <span></span>
              <span></span>
            </button>
          </div>
        </>
      )}
      
      <div className={`${styles.sidebar} ${isSidebarOpen ? styles.open : ''}`}>
        <div className={styles.logo}>
          <h1>
            <img src="/logo.png" alt="Wars of Cards" className={styles.logoImage} />
          </h1>
        </div>
        
        <nav className={styles.menu}>
          <ul>
            <li 
              className={`${styles.menuItem} ${activeMenuItem === 'money' ? styles.active : ''}`}
              onClick={() => handleMenuItemClick('money')}
              data-menu="brief"
            >
              Chat
            </li>
            <li 
              className={`${styles.menuItem} ${activeMenuItem === 'messages' ? styles.active : ''}`}
              onClick={() => handleMenuItemClick('messages')}
              data-menu="messages"
            >
              Messages
            </li>
            {wallet?.accountId && (
              <>
                <li 
                  className={`${styles.menuItem} ${activeMenuItem === 'profile' ? styles.active : ''}`}
                  onClick={() => handleMenuItemClick('profile')}
                  data-menu="profile"
                >
                  Profile
                </li>
                <li 
                  className={`${styles.menuItem} ${activeMenuItem === 'play' ? styles.active : ''}`}
                  onClick={() => handleMenuItemClick('play')}
                  data-menu="play"
                >
                  Play
                </li>
              </>
            )}
          </ul>
        </nav>

        <div style={{ flex: 1 }}></div>

        {!isLoading && (
          <div className={styles.priceInfo}>
            <div className={styles.priceContainer}>
              <div className={styles.priceItem}>
                <span style={{ 
                  color: '#ffd700', 
                  fontWeight: 'bold',
                  fontSize: '0.85rem',
                  letterSpacing: '0.02em'
                }}>NEAR</span>
                <span style={{ 
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  fontWeight: '500'
                }}>${nearInUsdc}</span>
              </div>
              <div className={styles.priceItem}>
                <span style={{ 
                  color: '#ffd700', 
                  fontWeight: 'bold',
                  fontSize: '0.85rem',
                  letterSpacing: '0.02em'
                }}>CRANS</span>
                <span style={{ 
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  fontWeight: '500'
                }}>{cransPerNear}</span>
              </div>
            </div>
          </div>
        )}

        <div className={styles.socialLinks}>
          <a 
            href="https://x.com/RebelsBlocks" 
            target="_blank" 
            rel="noopener noreferrer"
            className={styles.xLink}
          >
            <img src="/x.png" alt="X (Twitter)" />
          </a>
        </div>
      </div>
      
      <div className={`${styles.content} ${isSidebarOpen ? styles.shifted : ''}`}>
        {children}
      </div>

      {isSidebarOpen && isMobile && (
        <div 
          className={styles.overlay} 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
} 