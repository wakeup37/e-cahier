import React, { useState } from 'react';
import EnseignantDashboard from './EnseignantDashboard';
import CenseurDashboard from './CenseurDashboard';
import ChefEtablissementDashboard from './ChefEtablissementDashboard';

export default function App() {
  const [modeAffichage, setModeAffichage] = useState('accueil'); 
  const [userRole, setUserRole] = useState(''); 
  const [notification, setNotification] = useState('');

  const [formConnexion, setFormConnexion] = useState({ email: '', motDePasse: '' });
  const [formInscription, setFormInscription] = useState({
    nom: '',
    email: '',
    motDePasse: '',
    role: 'enseignant',
    etablissement: '',
    ville: 'Abidjan',
    modePaiement: 'carte',
    numeroPaiement: ''
  });

  const afficherNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 4000);
  };

  const handleConnexion = (e) => {
    e.preventDefault();
    if (!formConnexion.email || !formConnexion.motDePasse) {
      afficherNotification("Veuillez remplir tous les champs de connexion.");
      return;
    }

    if (formConnexion.email.includes('chef') || formConnexion.email.includes('direction')) {
      setUserRole('chef');
    } else if (formConnexion.email.includes('censeur') || formConnexion.email.includes('kone')) {
      setUserRole('censeur');
    } else {
      setUserRole('enseignant');
    }
    afficherNotification("Connexion réussie ! Bienvenue dans votre espace.");
  };

  const handleInscription = (e) => {
    e.preventDefault();
    if (!formInscription.nom || !formInscription.email || !formInscription.motDePasse || !formInscription.etablissement) {
      afficherNotification("Veuillez renseigner tous les champs obligatoires.");
      return;
    }

    if (formInscription.role === 'chef' && !formInscription.numeroPaiement && formInscription.modePaiement !== 'virement') {
      afficherNotification("Veuillez renseigner les informations de paiement pour valider l'abonnement de direction.");
      return;
    }

    afficherNotification(`Compte ${formInscription.role} créé avec succès ! Redirection...`);
    
    setTimeout(() => {
      setUserRole(formInscription.role);
    }, 1500);
  };

  const handleLogout = () => {
    setUserRole('');
    setModeAffichage('accueil');
  };

  return (
    <div style={styles.conteneurGlobal}>
      <style>{`
        * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        
        @keyframes apparition { from { opacity: 0; } to { opacity: 1; } }
        @keyframes glissement { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
        
        .anim-apparition { animation: apparition 0.3s ease-out forwards; }
        .anim-carte { animation: glissement 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

        .bouton-principal {
          background-color: #4f46e5;
          color: #ffffff;
          border: none;
          padding: 12px 20px;
          border-radius: 10px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
          width: 100%;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }
        .bouton-principal:hover {
          background-color: #4338ca;
          transform: translateY(-1px);
        }

        .bouton-secondaire {
          background-color: #f1f5f9;
          color: #334155;
          border: 1px solid #cbd5e1;
          padding: 10px 16px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .bouton-secondaire:hover {
          background-color: #e2e8f0;
          color: #0f172a;
        }

        .champ-saisie {
          width: 100%;
          padding: 10px 14px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          font-size: 13px;
          background-color: #fff;
          color: #1e293b;
          outline: none;
          transition: border-color 0.2s;
        }
        .champ-saisie:focus {
          border-color: #4f46e5;
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.15);
        }

        .carte-auth {
          background: #ffffff;
          padding: 36px;
          border-radius: 16px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
          width: 100%;
          max-width: 460px;
          border: 1px solid #e2e8f0;
        }
      `}</style>

      {notification && (
        <div style={styles.conteneurNotification} className="anim-apparition">
          <div style={styles.texteNotification}>{notification}</div>
        </div>
      )}

      {!userRole && (
        <div style={styles.ecranAuth} className="anim-apparition">
          
          {modeAffichage === 'accueil' && (
            <div style={styles.carteAuth} className="anim-carte">
              <div style={{ fontSize: '38px', marginBottom: '10px', textAlign: 'center' }}>🏫</div>
              <h2 style={styles.titreAuth}>Plateforme Éducative</h2>
              <p style={styles.sousTitreAuth}>Gestion intelligente et sécurisée des établissements</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px' }}>
                <button onClick={() => setModeAffichage('connexion')} className="bouton-principal">
                  🔐 Se connecter à mon compte
                </button>
                <button onClick={() => setModeAffichage('inscription')} className="bouton-secondaire" style={{ width: '100%', textAlign: 'center' }}>
                  📝 Créer un nouveau compte
                </button>
              </div>
            </div>
          )}

          {modeAffichage === 'connexion' && (
            <div style={styles.carteAuth} className="anim-carte">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ margin: 0, fontSize: '20px', color: '#0f172a' }}>Connexion</h2>
                <button onClick={() => setModeAffichage('accueil')} style={styles.lienRetour}>← Retour</button>
              </div>

              <form onSubmit={handleConnexion} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={styles.libelle}>Adresse e-mail</label>
                  <input type="email" placeholder="votre.email@ecole.edu" value={formConnexion.email} onChange={e => setFormConnexion({...formConnexion, email: e.target.value})} className="champ-saisie" required />
                </div>
                <div>
                  <label style={styles.libelle}>Mot de passe</label>
                  <input type="password" placeholder="••••••••" value={formConnexion.motDePasse} onChange={e => setFormConnexion({...formConnexion, motDePasse: e.target.value})} className="champ-saisie" required />
                </div>
                <button type="submit" className="bouton-principal" style={{ marginTop: '10px' }}>Se connecter</button>
              </form>
            </div>
          )}

          {modeAffichage === 'inscription' && (
            <div style={{ ...styles.carteAuth, maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' }} className="anim-carte">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ margin: 0, fontSize: '20px', color: '#0f172a' }}>Création de Compte</h2>
                <button onClick={() => setModeAffichage('accueil')} style={styles.lienRetour}>← Retour</button>
              </div>

              <form onSubmit={handleInscription} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={styles.libelle}>Sélectionnez votre rôle</label>
                  <select value={formInscription.role} onChange={e => setFormInscription({...formInscription, role: e.target.value})} className="champ-saisie">
                    <option value="enseignant">Enseignant</option>
                    <option value="censeur">Censeur / Superviseur</option>
                    <option value="chef">Chef d'Établissement (Abonnement direction)</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={styles.libelle}>Nom complet</label>
                    <input type="text" placeholder="M. Kouassi..." value={formInscription.nom} onChange={e => setFormInscription({...formInscription, nom: e.target.value})} className="champ-saisie" required />
                  </div>
                  <div>
                    <label style={styles.libelle}>Ville</label>
                    <input type="text" placeholder="Abidjan" value={formInscription.ville} onChange={e => setFormInscription({...formInscription, ville: e.target.value})} className="champ-saisie" required />
                  </div>
                </div>

                <div>
                  <label style={styles.libelle}>Nom de l'établissement</label>
                  <input type="text" placeholder="Lycée ou Collège..." value={formInscription.etablissement} onChange={e => setFormInscription({...formInscription, etablissement: e.target.value})} className="champ-saisie" required />
                </div>

                <div>
                  <label style={styles.libelle}>Adresse e-mail</label>
                  <input type="email" placeholder="email@etablissement.edu" value={formInscription.email} onChange={e => setFormInscription({...formInscription, email: e.target.value})} className="champ-saisie" required />
                </div>

                <div>
                  <label style={styles.libelle}>Mot de passe sécurisé</label>
                  <input type="password" placeholder="••••••••" value={formInscription.motDePasse} onChange={e => setFormInscription({...formInscription, motDePasse: e.target.value})} className="champ-saisie" required />
                </div>

                {formInscription.role === 'chef' && (
                  <div style={styles.sectionPaiement}>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#1e293b' }}>💳 Espace Paiement Sécurisé (Abonnement Établissement)</h4>
                    <p style={{ fontSize: '11px', color: '#64748b', margin: '0 0 10px 0' }}>L'accès directionnel requiert un abonnement institutionnel actif.</p>

                    <div style={{ marginBottom: '10px' }}>
                      <label style={styles.libelle}>Mode de paiement</label>
                      <select value={formInscription.modePaiement} onChange={e => setFormInscription({...formInscription, modePaiement: e.target.value})} className="champ-saisie">
                        <option value="carte">Carte Bancaire (Visa / Mastercard)</option>
                        <option value="mobile">Mobile Money (Orange, MTN, Moov, Wave)</option>
                        <option value="paypal">PayPal</option>
                        <option value="virement">Virement Bancaire institutionnel</option>
                      </select>
                    </div>

                    {formInscription.modePaiement !== 'virement' && (
                      <div>
                        <label style={styles.libelle}>{formInscription.modePaiement === 'carte' ? 'Numéro de carte (16 chiffres)' : 'Numéro de compte / téléphone mobile'}</label>
                        <input type="text" placeholder={formInscription.modePaiement === 'carte' ? '4532 •••• •••• ••••' : '+225 07 00 00 00 00'} value={formInscription.numeroPaiement} onChange={e => setFormInscription({...formInscription, numeroPaiement: e.target.value})} className="champ-saisie" required />
                      </div>
                    )}
                  </div>
                )}

                <button type="submit" className="bouton-principal" style={{ marginTop: '10px' }}>
                  {formInscription.role === 'chef' ? 'Valider le paiement & Créer le compte' : 'Créer mon compte'}
                </button>
              </form>
            </div>
          )}

        </div>
      )}

      {userRole === 'enseignant' && (
        <div className="anim-apparition">
          <div style={styles.barreNavigation}>
            <span style={styles.texteNav}>Session active : <strong>Espace Enseignant</strong></span>
            <button style={styles.boutonDeconnexion} onClick={handleLogout}>Déconnexion</button>
          </div>
          <EnseignantDashboard />
        </div>
      )}

      {userRole === 'censeur' && (
        <div className="anim-apparition">
          <div style={styles.barreNavigation}>
            <span style={styles.texteNav}>Session active : <strong>Poste de Commandement Censeur</strong></span>
            <button style={styles.boutonDeconnexion} onClick={handleLogout}>Déconnexion</button>
          </div>
          <CenseurDashboard />
        </div>
      )}

      {userRole === 'chef' && (
        <div className="anim-apparition">
          <div style={styles.barreNavigation}>
            <span style={styles.texteNav}>Session active : <strong>Chef d'Établissement (Direction)</strong></span>
            <button style={styles.boutonDeconnexion} onClick={handleLogout}>Déconnexion</button>
          </div>
          <ChefEtablissementDashboard />
        </div>
      )}
    </div>
  );
}

const styles = {
  conteneurGlobal: { minHeight: '100vh', backgroundColor: '#f1f5f9', position: 'relative' },
  ecranAuth: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', padding: '20px' },
  titreAuth: { fontSize: '22px', fontWeight: '700', color: '#0f172a', textAlign: 'center', marginBottom: '6px' },
  sousTitreAuth: { fontSize: '13px', color: '#64748b', textAlign: 'center', marginBottom: '20px' },
  lienRetour: { background: 'none', border: 'none', color: '#4f46e5', fontWeight: '600', fontSize: '13px', cursor: 'pointer' },
  libelle: { display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' },
  sectionPaiement: { backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '14px', marginTop: '6px' },
  conteneurNotification: { position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 9999 },
  texteNotification: { backgroundColor: '#1e293b', color: '#f8fafc', padding: '14px 22px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', border: '1px solid #334155' },
  barreNavigation: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0f172a', color: '#ffffff', padding: '12px 30px', fontSize: '13px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
  texteNav: { fontWeight: '400' },
  boutonDeconnexion: { background: '#ef4444', color: '#ffffff', border: 'none', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '12px', transition: 'background 0.2s' },
};
