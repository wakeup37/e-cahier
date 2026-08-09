import React, { useState } from 'react';
import EnseignantDashboard from './components/EnseignantDashboard';
import CenseurDashboard from './components/CenseurDashboard';
import ChefEtablissementDashboard from './components/ChefEtablissementDashboard';

export default function Application() {
  const [userRole, setUserRole] = useState(''); // '', 'enseignant', 'censeur', 'chef'

  if (!userRole) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#0f172a', gap: '15px' }}>
        <h2 style={{ color: '#fff', marginBottom: '10px' }}>Connexion à l'Espace</h2>
        <button 
          onClick={() => setUserRole('enseignant')}
          style={{ padding: '12px 24px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '800', cursor: 'pointer', width: '250px' }}
        >
          Espace Enseignant
        </button>
        <button 
          onClick={() => setUserRole('censeur')}
          style={{ padding: '12px 24px', backgroundColor: '#059669', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '800', cursor: 'pointer', width: '250px' }}
        >
          Espace Censeur
        </button>
        <button 
          onClick={() => setUserRole('chef')}
          style={{ padding: '12px 24px', backgroundColor: '#d97706', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '800', cursor: 'pointer', width: '250px' }}
        >
          Espace Chef d'Établissement
        </button>
      </div>
    );
  }

  return (
    <div>
      {userRole === 'enseignant' && <EnseignantDashboard onLogout={() => setUserRole('')} />}
      {userRole === 'censeur' && <CenseurDashboard onLogout={() => setUserRole('')} />}
      {userRole === 'chef' && <ChefEtablissementDashboard onLogout={() => setUserRole('')} />}
    </div>
  );
}
