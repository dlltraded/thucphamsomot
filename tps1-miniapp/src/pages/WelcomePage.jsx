import React from 'react';
import { useAppStore } from '../stores/appState';

const WelcomePage = () => {
  const setLanguage = useAppStore(state => state.setLanguage);

  return (
    <div className="welcome-page" style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
      <div 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: 'url(https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1000&auto=format&fit=crop)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          zIndex: 0
        }}
      >
        {/* Dark overlay for better text readability */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.65)'
        }}></div>
      </div>

      <div 
        style={{ 
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh', 
          position: 'relative', 
          zIndex: 1, 
          padding: '32px' 
        }}
      >
        <div style={{ marginBottom: '40px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <img 
            src="./logo.png" 
            alt="TPS1 Logo" 
            style={{ width: '120px', height: '120px', objectFit: 'contain', marginBottom: '24px' }}
          />
          <div style={{ color: '#fff', fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>
            Welcome to TPS1
          </div>
          <div style={{ color: '#ddd', fontSize: '16px', textAlign: 'center', lineHeight: '1.5' }}>
            Vui lòng chọn ngôn ngữ để tiếp tục<br/>
            Please select your language to continue
          </div>
        </div>

        <div style={{ width: '100%', maxWidth: '300px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <button 
            onClick={() => setLanguage('vi')}
            style={{ 
              width: '100%',
              background: 'var(--color-primary-gradient)', 
              color: 'white',
              fontSize: '16px', 
              fontWeight: 'bold',
              height: '52px',
              border: 'none',
              borderRadius: 'var(--radius-xl)',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-glow)',
              transition: 'var(--transition-bounce)'
            }}
          >
            🇻🇳 Tiếng Việt
          </button>
          
          <button 
            onClick={() => setLanguage('en')}
            style={{ 
              width: '100%',
              background: 'var(--color-bg-glass)', 
              color: 'var(--color-text)', 
              fontSize: '16px', 
              fontWeight: 'bold',
              height: '52px',
              border: '1px solid rgba(255,255,255,0.8)',
              borderRadius: 'var(--radius-xl)',
              cursor: 'pointer',
              backdropFilter: 'blur(12px)',
              transition: 'var(--transition-bounce)'
            }}
          >
            🇺🇸 English
          </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomePage;
