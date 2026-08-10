import React from 'react';

export default function Application({ onLogin }) {
  return (
    <div style={styles.ecranAuth}>
      <div style={styles.carteAuth}>
        <span style={{ fontSize: '40px' }}>📚</span>
        <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: '12px 0 8px 0' }}>
          Bienvenue sur E-cahier !
        </h2>
        <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px' }}>
          Veuillez sélectionner votre profil pour vous connecter.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button 
            type="button" 
            style={{ ...styles.bouton, backgroundColor: '#2563eb' }} 
            onClick={() => onLogin('enseignant')}
          >
            👨‍🏫 Espace Enseignant
          </button>
          
          <button 
            type="button" 
            style={{ ...styles.bouton, backgroundColor: '#16a34a' }} 
            onClick={() => onLogin('censeur')}
          >
            📋 Espace Censeur
          </button>
          
          <button 
            type="button" 
            style={{ ...styles.bouton, backgroundColor: '#9333ea' }} 
            onClick={() => onLogin('chef')}
          >
            🏫 Espace Chef d'Établissement
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  ecranAuth: { 
    display: 'flex', 
    flexDirection: 'column', 
    justifyContent: 'center', 
    alignItems: 'center', 
    minHeight: '100vh', 
    padding: '30px 20px', 
    backgroundColor: '#f8fafc' 
  },
  carteAuth: { 
    background: '#ffffff', 
    padding: '40px', 
    borderRadius: '16px', 
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08)', 
    border: '1px solid #e2e8f0', 
    width: '100%', 
    maxWidth: '420px', 
    textAlign: 'center' 
  },
  bouton: { 
    color: '#ffffff', 
    border: 'none', 
    padding: '14px 20px', 
    borderRadius: '8px', 
    fontWeight: '600', 
    fontSize: '15px', 
    cursor: 'pointer', 
    width: '100%',
    transition: 'opacity 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px'
  }
};
