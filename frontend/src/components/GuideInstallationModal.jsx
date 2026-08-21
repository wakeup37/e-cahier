import React, { useState, useEffect } from 'react';

export default function GuideInstallationModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [platform, setPlatform] = useState('unknown');
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(userAgent);
    const isStandalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;

    // Si l'app est déjà installée, on n'affiche rien
    if (isStandalone) return;

    if (isIos) {
      setPlatform('ios');
    } else {
      setPlatform('android');
    }

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Afficher le guide automatiquement après 3 secondes pour la première visite (ou via un bouton d'aide)
    const timer = setTimeout(() => {
      const hasSeenGuide = localStorage.getItem('e_cahier_guide_vu');
      if (!hasSeenGuide) {
        setIsOpen(true);
      }
    }, 3000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      clearTimeout(timer);
    };
  }, []);

  const handleNativeInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setIsOpen(false);
      }
    }
  };

  const closeModal = () => {
    setIsOpen(false);
    localStorage.setItem('e_cahier_guide_vu', 'true');
  };

  if (!isOpen) {
    // Petit bouton flottant discret pour rouvrir le guide si besoin
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          backgroundColor: '#4f46e5',
          color: '#ffffff',
          border: 'none',
          borderRadius: '30px',
          padding: '10px 16px',
          fontSize: '14px',
          fontWeight: 'bold',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          cursor: 'pointer',
          zIndex: 9998,
          display: 'flex',
          alignItem: 'center',
          gap: '8px'
        }}
      >
        📱 Installer l'app
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9999,
      padding: '16px',
      fontFamily: 'sans-serif'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        maxWidth: '450px',
        width: '100%',
        padding: '24px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
        position: 'relative',
        color: '#1e293b'
      }}>
        <button
          onClick={closeModal}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'none',
            border: 'none',
            fontSize: '20px',
            cursor: 'pointer',
            color: '#64748b'
          }}
        >
          ✕
        </button>

        <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px', color: '#0f172a' }}>
          Installez E-cahier 🚀
        </h2>
        <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '20px' }}>
          Profitez d'un accès rapide, en plein écran et adapté au mode hors-ligne directement depuis votre écran d'accueil.
        </p>

        {platform === 'ios' ? (
          // Guide pour iPhone / iPad (Safari)
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ background: '#e0e7ff', color: '#4f46e5', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0 }}>1</div>
              <p style={{ fontSize: '14px', margin: 0, paddingTop: '4px' }}>
                Ouvrez cette page dans le navigateur <strong>Safari</strong> (obligatoire sur iOS).
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ background: '#e0e7ff', color: '#4f46e5', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0 }}>2</div>
              <p style={{ fontSize: '14px', margin: 0, paddingTop: '4px' }}>
                Appuyez sur le bouton de <strong>Partage</strong> <span style={{ fontSize: '18px', border: '1px solid #cbd5e1', padding: '2px 6px', borderRadius: '4px' }}>⎋</span> situé en bas de votre écran dans la barre Safari.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ background: '#e0e7ff', color: '#4f46e5', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0 }}>3</div>
              <p style={{ fontSize: '14px', margin: 0, paddingTop: '4px' }}>
                Faites défiler le menu et sélectionnez <strong>« Sur l'écran d'accueil »</strong> ➕.
              </p>
            </div>
          </div>
        ) : (
          // Guide pour Android (Chrome / autres)
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ fontSize: '14px', color: '#334155', lineHeight: '1.5' }}>
              Cliquez simplement sur le bouton ci-dessous pour installer l'application instantanément sur votre téléphone.
            </p>
            {deferredPrompt ? (
              <button
                onClick={handleNativeInstall}
                style={{
                  backgroundColor: '#4f46e5',
                  color: 'white',
                  border: 'none',
                  padding: '12px',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  fontSize: '15px',
                  cursor: 'pointer',
                  width: '100%'
                }}
              >
                Installer l'application maintenant
              </button>
            ) : (
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <p style={{ fontSize: '13px', margin: 0, color: '#475569' }}>
                  Si le bouton automatique n'apparaît pas : appuyez sur le menu (les 3 petits points <strong>⋮</strong> en haut à droite de votre navigateur) puis choisissez <strong>« Installer l'application »</strong> ou <strong>« Ajouter à l'écran d'accueil »</strong>.
                </p>
              </div>
            )}
          </div>
        )}

        <button
          onClick={closeModal}
          style={{
            marginTop: '24px',
            backgroundColor: '#e2e8f0',
            color: '#334155',
            border: 'none',
            padding: '10px',
            borderRadius: '8px',
            fontWeight: '600',
            fontSize: '14px',
            cursor: 'pointer',
            width: '100%'
          }}
        >
          J'ai compris
        </button>
      </div>
    </div>
  );
}