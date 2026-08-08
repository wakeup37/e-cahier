import React, { useState, useEffect } from 'react';
import EnseignantDashboard from './components/EnseignantDashboard';
import CenseurDashboard from './components/CenseurDashboard';
import ChefEtablissementDashboard from './components/ChefEtablissementDashboard';

export default function Application() {
  const [userRole, setUserRole] = useState(''); 
  const [authContext, setAuthContext] = useState(''); 
  const [notification, setNotification] = useState('');
  const [estEnLigne, setEstEnLigne] = useState(navigator.onLine);

  const [modeAccueil, setModeAccueil] = useState('connexion');

  const [etapeChefEcole, setEtapeChefEcole] = useState(false);
  const [choixModeEcole, setChoixModeEcole] = useState('choix'); 
  
  const [formNouvelleEcole, setFormNouvelleEcole] = useState({
    nomEcole: '', codeMinistere: '', ville: '', commune: '', quartier: '', typeEtablissement: 'Public' 
  });
  const [moyenPaiement, setMoyenPaiement] = useState('wave');
  const [codeOuNomRejoins, setCodeOuNomRejoins] = useState('');

  const [formConnexion, setFormConnexion] = useState({ email: '', motDePasse: '', roleAttendu: 'enseignant' });
  const [formInscription, setFormInscription] = useState({
    civilite: 'M.', role: 'enseignant', nom: '', prenoms: '', dateNaissance: '', telephone: '', ville: '',
    anciennete: '1 à 5 ans', matiere: '', secteurEnseignement: 'Public', typeStatutPublic: 'Titulaire', numeroMatricule: '', email: '', motDePasse: ''
  });

  // --- ÉTAT DU PROFIL UTILISATEUR & MENU BURGER ---
  const [menuBurgerOuvert, setMenuBurgerOuvert] = useState(false);
  const [modalProfilOuvert, setModalProfilOuvert] = useState(false);
  const [profilUtilisateur, setProfilUtilisateur] = useState(() => {
    try { return JSON.parse(localStorage.getItem('app_profil_utilisateur')) || { civilite: 'M.', nom: 'Kouassi', prenoms: 'Jean', telephone: '+225 01020304', photo: '' }; }
    catch { return { civilite: 'M.', nom: 'Kouassi', prenoms: 'Jean', telephone: '+225 01020304', photo: '' }; }
  });

  useEffect(() => {
    try { localStorage.setItem('app_profil_utilisateur', JSON.stringify(profilUtilisateur)); } catch {}
  }, [profilUtilisateur]);

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

  const afficherNotification = (msg) => { setNotification(msg); setTimeout(() => setNotification(''), 4000); };

  const handleConnexion = (e) => {
    e.preventDefault();
    if (!formConnexion.email || !formConnexion.motDePasse) {
      afficherNotification("Veuillez remplir vos identifiants."); return;
    }
    localStorage.setItem('app_enseignant_statut', 'actif');
    setAuthContext('connexion'); 
    if (formConnexion.roleAttendu === 'chef') { setEtapeChefEcole(true); return; }
    afficherNotification("Connexion réussie ! Redirection vers vos classes...");
    setTimeout(() => setUserRole(formConnexion.roleAttendu), 400);
  };

  const handleInscription = (e) => {
    e.preventDefault();
    if (!formInscription.nom || !formInscription.email || !formInscription.motDePasse) {
      afficherNotification("Veuillez renseigner tous les champs obligatoires."); return;
    }
    if (formInscription.secteurEnseignement === 'Public' && formInscription.typeStatutPublic === 'Titulaire' && !formInscription.numeroMatricule.trim()) {
      afficherNotification("❌ Veuillez renseigner votre numéro matricule."); return;
    }
    localStorage.setItem('app_enseignant_statut', 'nouveau');
    setAuthContext('inscription');
    setProfilUtilisateur(prev => ({ ...prev, nom: formInscription.nom, prenoms: formInscription.prenoms, civilite: formInscription.civilite, telephone: formInscription.telephone }));
    if (formInscription.role === 'chef') { setEtapeChefEcole(true); return; }
    afficherNotification("Compte créé avec succès ! Procédez à l'affiliation.");
    setTimeout(() => setUserRole(formInscription.role), 600);
  };

  const preparerPaiementCodeEcole = (e) => {
    e.preventDefault();
    if (!formNouvelleEcole.nomEcole.trim() || !formNouvelleEcole.codeMinistere.trim() || !formNouvelleEcole.ville.trim() || !formNouvelleEcole.commune.trim()) {
      afficherNotification("⚠️ Veuillez remplir tous les champs obligatoires."); return;
    }
    setChoixModeEcole('paiement');
  };

  const validerPaiementEtFinaliserEcole = () => {
    const montant = formNouvelleEcole.typeEtablissement === 'Privé' ? '50 000 FCFA' : '30 000 FCFA';
    const configEcole = {
      nomEcole: formNouvelleEcole.nomEcole.trim(), codeEtablissement: formNouvelleEcole.codeMinistere.trim().toUpperCase(),
      ville: formNouvelleEcole.ville.trim(), commune: formNouvelleEcole.commune.trim(), quartier: formNouvelleEcole.quartier.trim(),
      typeEtablissement: formNouvelleEcole.typeEtablissement, anneeScolaire: '2025-2026', anneeOuverte: true
    };
    localStorage.setItem('app_chef_ecole_config', JSON.stringify(configEcole));
    setEtapeChefEcole(false);
    afficherNotification(`💳 Paiement de ${montant} validé via ${moyenPaiement.toUpperCase()} ! Établissement enregistré.`);
    setUserRole('chef');
  };

  const validerConnexionEcoleExistante = (e) => {
    e.preventDefault();
    if (!codeOuNomRejoins.trim()) { afficherNotification("⚠️ Veuillez entrer le code officiel du Ministère ou le nom de l'établissement."); return; }
    const configEcole = {
      nomEcole: codeOuNomRejoins.trim(), codeEtablissement: codeOuNomRejoins.trim().toUpperCase(),
      ville: 'Inconnue', commune: 'Inconnue', quartier: '', typeEtablissement: 'Public', anneeScolaire: '2025-2026', anneeOuverte: true
    };
    localStorage.setItem('app_chef_ecole_config', JSON.stringify(configEcole));
    setEtapeChefEcole(false);
    afficherNotification("🔗 Connexion à l'établissement réussie via le code officiel !");
    setUserRole('chef');
  };

  const handleLogout = () => {
    setUserRole(''); setAuthContext(''); setEtapeChefEcole(false); setChoixModeEcole('choix');
    setFormNouvelleEcole({ nomEcole: '', codeMinistere: '', ville: '', commune: '', quartier: '', typeEtablissement: 'Public' });
    setCodeOuNomRejoins(''); localStorage.removeItem('app_enseignant_statut');
    setFormConnexion({ email: '', motDePasse: '', roleAttendu: 'enseignant' });
    setMenuBurgerOuvert(false);
    afficherNotification("🚪 Déconnexion réussie.");
  };

  const handleChangerPhotoProfil = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setProfilUtilisateur(prev => ({ ...prev, photo: reader.result }));
    reader.readAsDataURL(file);
  };

  return (
    <div style={styles.conteneurGlobal}>
      <style>{`
        * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif; }
        body { margin: 0; background-color: #f8fafc; -webkit-font-smoothing: antialiased; }
        
        .anim-apparition { animation: apparition 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes apparition { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        
        .bouton-principal { background-color: #0f172a; color: #ffffff; border: none; padding: 12px 20px; border-radius: 10px; font-weight: 600; font-size: 14px; cursor: pointer; transition: all 0.2s ease; width: 100%; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
        .bouton-principal:hover { background-color: #1e293b; transform: translateY(-1px); }
        
        .bouton-inscription { background-color: #2563eb; color: #ffffff; border: none; padding: 12px 20px; border-radius: 10px; font-weight: 600; font-size: 14px; cursor: pointer; transition: all 0.2s ease; width: 100%; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2); }
        .bouton-inscription:hover { background-color: #1d4ed8; transform: translateY(-1px); }
        
        .bouton-secondaire { background-color: #f1f5f9; color: #475569; border: none; padding: 12px 20px; border-radius: 10px; font-weight: 600; font-size: 14px; cursor: pointer; transition: all 0.2s ease; }
        .bouton-secondaire:hover { background-color: #e2e8f0; color: #0f172a; }

        .champ-saisie { width: 100%; padding: 12px 16px; border-radius: 10px; border: 1px solid #e2e8f0; font-size: 14px; background-color: #f8fafc; color: #0f172a; outline: none; transition: all 0.2s ease; }
        .champ-saisie:focus { border-color: #3b82f6; background-color: #ffffff; box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.15); }
        
        .carte-auth { background: #ffffff; padding: 40px; border-radius: 24px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.05); border: 1px solid #f1f5f9; width: 100%; max-width: 500px; margin: 0 auto; }
        .libelle { display: block; font-size: 13px; font-weight: 600; color: #475569; margin-bottom: 8px; }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        
        .onglet-conteneur { display: flex; background-color: #f1f5f9; border-radius: 12px; padding: 4px; margin-bottom: 24px; }
        .onglet-btn { flex: 1; padding: 10px; font-size: 14px; font-weight: 600; border: none; border-radius: 8px; cursor: pointer; transition: all 0.2s ease; background: transparent; color: #64748b; }
        .onglet-btn.actif { background: #ffffff; color: #0f172a; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }

        .option-paiement { display: flex; align-items: center; gap: 16px; padding: 14px; border: 1px solid #e2e8f0; border-radius: 12px; cursor: pointer; transition: all 0.2s ease; background: #ffffff; margin-bottom: 10px; }
        .option-paiement.selectionne { border-color: #3b82f6; background: #eff6ff; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2); }

        .nav-header { display: flex; justify-content: space-between; align-items: center; background: #ffffff; padding: 16px 32px; border-bottom: 1px solid #e2e8f0; position: sticky; top: 0; z-index: 50; }
        .nav-logo-container { display: flex; align-items: center; gap: 12px; }
        .nav-title { font-weight: 800; font-size: 18px; color: #0f172a; letter-spacing: -0.5px; }
        .nav-role { font-weight: 600; color: #64748b; font-size: 13px; background: #f1f5f9; padding: 4px 12px; border-radius: 99px; }

        /* Style Avatar & Menu Burger */
        .avatar-container { display: flex; align-items: center; gap: 12px; cursor: pointer; padding: 6px 12px; border-radius: 12px; transition: background 0.2s; border: 1px solid transparent; }
        .avatar-container:hover { background: #f8fafc; border-color: #e2e8f0; }
        .avatar-cercle { width: 40px; height: 40px; border-radius: 50%; background: #0f172a; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; overflow: hidden; object-fit: cover; }
        
        .menu-burger-btn { background: none; border: none; font-size: 22px; cursor: pointer; padding: 8px; border-radius: 8px; color: #0f172a; }
        .menu-burger-btn:hover { background: #f1f5f9; }

        /* Modal Profile Overlay */
        .modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.5); backdrop-filter: blur(4px); display: flex; justify-content: center; align-items: center; z-index: 1000; padding: 16px; }
        .modal-card { background: #ffffff; width: 100%; max-width: 480px; padding: 32px; border-radius: 20px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); }

        /* Menu Burger Drawer */
        .drawer-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.4); z-index: 1000; display: flex; justify-content: flex-end; }
        .drawer-content { width: 100%; max-width: 320px; background: #ffffff; height: 100%; padding: 24px; display: flex; flexDirection: column; box-shadow: -10px 0 25px rgba(0,0,0,0.1); }
      `}</style>

      {!estEnLigne && <div style={styles.bandeauHorsLigne}>⚠️ Mode hors ligne actif. Sauvegarde locale activée.</div>}
      {notification && <div style={styles.conteneurNotification}><div style={styles.texteNotification}>{notification}</div></div>}

      {/* --- MODAL DE GESTION DU PROFIL (OUVERT VIA L'AVATAR) --- */}
      {modalProfilOuvert && (
        <div className="modal-overlay anim-apparition">
          <div className="modal-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>⚙️ Gestion de mon Profil</h3>
              <button onClick={() => setModalProfilOuvert(false)} className="bouton-secondaire" style={{ padding: '6px 12px', fontSize: '12px' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div className="avatar-cercle" style={{ width: '56px', height: '56px', fontSize: '20px' }}>
                  {profilUtilisateur.photo ? <img src={profilUtilisateur.photo} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : `${profilUtilisateur.nom?.[0] || 'U'}`}
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#2563eb', cursor: 'pointer', display: 'inline-block' }}>
                    Changer la photo de profil
                    <input type="file" accept="image/*" onChange={handleChangerPhotoProfil} style={{ display: 'none' }} />
                  </label>
                  <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#64748b' }}>Format PNG ou JPG recommandé.</p>
                </div>
              </div>

              <div className="form-grid">
                <div>
                  <label className="libelle">Civilité</label>
                  <select value={profilUtilisateur.civilite} onChange={e => setProfilUtilisateur({...profilUtilisateur, civilite: e.target.value})} className="champ-saisie">
                    <option value="M.">M.</option><option value="Mme">Mme</option><option value="Dr">Dr</option><option value="Pr">Pr</option>
                  </select>
                </div>
                <div>
                  <label className="libelle">Nom</label>
                  <input type="text" value={profilUtilisateur.nom} onChange={e => setProfilUtilisateur({...profilUtilisateur, nom: e.target.value})} className="champ-saisie" />
                </div>
              </div>

              <div>
                <label className="libelle">Prénoms</label>
                <input type="text" value={profilUtilisateur.prenoms} onChange={e => setProfilUtilisateur({...profilUtilisateur, prenoms: e.target.value})} className="champ-saisie" />
              </div>

              <div>
                <label className="libelle">Téléphone / WhatsApp</label>
                <input type="text" value={profilUtilisateur.telephone} onChange={e => setProfilUtilisateur({...profilUtilisateur, telephone: e.target.value})} className="champ-saisie" />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button onClick={() => setModalProfilOuvert(false)} className="bouton-secondaire" style={{ flex: 1 }}>Fermer</button>
                <button onClick={() => { setModalProfilOuvert(false); afficherNotification("✅ Modifications de profil enregistrées !"); }} className="bouton-principal" style={{ flex: 2 }}>Enregistrer</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MENU BURGER DRAWER (CONTIENT LA DÉCONNEXION) --- */}
      {menuBurgerOuvert && (
        <div className="drawer-overlay anim-apparition" onClick={() => setMenuBurgerOuvert(false)}>
          <div className="drawer-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '20px' }}>📖</span>
                <span style={{ fontWeight: '800', fontSize: '16px', color: '#0f172a' }}>Menu E-cahier</span>
              </div>
              <button onClick={() => setMenuBurgerOuvert(false)} className="menu-burger-btn">✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#64748b' }}>Connecté en tant que</p>
                <p style={{ margin: 0, fontWeight: '700', fontSize: '14px', color: '#0f172a' }}>{profilUtilisateur.civilite} {profilUtilisateur.prenoms} {profilUtilisateur.nom}</p>
              </div>

              <button onClick={() => { setMenuBurgerOuvert(false); setModalProfilOuvert(true); }} style={styles.menuItem}>
                👤 Modifier mon profil
              </button>
              <button onClick={() => { setMenuBurgerOuvert(false); afficherNotification("📌 Centre d'aide et documentation actif."); }} style={styles.menuItem}>
                📚 Guide d'utilisation
              </button>
              <button onClick={() => { setMenuBurgerOuvert(false); afficherNotification("🛡️ Version sécurisée 2.4.0 (Ministère)"); }} style={styles.menuItem}>
                🔒 Sécurité & Paramètres
              </button>
            </div>

            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
              <button type="button" onClick={handleLogout} style={styles.boutonDeconnexionBurger}>
                🚪 Se déconnecter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- ÉCRAN INTERMÉDIAIRE CHEF --- */}
      {etapeChefEcole && (
        <div style={styles.ecranAuth} className="anim-apparition">
          <div className="carte-auth" style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '42px', display: 'block', marginBottom: '12px' }}>🏫</span>
            <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: '0 0 8px 0' }}>Espace Direction</h2>
            <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '28px', lineHeight: '1.5' }}>Veuillez authentifier votre établissement pour accéder au tableau de bord.</p>

            {choixModeEcole === 'choix' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <button type="button" className="bouton-principal" onClick={() => setChoixModeEcole('creer')}>➕ Enregistrer un établissement (Payant)</button>
                <button type="button" className="bouton-secondaire" onClick={() => setChoixModeEcole('rejoindre')}>🔗 Se connecter avec le code officiel</button>
              </div>
            )}

            {choixModeEcole === 'creer' && (
              <form onSubmit={preparerPaiementCodeEcole} style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'left' }}>
                <div>
                  <label className="libelle">Type d'établissement</label>
                  <select value={formNouvelleEcole.typeEtablissement} onChange={e => setFormNouvelleEcole({...formNouvelleEcole, typeEtablissement: e.target.value})} className="champ-saisie">
                    <option value="Public">Public (Frais d'enregistrement : 30 000 FCFA)</option>
                    <option value="Privé">Privé (Frais d'enregistrement : 50 000 FCFA)</option>
                  </select>
                </div>
                <div>
                  <label className="libelle">Nom de l'école</label>
                  <input type="text" placeholder="Ex: Lycée Moderne..." value={formNouvelleEcole.nomEcole} onChange={e => setFormNouvelleEcole({...formNouvelleEcole, nomEcole: e.target.value})} className="champ-saisie" required />
                </div>
                <div>
                  <label className="libelle">Code d'établissement officiel (Ministère)</label>
                  <input type="text" placeholder="Ex: Code officiel..." value={formNouvelleEcole.codeMinistere} onChange={e => setFormNouvelleEcole({...formNouvelleEcole, codeMinistere: e.target.value})} className="champ-saisie" required />
                </div>
                <div className="form-grid">
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
                <div className="form-grid" style={{ marginTop: '12px' }}>
                  <button type="button" className="bouton-secondaire" onClick={() => setChoixModeEcole('choix')}>Retour</button>
                  <button type="submit" className="bouton-principal">Procéder au paiement</button>
                </div>
              </form>
            )}

            {choixModeEcole === 'paiement' && (
              <div style={{ textAlign: 'left' }}>
                <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '16px', marginBottom: '20px', textAlign: 'center' }}>
                  <p style={{ margin: '0 0 8px 0', color: '#64748b', fontSize: '13px' }}>Montant total à régler</p>
                  <p style={{ margin: 0, fontSize: '28px', fontWeight: '800', color: '#0f172a' }}>{formNouvelleEcole.typeEtablissement === 'Privé' ? '50 000 FCFA' : '30 000 FCFA'}</p>
                </div>

                <div className={`option-paiement ${moyenPaiement === 'wave' ? 'selectionne' : ''}`} onClick={() => setMoyenPaiement('wave')}>
                  <span style={{ fontSize: '24px' }}>🌊</span>
                  <div><strong style={{ display: 'block', color: '#0f172a', fontSize: '14px' }}>Wave</strong><span style={{ fontSize: '12px', color: '#64748b' }}>Paiement instantané</span></div>
                </div>
                
                <div className={`option-paiement ${moyenPaiement === 'orange' ? 'selectionne' : ''}`} onClick={() => setMoyenPaiement('orange')}>
                  <span style={{ fontSize: '24px' }}>📱</span>
                  <div><strong style={{ display: 'block', color: '#0f172a', fontSize: '14px' }}>Orange / MTN / Moov</strong><span style={{ fontSize: '12px', color: '#64748b' }}>Mobile Money</span></div>
                </div>

                <div className={`option-paiement ${moyenPaiement === 'carte' ? 'selectionne' : ''}`} onClick={() => setMoyenPaiement('carte')}>
                  <span style={{ fontSize: '24px' }}>💳</span>
                  <div><strong style={{ display: 'block', color: '#0f172a', fontSize: '14px' }}>Carte Bancaire</strong><span style={{ fontSize: '12px', color: '#64748b' }}>Visa & Mastercard</span></div>
                </div>

                <div className="form-grid" style={{ marginTop: '24px' }}>
                  <button type="button" className="bouton-secondaire" onClick={() => setChoixModeEcole('creer')}>Annuler</button>
                  <button type="button" className="bouton-inscription" onClick={validerPaiementEtFinaliserEcole}>Confirmer le paiement</button>
                </div>
              </div>
            )}

            {choixModeEcole === 'rejoindre' && (
              <form onSubmit={validerConnexionEcoleExistante} style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'left' }}>
                <div>
                  <label className="libelle">Identifiant de l'établissement</label>
                  <input type="text" placeholder="Entrez le code officiel..." value={codeOuNomRejoins} onChange={e => setCodeOuNomRejoins(e.target.value)} className="champ-saisie" required />
                </div>
                <div className="form-grid" style={{ marginTop: '8px' }}>
                  <button type="button" className="bouton-secondaire" onClick={() => setChoixModeEcole('choix')}>Retour</button>
                  <button type="submit" className="bouton-principal">Accéder au portail</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* --- ÉCRAN CONNEXION / INSCRIPTION --- */}
      {!userRole && !etapeChefEcole && (
        <div style={styles.ecranAuth} className="anim-apparition">
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', borderRadius: '16px', backgroundColor: '#ffffff', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', marginBottom: '16px', fontSize: '32px' }}>📖</div>
            <h1 style={{ fontSize: '28px', fontWeight: '900', color: '#0f172a', margin: '0 0 6px 0', letterSpacing: '-0.5px' }}>E-cahier !</h1>
            <p style={{ color: '#64748b', fontSize: '15px', margin: 0 }}>L'espace collaboratif nouvelle génération</p>
          </div>

          <div className="carte-auth">
            <div className="onglet-conteneur">
              <button type="button" className={`onglet-btn ${modeAccueil === 'connexion' ? 'actif' : ''}`} onClick={() => setModeAccueil('connexion')}>Se connecter</button>
              <button type="button" className={`onglet-btn ${modeAccueil === 'inscription' ? 'actif' : ''}`} onClick={() => setModeAccueil('inscription')}>Créer un compte</button>
            </div>

            {modeAccueil === 'connexion' && (
              <form onSubmit={handleConnexion} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }} className="anim-apparition">
                <div>
                  <label className="libelle">Accès sécurisé pour :</label>
                  <select value={formConnexion.roleAttendu} onChange={e => setFormConnexion({...formConnexion, roleAttendu: e.target.value})} className="champ-saisie">
                    <option value="enseignant">Enseignant</option>
                    <option value="censeur">Censeur Pédagogique</option>
                    <option value="chef">Chef d'établissement</option>
                  </select>
                </div>
                <div>
                  <label className="libelle">Adresse e-mail professionnelle</label>
                  <input type="email" placeholder="nom@etablissement.edu" value={formConnexion.email} onChange={e => setFormConnexion({...formConnexion, email: e.target.value})} className="champ-saisie" required />
                </div>
                <div>
                  <label className="libelle">Mot de passe</label>
                  <input type="password" placeholder="••••••••" value={formConnexion.motDePasse} onChange={e => setFormConnexion({...formConnexion, motDePasse: e.target.value})} className="champ-saisie" required />
                </div>
                <button type="submit" className="bouton-principal" style={{ marginTop: '12px' }}>Connexion à l'espace</button>
              </form>
            )}

            {modeAccueil === 'inscription' && (
              <form onSubmit={handleInscription} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} className="anim-apparition">
                <div className="form-grid">
                  <div>
                    <label className="libelle">Civilité</label>
                    <select value={formInscription.civilite} onChange={e => setFormInscription({...formInscription, civilite: e.target.value})} className="champ-saisie">
                      <option value="M.">M.</option><option value="Mme">Mme</option><option value="Dr">Dr</option><option value="Pr">Pr</option>
                    </select>
                  </div>
                  <div>
                    <label className="libelle">Fonction</label>
                    <select value={formInscription.role} onChange={e => setFormInscription({...formInscription, role: e.target.value})} className="champ-saisie">
                      <option value="enseignant">Enseignant</option><option value="censeur">Censeur</option><option value="chef">Direction</option>
                    </select>
                  </div>
                </div>

                <div className="form-grid">
                  <div>
                    <label className="libelle">Nom</label>
                    <input type="text" placeholder="Ex: Kouassi" value={formInscription.nom} onChange={e => setFormInscription({...formInscription, nom: e.target.value})} className="champ-saisie" required />
                  </div>
                  <div>
                    <label className="libelle">Prénoms</label>
                    <input type="text" placeholder="Ex: Jean" value={formInscription.prenoms} onChange={e => setFormInscription({...formInscription, prenoms: e.target.value})} className="champ-saisie" required />
                  </div>
                </div>

                <div className="form-grid">
                  <div>
                    <label className="libelle">Date de naissance</label>
                    <input type="date" value={formInscription.dateNaissance} onChange={e => setFormInscription({...formInscription, dateNaissance: e.target.value})} className="champ-saisie" required />
                  </div>
                  <div>
                    <label className="libelle">Téléphone (WhatsApp)</label>
                    <input type="text" placeholder="+225..." value={formInscription.telephone} onChange={e => setFormInscription({...formInscription, telephone: e.target.value})} className="champ-saisie" required />
                  </div>
                </div>

                <div className="form-grid">
                  <div>
                    <label className="libelle">Matière</label>
                    <input type="text" placeholder="Ex: Mathématiques" value={formInscription.matiere} onChange={e => setFormInscription({...formInscription, matiere: e.target.value})} className="champ-saisie" required />
                  </div>
                  <div>
                    <label className="libelle">Ancienneté</label>
                    <select value={formInscription.anciennete} onChange={e => setFormInscription({...formInscription, anciennete: e.target.value})} className="champ-saisie">
                      <option value="Moins d'un an">Moins d'un an</option><option value="1 à 5 ans">1 à 5 ans</option><option value="6 à 10 ans">6 à 10 ans</option><option value="Plus de 10 ans">Plus de 10 ans</option>
                    </select>
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <label className="libelle">Secteur d'enseignement</label>
                  <select value={formInscription.secteurEnseignement} onChange={e => setFormInscription({...formInscription, secteurEnseignement: e.target.value})} className="champ-saisie" style={{ marginBottom: '12px' }}>
                    <option value="Public">Public</option><option value="Privé">Privé</option>
                  </select>
                  {formInscription.secteurEnseignement === 'Public' && (
                    <div className="form-grid">
                      <div>
                        <label className="libelle">Statut</label>
                        <select value={formInscription.typeStatutPublic} onChange={e => setFormInscription({...formInscription, typeStatutPublic: e.target.value})} className="champ-saisie">
                          <option value="Titulaire">Titulaire</option><option value="Contractuel">Contractuel</option>
                        </select>
                      </div>
                      {formInscription.typeStatutPublic === 'Titulaire' && (
                        <div>
                          <label className="libelle">Matricule MENA</label>
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

                <button type="submit" className="bouton-inscription" style={{ marginTop: '12px' }}>Créer mon espace sécurisé</button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* --- DASHBOARDS ET NAVIGATION HAUT DE GAMME --- */}
      {userRole && (
        <div className="anim-apparition">
          <header className="nav-header">
            <div className="nav-logo-container">
              <span style={{ fontSize: '22px' }}>📖</span>
              <span className="nav-title">E-cahier !</span>
              <span className="nav-role">
                {userRole === 'enseignant' && `Espace Enseignant`}
                {userRole === 'censeur' && `Pôle Pédagogique`}
                {userRole === 'chef' && `Direction Générale`}
              </span>
            </div>

            {/* PARTIE DROITE : Avatar pour le profil & Bouton pour le Menu Burger */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div className="avatar-container" onClick={() => setModalProfilOuvert(true)} title="Gérer mon profil">
                <div className="avatar-cercle">
                  {profilUtilisateur.photo ? <img src={profilUtilisateur.photo} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : `${profilUtilisateur.nom?.[0] || 'U'}`}
                </div>
                <div style={{ textAlign: 'left', display: 'inline-block' }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>{profilUtilisateur.nom} {profilUtilisateur.prenoms?.[0]}.</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Mon profil</div>
                </div>
              </div>

              <button type="button" className="menu-burger-btn" onClick={() => setMenuBurgerOuvert(true)} title="Ouvrir le menu">
                ☰
              </button>
            </div>
          </header>

          <main style={{ padding: '24px 16px', maxWidth: '1200px', margin: '0 auto' }}>
            {userRole === 'enseignant' && (
              <EnseignantDashboard authContext={authContext} demandesAffiliation={demandesAffiliationEnseignants} setDemandesAffiliation={setDemandesAffiliationEnseignants} seances={seancesEnseignants} setSeances={setSeancesEnseignants} />
            )}
            {userRole === 'censeur' && (
              <CenseurDashboard authContext={authContext} demandesAffiliation={demandesAffiliationEnseignants} setDemandesAffiliation={setDemandesAffiliationEnseignants} seances={seancesEnseignants} setSeances={setSeancesEnseignants} bibliotheque={bibliothequeFiches} setBibliotheque={setBibliothequeFiches} enseignantsSansFiche={enseignantsSansFiche} />
            )}
            {userRole === 'chef' && (
              <ChefEtablissementDashboard authContext={authContext} demandesAffiliation={demandesAffiliationEnseignants} seances={seancesEnseignants} bibliotheque={bibliothequeFiches} enseignantsSansFiche={enseignantsSansFiche} />
            )}
          </main>
        </div>
      )}
    </div>
  );
}

const styles = {
  conteneurGlobal: { minHeight: '100vh', backgroundColor: '#f8fafc', position: 'relative' },
  bandeauHorsLigne: { backgroundColor: '#f59e0b', color: '#ffffff', padding: '8px 20px', textAlign: 'center', fontSize: '13px', fontWeight: '600', position: 'sticky', top: 0, zIndex: 10000 },
  ecranAuth: { display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '40px 20px' },
  conteneurNotification: { position: 'fixed', top: '24px', left: '50%', transform: 'translateX(-50%)', zIndex: 9999 },
  texteNotification: { backgroundColor: '#0f172a', color: '#ffffff', padding: '14px 24px', borderRadius: '12px', fontSize: '14px', fontWeight: '600', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' },
  menuItem: { background: 'none', border: 'none', textAlign: 'left', padding: '12px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', color: '#334155', transition: 'background 0.2s', width: '100%' },
  boutonDeconnexionBurger: { background: '#fef2f2', color: '#ef4444', border: '1px solid #fee2e2', padding: '12px 16px', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '14px', width: '100%', textAlign: 'center', transition: 'all 0.2s' }
};
