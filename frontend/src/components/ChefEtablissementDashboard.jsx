import React, { useState, useEffect, useRef, useMemo } from 'react';

// =========================================================================
// 1. SÉCURISATION MAXIMALE DES DONNÉES LOCALES (ANTI-CRASH)
// =========================================================================
const safeGetArray = (key, defaultArr = []) => {
  try {
    const item = localStorage.getItem(key);
    if (!item) return defaultArr;
    const parsed = JSON.parse(item);
    return Array.isArray(parsed) ? parsed : defaultArr;
  } catch { return defaultArr; }
};

const safeGetObject = (key, defaultObj = {}) => {
  try {
    const item = localStorage.getItem(key);
    if (!item) return defaultObj;
    const parsed = JSON.parse(item);
    return (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : defaultObj;
  } catch { return defaultObj; }
};

export default function ChefEtablissementDashboard() {
  
  // --- ÉTAPE DE SÉLECTION INITIALE (CRÉER OU SE CONNECTER À UN ÉTABLISSEMENT) ---
  const [ecoleConfig, setEcoleConfig] = useState(() => safeGetObject('app_chef_ecole_config', null));

  const [modeSetup, setModeSetup] = useState('CHOIX'); // 'CHOIX', 'CREER', 'CONNECTER', 'OUBLIE_CODE'
  
  const [inputNomEcole, setInputNomEcole] = useState('');
  const [inputTypeEtablissement, setInputTypeEtablissement] = useState('public');
  const [inputCodeEtablissement, setInputCodeEtablissement] = useState('');
  const [inputSituationGeo, setInputSituationGeo] = useState('');
  const [inputAnneeScolaire, setInputAnneeScolaire] = useState('2025-2026');
  const [inputNombreEleves, setInputNombreEleves] = useState('450');
  const [inputNombreEnseignants, setInputNombreEnseignants] = useState('25');
  const [inputDateCreation, setInputDateCreation] = useState('2010-09-15');
  const [inputEmailRecuperation, setInputEmailRecuperation] = useState('');

  // --- PROFIL DU CHEF D'ÉTABLISSEMENT & SESSION ---
  const [infosChef, setInfosChef] = useState(() => safeGetObject('app_chef_profil', {
    civilite: 'M.',
    nom: 'Koffi',
    prenoms: 'Bernard',
    etablissement: '',
    role: 'Chef d’Établissement (Proviseur)',
    photoProfil: '',
    emailSecurite: 'bernard.koffi@chef.ci'
  }));

  useEffect(() => {
    try {
      localStorage.setItem('app_chef_profil', JSON.stringify(infosChef));
    } catch {}
  }, [infosChef]);

  const [modalProfilChefOuvert, setModalProfilChefOuvert] = useState(false);
  const [formProfilChef, setFormProfilChef] = useState({ ...infosChef });
  const [profilChefOuvert, setProfilChefOuvert] = useState(false);
  const profilChefRef = useRef(null);

  // --- SÉCURITÉ : MOT DE PASSE (HARMONISÉ) ---
  const [modalSecurite, setModalSecurite] = useState(false);
  const [ancienMdp, setAncienMdp] = useState('');
  const [nouveauMdp, setNouveauMdp] = useState('');

  // --- MODALE DE CONFIRMATION DE QUITTER L'ÉCOLE ---
  const [modalQuitterEcole, setModalQuitterEcole] = useState(false);

  // --- MENU BURGER FLUIDE POUR LES ONGLETS ---
  const [menuBurgerChefOuvert, setMenuBurgerChefOuvert] = useState(false);
  const menuBurgerChefRef = useRef(null);

  useEffect(() => {
    try {
      if (ecoleConfig) {
        localStorage.setItem('app_chef_ecole_config', JSON.stringify(ecoleConfig));
      } else {
        localStorage.removeItem('app_chef_ecole_config');
      }
    } catch {}
  }, [ecoleConfig]);

  // --- MODALE DE CONFIRMATION DE DÉCONNEXION ---
  const [modalDeconnexion, setModalDeconnexion] = useState(false);

  // --- ÉTATS POUR LA CONFIRMATION D'OUVERTURE / CLÔTURE DE L'ANNÉE SCOLAIRE ---
  const [modalConfirmationActionAnnee, setModalConfirmationActionAnnee] = useState({
    ouvert: false,
    actionType: null 
  });

  // --- ÉTATS POUR LA MODIFICATION DE LA CARTE D'IDENTITÉ DE L'ÉCOLE ---
  const [modeEditionEcole, setModeEditionEcole] = useState(false);
  const [formEcoleEdition, setFormEcoleEdition] = useState(ecoleConfig || {});

  // --- CENSEURS EN ATTENTE DE VALIDATION ---
  const [censeursAffiliations, setCenseursAffiliations] = useState(() => safeGetArray('app_chef_censeurs_affiliations', [
    { id: 1, nomComplet: 'M. Touré Alpha', email: 'toure.alpha@ecole.ci', niveauCharge: '6ème', statut: 'En attente' }
  ]));

  useEffect(() => {
    try {
      localStorage.setItem('app_chef_censeurs_affiliations', JSON.stringify(censeursAffiliations));
    } catch {}
  }, [censeursAffiliations]);

  // --- RAPPORTS ET NOTIFICATIONS ---
  const [rapportsCenseurs, setRapportsCenseurs] = useState(() => safeGetArray('app_chef_rapports_censeurs', []));

  const [notificationsChef, setNotificationsChef] = useState(() => safeGetArray('app_chef_notifications', [
    { id: 1, texte: 'Bienvenue sur votre tableau de bord du réseau de l’établissement.', date: 'Aujourd’hui', lu: false }
  ]));

  useEffect(() => {
    try {
      localStorage.setItem('app_chef_notifications', JSON.stringify(notificationsChef));
    } catch {}
  }, [notificationsChef]);

  const [notifChefOuvert, setNotifChefOuvert] = useState(false);
  const notifChefRef = useRef(null);

  // --- ARCHIVES HISTORIQUES DES ANNÉES PASSÉES & BIBLIOTHÈQUE DE FICHIERS UPLOADÉS ---
  const [archivesHistoriques, setArchivesHistoriques] = useState(() => safeGetArray('app_chef_archives_historiques', [
    { 
      annee: '2024-2025', 
      dateCloture: '30/06/2025', 
      stats: { totalClasses: 12, totalPersonnesConnectees: 28 },
      personnelAdministratif: [
        { id: 101, nom: 'M. Koné Paul', role: 'Éducateur', contact: '0102030405', matricule: 'MAT-991', email: 'kone@ecole.ci', duree: '1 an' }
      ],
      personnelEnseignant: [
        { id: 1, nomComplet: 'M. Kouassi Jean', matiere: 'EPS', niveau: '6ème', dureeService: '1 an' }
      ]
    }
  ]));

  useEffect(() => {
    try {
      localStorage.setItem('app_chef_archives_historiques', JSON.stringify(archivesHistoriques));
    } catch {}
  }, [archivesHistoriques]);

  const [fichiersAdministratifsUploads, setFichiersAdministratifsUploads] = useState(() => safeGetArray('app_chef_fichiers_admin', []));

  useEffect(() => {
    try {
      localStorage.setItem('app_chef_fichiers_admin', JSON.stringify(fichiersAdministratifsUploads));
    } catch {}
  }, [fichiersAdministratifsUploads]);

  // --- PERSONNEL ADMINISTRATIF HORS PLATEFORME ---
  const [personnelAdministratifManuel, setPersonnelAdministratifManuel] = useState(() => safeGetArray('app_chef_personnel_admin_manuel', [
    { id: 1, nomComplet: 'M. Koné Paul', role: 'Éducateur', matricule: 'MAT-1029', contact: '0102030405', email: 'kone.paul@ecole.ci' },
    { id: 2, nomComplet: 'Mme Traoré Aminata', role: 'Secrétaire Générale', matricule: 'MAT-3321', contact: '0708091011', email: 'traore.amina@ecole.ci' }
  ]));

  useEffect(() => {
    try {
      localStorage.setItem('app_chef_personnel_admin_manuel', JSON.stringify(personnelAdministratifManuel));
    } catch {}
  }, [personnelAdministratifManuel]);

  const [nouveauAdminNom, setNouveauAdminNom] = useState('');
  const [nouveauAdminRole, setNouveauAdminRole] = useState('Éducateur');
  const [nouveauAdminMatricule, setNouveauAdminMatricule] = useState('');
  const [nouveauAdminContact, setNouveauAdminContact] = useState('');
  const [nouveauAdminEmail, setNouveauAdminEmail] = useState('');

  // --- FORMULAIRE D'UPLOAD DE FICHIER ---
  const [nomNouveauFichier, setNomNouveauFichier] = useState('');
  const [anneeFichier, setAnneeFichier] = useState('2025-2026');
  const [fichierSelectionneObj, setFichierSelectionneObj] = useState(null);

  const [activeTab, setActiveTab] = useState('profil_ecole');

  // --- ETATS POUR LE FILTRE DES PROFESSEURS & FICHIERS ---
  const [filtreProfMatiere, setFiltreProfMatiere] = useState('TOUTES');
  const [filtreProfNiveau, setFiltreProfNiveau] = useState('TOUS');
  const [filtreProfClasse, setFiltreProfClasse] = useState('TOUTES');

  const [anneeArchiveSelectionnee, setAnneeArchiveSelectionnee] = useState('TOUTES');

  // --- CALCUL AUTOMATIQUE DU NOMBRE DE CLASSES ---
  const nombreClassesAutomatique = useMemo(() => {
    try {
      const programmes = JSON.parse(localStorage.getItem('app_enseignant_programmes_classes')) || {};
      const count = Object.keys(programmes).length;
      return count > 0 ? count : 1;
    } catch {
      return 1;
    }
  }, []);

  // --- SYNCHRONISATION GLOBALE DES PROFESSEURS AFFILIÉS ---
  const listeProfesseursEtablissement = useMemo(() => {
    try {
      const affs = JSON.parse(localStorage.getItem('app_enseignant_affiliations')) || [];
      const profilActuel = JSON.parse(localStorage.getItem('app_enseignant_profil')) || { nom: 'Kouassi', prenoms: 'Jean', matiere: 'EPS', ville: 'Abidjan', emailSecurite: 'jean.kouassi@prof.ci' };
      
      let enseignantsList = affs.map(a => ({
        id: a.id,
        nomComplet: a.enseignant || 'M. Kouassi Jean',
        matiere: profilActuel.matiere || 'EPS',
        niveau: '6ème / 5ème',
        classes: a.classes || ['6ème A', '6ème B'],
        statut: a.statut || 'Validée',
        ecole: a.ecole,
        matricule: 'ENS-8821',
        contact: '0506070809',
        email: profilActuel.emailSecurite || 'jean.kouassi@prof.ci',
        dureeService: '1 an (En cours)'
      }));

      if (enseignantsList.length === 0) {
        enseignantsList.push({
          id: 1,
          nomComplet: 'M. Kouassi Jean',
          matiere: 'EPS',
          niveau: '6ème',
          classes: ['6ème A'],
          statut: 'Validée',
          ecole: ecoleConfig?.nomEcole || 'Lycée Moderne d’Abidjan',
          matricule: 'ENS-8821',
          contact: '0506070809',
          email: 'jean.kouassi@prof.ci',
          dureeService: '1 an (En cours)'
        });
      }

      return enseignantsList.filter(item => item.ecole === ecoleConfig?.nomEcole);
    } catch {
      return [{
        id: 1,
        nomComplet: 'M. Kouassi Jean',
        matiere: 'EPS',
        niveau: '6ème',
        classes: ['6ème A'],
        statut: 'Validée',
        ecole: ecoleConfig?.nomEcole || 'Lycée Moderne d’Abidjan',
        matricule: 'ENS-8821',
        contact: '0506070809',
        email: 'jean.kouassi@prof.ci',
        dureeService: '1 an (En cours)'
      }];
    }
  }, [ecoleConfig]);

  // --- SYNCHRONISATION DES FICHES PÉDAGOGIQUES ---
  const fichesPedagogiquesEcole = useMemo(() => {
    try {
      const archiveCenseur = JSON.parse(localStorage.getItem('app_censeur_archive_ecole')) || [];
      const biblioEnseignant = JSON.parse(localStorage.getItem('app_enseignant_bibliotheque_permanente')) || [];
      
      let fusion = [...archiveCenseur, ...biblioEnseignant];
      if (fusion.length === 0) {
        fusion = [
          { id: 101, enseignant: 'M. Kouassi Jean', matiere: 'EPS', classe: '6ème A', niveau: '6ème', anneeScolaire: '2025-2026', titre: 'Séance d’initiation - Roulement avant', dateValidation: '10/03/2026', details: { habilites: 'Savoir enrouler sa tête.' } }
        ];
      }
      return fusion;
    } catch {
      return [];
    }
  }, []);

  const professeursFiltres = useMemo(() => {
    return listeProfesseursEtablissement.filter(prof => {
      const matchMat = filtreProfMatiere === 'TOUTES' || prof.matiere === filtreProfMatiere;
      const matchNiv = filtreProfNiveau === 'TOUS' || prof.niveau.includes(filtreProfNiveau);
      const matchCl = filtreProfClasse === 'TOUTES' || (prof.classes && prof.classes.includes(filtreProfClasse));
      return matchMat && matchNiv && matchCl;
    });
  }, [listeProfesseursEtablissement, filtreProfMatiere, filtreProfNiveau, filtreProfClasse]);

  const fichesFiltrees = useMemo(() => {
    return fichesPedagogiquesEcole.filter(fiche => {
      const matchMat = filtreProfMatiere === 'TOUTES' || fiche.matiere === filtreProfMatiere;
      const matchNiv = filtreProfNiveau === 'TOUS' || (fiche.niveau && fiche.niveau.includes(filtreProfNiveau));
      const matchCl = filtreProfClasse === 'TOUTES' || fiche.classe === filtreProfClasse;
      return matchMat && matchNiv && matchCl;
    });
  }, [fichesPedagogiquesEcole, filtreProfMatiere, filtreProfNiveau, filtreProfClasse]);

  const statistiquesReseau = useMemo(() => {
    const censeursValidesCount = Array.isArray(censeursAffiliations) ? censeursAffiliations.filter(c => c.statut === 'Validé').length + 1 : 1;
    const enseignantsCount = listeProfesseursEtablissement.length;
    const adminCount = personnelAdministratifManuel.length;

    return {
      totalClasses: nombreClassesAutomatique,
      totalPersonnesConnectees: censeursValidesCount + enseignantsCount + adminCount
    };
  }, [censeursAffiliations, nombreClassesAutomatique, listeProfesseursEtablissement.length, personnelAdministratifManuel.length]);

  const [message, setMessage] = useState('');
  const showToast = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 4000);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profilChefRef.current && !profilChefRef.current.contains(event.target)) {
        setProfilChefOuvert(false);
      }
      if (notifChefRef.current && !notifChefRef.current.contains(event.target)) {
        setNotifChefOuvert(false);
      }
      if (menuBurgerChefRef.current && !menuBurgerChefRef.current.contains(event.target)) {
        setMenuBurgerChefOuvert(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCreerOuConnecterEcole = (e, type) => {
    e.preventDefault();
    if (!inputNomEcole.trim()) {
      showToast("⚠️ Veuillez entrer un nom d'établissement valide.");
      return;
    }

    const fraisCreation = type === 'CREER' ? (inputTypeEtablissement === 'prive' ? '50 000 FCFA' : '25 000 FCFA') : 'Gratuit (Connexion)';

    const nouvelleConfig = {
      nomEcole: inputNomEcole.trim(),
      typeEtablissement: type === 'CREER' ? inputTypeEtablissement : 'inconnu',
      codeEtablissement: inputCodeEtablissement.trim() || 'ETAB-001',
      situationGeo: inputSituationGeo.trim() || 'Non renseignée',
      anneeScolaire: inputAnneeScolaire.trim() || '2025-2026',
      nombreEleves: inputNombreEleves,
      nombreEnseignants: inputNombreEnseignants,
      dateCreation: inputDateCreation,
      anneeOuverte: true,
      fraisPayes: fraisCreation
    };

    setEcoleConfig(nouvelleConfig);
    setFormEcoleEdition(nouvelleConfig);
    setInfosChef(prev => ({ ...prev, etablissement: nouvelleConfig.nomEcole }));
    showToast(type === 'CREER' ? `🏫 Établissement créé avec succès ! Frais de mise en service : ${fraisCreation}` : "🔗 Connecté à l'établissement avec succès !");
  };

  const handleRecuperationCode = (e) => {
    e.preventDefault();
    if (!inputEmailRecuperation.trim()) {
      showToast("⚠️ Veuillez entrer un email de récupération valide.");
      return;
    }
    showToast("📩 Instructions de réinitialisation envoyées à votre email institutionnel.");
    setModeSetup('CONNECTER');
    setInputEmailRecuperation('');
  };

  const handleEnregistrerProfilChef = (e) => {
    e.preventDefault();
    setInfosChef({ ...formProfilChef });
    setModalProfilChefOuvert(false);
    showToast("✅ Profil et photo mis à jour avec succès !");
  };

  const handleChangerPhotoProfilChef = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormProfilChef(prev => ({ ...prev, photoProfil: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleEnregistrerCarteEcole = (e) => {
    e.preventDefault();
    setEcoleConfig(formEcoleEdition);
    setModeEditionEcole(false);
    showToast("✅ Carte d'identité de l'établissement mise à jour avec succès !");
  };

  const executerActionAnneeScolaire = () => {
    const { actionType } = modalConfirmationActionAnnee;
    if (actionType === 'ouvrir') {
      setEcoleConfig(prev => ({ ...prev, anneeOuverte: true }));
      showToast("🚀 Nouvelle année scolaire ouverte et démarrée avec succès ! Statistiques réinitialisées pour la session active.");
    } else if (actionType === 'fermer') {
      try {
        const archiveSession = {
          annee: ecoleConfig.anneeScolaire,
          dateCloture: new Date().toLocaleDateString(),
          stats: statistiquesReseau,
          personnelAdministratif: personnelAdministratifManuel,
          personnelEnseignant: listeProfesseursEtablissement
        };
        setArchivesHistoriques(prev => [...prev, archiveSession]);
      } catch {}

      setEcoleConfig(prev => ({ ...prev, anneeOuverte: false }));
      showToast("🔒 Année scolaire terminée avec succès. Données administratives et pédagogiques archivées à vie.");
    }
    setModalConfirmationActionAnnee({ ouvert: false, actionType: null });
  };

  const validerCenseur = (id) => {
    setCenseursAffiliations(prev => prev.map(c => c.id === id ? { ...c, statut: 'Validé' } : c));
    showToast("✅ Compte censeur validé avec succès sur le réseau !");
  };

  const rejeterCenseur = (id) => {
    setCenseursAffiliations(prev => prev.filter(c => c.id !== id));
    showToast("❌ Demande de censeur rejetée.");
  };

  const ajouterPersonnelAdministratif = (e) => {
    e.preventDefault();
    if (!nouveauAdminNom.trim()) return;
    const nouveau = {
      id: Date.now(),
      nomComplet: nouveauAdminNom.trim(),
      role: nouveauAdminRole,
      matricule: nouveauAdminMatricule.trim() || 'MAT-000',
      contact: nouveauAdminContact.trim() || 'N/A',
      email: nouveauAdminEmail.trim() || 'N/A'
    };
    setPersonnelAdministratifManuel(prev => [...prev, nouveau]);
    setNouveauAdminNom('');
    setNouveauAdminMatricule('');
    setNouveauAdminContact('');
    setNouveauAdminEmail('');
    showToast("✅ Membre du personnel administratif ajouté avec succès !");
  };

  const supprimerPersonnelAdministratif = (id) => {
    setPersonnelAdministratifManuel(prev => prev.filter(p => p.id !== id));
    showToast("🗑️ Membre du personnel retiré.");
  };

  const uploaderFichierAdministratifreel = (e) => {
    e.preventDefault();
    if (!nomNouveauFichier.trim()) {
      showToast("⚠️ Veuillez donner un nom au document.");
      return;
    }
    const nouveauFichier = {
      id: Date.now(),
      nom: nomNouveauFichier.trim(),
      annee: anneeFichier,
      nomFichierReel: fichierSelectionneObj ? fichierSelectionneObj.name : 'Document_officiel.pdf',
      dateAjout: new Date().toLocaleDateString()
    };
    setFichiersAdministratifsUploads(prev => [nouveauFichier, ...prev]);
    setNomNouveauFichier('');
    setFichierSelectionneObj(null);
    showToast("📎 Fichier administratif uploadé et stocké avec succès !");
  };

  // --- SI AUCUN ÉTABLISSEMENT N'EST CONFIGURÉ ---
  if (!ecoleConfig) {
    return (
      <div style={styles.setupContainer}>
        <div style={styles.setupCard}>
          <div style={{ width: '50px', height: '50px', background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', margin: '0 auto 16px auto', boxShadow: '0 8px 16px rgba(37,99,235,0.3)' }}>
            🎓
          </div>
          <h2 style={{ color: '#0f172a', marginBottom: '8px', textAlign: 'center', fontSize: '22px', fontWeight: '800' }}>Espace Chef d'Établissement</h2>
          <p style={{ fontSize: '13px', color: '#64748b', textAlign: 'center', marginBottom: '24px', lineHeight: '1.5' }}>
            Veuillez rattacher votre session à un établissement (Création payante ou Connexion) pour accéder au réseau institutionnel.
          </p>

          {message && <div style={{ ...styles.toastSuccess, marginBottom: '16px' }}>{message}</div>}

          {modeSetup === 'CHOIX' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button onClick={() => setModeSetup('CREER')} className="bouton bouton-principal">
                🏫 Créer un nouvel établissement
              </button>
              <button onClick={() => setModeSetup('CONNECTER')} className="bouton bouton-secondaire">
                🔗 Se connecter à un établissement existant
              </button>
            </div>
          )}

          {modeSetup === 'CREER' && (
            <form onSubmit={(e) => handleCreerOuConnecterEcole(e, 'CREER')} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={styles.label}>Type d'établissement (Tarif variable)</label>
                <select value={inputTypeEtablissement} onChange={(e) => setInputTypeEtablissement(e.target.value)} style={styles.inputStyle}>
                  <option value="public">Établissement Public (25 000 FCFA)</option>
                  <option value="prive">Établissement Privé (50 000 FCFA)</option>
                </select>
              </div>
              <div>
                <label style={styles.label}>Nom complet de l'établissement</label>
                <input type="text" placeholder="Ex: Lycée Moderne..." value={inputNomEcole} onChange={(e) => setInputNomEcole(e.target.value)} style={styles.inputStyle} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={styles.label}>Code Établissement</label>
                  <input type="text" placeholder="Ex: LYM-01" value={inputCodeEtablissement} onChange={(e) => setInputCodeEtablissement(e.target.value)} style={styles.inputStyle} required />
                </div>
                <div>
                  <label style={styles.label}>Année Scolaire</label>
                  <input type="text" value={inputAnneeScolaire} onChange={(e) => setInputAnneeScolaire(e.target.value)} style={styles.inputStyle} required />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={styles.label}>Nombre d'élèves</label>
                  <input type="number" value={inputNombreEleves} onChange={(e) => setInputNombreEleves(e.target.value)} style={styles.inputStyle} required />
                </div>
                <div>
                  <label style={styles.label}>Nombre d'enseignants</label>
                  <input type="number" value={inputNombreEnseignants} onChange={(e) => setInputNombreEnseignants(e.target.value)} style={styles.inputStyle} required />
                </div>
              </div>
              <div>
                <label style={styles.label}>Situation géographique & Date de création</label>
                <input type="text" placeholder="Ex: Abidjan, Cocody..." value={inputSituationGeo} onChange={(e) => setInputSituationGeo(e.target.value)} style={{ ...styles.inputStyle, marginBottom: '6px' }} required />
                <input type="date" value={inputDateCreation} onChange={(e) => setInputDateCreation(e.target.value)} style={styles.inputStyle} required />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button type="button" onClick={() => setModeSetup('CHOIX')} className="bouton bouton-secondaire" style={{ flex: 1 }}>Retour</button>
                <button type="submit" className="bouton bouton-principal" style={{ flex: 1 }}>Payer & Créer</button>
              </div>
            </form>
          )}

          {modeSetup === 'CONNECTER' && (
            <form onSubmit={(e) => handleCreerOuConnecterEcole(e, 'CONNECTER')} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={styles.label}>Nom de l'établissement</label>
                <input type="text" placeholder="Entrez le nom exact..." value={inputNomEcole} onChange={(e) => setInputNomEcole(e.target.value)} style={styles.inputStyle} required />
              </div>
              <div>
                <label style={styles.label}>Code d'accès de l'établissement</label>
                <input type="text" placeholder="Entrez le code secret..." value={inputCodeEtablissement} onChange={(e) => setInputCodeEtablissement(e.target.value)} style={styles.inputStyle} required />
              </div>
              <div>
                <label style={styles.label}>Année Scolaire</label>
                <input type="text" value={inputAnneeScolaire} onChange={(e) => setInputAnneeScolaire(e.target.value)} style={styles.inputStyle} required />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                <button type="button" onClick={() => setModeSetup('OUBLIE_CODE')} style={{ background: 'transparent', border: 'none', color: '#2563eb', fontSize: '12px', fontWeight: '700', cursor: 'pointer', padding: 0 }}>
                  Code d'établissement oublié ?
                </button>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button type="button" onClick={() => setModeSetup('CHOIX')} className="bouton bouton-secondaire" style={{ flex: 1 }}>Retour</button>
                <button type="submit" className="bouton bouton-principal" style={{ flex: 1 }}>Se connecter</button>
              </div>
            </form>
          )}

          {modeSetup === 'OUBLIE_CODE' && (
            <form onSubmit={handleRecuperationCode} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={styles.label}>Email institutionnel de récupération</label>
                <input type="email" placeholder="Entrez votre email..." value={inputEmailRecuperation} onChange={(e) => setInputEmailRecuperation(e.target.value)} style={styles.inputStyle} required />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button type="button" onClick={() => setModeSetup('CONNECTER')} className="bouton bouton-secondaire" style={{ flex: 1 }}>Retour</button>
                <button type="submit" className="bouton bouton-principal" style={{ flex: 1 }}>Réinitialiser le code</button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  // --- DASHBOARD PRINCIPAL DU CHEF D'ÉTABLISSEMENT ---
  return (
    <div style={styles.container}>
      <header style={styles.darkNavbar}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', width: '100%', maxWidth: '1000px', margin: '0 auto' }}>
          
          {/* SECTION PROFIL ÉPURÉE (HARMONISÉE AVEC LES AUTRES DASHBOARDS) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ position: 'relative' }} ref={profilChefRef}>
              <button onClick={() => setProfilChefOuvert(!profilChefOuvert)} style={styles.navbarTeacherClickableBlock}>
                <div style={styles.avatarNavbarContainer}>
                  {infosChef.photoProfil ? (
                    <img src={infosChef.photoProfil} alt="Profil Chef" style={styles.avatarNavbarImg} />
                  ) : (
                    <div style={styles.avatarNavbarPlaceholder}>👤</div>
                  )}
                </div>
                <div style={styles.navbarTeacherInfo}>
                  <span style={{ fontSize: '13px', fontWeight: '900', color: '#ffffff' }}>
                    {infosChef.civilite} {infosChef.nom}
                  </span>
                  <span style={{ fontSize: '10px', fontWeight: '700', color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                    Espace Chef d'Établissement
                  </span>
                </div>
                <span style={{ fontSize: '10px', color: '#94a3b8', marginLeft: '6px' }}>{profilChefOuvert ? '▲' : '▼'}</span>
              </button>

              {profilChefOuvert && (
                <div style={styles.notificationDropdown}>
                  <div style={styles.dropdownHeader}>Mon Compte Directeur</div>
                  <div style={{ padding: '10px', fontSize: '12px', color: '#334155', borderBottom: '1px solid #e2e8f0', marginBottom: '6px', background: '#f8fafc', borderRadius: '8px' }}>
                    <strong>{infosChef.civilite} {infosChef.nom} {infosChef.prenoms}</strong><br />
                    <span style={{ color: '#64748b', fontSize: '11px' }}>{infosChef.etablissement}</span>
                  </div>
                  <button 
                    onClick={() => {
                      setFormProfilChef({ ...infosChef });
                      setModalProfilChefOuvert(true);
                      setProfilChefOuvert(false);
                    }} 
                    style={styles.optionMenu}
                  >
                    ⚙️ Modifier mon profil & photo
                  </button>
                  <button 
                    onClick={() => {
                      setModalSecurite(true);
                      setProfilChefOuvert(false);
                    }} 
                    style={styles.optionMenu}
                  >
                    🔒 Changer mon mot de passe
                  </button>
                  <button 
                    onClick={() => {
                      setModalQuitterEcole(true);
                      setProfilChefOuvert(false);
                    }} 
                    style={{ ...styles.optionMenu, color: '#ef4444', fontWeight: '800' }}
                  >
                    🚪 Quitter l'école
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* NOTIFICATIONS & MENU BURGER */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', position: 'relative' }}>
            
            {/* CLOCHE DE NOTIFICATION */}
            <div style={{ position: 'relative' }} ref={notifChefRef}>
              <button onClick={() => setNotifChefOuvert(!notifChefOuvert)} style={styles.navDarkBtn}>
                <span>🔔</span>
                {notificationsChef.filter(n => !n.lu).length > 0 && <span style={styles.pastilleAlerte}>{notificationsChef.filter(n => !n.lu).length}</span>}
              </button>
              {notifChefOuvert && (
                <div style={styles.notificationDropdownRight}>
                  <div style={styles.dropdownHeader}>Notifications des Rapports</div>
                  {notificationsChef.map(n => (
                    <div key={n.id} style={styles.notifItem}>
                      <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#334155', lineHeight: '1.4' }}>{n.texte}</p>
                      <span style={{ fontSize: '10px', color: '#94a3b8' }}>{n.date}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* BOUTON BURGER */}
            <div style={{ position: 'relative' }} ref={menuBurgerChefRef}>
              <button 
                onClick={() => setMenuBurgerChefOuvert(!menuBurgerChefOuvert)} 
                style={styles.burgerBtn}
                title="Menu des fonctionnalités"
              >
                ☰
              </button>

              {menuBurgerChefOuvert && (
                <div style={styles.burgerDropdown} className="anim-apparition">
                  <div style={styles.dropdownHeader}>Menu Direction</div>
                  <button onClick={() => { setActiveTab('profil_ecole'); setMenuBurgerChefOuvert(false); }} style={styles.optionMenu}>🏛️ Profil & Carte d'Identité École</button>
                  <button onClick={() => { setActiveTab('censeurs'); setMenuBurgerChefOuvert(false); }} style={styles.optionMenu}>👥 Validation des Censeurs</button>
                  <button onClick={() => { setActiveTab('professeurs'); setMenuBurgerChefOuvert(false); }} style={styles.optionMenu}>👨‍🏫 Annuaire & Personnel</button>
                  <button onClick={() => { setActiveTab('fichiers_pedagogiques'); setMenuBurgerChefOuvert(false); }} style={styles.optionMenu}>📚 Fiches Pédagogiques</button>
                  <button onClick={() => { setActiveTab('rapports'); setMenuBurgerChefOuvert(false); }} style={styles.optionMenu}>📈 Rapports Détaillés</button>
                  
                  {/* BOUTON SE DÉCONNECTER DANS LE MENU BURGER */}
                  <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '6px', paddingTop: '6px' }}>
                    <button onClick={() => { setModalDeconnexion(true); setMenuBurgerChefOuvert(false); }} style={{ ...styles.optionMenu, color: '#ef4444', fontWeight: '900', textAlign: 'center' }}>
                      🚪 Se déconnecter
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>
      </header>

      <main style={styles.mainContentBody}>
        {message && <div style={styles.toastSuccess}>{message}</div>}

        {/* MODALE DE CONFIRMATION DE QUITTER L'ÉCOLE */}
        {modalQuitterEcole && (
          <div style={styles.fondModale}>
            <div style={{ ...styles.cardWide, width: '400px', textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#0f172a', fontSize: '18px', fontWeight: '800' }}>⚠️ Quitter l'établissement</h3>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px', lineHeight: '1.5' }}>
                Êtes-vous sûr de vouloir rompre l'affiliation avec <strong>{ecoleConfig?.nomEcole}</strong> ? Vous devrez vous reconnecter ou créer un nouvel établissement pour accéder au réseau.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                <button onClick={() => setModalQuitterEcole(false)} className="bouton bouton-secondaire">Retour (Annuler)</button>
                <button onClick={() => {
                  setModalQuitterEcole(false);
                  setEcoleConfig(null);
                  showToast("🔗 Affiliation avec l'école rompue.");
                }} className="bouton bouton-danger">Oui, quitter l'école</button>
              </div>
            </div>
          </div>
        )}

        {/* MODALE DE CONFIRMATION DE DÉCONNEXION */}
        {modalDeconnexion && (
          <div style={styles.fondModale}>
            <div style={{ ...styles.cardWide, width: '400px', textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#0f172a', fontSize: '18px', fontWeight: '800' }}>🚪 Confirmation de Déconnexion</h3>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px', lineHeight: '1.5' }}>
                Êtes-vous sûr de vouloir vous déconnecter de votre session E-cahier ?
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                <button onClick={() => setModalDeconnexion(false)} className="bouton bouton-secondaire">Annuler</button>
                <button onClick={() => {
                  setModalDeconnexion(false);
                  localStorage.removeItem('app_chef_statut');
                  window.location.reload();
                }} className="bouton bouton-danger">Oui, me déconnecter</button>
              </div>
            </div>
          </div>
        )}

        {/* MODALE DE SÉCURITÉ (CHANGEMENT DE MOT DE PASSE HARMONISÉ) */}
        {modalSecurite && (
          <div style={styles.fondModale}>
            <div style={{ ...styles.cardWide, width: '460px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px', fontWeight: '800' }}>🔒 Changer mon mot de passe</h3>
                <button onClick={() => setModalSecurite(false)} className="bouton bouton-secondaire" style={{ padding: '6px 10px' }}>✕</button>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                if (!ancienMdp || !nouveauMdp) {
                  showToast("⚠️ Veuillez remplir tous les champs de mot de passe.");
                  return;
                }
                showToast("🔒 Mot de passe modifié et sécurisé avec succès !");
                setModalSecurite(false);
                setAncienMdp('');
                setNouveauMdp('');
              }} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={styles.label}>Ancien mot de passe</label>
                  <input type="password" value={ancienMdp} onChange={e => setAncienMdp(e.target.value)} style={styles.inputStyle} required />
                </div>
                <div>
                  <label style={styles.label}>Nouveau mot de passe sécurisé</label>
                  <input type="password" value={nouveauMdp} onChange={e => setNouveauMdp(e.target.value)} style={styles.inputStyle} required />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button type="button" onClick={() => setModalSecurite(false)} className="bouton bouton-secondaire">Annuler</button>
                  <button type="submit" className="bouton bouton-principal">Mettre à jour</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {modalProfilChefOuvert && (
          <div style={styles.fondModale}>
            <div style={{ ...styles.cardWide, width: '480px', maxHeight: '90vh', overflowY: 'auto' }}>
              <h3 style={{ margin: '0 0 16px 0', color: '#0f172a', fontSize: '18px', fontWeight: '800' }}>👤 Paramètres du Profil & Photo</h3>
              
              <form onSubmit={handleEnregistrerProfilChef} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '4px' }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#e2e8f0', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center', border: '2px solid #cbd5e1', flexShrink: 0 }}>
                    {formProfilChef.photoProfil ? (
                      <img src={formProfilChef.photoProfil} alt="Aperçu" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: '28px' }}>👤</span>
                    )}
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Photo de profil</label>
                    <input type="file" accept="image/*" onChange={handleChangerPhotoProfilChef} style={{ fontSize: '12px', cursor: 'pointer' }} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
                  <div>
                    <label style={styles.label}>Civilité</label>
                    <select value={formProfilChef.civilite} onChange={(e) => setFormProfilChef({...formProfilChef, civilite: e.target.value})} style={styles.inputStyle}>
                      <option value="M.">M.</option>
                      <option value="Mme">Mme</option>
                      <option value="Dr">Dr</option>
                    </select>
                  </div>
                  <div>
                    <label style={styles.label}>Nom</label>
                    <input type="text" value={formProfilChef.nom} onChange={(e) => setFormProfilChef({...formProfilChef, nom: e.target.value})} style={styles.inputStyle} required />
                  </div>
                </div>

                <div>
                  <label style={styles.label}>Prénoms</label>
                  <input type="text" value={formProfilChef.prenoms} onChange={(e) => setFormProfilChef({...formProfilChef, prenoms: e.target.value})} style={styles.inputStyle} required />
                </div>

                <div>
                  <label style={styles.label}>Établissement</label>
                  <input type="text" value={formProfilChef.etablissement} onChange={(e) => setFormProfilChef({...formProfilChef, etablissement: e.target.value})} style={styles.inputStyle} required />
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
                  <button type="button" onClick={() => setModalProfilChefOuvert(false)} className="bouton bouton-secondaire">Annuler</button>
                  <button type="submit" className="bouton bouton-principal">Enregistrer</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODALE DE CONFIRMATION AVANT OUVERTURE OU CLÔTURE DE L'ANNÉE SCOLAIRE */}
        {modalConfirmationActionAnnee.ouvert && (
          <div style={styles.fondModale}>
            <div style={{ ...styles.cardWide, width: '420px', textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 10px 0', color: modalConfirmationActionAnnee.actionType === 'fermer' ? '#991b1b' : '#166534', fontSize: '18px', fontWeight: '800' }}>
                {modalConfirmationActionAnnee.actionType === 'fermer' ? '⚠️ Clôturer l’année scolaire ?' : '🟢 Ouvrir une nouvelle année ?'}
              </h3>
              <p style={{ fontSize: '13px', color: '#475569', marginBottom: '20px', lineHeight: '1.5' }}>
                {modalConfirmationActionAnnee.actionType === 'fermer' 
                  ? 'Êtes-vous sûr de vouloir terminer l’année scolaire ? Les statistiques courantes et le personnel actif seront archivés à vie, et l’année sera réinitialisée.' 
                  : 'Êtes-vous sûr de vouloir ouvrir et démarrer les activités pour cette nouvelle année scolaire ?'}
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                <button onClick={() => setModalConfirmationActionAnnee({ ouvert: false, actionType: null })} className="bouton bouton-secondaire">Annuler</button>
                <button 
                  onClick={executerActionAnneeScolaire} 
                  className={`bouton ${modalConfirmationActionAnnee.actionType === 'fermer' ? 'bouton-danger' : 'bouton-succes'}`}
                >
                  {modalConfirmationActionAnnee.actionType === 'fermer' ? 'Oui, fermer l’année' : 'Oui, ouvrir l’année'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '24px' }}>
          <div style={styles.statCard}>
            <div style={{ fontSize: '28px', marginBottom: '10px' }}>🏫</div>
            <h4 style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Nombre total de Classes (Géré automatiquement)</h4>
            <p style={{ fontSize: '30px', fontWeight: '900', color: '#2563eb', margin: 0 }}>{statistiquesReseau.totalClasses}</p>
          </div>
          <div style={styles.statCard}>
            <div style={{ fontSize: '28px', marginBottom: '10px' }}>👥</div>
            <h4 style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Personnes Connectées au Réseau</h4>
            <p style={{ fontSize: '30px', fontWeight: '900', color: '#16a34a', margin: 0 }}>{statistiquesReseau.totalPersonnesConnectees}</p>
          </div>
        </div>

        {/* ONGLET : PROFIL & CARTE D'IDENTITÉ DE L'ÉTABLISSEMENT */}
        {activeTab === 'profil_ecole' && (
          <div style={styles.cardWide}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', margin: '0 0 4px 0' }}>🏛️ Carte d'Identité & Bibliothèque d'Archives de l'Établissement</h2>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Informations officielles modifiables, nombre de classes géré automatiquement, et stockage à vie du savoir pédagogique et administratif.</p>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                {!modeEditionEcole ? (
                  <button onClick={() => setModeEditionEcole(true)} className="bouton bouton-principal" style={{ padding: '10px 20px' }}>
                    ✏️ Modifier le profil école
                  </button>
                ) : (
                  <button onClick={() => setModeEditionEcole(false)} className="bouton bouton-secondaire" style={{ padding: '10px 20px' }}>
                    Annuler
                  </button>
                )}

                {!ecoleConfig.anneeOuverte ? (
                  <button 
                    onClick={() => setModalConfirmationActionAnnee({ ouvert: true, actionType: 'ouvrir' })} 
                    style={styles.boutonPuissantOuvrir}
                  >
                    🟢 Ouvrir l'Année Scolaire
                  </button>
                ) : (
                  <button 
                    onClick={() => setModalConfirmationActionAnnee({ ouvert: true, actionType: 'fermer' })} 
                    style={styles.boutonPuissantFermer}
                  >
                    🔒 Clôturer l'Année Scolaire
                  </button>
                )}
              </div>
            </div>

            {!modeEditionEcole ? (
              <div style={{ backgroundColor: '#f8fafc', padding: '24px', borderRadius: '16px', border: '1px solid #cbd5e1', marginBottom: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={styles.label}>Nom Officiel</label>
                  <p style={{ margin: '4px 0 0 0', fontWeight: '800', fontSize: '15px', color: '#0f172a' }}>{ecoleConfig.nomEcole}</p>
                </div>
                <div>
                  <label style={styles.label}>Code Établissement</label>
                  <p style={{ margin: '4px 0 0 0', fontWeight: '800', fontSize: '15px', color: '#2563eb' }}>{ecoleConfig.codeEtablissement || 'N/A'}</p>
                </div>
                <div>
                  <label style={styles.label}>Type d'Établissement</label>
                  <p style={{ margin: '4px 0 0 0', fontWeight: '800', fontSize: '15px', color: '#0f172a', textTransform: 'uppercase' }}>{ecoleConfig.typeEtablissement || 'Public'}</p>
                </div>
                <div>
                  <label style={styles.label}>Situation Géographique</label>
                  <p style={{ margin: '4px 0 0 0', fontWeight: '800', fontSize: '15px', color: '#0f172a' }}>{ecoleConfig.situationGeo || 'N/A'}</p>
                </div>
                <div>
                  <label style={styles.label}>Nombre de Classes (Automatique)</label>
                  <p style={{ margin: '4px 0 0 0', fontWeight: '800', fontSize: '15px', color: '#2563eb' }}>{nombreClassesAutomatique} classe(s)</p>
                </div>
                <div>
                  <label style={styles.label}>Effectif Élèves</label>
                  <p style={{ margin: '4px 0 0 0', fontWeight: '800', fontSize: '15px', color: '#16a34a' }}>{ecoleConfig.nombreEleves || '450'} élèves</p>
                </div>
                <div>
                  <label style={styles.label}>Corps Enseignant</label>
                  <p style={{ margin: '4px 0 0 0', fontWeight: '800', fontSize: '15px', color: '#16a34a' }}>{ecoleConfig.nombreEnseignants || '25'} enseignants</p>
                </div>
                <div>
                  <label style={styles.label}>Date de Création</label>
                  <p style={{ margin: '4px 0 0 0', fontWeight: '800', fontSize: '15px', color: '#0f172a' }}>{ecoleConfig.dateCreation || '15/09/2010'}</p>
                </div>
                <div>
                  <label style={styles.label}>Statut Année Active</label>
                  <p style={{ margin: '4px 0 0 0', fontWeight: '800', fontSize: '15px', color: ecoleConfig.anneeOuverte ? '#16a34a' : '#ef4444' }}>
                    {ecoleConfig.anneeOuverte ? `Active (${ecoleConfig.anneeScolaire})` : 'Clôturée'}
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleEnregistrerCarteEcole} style={{ backgroundColor: '#f8fafc', padding: '24px', borderRadius: '16px', border: '1px solid #2563eb', marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                  <div>
                    <label style={styles.label}>Nom Officiel (Modifiable)</label>
                    <input type="text" value={formEcoleEdition.nomEcole || ''} onChange={(e) => setFormEcoleEdition({...formEcoleEdition, nomEcole: e.target.value})} style={styles.inputStyle} required />
                  </div>
                  <div>
                    <label style={styles.label}>Code Établissement (Modifiable)</label>
                    <input type="text" value={formEcoleEdition.codeEtablissement || ''} onChange={(e) => setFormEcoleEdition({...formEcoleEdition, codeEtablissement: e.target.value})} style={styles.inputStyle} required />
                  </div>
                  <div>
                    <label style={styles.label}>Situation Géographique (Modifiable)</label>
                    <input type="text" value={formEcoleEdition.situationGeo || ''} onChange={(e) => setFormEcoleEdition({...formEcoleEdition, situationGeo: e.target.value})} style={styles.inputStyle} required />
                  </div>
                  <div>
                    <label style={styles.label}>Nombre de Classes (Géré automatiquement)</label>
                    <input type="text" value={`${nombreClassesAutomatique} classe(s) (Auto)`} disabled style={{ ...styles.inputStyle, backgroundColor: '#f1f5f9', color: '#64748b' }} />
                  </div>
                  <div>
                    <label style={styles.label}>Effectif Élèves</label>
                    <input type="number" value={formEcoleEdition.nombreEleves || ''} onChange={(e) => setFormEcoleEdition({...formEcoleEdition, nombreEleves: e.target.value})} style={styles.inputStyle} required />
                  </div>
                  <div>
                    <label style={styles.label}>Corps Enseignant</label>
                    <input type="number" value={formEcoleEdition.nombreEnseignants || ''} onChange={(e) => setFormEcoleEdition({...formEcoleEdition, nombreEnseignants: e.target.value})} style={styles.inputStyle} required />
                  </div>
                  <div>
                    <label style={styles.label}>Date de Création</label>
                    <input type="date" value={formEcoleEdition.dateCreation || ''} onChange={(e) => setFormEcoleEdition({...formEcoleEdition, dateCreation: e.target.value})} style={styles.inputStyle} required />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button type="button" onClick={() => setModeEditionEcole(false)} className="bouton bouton-secondaire">Annuler</button>
                  <button type="submit" className="bouton bouton-principal">Enregistrer les modifications</button>
                </div>
              </form>
            )}

            {/* SECTION UPLOAD DE FICHIERS ADMINISTRATIFS */}
            <div style={{ backgroundColor: '#eff6ff', padding: '20px', borderRadius: '16px', border: '1px solid #bfdbfe', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#1e3a8a', marginBottom: '8px' }}>📤 Uploader un Fichier Administratif ou Pédagogique</h3>
              <p style={{ fontSize: '12px', color: '#1e40af', marginBottom: '12px' }}>Sélectionnez, nommez et stockez les documents officiels de l'établissement par année.</p>
              
              <form onSubmit={uploaderFichierAdministratifreel} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                <input 
                  type="text" 
                  placeholder="Nom du document (ex: Décision rectorat, Bilan...)" 
                  value={nomNouveauFichier} 
                  onChange={(e) => setNomNouveauFichier(e.target.value)} 
                  style={{ ...styles.inputStyle, flex: '2 1 200px', margin: 0 }} 
                  required 
                />
                <select value={anneeFichier} onChange={(e) => setAnneeFichier(e.target.value)} style={{ ...styles.inputStyle, flex: '1 1 130px', margin: 0 }}>
                  <option value="2025-2026">2025-2026</option>
                  <option value="2024-2025">2024-2025</option>
                  <option value="2023-2024">2023-2024</option>
                </select>
                <input 
                  type="file" 
                  onChange={(e) => setFichierSelectionneObj(e.target.files[0])} 
                  style={{ fontSize: '12px', flex: '1 1 180px' }} 
                  required 
                />
                <button type="submit" className="bouton bouton-principal" style={{ flexShrink: 0 }}>Uploader & Stocker</button>
              </form>

              {fichiersAdministratifsUploads.length > 0 && (
                <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <strong style={{ fontSize: '12px', color: '#1e3a8a' }}>Documents administratifs stockés :</strong>
                  {fichiersAdministratifsUploads.map(f => (
                    <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: '8px 12px', borderRadius: '8px', border: '1px solid #bfdbfe', fontSize: '12px' }}>
                      <span>📄 <strong>{f.nom}</strong> [Fichier: {f.nomFichierReel}] ({f.annee}) - Ajouté le {f.dateAjout}</span>
                      <button onClick={() => showToast(`📥 Téléchargement de ${f.nom}...`)} className="bouton bouton-secondaire" style={{ padding: '4px 8px', fontSize: '11px' }}>Télécharger</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SECTION MENU DÉROULANT DES ARCHIVES HISTORIQUES DES ANNÉES PASSÉES */}
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: 0 }}>📁 Menu Historique des Années Passées & Savoir Pédagogique (À vie)</h3>
                
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <label style={{ fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase' }}>Filtrer par Année :</label>
                  <select 
                    value={anneeArchiveSelectionnee} 
                    onChange={(e) => setAnneeArchiveSelectionnee(e.target.value)} 
                    style={{ ...styles.inputStyle, width: '160px', padding: '8px' }}
                  >
                    <option value="TOUTES">Toutes les années</option>
                    {archivesHistoriques.map((arch, index) => (
                      <option key={index} value={arch.annee}>{arch.annee}</option>
                    ))}
                  </select>
                </div>
              </div>

              {archivesHistoriques.length === 0 ? (
                <p style={{ fontStyle: 'italic', color: '#64748b', fontSize: '13px' }}>Aucune archive historique enregistrée pour l'instant.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {archivesHistoriques
                    .filter(arch => anneeArchiveSelectionnee === 'TOUTES' || arch.annee === anneeArchiveSelectionnee)
                    .map((arch, idx) => (
                      <div key={idx} style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '14px', padding: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <strong style={{ color: '#0f172a', fontSize: '15px' }}>📅 Année Scolaire : {arch.annee}</strong>
                          <span style={{ fontSize: '11px', color: '#64748b', backgroundColor: '#e2e8f0', padding: '2px 8px', borderRadius: '6px' }}>Clôturée le {arch.dateCloture}</span>
                        </div>
                        <p style={{ fontSize: '12px', color: '#475569', marginBottom: '12px' }}>
                          Classes enregistrées : <strong>{arch.stats.totalClasses}</strong> | Effectif réseau : <strong>{arch.stats.totalPersonnesConnectees}</strong>
                        </p>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                          <div style={{ backgroundColor: '#fff', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                            <strong style={{ fontSize: '12px', color: '#2563eb', display: 'block', marginBottom: '6px' }}>👥 Personnel Enseignant ({arch.annee}) :</strong>
                            {arch.personnelEnseignant && arch.personnelEnseignant.length > 0 ? (
                              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#334155' }}>
                                {arch.personnelEnseignant.map(p => (
                                  <li key={p.id}><strong>{p.nomComplet}</strong> — {p.matiere} (Niveau: {p.niveau}, Durée: {p.dureeService})</li>
                                ))}
                              </ul>
                            ) : (
                              <p style={{ margin: 0, fontSize: '12px', fontStyle: 'italic', color: '#64748b' }}>Aucun enseignant archivé.</p>
                            )}
                          </div>

                          <div style={{ backgroundColor: '#fff', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                            <strong style={{ fontSize: '12px', color: '#16a34a', display: 'block', marginBottom: '6px' }}>🏛️ Personnel Administratif ({arch.annee}) :</strong>
                            {arch.personnelAdministratif && arch.personnelAdministratif.length > 0 ? (
                              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#334155' }}>
                                {arch.personnelAdministratif.map(p => (
                                  <li key={p.id}><strong>{p.nom}</strong> — {p.role} (Matricule: {p.matricule || 'N/A'}, Contact: {p.contact || 'N/A'}, Email: {p.email || 'N/A'}, Durée: {p.duree})</li>
                                ))}
                              </ul>
                            ) : (
                              <p style={{ margin: 0, fontSize: '12px', fontStyle: 'italic', color: '#64748b' }}>Aucun personnel administratif archivé.</p>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <button onClick={() => showToast(`📥 Téléchargement de l'archive complète ${arch.annee} en PDF...`)} className="bouton bouton-principal" style={{ padding: '6px 12px', fontSize: '12px' }}>
                            📥 Télécharger le dossier d'archive ({arch.annee}) en PDF
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ONGLET : VALIDATION DES CENSEURS */}
        {activeTab === 'censeurs' && (
          <div style={styles.cardWide}>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', marginBottom: '6px' }}>👥 Validation des Affiliations des Censeurs</h2>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>En tant que chef d'établissement, validez l'accès des censeurs au réseau de l'école.</p>

            {censeursAffiliations.length === 0 ? (
              <p style={{ fontStyle: 'italic', color: '#64748b', fontSize: '13px', padding: '12px 0' }}>Aucune demande de censeur en attente.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {censeursAffiliations.map(censeur => (
                  <div key={censeur.id} style={styles.itemRow}>
                    <div>
                      <strong style={{ color: '#0f172a', fontSize: '14px' }}>{censeur.nomComplet}</strong> <span style={{ color: '#64748b', fontSize: '12px' }}>({censeur.email})</span><br />
                      <small style={{ color: '#64748b', fontSize: '12px' }}>Niveau en charge : <strong>{censeur.niveauCharge}</strong> | Statut : <span style={{ color: censeur.statut === 'Validé' ? '#16a34a' : '#d97706', fontWeight: '700' }}>{censeur.statut}</span></small>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {censeur.statut !== 'Validé' && (
                        <button onClick={() => validerCenseur(censeur.id)} className="bouton bouton-succes" style={{ padding: '6px 12px', fontSize: '12px' }}>Valider</button>
                      )}
                      <button onClick={() => rejeterCenseur(censeur.id)} className="bouton bouton-danger" style={{ padding: '6px 12px', fontSize: '12px' }}>Rejeter</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ONGLET : ANNUAIRE & PERSONNEL */}
        {activeTab === 'professeurs' && (
          <div style={styles.cardWide}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 }}>👨‍🏫 Annuaire Détaillé du Personnel (Enseignant & Administratif)</h2>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>Gérez le corps professoral et ajoutez manuellement les éducateurs, intendants et secrétaires.</p>
              </div>
            </div>

            {/* FORMULAIRE D'AJOUT DE PERSONNEL ADMINISTRATIF */}
            <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', marginBottom: '8px' }}>+ Ajouter un membre du personnel administratif (Éducateur, Intendant, Secrétaire...)</h3>
              <form onSubmit={ajouterPersonnelAdministratif} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <input 
                  type="text" 
                  placeholder="Nom et prénoms..." 
                  value={nouveauAdminNom} 
                  onChange={(e) => setNouveauAdminNom(e.target.value)} 
                  style={{ ...styles.inputStyle, flex: '2 1 180px', margin: 0 }} 
                  required 
                />
                <select value={nouveauAdminRole} onChange={(e) => setNouveauAdminRole(e.target.value)} style={{ ...styles.inputStyle, flex: '1 1 130px', margin: 0 }}>
                  <option value="Éducateur">Éducateur</option>
                  <option value="Intendant">Intendant</option>
                  <option value="Secrétaire">Secrétaire</option>
                  <option value="Surveillant">Surveillant</option>
                  <option value="Économe">Économe</option>
                </select>
                <input 
                  type="text" 
                  placeholder="Numéro Matricule (ex: MAT-1234)" 
                  value={nouveauAdminMatricule} 
                  onChange={(e) => setNouveauAdminMatricule(e.target.value)} 
                  style={{ ...styles.inputStyle, flex: '1 1 140px', margin: 0 }} 
                  required 
                />
                <input 
                  type="text" 
                  placeholder="Contact (ex: 0102030405)" 
                  value={nouveauAdminContact} 
                  onChange={(e) => setNouveauAdminContact(e.target.value)} 
                  style={{ ...styles.inputStyle, flex: '1 1 130px', margin: 0 }} 
                />
                <input 
                  type="email" 
                  placeholder="Email professionnel..." 
                  value={nouveauAdminEmail} 
                  onChange={(e) => setNouveauAdminEmail(e.target.value)} 
                  style={{ ...styles.inputStyle, flex: '1 1 160px', margin: 0 }} 
                />
                <button type="submit" className="bouton bouton-principal" style={{ flexShrink: 0 }}>Ajouter</button>
              </form>

              {personnelAdministratifManuel.length > 0 && (
                <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <strong style={{ fontSize: '11px', color: '#475569', textTransform: 'uppercase' }}>Personnel administratif enregistré:</strong>
                  {personnelAdministratifManuel.map(p => (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px', flexWrap: 'wrap', gap: '8px' }}>
                      <span>👤 <strong>{p.nomComplet}</strong> — Rôle : <em>{p.role}</em> | Matricule : <strong>{p.matricule || 'N/A'}</strong> | Contact : {p.contact} | Email : {p.email}[span_0](start_span)[span_0](end_span)</span>
                      <button onClick={() => supprimerPersonnelAdministratif(p.id)} className="bouton bouton-danger" style={{ padding: '2px 8px', fontSize: '11px' }}>Supprimer</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* FILTRES DE CLASSEMENT POUR LE PERSONNEL ENSEIGNANT */}
            <div style={styles.bibliothequeFilterBox}>
              <div style={{ flex: '1 1 180px' }}>
                <label style={styles.labelFiltre}>Matière</label>
                <select value={filtreProfMatiere} onChange={(e) => setFiltreProfMatiere(e.target.value)} style={styles.inputStyle}>
                  <option value="TOUTES">Toutes les matières</option>
                  <option value="EPS">EPS</option>
                  <option value="Mathématiques">Mathématiques</option>
                  <option value="Français">Français</option>
                </select>
              </div>
              <div style={{ flex: '1 1 180px' }}>
                <label style={styles.labelFiltre}>Niveau</label>
                <select value={filtreProfNiveau} onChange={(e) => setFiltreProfNiveau(e.target.value)} style={styles.inputStyle}>
                  <option value="TOUS">Tous les niveaux</option>
                  <option value="6ème">6ème</option>
                  <option value="5ème">5ème</option>
                </select>
              </div>
              <div style={{ flex: '1 1 180px' }}>
                <label style={styles.labelFiltre}>Classe</label>
                <select value={filtreProfClasse} onChange={(e) => setFiltreProfClasse(e.target.value)} style={styles.inputStyle}>
                  <option value="TOUTES">Toutes les classes</option>
                  <option value="6ème A">6ème A</option>
                  <option value="6ème B">6ème B</option>
                </select>
              </div>
            </div>

            {professeursFiltres.length === 0 ? (
              <p style={{ fontStyle: 'italic', color: '#64748b', textAlign: 'center', padding: '30px' }}>Aucun professeur trouvé avec ces filtres.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                {professeursFiltres.map(prof => (
                  <div key={prof.id} style={styles.itemRow}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ backgroundColor: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700' }}>{prof.matiere}</span>
                        <strong style={{ fontSize: '14px', color: '#0f172a' }}>{prof.nomComplet}</strong>
                      </div>
                      <p style={{ fontSize: '12px', color: '#475569', margin: 0 }}>
                        Matricule : <strong>{prof.matricule}</strong> | Contact : {prof.contact} | Email : {prof.email} | Classes : <strong>{prof.classes ? prof.classes.join(', ') : 'N/A'}</strong>[span_1](start_span)[span_1](end_span)
                      </p>
                    </div>
                    <div>
                      <button onClick={() => showToast(`✉️ Message envoyé à ${prof.nomComplet}`)} className="bouton bouton-secondaire" style={{ padding: '6px 12px', fontSize: '12px' }}>
                        ✉️ Contacter
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ONGLET : FICHES PÉDAGOGIQUES DES ENSEIGNANTS */}
        {activeTab === 'fichiers_pedagogiques' && (
          <div style={styles.cardWide}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 }}>📚 Fiches Pédagogiques & Savoir Enseigné</h2>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>Retrouvez et filtrez toutes les fiches pédagogiques validées et dispensées dans l'école.</p>
              </div>
            </div>

            <div style={styles.bibliothequeFilterBox}>
              <div style={{ flex: '1 1 180px' }}>
                <label style={styles.labelFiltre}>Matière</label>
                <select value={filtreProfMatiere} onChange={(e) => setFiltreProfMatiere(e.target.value)} style={styles.inputStyle}>
                  <option value="TOUTES">Toutes les matières</option>
                  <option value="EPS">EPS</option>
                  <option value="Mathématiques">Mathématiques</option>
                  <option value="Français">Français</option>
                </select>
              </div>
              <div style={{ flex: '1 1 180px' }}>
                <label style={styles.labelFiltre}>Niveau</label>
                <select value={filtreProfNiveau} onChange={(e) => setFiltreProfNiveau(e.target.value)} style={styles.inputStyle}>
                  <option value="TOUS">Tous les niveaux</option>
                  <option value="6ème">6ème</option>
                  <option value="5ème">5ème</option>
                </select>
              </div>
              <div style={{ flex: '1 1 180px' }}>
                <label style={styles.labelFiltre}>Classe</label>
                <select value={filtreProfClasse} onChange={(e) => setFiltreProfClasse(e.target.value)} style={styles.inputStyle}>
                  <option value="TOUTES">Toutes les classes</option>
                  <option value="6ème A">6ème A</option>
                  <option value="6ème B">6ème B</option>
                </select>
              </div>
            </div>

            {fichesFiltrees.length === 0 ? (
              <p style={{ fontStyle: 'italic', color: '#64748b', textAlign: 'center', padding: '30px' }}>Aucune fiche pédagogique trouvée avec ces filtres.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                {fichesFiltrees.map(fiche => (
                  <div key={fiche.id} style={styles.itemRow}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ backgroundColor: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700' }}>{fiche.matiere}</span>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>({fiche.classe} - {fiche.anneeScolaire})</span>
                        <strong style={{ fontSize: '14px', color: '#0f172a' }}>{fiche.titre}</strong>
                      </div>
                      <p style={{ fontSize: '12px', color: '#475569', margin: 0 }}>
                        Enseignant : <strong>{fiche.enseignant}</strong> | Validé le : {fiche.dateValidation}
                      </p>
                    </div>
                    <div>
                      <button onClick={() => showToast(`📥 Téléchargement de la fiche "${fiche.titre}" en PDF...`)} className="bouton bouton-principal" style={{ padding: '6px 12px', fontSize: '12px' }}>
                        📥 Télécharger (PDF)
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ONGLET : RAPPORTS DÉTAILLÉS DES CENSEURS */}
        {activeTab === 'rapports' && (
          <div style={styles.cardWide}>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', marginBottom: '6px' }}>📈 Rapports Détaillés des Censeurs</h2>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>Visualisez ou téléchargez les synthèses analytiques et fiches détaillées transmises par les censeurs.</p>

            {rapportsCenseurs.length === 0 ? (
              <p style={{ fontStyle: 'italic', color: '#64748b', fontSize: '13px', padding: '12px 0' }}>Aucun rapport reçu pour l'instant.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {rapportsCenseurs.map((rapport, index) => (
                  <div key={index} style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                        <strong style={{ color: '#0f172a' }}>Censeur : {rapport.censeur}</strong>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>({rapport.date})</span>
                      </div>
                      <p style={{ fontSize: '13px', color: '#334155', margin: '2px 0' }}>Classes concernées : <strong>{rapport.classes.join(', ')}</strong></p>
                      <div style={{ display: 'flex', gap: '16px', marginTop: '6px', fontSize: '12px' }}>
                        <span style={{ color: '#16a34a', fontWeight: '700' }}>✔ Total validées : {rapport.totalValidees}</span>
                        <span style={{ color: '#d97706', fontWeight: '700' }}>⏳ Total en attente : {rapport.totalEnAttente}</span>
                      </div>
                    </div>
                    <div>
                      <button 
                        onClick={() => showToast(`📥 Téléchargement du rapport détaillé de ${rapport.censeur} en PDF...`)} 
                        className="bouton bouton-principal" 
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                      >
                        📥 Télécharger le rapport (PDF)
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// =========================================================================
// 8. STYLES SÉCURISÉS ET HARMONISÉS (STYLE INSTAGRAM / HAUT DE GAMME)
// =========================================================================
const styles = {
  container: { backgroundColor: '#f8fafc', minHeight: '100vh', color: '#1e293b', paddingBottom: '40px' },
  setupContainer: { backgroundColor: '#0f172a', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' },
  setupCard: { backgroundColor: '#ffffff', padding: '40px', borderRadius: '24px', width: '100%', maxWidth: '440px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid #334155' },
  darkNavbar: { backgroundColor: '#0f172a', color: '#ffffff', padding: '16px 24px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', borderBottom: '1px solid #1e293b', position: 'sticky', top: '0', zIndex: 30 },
  mainContentBody: { padding: '30px 20px', maxWidth: '1200px', margin: '0 auto' },
  cardWide: { backgroundColor: '#ffffff', padding: '32px', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' },
  statCard: { backgroundColor: '#ffffff', padding: '24px', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' },
  itemRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: '14px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', gap: '12px' },
  label: { display: 'block', fontSize: '11px', fontWeight: '800', color: '#475569', marginBottom: '6px', textTransform: 'uppercase' },
  labelFiltre: { display: 'block', fontSize: '11px', fontWeight: '800', color: '#475569', marginBottom: '6px', textTransform: 'uppercase' },
  inputStyle: { width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff', color: '#1e293b', outline: 'none', boxSizing: 'border-box' },
  toastSuccess: { backgroundColor: '#0f172a', color: '#f8fafc', padding: '14px 20px', borderRadius: '12px', marginBottom: '20px', fontSize: '13px', fontWeight: '700', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' },
  navbarTeacherClickableBlock: { display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#1e293b', padding: '6px 12px', borderRadius: '12px', border: '1px solid #334155', cursor: 'pointer', textAlign: 'left' },
  avatarNavbarContainer: { width: '34px', height: '34px', borderRadius: '50%', overflow: 'hidden', backgroundColor: '#334155', display: 'flex', justifyContent: 'center', alignItems: 'center', border: '1px solid #475569', flexShrink: 0 },
  avatarNavbarImg: { width: '100%', height: '100%', objectFit: 'cover' },
  avatarNavbarPlaceholder: { fontSize: '16px', color: '#94a3b8' },
  navbarTeacherInfo: { display: 'flex', flexDirection: 'column' },
  notificationDropdown: { position: 'absolute', top: '50px', right: 0, backgroundColor: '#ffffff', borderRadius: '16px', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.15)', border: '1px solid #e2e8f0', width: '280px', zIndex: 100, padding: '12px' },
  notificationDropdownRight: { position: 'absolute', top: '50px', right: 0, backgroundColor: '#ffffff', borderRadius: '16px', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.15)', border: '1px solid #e2e8f0', width: '280px', zIndex: 100, padding: '12px' },
  dropdownHeader: { padding: '6px 8px', fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0', marginBottom: '8px' },
  optionMenu: { width: '100%', textAlign: 'left', padding: '10px 14px', background: 'transparent', border: 'none', color: '#334155', fontSize: '13px', fontWeight: '700', cursor: 'pointer', borderRadius: '8px', marginBottom: '4px' },
  notifItem: { backgroundColor: '#f8fafc', padding: '10px', borderRadius: '10px', fontSize: '12px', marginBottom: '6px', border: '1px solid #f1f5f9' },
  navDarkBtn: { backgroundColor: '#1e293b', color: '#f8fafc', border: '1px solid #334155', padding: '8px 14px', borderRadius: '12px', cursor: 'pointer', fontWeight: '700', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' },
  fondModale: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '16px' },
  pastilleAlerte: { backgroundColor: '#ef4444', color: 'white', padding: '2px 6px', borderRadius: '999px', fontSize: '10px', fontWeight: '800' },
  burgerBtn: { backgroundColor: '#2563eb', color: '#ffffff', border: 'none', padding: '8px 12px', borderRadius: '10px', fontSize: '16px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(37,99,235,0.3)' },
  burgerDropdown: { position: 'absolute', top: '50px', right: 0, backgroundColor: '#ffffff', borderRadius: '16px', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.15)', border: '1px solid #e2e8f0', width: '280px', zIndex: 120, padding: '12px', display: 'flex', flexDirection: 'column', gap: '4px' },
  boutonPuissantOuvrir: { background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)', color: '#ffffff', border: 'none', padding: '12px 24px', borderRadius: '14px', fontWeight: '900', fontSize: '14px', cursor: 'pointer', boxShadow: '0 10px 20px rgba(22,163,74,0.3)', transition: 'transform 0.2s ease' },
  boutonPuissantFermer: { background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)', color: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 10px 20px rgba(220,38,38,0.3)', transition: 'transform 0.2s ease' }
};
