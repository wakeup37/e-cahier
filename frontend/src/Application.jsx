import React, { useState, useEffect } from 'react';
import EnseignantDashboard from './components/EnseignantDashboard';
import CenseurDashboard from './components/CenseurDashboard';
import ChefEtablissementDashboard from './components/ChefEtablissementDashboard';

export default function Application() {
  const [userRole, setUserRole] = useState(''); // '', 'enseignant', 'censeur', 'chef'
  const [authContext, setAuthContext] = useState(''); // 'connexion' ou 'inscription'
  const [notification, setNotification] = useState('');
  const [estEnLigne, setEstEnLigne] = useState(navigator.onLine);

  // Gestion de l'affichage de l'accueil ('connexion' ou 'inscription')
  const [modeAccueil, setModeAccueil] = useState('connexion');

  // --- ÉTAPE SUPPLÉMENTAIRE : CHOIX DE L'ÉCOLE POUR LE CHEF ---
  const [etapeChefEcole, setEtapeChefEcole] = useState(false);
  const [choixModeEcole, setChoixModeEcole] = useState('choix'); // 'choix', 'creer', 'rejoindre', 'paiement', 'oublie_code'
  
  // Champs pour la création avec le code officiel du Ministère
  const [formNouvelleEcole, setFormNouvelleEcole] = useState({
    nomEcole: '',
    codeMinistere: '',
    ville: '',
    commune: '',
    quartier: '',
    typeEtablissement: 'Public' // 'Public' (30 000 FCFA) ou 'Privé' (50 000 FCFA)
  });

  // Mode de paiement sélectionné
  const [moyenPaiement, setMoyenPaiement] = useState('wave');

  // Champ pour se connecter à un établissement existant via son code officiel ou son nom
  const [codeOuNomRejoins, setCodeOuNomRejoins] = useState('');

  // Formulaire de connexion
  const [formConnexion, setFormConnexion] = useState({ 
    email: '', 
    motDePasse: '',
    roleAttendu: 'enseignant'
  });
  
  // Formulaire d'inscription complet avec toutes les civilités
  const [formInscription, setFormInscription] = useState({
    civilite: 'M.',
    role: 'enseignant', 
    nom: '',
    prenoms: '',
    dateNaissance: '',
    telephone: '',
    ville: '',
    anciennete: '1 à 5 ans',
    matiere: '',
    secteurEnseignement: 'Public',
    typeStatutPublic: 'Titulaire',
    numeroMatricule: '',
    email: '',
    motDePasse: ''
  });

  // --- DONNÉES GLOBALES ---
  const [demandesAffiliationEnseignants, setDemandesAffiliationEnseignants] = useState(() => {
    try { return JSON.parse(localStorage.getItem('app_demandes_affiliation')) || []; } catch { return []; }
  });

  const [seancesEnseignants, setSeancesEnseignants] = useState(() => {
    try { return JSON.parse(localStorage.getItem('app_seances_enseignants')) || []; } catch { return []; }
  });

  const [bibliothequeFiches, setBibliothequeFiches] = useState(() => {
    try { return JSON.parse(localStorage.getItem('app_bibliotheque_fiches')) || []; } catch { return []; }
  });

  const [enseignantsSansFiche] = useState([
    { id: 201, enseignantNom: 'M. Yao Koffi', matiere: 'Histoire-Géographie', niveau: '2nde', classe: '2nde A', email: 'koffi.yao@prof.edu', derniereFiche: '2026-02-18' }
  ]);

  useEffect(() => {
    const gererEnLigne = () => { setEstEnLigne(true); afficherNotification("Connexion Internet rétablie."); };
    const gererHorsLigne = () => { setEstEnLigne(false); afficherNotification("⚠️ Mode hors ligne activé."); };

    window.addEventListener('online', gererEnLigne);
    window.addEventListener('offline', gererHorsLigne);
    return () => { window.removeEventListener('online', gererEnLigne); window.removeEventListener('offline', gererHorsLigne); };
  }, []);

  useEffect(() => { localStorage.setItem('app_demandes_affiliation', JSON.stringify(demandesAffiliationEnseignants)); }, [demandesAffiliationEnseignants]);
  useEffect(() => { localStorage.setItem('app_seances_enseignants', JSON.stringify(seancesEnseignants)); }, [seancesEnseignants]);
  useEffect(() => { localStorage.setItem('app_bibliotheque_fiches', JSON.stringify(bibliothequeFiches)); }, [bibliothequeFiches]);

  const afficherNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 4000);
  };

  // --- ACTIONS D'AUTHENTIFICATION ---
  const handleConnexion = (e) => {
    e.preventDefault();
    if (!formConnexion.email || !formConnexion.motDePasse) {
      afficherNotification("Veuillez remplir vos identifiants.");
      return;
    }
    
    localStorage.setItem('app_enseignant_statut', 'actif');
    setAuthContext('connexion'); 

    if (formConnexion.roleAttendu === 'chef') {
      setEtapeChefEcole(true);
      return;
    }

    afficherNotification("Connexion réussie ! Redirection vers vos classes...");
    setTimeout(() => setUserRole(formConnexion.roleAttendu), 400);
  };

  const handleInscription = (e) => {
    e.preventDefault();
    if (!formInscription.nom || !formInscription.email || !formInscription.motDePasse) {
      afficherNotification("Veuillez renseigner tous les champs obligatoires.");
      return;
    }
    if (formInscription.secteurEnseignement === 'Public' && formInscription.typeStatutPublic === 'Titulaire' && !formInscription.numeroMatricule.trim()) {
      afficherNotification("❌ Veuillez renseigner votre numéro matricule.");
      return;
    }
    
    localStorage.setItem('app_enseignant_statut', 'nouveau');
    setAuthContext('inscription');

    if (formInscription.role === 'chef') {
      setEtapeChefEcole(true);
      return;
    }

    afficherNotification("Compte créé avec succès ! Procédez à l'affiliation.");
    setTimeout(() => setUserRole(formInscription.role), 600);
  };

  const preparerPaiementCodeEcole = (e) => {
    e.preventDefault();
    if (!formNouvelleEcole.nomEcole.trim() || !formNouvelleEcole.codeMinistere.trim() || !formNouvelleEcole.ville.trim() || !formNouvelleEcole.commune.trim()) {
      afficherNotification("⚠️ Veuillez remplir tous les champs obligatoires.");
      return;
    }
    setChoixModeEcole('paiement');
  };

  const validerPaiementEtFinaliserEcole = () => {
    const montant = formNouvelleEcole.typeEtablissement === 'Privé' ? '50 000 FCFA' : '30 000 FCFA';

    const configEcole = {
      nomEcole: formNouvelleEcole.nomEcole.trim(),
      codeEtablissement: formNouvelleEcole.codeMinistere.trim().toUpperCase(),
      ville: formNouvelleEcole.ville.trim(),
      commune: formNouvelleEcole.commune.trim(),
      quartier: formNouvelleEcole.quartier.trim(),
      typeEtablissement: formNouvelleEcole.typeEtablissement,
      anneeScolaire: '2025-2026',
      anneeOuverte: true
    };

    localStorage.setItem('app_chef_ecole_config', JSON.stringify(configEcole));
    setEtapeChefEcole(false);
    afficherNotification(`💳 Paiement de ${montant} validé via ${moyenPaiement.toUpperCase()} ! Établissement enregistré.`);
    setUserRole('chef');
  };

  const validerConnexionEcoleExistante = (e) => {
    e.preventDefault();
    if (!codeOuNomRejoins.trim()) {
      afficherNotification("⚠️ Veuillez entrer le code officiel du Ministère ou le nom de l'établissement.");
      return;
    }

    const configEcole = {
      nomEcole: codeOuNomRejoins.trim(),
      codeEtablissement: codeOuNomRejoins.trim().toUpperCase(),
      ville: 'Inconnue',
      commune: 'Inconnue',
      quartier: '',
      typeEtablissement: 'Public',
      anneeScolaire: '2025-2026',
      anneeOuverte: true
    };

    localStorage.setItem('app_chef_ecole_config', JSON.stringify(configEcole));
    setEtapeChefEcole(false);
    afficherNotification("🔗 Connexion à l'établissement réussie via le code officiel !");
    setUserRole('chef');
  };

  const handleLogout = () => {
    setUserRole('');
    setAuthContext('');
    setEtapeChefEcole(false);
    setChoixModeEcole('choix');
    setFormNouvelleEcole({ nomEcole: '', codeMinistere: '', ville: '', commune: '', quartier: '', typeEtablissement: 'Public' });
    setCodeOuNomRejoins('');
    localStorage.removeItem('app_enseignant_statut');
    setFormConnexion({ email: '', motDePasse: '', roleAttendu: 'enseignant' });
  };

  return (
    <div style={styles.conteneurGlobal}>
      <style>{`
        * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        @keyframes apparition { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .anim-apparition { animation: apparition 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        
        .bouton-principal { background-color: #2563eb; color: #ffffff; border: none; padding: 12px 20px; border-radius: 12px; font-weight: 700; font-size: 14px; cursor: pointer; transition: all 0.2s ease; width: 100%; box-shadow: 0 4px 12px rgba(37,99,235,0.2); }
        .bouton-principal:hover { background-color: #1d4ed8; transform: translateY(-1px); }
        
        .bouton-inscription { background-color: #16a34a; color: #ffffff; border: none; padding: 12px 20px; border-radius: 12px; font-weight: 700; font-size: 14px; cursor: pointer; transition: all 0.2s ease; width: 100%; box-shadow: 0 4px 12px rgba(22,163,74,0.2); }
        .bouton-inscription:hover { background-color: #15803d; transform: translateY(-1px); }
        
        .champ-saisie { width: 100%; padding: 12px 14px; border-radius: 12px; border: 1px solid #cbd5e1; font-size: 13px; background-color: #f8fafc; color: #1e293b; outline: none; transition: all 0.2s; box-sizing: border-box; }
        .champ-saisie:focus { border-color: #2563eb; background-color: #ffffff; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15); }
        
        .carte-auth { background: #ffffff; padding: 40px; border-radius: 24px; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.06); border: 1px solid #e2e8f0; width: 100%; max-width: 520px; }
        .libelle { display: block; font-size: 11px; font-weight: 800; color: #475569; margin-bottom: 6px; text-transform: uppercase; }
        
        .onglet-btn { flex: 1; padding: 12px; font-size: 14px; font-weight: 800; background: #f8fafc; border: none; cursor: pointer; transition: all 0.2s; color: #64748b; }
        .onglet-btn.actif { background: #ffffff; color: #2563eb; border-bottom: 3px solid #2563eb; }

        .option-paiement { display: flex; align-items: center; gap: 12px; padding: 14px; border: 2px solid #cbd5e1; border-radius: 12px; cursor: pointer; transition: all 0.2s; background: #fff; }
        .option-paiement.selectionne { border-color: #2563eb; background: #eff6ff; }
      `}</style>

      {!estEnLigne && <div style={styles.bandeauHorsLigne}>⚠️ Mode hors ligne actif. Sauvegarde locale activée.</div>}
      {notification && <div style={styles.conteneurNotification}><div style={styles.texteNotification}>{notification}</div></div>}

      {/* --- ÉCRAN INTERMÉDIAIRE POUR LE CHEF D'ÉTABLISSEMENT --- */}
      {etapeChefEcole && (
        <div style={styles.ecranAuth} className="anim-apparition">
          <div className="carte-auth" style={{ textAlign: 'center', position: 'relative' }}>
            
            <button
              type="button"
              onClick={() => {
                setEtapeChefEcole(false);
                setChoixModeEcole('choix');
              }}
              style={{
                position: 'absolute',
                top: '20px',
                left: '20px',
                background: '#f1f5f9',
                border: 'none',
                color: '#475569',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
            >
              ← Retour
            </button>

            <div style={{ width: '64px', height: '64px', background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '30px', margin: '20px auto 16px auto', boxShadow: '0 10px 20px rgba(37,99,235,0.3)' }}>
              🏫
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: '900', color: '#0f172a', margin: '0 0 8px 0' }}>Espace Chef d'Établissement</h2>
            <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '24px', lineHeight: '1.5' }}>Renseignez le code officiel de votre établissement (Ministère) pour vous connecter ou créer votre espace.</p>

            {choixModeEcole === 'choix' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button type="button" className="bouton-principal" onClick={() => setChoixModeEcole('creer')}>
                  ➕ Enregistrer un nouvel établissement
                </button>
                <button type="button" className="bouton-inscription" onClick={() => setChoixModeEcole('rejoindre')}>
                  🔗 Se connecter avec le code officiel
                </button>
              </div>
            )}

            {choixModeEcole === 'creer' && (
              <form onSubmit={preparerPaiementCodeEcole} style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left' }}>
                <div>
                  <label className="libelle">Type d'établissement</label>
                  <select value={formNouvelleEcole.typeEtablissement} onChange={e => setFormNouvelleEcole({...formNouvelleEcole, typeEtablissement: e.target.value})} className="champ-saisie">
                    <option value="Public">Établissement Public (30 000 FCFA)</option>
                    <option value="Privé">Établissement Privé (50 000 FCFA)</option>
                  </select>
                </div>
                <div>
                  <label className="libelle">Nom de l'école</label>
                  <input type="text" placeholder="Ex: Lycée Moderne..." value={formNouvelleEcole.nomEcole} onChange={e => setFormNouvelleEcole({...formNouvelleEcole, nomEcole: e.target.value})} className="champ-saisie" required />
                </div>
                <div>
                  <label className="libelle">Code d'établissement officiel (Ministère)</label>
                  <input type="text" placeholder="Ex: Code officiel Ministère..." value={formNouvelleEcole.codeMinistere} onChange={e => setFormNouvelleEcole({...formNouvelleEcole, codeMinistere: e.target.value})} className="champ-saisie" required />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label className="libelle">Ville</label>
                    <input type="text" placeholder="Ex: Abidjan" value={formNouvelleEcole.ville} onChange={e => setFormNouvelleEcole({...formNouvelleEcole, ville: e.target.value})} className="champ-saisie" required />
                  </div>
                  <div>
                    <label className="libelle">Commune</label>
                    <input type="text" placeholder="Ex: Cocody" value={formNouvelleEcole.commune} onChange={e => setFormNouvelleEcole({...formNouvelleEcole, commune: e.target.value})} className="champ-saisie" required />
                  </div>
                </div>
                <div>
                  <label className="libelle">Quartier (Facultatif)</label>
                  <input type="text" placeholder="Ex: Deux Plateaux" value={formNouvelleEcole.quartier} onChange={e => setFormNouvelleEcole({...formNouvelleEcole, quartier: e.target.value})} className="champ-saisie" />
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                  <button type="button" style={{ background: '#64748b', color: '#fff', border: 'none', padding: '10px', flex: 1, borderRadius: '12px', cursor: 'pointer' }} onClick={() => setChoixModeEcole('choix')}>Retour</button>
                  <button type="submit" className="bouton-principal" style={{ flex: 2 }}>Procéder au paiement</button>
                </div>
              </form>
            )}

            {choixModeEcole === 'paiement' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'left', backgroundColor: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px solid #cbd5e1' }}>
                <h3 style={{ fontSize: '15px', color: '#0f172a', margin: 0, textAlign: 'center', fontWeight: '800' }}>💳 Choix du mode de paiement</h3>
                <p style={{ fontSize: '13px', color: '#475569', margin: 0, textAlign: 'center' }}>
                  Montant à régler : <strong style={{ color: '#2563eb' }}>{formNouvelleEcole.typeEtablissement === 'Privé' ? '50 000 FCFA' : '30 000 FCFA'}</strong>
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                  <div className={`option-paiement ${moyenPaiement === 'wave' ? 'selectionne' : ''}`} onClick={() => setMoyenPaiement('wave')}>
                    <span style={{ fontSize: '20px' }}>🔵</span>
                    <div style={{ flex: 1 }}>
                      <strong style={{ fontSize: '13px', color: '#0f172a' }}>Wave</strong>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>Paiement instantané via application Wave</div>
                    </div>
                  </div>

                  <div className={`option-paiement ${moyenPaiement === 'orange' ? 'selectionne' : ''}`} onClick={() => setMoyenPaiement('orange')}>
                    <span style={{ fontSize: '20px' }}>🟠</span>
                    <div style={{ flex: 1 }}>
                      <strong style={{ fontSize: '13px', color: '#0f172a' }}>Orange Money</strong>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>Application Orange Money</div>
                    </div>
                  </div>

                  <div className={`option-paiement ${moyenPaiement === 'mtn' ? 'selectionne' : ''}`} onClick={() => setMoyenPaiement('mtn')}>
                    <span style={{ fontSize: '20px' }}>🟡</span>
                    <div style={{ flex: 1 }}>
                      <strong style={{ fontSize: '13px', color: '#0f172a' }}>MTN MoMo</strong>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>Application MoMo</div>
                    </div>
                  </div>

                  <div className={`option-paiement ${moyenPaiement === 'carte' ? 'selectionne' : ''}`} onClick={() => setMoyenPaiement('carte')}>
                    <span style={{ fontSize: '20px' }}>💳</span>
                    <div style={{ flex: 1 }}>
                      <strong style={{ fontSize: '13px', color: '#0f172a' }}>Carte Bancaire</strong>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>Paiement sécurisé en ligne</div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button type="button" style={{ background: '#64748b', color: '#fff', border: 'none', padding: '10px', flex: 1, borderRadius: '12px', cursor: 'pointer' }} onClick={() => setChoixModeEcole('creer')}>Retour</button>
                  <button type="button" className="bouton-inscription" style={{ flex: 2 }} onClick={validerPaiementEtFinaliserEcole}>Payer et Activer</button>
                </div>
              </div>
            )}

            {choixModeEcole === 'rejoindre' && (
              <form onSubmit={validerConnexionEcoleExistante} style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left' }}>
                <div>
                  <label className="libelle">Code officiel du Ministère ou Nom</label>
                  <input type="text" placeholder="Entrez le code officiel..." value={codeOuNomRejoins} onChange={e => setCodeOuNomRejoins(e.target.value)} className="champ-saisie" required />
                  
                  {/* AJOUT : BOUTON MOT DE PASSE D'ÉTABLISSEMENT OUBLIÉ */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                    <button 
                      type="button" 
                      onClick={() => setChoixModeEcole('oublie_code')} 
                      style={{ background: 'none', border: 'none', color: '#ea580c', fontSize: '12px', fontWeight: '800', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                    >
                      Mot de passe d'établissement oublié ?
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="button" style={{ background: '#64748b', color: '#fff', border: 'none', padding: '10px', flex: 1, borderRadius: '12px', cursor: 'pointer' }} onClick={() => setChoixModeEcole('choix')}>Retour</button>
                  <button type="submit" className="bouton-inscription" style={{ flex: 2 }}>Se connecter</button>
                </div>
              </form>
            )}

            {/* AJOUT : FORMULAIRE DE RÉCUPÉRATION DU CODE D'ÉTABLISSEMENT */}
            {choixModeEcole === 'oublie_code' && (
              <form 
                onSubmit={(e) => { 
                  e.preventDefault(); 
                  afficherNotification("📩 Instructions envoyées à votre e-mail !"); 
                  setChoixModeEcole('rejoindre'); 
                }} 
                style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left' }}
              >
                <div>
                  <label className="libelle">Email institutionnel de récupération</label>
                  <input type="email" placeholder="Entrez votre email..." className="champ-saisie" required />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="button" style={{ background: '#64748b', color: '#fff', border: 'none', padding: '10px', flex: 1, borderRadius: '12px', cursor: 'pointer' }} onClick={() => setChoixModeEcole('rejoindre')}>Retour</button>
                  <button type="submit" className="bouton-principal" style={{ flex: 2 }}>Réinitialiser</button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

      {/* --- ÉCRAN DE CONNEXION / INSCRIPTION STANDARD --- */}
      {!userRole && !etapeChefEcole && (
        <div style={styles.ecranAuth} className="anim-apparition">
          
          <div style={{ textAlign: 'center', marginBottom: '24px', width: '100%' }}>
            <div style={{ width: '64px', height: '64px', background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '30px', margin: '0 auto 16px auto', boxShadow: '0 10px 20px rgba(37,99,235,0.3)' }}>
              📖
            </div>
            <h1 style={{ fontSize: '26px', fontWeight: '900', color: '#0f172a', margin: '0 0 4px 0' }}>E-cahier !</h1>
            <p style={{ color: '#64748b', fontSize: '14px' }}>L'espace collaboratif de votre établissement</p>
          </div>

          <div className="carte-auth">
            <div style={{ display: 'flex', borderRadius: '12px', overflow: 'hidden', border: '1px solid #cbd5e1', marginBottom: '24px' }}>
              <button 
                type="button" 
                className={`onglet-btn ${modeAccueil === 'connexion' ? 'actif' : ''}`}
                onClick={() => setModeAccueil('connexion')}
              >
                🔑 Se connecter
              </button>
              <button 
                type="button" 
                className={`onglet-btn ${modeAccueil === 'inscription' ? 'actif' : ''}`}
                onClick={() => setModeAccueil('inscription')}
              >
                ✨ Créer un compte
              </button>
            </div>

            {modeAccueil === 'connexion' && (
              <form onSubmit={handleConnexion} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} className="anim-apparition">
                <div>
                  <label className="libelle">Rôle attendu</label>
                  <select value={formConnexion.roleAttendu} onChange={e => setFormConnexion({...formConnexion, roleAttendu: e.target.value})} className="champ-saisie">
                    <option value="enseignant">Enseignant</option>
                    <option value="censeur">Censeur</option>
                    <option value="chef">Chef d'établissement</option>
                  </select>
                </div>
                <div>
                  <label className="libelle">Adresse e-mail</label>
                  <input type="email" placeholder="votre.email@ecole.edu" value={formConnexion.email} onChange={e => setFormConnexion({...formConnexion, email: e.target.value})} className="champ-saisie" required />
                </div>
                <div>
                  <label className="libelle">Mot de passe</label>
                  <input type="password" placeholder="••••••••" value={formConnexion.motDePasse} onChange={e => setFormConnexion({...formConnexion, motDePasse: e.target.value})} className="champ-saisie" required />
                  
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                    <button
                      type="button"
                      onClick={() => afficherNotification("Lien de réinitialisation envoyé à votre e-mail (simulation).")}
                      style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '12px', fontWeight: '700', cursor: 'pointer', padding: 0 }}
                    >
                      Mot de passe oublié ?
                    </button>
                  </div>
                </div>
                <button type="submit" className="bouton-principal" style={{ marginTop: '8px' }}>Connexion sécurisée</button>
              </form>
            )}

            {modeAccueil === 'inscription' && (
              <form onSubmit={handleInscription} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }} className="anim-apparition">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
                  <div>
                    <label className="libelle">Civilité</label>
                    <select value={formInscription.civilite} onChange={e => setFormInscription({...formInscription, civilite: e.target.value})} className="champ-saisie">
                      <option value="M.">M.</option>
                      <option value="Mme">Mme</option>
                      <option value="Dr">Dr</option>
                      <option value="Pr">Pr</option>
                    </select>
                  </div>
                  <div>
                    <label className="libelle">Rôle</label>
                    <select value={formInscription.role} onChange={e => setFormInscription({...formInscription, role: e.target.value})} className="champ-saisie">
                      <option value="enseignant">Enseignant</option>
                      <option value="censeur">Censeur</option>
                      <option value="chef">Chef d'établissement</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label className="libelle">Nom</label>
                    <input type="text" placeholder="Ex: Kouassi" value={formInscription.nom} onChange={e => setFormInscription({...formInscription, nom: e.target.value})} className="champ-saisie" required />
                  </div>
                  <div>
                    <label className="libelle">Prénoms</label>
                    <input type="text" placeholder="Ex: Jean" value={formInscription.prenoms} onChange={e => setFormInscription({...formInscription, prenoms: e.target.value})} className="champ-saisie" required />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label className="libelle">Date de naissance</label>
                    <input type="date" value={formInscription.dateNaissance} onChange={e => setFormInscription({...formInscription, dateNaissance: e.target.value})} className="champ-saisie" required />
                  </div>
                  <div>
                    <label className="libelle">Téléphone</label>
                    <input type="text" placeholder="+225..." value={formInscription.telephone} onChange={e => setFormInscription({...formInscription, telephone: e.target.value})} className="champ-saisie" required />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label className="libelle">Matière</label>
                    <input type="text" placeholder="Ex: Mathématiques..." value={formInscription.matiere} onChange={e => setFormInscription({...formInscription, matiere: e.target.value})} className="champ-saisie" required />
                  </div>
                  <div>
                    <label className="libelle">Ancienneté</label>
                    <select value={formInscription.anciennete} onChange={e => setFormInscription({...formInscription, anciennete: e.target.value})} className="champ-saisie">
                      <option value="Moins d'un an">Moins d'un an</option>
                      <option value="1 à 5 ans">1 à 5 ans</option>
                      <option value="6 à 10 ans">6 à 10 ans</option>
                      <option value="Plus de 10 ans">Plus de 10 ans</option>
                    </select>
                  </div>
                </div>

                <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div>
                    <label className="libelle">Secteur</label>
                    <select value={formInscription.secteurEnseignement} onChange={e => setFormInscription({...formInscription, secteurEnseignement: e.target.value})} className="champ-saisie">
                      <option value="Public">Public</option>
                      <option value="Privé">Privé</option>
                    </select>
                  </div>

                  {formInscription.secteurEnseignement === 'Public' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div>
                        <label className="libelle">Statut Public</label>
                        <select value={formInscription.typeStatutPublic} onChange={e => setFormInscription({...formInscription, typeStatutPublic: e.target.value})} className="champ-saisie">
                          <option value="Titulaire">Titulaire</option>
                          <option value="Contractuel">Contractuel</option>
                        </select>
                      </div>
                      {formInscription.typeStatutPublic === 'Titulaire' && (
                        <div>
                          <label className="libelle">Matricule</label>
                          <input type="text" placeholder="MT-XXXXXX" value={formInscription.numeroMatricule} onChange={e => setFormInscription({...formInscription, numeroMatricule: e.target.value})} className="champ-saisie" required />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="libelle">E-mail professionnel</label>
                  <input type="email" placeholder="nom@etablissement.edu" value={formInscription.email} onChange={e => setFormInscription({...formInscription, email: e.target.value})} className="champ-saisie" required />
                </div>
                <div>
                  <label className="libelle">Mot de passe</label>
                  <input type="password" placeholder="••••••••" value={formInscription.motDePasse} onChange={e => setFormInscription({...formInscription, motDePasse: e.target.value})} className="champ-saisie" required />
                </div>

                <button type="submit" className="bouton-inscription" style={{ marginTop: '8px' }}>
                  Créer mon compte
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* --- DASHBOARDS --- */}
      {userRole && (
        <div className="anim-apparition">
          <div style={styles.barreNavigation}>
            <div style={styles.navLogoContainerCenter}>
              <span style={{ fontSize: '20px' }}>📖</span>
              <span style={{ fontWeight: '900', fontSize: '16px', letterSpacing: '0.5px' }}>E-cahier !</span>
            </div>
            
            <div style={styles.texteNav}>
              {userRole === 'enseignant' && `Espace Enseignant`}
              {userRole === 'censeur' && `Poste de Commandement Censeur`}
              {userRole === 'chef' && `Direction Générale`}
            </div>
          </div>

          {userRole === 'enseignant' && (
            <EnseignantDashboard 
              authContext={authContext} 
              demandesAffiliation={demandesAffiliationEnseignants} setDemandesAffiliation={setDemandesAffiliationEnseignants}
              seances={seancesEnseignants} setSeances={setSeancesEnseignants}
            />
          )}
          {userRole === 'censeur' && (
            <CenseurDashboard 
              authContext={authContext} 
              demandesAffiliation={demandesAffiliationEnseignants} setDemandesAffiliation={setDemandesAffiliationEnseignants}
              seances={seancesEnseignants} setSeances={setSeancesEnseignants}
              bibliotheque={bibliothequeFiches} setBibliotheque={setBibliothequeFiches}
              enseignantsSansFiche={enseignantsSansFiche}
            />
          )}
          {userRole === 'chef' && (
            <ChefEtablissementDashboard 
              authContext={authContext} 
              demandesAffiliation={demandesAffiliationEnseignants}
              seances={seancesEnseignants}
              bibliotheque={bibliothequeFiches}
              enseignantsSansFiche={enseignantsSansFiche}
            />
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  conteneurGlobal: { minHeight: '100vh', backgroundColor: '#f8fafc', position: 'relative' },
  bandeauHorsLigne: { backgroundColor: '#f59e0b', color: '#ffffff', padding: '8px 20px', textAlign: 'center', fontSize: '12px', fontWeight: '600', position: 'sticky', top: 0, zIndex: 10000 },
  ecranAuth: { display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '30px 20px' },
  conteneurNotification: { position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 9999 },
  texteNotification: { backgroundColor: '#1e293b', color: '#f8fafc', padding: '14px 22px', borderRadius: '12px', fontSize: '13px', fontWeight: '700', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' },
  barreNavigation: { display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '6px', background: '#0f172a', color: '#ffffff', padding: '16px 20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', width: '100%' },
  navLogoContainerCenter: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },
  texteNav: { fontWeight: '600', color: '#94a3b8', fontSize: '13px', textAlign: 'center' },
};
