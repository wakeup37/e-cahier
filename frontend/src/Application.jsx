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
    setUserRole(''); 
    setAuthContext(''); 
    setEtapeChefEcole(false); 
    setChoixModeEcole('choix');
    setFormNouvelleEcole({ nomEcole: '', codeMinistere: '', ville: '', commune: '', quartier: '', typeEtablissement: 'Public' });
    setCodeOuNomRejoins(''); 
    localStorage.removeItem('app_enseignant_statut');
    setFormConnexion({ email: '', motDePasse: '', roleAttendu: 'enseignant' });
    setMenuBurgerOuvert(false);
    setModalProfilOuvert(false);
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
        body { margin: 0; background-color: #0d1b2a; -webkit-font-smoothing: antialiased; }
        
        .anim-apparition { animation: apparition 0.3s ease-out forwards; }
        @keyframes apparition { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        
        .bouton-principal { background-color: #1b263b; color: #ffffff; border: 1px solid #415a77; padding: 12px 20px; border-radius: 8px; font-weight: 600; font-size: 14px; cursor: pointer; transition: all 0.2s; width: 100%; }
        .bouton-principal:hover { background-color: #415a77; }
        
        .bouton-inscription { background-color: #ffffff; color: #0d1b2a; border: none; padding: 12px 20px; border-radius: 8px; font-weight: 700; font-size: 14px; cursor: pointer; transition: all 0.2s; width: 100%; }
        .bouton-inscription:hover { background-color: #e0e1dd; }
        
        .bouton-secondaire { background-color: transparent; color: #e0e1dd; border: 1px solid #415a77; padding: 12px 20px; border-radius: 8px; font-weight: 600; font-size: 14px; cursor: pointer; transition: all 0.2s; }
        .bouton-secondaire:hover { background-color: #1b263b; }

        .champ-saisie { width: 100%; padding: 12px 14px; border-radius: 8px; border: 1px solid #415a77; font-size: 14px; background-color: #1b263b; color: #ffffff; outline: none; }
        .champ-saisie::placeholder { color: #778da9; }
        .champ-saisie:focus { border-color: #ffffff; background-color: #1d2d44; }
        
        .carte-auth { background: #1b263b; padding: 36px; border-radius: 16px; border: 1px solid #415a77; width: 100%; max-width: 480px; margin: 0 auto; color: #ffffff; box-shadow: 0 10px 30px rgba(0,0,0,0.3); }
        .libelle { display: block; font-size: 12px; font-weight: 600; color: #96afc8; margin-bottom: 6px; text-transform: uppercase; }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        
        .onglet-conteneur { display: flex; background-color: #0d1b2a; border-radius: 8px; padding: 4px; margin-bottom: 24px; border: 1px solid #415a77; }
        .onglet-btn { flex: 1; padding: 10px; font-size: 14px; font-weight: 600; border: none; border-radius: 6px; cursor: pointer; background: transparent; color: #778da9; }
        .onglet-btn.actif { background: #1b263b; color: #ffffff; border: 1px solid #415a77; }

        .option-paiement { display: flex; align-items: center; gap: 14px; padding: 14px; border: 1px solid #415a77; border-radius: 8px; cursor: pointer; background: #0d1b2a; margin-bottom: 10px; }
        .option-paiement.selectionne { border-color: #ffffff; background: #1b263b; }

        .nav-header { display: flex; justify-content: space-between; align-items: center; background: #1b263b; padding: 14px 28px; border-bottom: 1px solid #415a77; position: sticky; top: 0; z-index: 50; }
        .nav-logo-container { display: flex; align-items: center; gap: 10px; }
        .nav-title { font-weight: 800; font-size: 18px; color: #ffffff; }
        .nav-role { font-weight: 600; color: #778da9; font-size: 12px; background: #0d1b2a; padding: 4px 10px; border-radius: 6px; border: 1px solid #415a77; }

        .avatar-container { display: flex; align-items: center; gap: 10px; cursor: pointer; padding: 4px 10px; border-radius: 8px; border: 1px solid transparent; }
        .avatar-container:hover { background: #0d1b2a; border-color: #415a77; }
        .avatar-cercle { width: 36px; height: 36px; border-radius: 50%; background: #ffffff; color: #0d1b2a; display: flex; align-items: center; justify-content: center; font-weight: 700; overflow: hidden; }
        
        .menu-burger-btn { background: #0d1b2a; border: 1px solid #415a77; font-size: 18px; cursor: pointer; padding: 8px 12px; border-radius: 8px; color: #ffffff; }
        .menu-burger-btn:hover { background: #415a77; }

        .modal-overlay { position: fixed; inset: 0; background: rgba(13, 27, 42, 0.8); display: flex; justify-content: center; align-items: center; z-index: 1000; padding: 16px; }
        .modal-card { background: #1b263b; width: 100%; max-width: 440px; padding: 30px; border-radius: 16px; border: 1px solid #415a77; color: #ffffff; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }

        .drawer-overlay { position: fixed; inset: 0; background: rgba(13, 27, 42, 0.8); z-index: 1000; display: flex; justify-content: flex-end; }
        .drawer-content { width: 100%; max-width: 320px; background: #1b263b; height: 100%; padding: 24px; display: flex; flex-direction: column; border-left: 1px solid #415a77; color: #ffffff; }
      `}</style>

      {!estEnLigne && <div style={styles.bandeauHorsLigne}>⚠️ Mode hors ligne actif. Sauvegarde locale activée.</div>}
      {notification && <div style={styles.conteneurNotification}><div style={styles.texteNotification}>{notification}</div></div>}

      {/* --- MODAL DE PROFIL --- */}
      {modalProfilOuvert && (
        <div className="modal-overlay anim-apparition">
          <div className="modal-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700' }}>Mon Profil</h3>
              <button onClick={() => setModalProfilOuvert(false)} className="bouton-secondaire" style={{ padding: '4px 10px', fontSize: '12px' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', background: '#0d1b2a', padding: '12px', borderRadius: '8px', border: '1px solid #415a77' }}>
                <div className="avatar-cercle" style={{ width: '48px', height: '48px', fontSize: '18px' }}>
                  {profilUtilisateur.photo ? <img src={profilUtilisateur.photo} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : `${profilUtilisateur.nom?.[0] || 'U'}`}
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#ffffff', cursor: 'pointer', display: 'inline-block', textDecoration: 'underline' }}>
                    Changer la photo
                    <input type="file" accept="image/*" onChange={handleChangerPhotoProfil} style={{ display: 'none' }} />
                  </label>
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
                <label className="libelle">Téléphone</label>
                <input type="text" value={profilUtilisateur.telephone} onChange={e => setProfilUtilisateur({...profilUtilisateur, telephone: e.target.value})} className="champ-saisie" />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button onClick={() => setModalProfilOuvert(false)} className="bouton-secondaire" style={{ flex: 1 }}>Fermer</button>
                <button onClick={() => { setModalProfilOuvert(false); afficherNotification("✅ Profil mis à jour."); }} className="bouton-inscription" style={{ flex: 2 }}>Enregistrer</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MENU BURGER DRAWER (AVEC DÉCONNEXION FONCTIONNELLE) --- */}
      {menuBurgerOuvert && (
        <div className="drawer-overlay anim-apparition" onClick={() => setMenuBurgerOuvert(false)}>
          <div className="drawer-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <span style={{ fontWeight: '800', fontSize: '16px' }}>Menu E-cahier</span>
              <button onClick={() => setMenuBurgerOuvert(false)} className="menu-burger-btn">✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
              <div style={{ background: '#0d1b2a', padding: '12px', borderRadius: '8px', border: '1px solid #415a77' }}>
                <p style={{ margin: '0 0 2px 0', fontSize: '11px', color: '#778da9' }}>Connecté en tant que</p>
                <p style={{ margin: 0, fontWeight: '700', fontSize: '13px' }}>{profilUtilisateur.civilite} {profilUtilisateur.prenoms} {profilUtilisateur.nom}</p>
              </div>

              <button onClick={() => { setMenuBurgerOuvert(false); setModalProfilOuvert(true); }} style={styles.menuItem}>
                👤 Gérer mon profil
              </button>
              <button onClick={() => { setMenuBurgerOuvert(false); afficherNotification("📚 Guide d'utilisation en cours."); }} style={styles.menuItem}>
                📖 Guide d'utilisation
              </button>
            </div>

            <div style={{ borderTop: '1px solid #415a77', paddingTop: '16px' }}>
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
            <span style={{ fontSize: '36px', display: 'block', marginBottom: '10px' }}>🏫</span>
            <h2 style={{ fontSize: '20px', fontWeight: '800', margin: '0 0 6px 0' }}>Espace Direction</h2>
            <p style={{ color: '#96afc8', fontSize: '13px', marginBottom: '20px' }}>Authentifiez votre établissement.</p>

            {choixModeEcole === 'choix' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button type="button" className="bouton-principal" onClick={() => setChoixModeEcole('creer')}>➕ Enregistrer un établissement (Payant)</button>
                <button type="button" className="bouton-secondaire" onClick={() => setChoixModeEcole('rejoindre')}>🔗 Se connecter avec le code officiel</button>
              </div>
            )}

            {choixModeEcole === 'creer' && (
              <form onSubmit={preparerPaiementCodeEcole} style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left' }}>
                <div>
                  <label className="libelle">Type d'établissement</label>
                  <select value={formNouvelleEcole.typeEtablissement} onChange={e => setFormNouvelleEcole({...formNouvelleEcole, typeEtablissement: e.target.value})} className="champ-saisie">
                    <option value="Public">Public (30 000 FCFA)</option>
                    <option value="Privé">Privé (50 000 FCFA)</option>
                  </select>
                </div>
                <div>
                  <label className="libelle">Nom de l'école</label>
                  <input type="text" placeholder="Ex: Lycée Moderne..." value={formNouvelleEcole.nomEcole} onChange={e => setFormNouvelleEcole({...formNouvelleEcole, nomEcole: e.target.value})} className="champ-saisie" required />
                </div>
                <div>
                  <label className="libelle">Code officiel (Ministère)</label>
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
                <div className="form-grid" style={{ marginTop: '10px' }}>
                  <button type="button" className="bouton-secondaire" onClick={() => setChoixModeEcole('choix')}>Retour</button>
                  <button type="submit" className="bouton-principal">Continuer</button>
                </div>
              </form>
            )}

            {choixModeEcole === 'paiement' && (
              <div style={{ textAlign: 'left' }}>
                <div style={{ background: '#0d1b2a', padding: '16px', borderRadius: '8px', marginBottom: '16px', textAlign: 'center', border: '1px solid #415a77' }}>
                  <p style={{ margin: '0 0 4px 0', color: '#96afc8', fontSize: '12px' }}>Montant à régler</p>
                  <p style={{ margin: 0, fontSize: '22px', fontWeight: '800' }}>{formNouvelleEcole.typeEtablissement === 'Privé' ? '50 000 FCFA' : '30 000 FCFA'}</p>
                </div>

                <div className={`option-paiement ${moyenPaiement === 'wave' ? 'selectionne' : ''}`} onClick={() => setMoyenPaiement('wave')}>
                  <span>🌊</span><div><strong style={{ fontSize: '13px' }}>Wave</strong></div>
                </div>
                <div className={`option-paiement ${moyenPaiement === 'orange' ? 'selectionne' : ''}`} onClick={() => setMoyenPaiement('orange')}>
                  <span>📱</span><div><strong style={{ fontSize: '13px' }}>Mobile Money</strong></div>
                </div>

                <div className="form-grid" style={{ marginTop: '16px' }}>
                  <button type="button" className="bouton-secondaire" onClick={() => setChoixModeEcole('creer')}>Retour</button>
                  <button type="button" className="bouton-inscription" onClick={validerPaiementEtFinaliserEcole}>Payer</button>
                </div>
              </div>
            )}

            {choixModeEcole === 'rejoindre' && (
              <form onSubmit={validerConnexionEcoleExistante} style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left' }}>
                <div>
                  <label className="libelle">Code officiel ou nom</label>
                  <input type="text" placeholder="Entrez le code..." value={codeOuNomRejoins} onChange={e => setCodeOuNomRejoins(e.target.value)} className="champ-saisie" required />
                </div>
                <div className="form-grid" style={{ marginTop: '6px' }}>
                  <button type="button" className="bouton-secondaire" onClick={() => setChoixModeEcole('choix')}>Retour</button>
                  <button type="submit" className="bouton-principal">Accéder</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* --- ÉCRAN CONNEXION / INSCRIPTION --- */}
      {!userRole && !etapeChefEcole && (
        <div style={styles.ecranAuth} className="anim-apparition">
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <span style={{ fontSize: '38px', display: 'block', marginBottom: '8px' }}>📖</span>
            <h1 style={{ fontSize: '24px', fontWeight: '900', margin: '0 0 4px 0' }}>E-cahier !</h1>
            <p style={{ color: '#96afc8', fontSize: '13px', margin: 0 }}>Espace institutionnel sécurisé</p>
          </div>

          <div className="carte-auth">
            <div className="onglet-conteneur">
              <button type="button" className={`onglet-btn ${modeAccueil === 'connexion' ? 'actif' : ''}`} onClick={() => setModeAccueil('connexion')}>Connexion</button>
              <button type="button" className={`onglet-btn ${modeAccueil === 'inscription' ? 'actif' : ''}`} onClick={() => setModeAccueil('inscription')}>Inscription</button>
            </div>

            {modeAccueil === 'connexion' && (
              <form onSubmit={handleConnexion} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} className="anim-apparition">
                <div>
                  <label className="libelle">Rôle</label>
                  <select value={formConnexion.roleAttendu} onChange={e => setFormConnexion({...formConnexion, roleAttendu: e.target.value})} className="champ-saisie">
                    <option value="enseignant">Enseignant</option>
                    <option value="censeur">Censeur Pédagogique</option>
                    <option value="chef">Chef d'établissement</option>
                  </select>
                </div>
                <div>
                  <label className="libelle">E-mail</label>
                  <input type="email" placeholder="nom@ecole.edu" value={formConnexion.email} onChange={e => setFormConnexion({...formConnexion, email: e.target.value})} className="champ-saisie" required />
                </div>
                <div>
                  <label className="libelle">Mot de passe</label>
                  <input type="password" placeholder="••••••••" value={formConnexion.motDePasse} onChange={e => setFormConnexion({...formConnexion, motDePasse: e.target.value})} className="champ-saisie" required />
                </div>
                <button type="submit" className="bouton-inscription" style={{ marginTop: '8px' }}>Se connecter</button>
              </form>
            )}

            {modeAccueil === 'inscription' && (
              <form onSubmit={handleInscription} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }} className="anim-apparition">
                <div className="form-grid">
                  <div>
                    <label className="libelle">Civilité</label>
                    <select value={formInscription.civilite} onChange={e => setFormInscription({...formInscription, civilite: e.target.value})} className="champ-saisie">
                      <option value="M.">M.</option><option value="Mme">Mme</option><option value="Dr">Dr</option><option value="Pr">Pr</option>
                    </select>
                  </div>
                  <div>
                    <label className="libelle">Rôle</label>
                    <select value={formInscription.role} onChange={e => setFormInscription({...formInscription, role: e.target.value})} className="champ-saisie">
                      <option value="enseignant">Enseignant</option><option value="censeur">Censeur</option><option value="chef">Direction</option>
                    </select>
                  </div>
                </div>

                <div className="form-grid">
                  <div>
                    <label className="libelle">Nom</label>
                    <input type="text" placeholder="Nom" value={formInscription.nom} onChange={e => setFormInscription({...formInscription, nom: e.target.value})} className="champ-saisie" required />
                  </div>
                  <div>
                    <label className="libelle">Prénoms</label>
                    <input type="text" placeholder="Prénoms" value={formInscription.prenoms} onChange={e => setFormInscription({...formInscription, prenoms: e.target.value})} className="champ-saisie" required />
                  </div>
                </div>

                <div className="form-grid">
                  <div>
                    <label className="libelle">Date de naissance</label>
                    <input type="date" value={formInscription.dateNaissance} onChange={e => setFormInscription({...formInscription, dateNaissance: e.target.value})} className="champ-saisie" required />
                  </div>
                  <div>
                    <label className="libelle">Téléphone</label>
                    <input type="text" placeholder="+225..." value={formInscription.telephone} onChange={e => setFormInscription({...formInscription, telephone: e.target.value})} className="champ-saisie" required />
                  </div>
                </div>

                <div>
                  <label className="libelle">Matière</label>
                  <input type="text" placeholder="Ex: Mathématiques" value={formInscription.matiere} onChange={e => setFormInscription({...formInscription, matiere: e.target.value})} className="champ-saisie" required />
                </div>

                <div>
                  <label className="libelle">E-mail</label>
                  <input type="email" placeholder="nom@ecole.edu" value={formInscription.email} onChange={e => setFormInscription({...formInscription, email: e.target.value})} className="champ-saisie" required />
                </div>
                <div>
                  <label className="libelle">Mot de passe</label>
                  <input type="password" placeholder="••••••••" value={formInscription.motDePasse} onChange={e => setFormInscription({...formInscription, motDePasse: e.target.value})} className="champ-saisie" required />
                </div>

                <button type="submit" className="bouton-inscription" style={{ marginTop: '8px' }}>S'inscrire</button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* --- DASHBOARD ET NAVIGATION --- */}
      {userRole && (
        <div className="anim-apparition">
          <header className="nav-header">
            <div className="nav-logo-container">
              <span style={{ fontSize: '18px' }}>📖</span>
              <span className="nav-title">E-cahier !</span>
              <span className="nav-role">
                {userRole === 'enseignant' && `Enseignant`}
                {userRole === 'censeur' && `Censeur`}
                {userRole === 'chef' && `Direction`}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="avatar-container" onClick={() => setModalProfilOuvert(true)} title="Gérer mon profil">
                <div className="avatar-cercle">
                  {profilUtilisateur.photo ? <img src={profilUtilisateur.photo} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : `${profilUtilisateur.nom?.[0] || 'U'}`}
                </div>
                <div style={{ textAlign: 'left', display: 'inline-block' }}>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#ffffff' }}>{profilUtilisateur.nom}</div>
                  <div style={{ fontSize: '10px', color: '#96afc8' }}>Profil</div>
                </div>
              </div>

              <button type="button" className="menu-burger-btn" onClick={() => setMenuBurgerOuvert(true)} title="Menu">
                ☰
              </button>
            </div>
          </header>

          <main style={{ padding: '20px 16px', maxWidth: '1200px', margin: '0 auto' }}>
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
  conteneurGlobal: { minHeight: '100vh', backgroundColor: '#0d1b2a', position: 'relative' },
  bandeauHorsLigne: { backgroundColor: '#415a77', color: '#ffffff', padding: '8px 20px', textAlign: 'center', fontSize: '12px', fontWeight: '600', position: 'sticky', top: 0, zIndex: 10000 },
  ecranAuth: { display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '30px 20px' },
  conteneurNotification: { position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 9999 },
  texteNotification: { backgroundColor: '#1b263b', color: '#ffffff', padding: '12px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', boxShadow: '0 8px 20px rgba(0,0,0,0.4)', border: '1px solid #415a77' },
  menuItem: { background: 'none', border: 'none', textAlign: 'left', padding: '12px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#e0e1dd', width: '100%', transition: 'background 0.2s' },
  boutonDeconnexionBurger: { background: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '12px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '13px', width: '100%', textAlign: 'center', transition: 'all 0.2s' }
};
