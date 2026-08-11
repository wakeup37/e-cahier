import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from './AppRouter'; 

// =========================================================================
// ÉTAPE 1/N — ÉTABLISSEMENT + PROFIL CHEF BRANCHÉS SUR SUPABASE
// Ce qui a changé par rapport à votre fichier :
//   - ecoleConfig ne vient plus de localStorage, mais de la vraie affiliation
//     ACTIVE du chef connecté (table affiliations_etablissement + etablissements)
//   - infosChef vient de utilisateurs_profils, plus de localStorage
//   - handleCreerOuConnecterEcole fait un vrai insert Supabase
// Ce qui n'est PAS encore branché dans cette étape (encore en localStorage,
// on les fait dans les étapes suivantes) : censeursAffiliations, rapports,
// notifications, archives, fichiers administratifs, personnel manuel,
// liste des professeurs, fiches pédagogiques.
// =========================================================================

const safeGetArray = (key, defaultArr = []) => {
  try {
    const item = localStorage.getItem(key);
    if (!item) return defaultArr;
    const parsed = JSON.parse(item);
    return Array.isArray(parsed) ? parsed : defaultArr;
  } catch { return defaultArr; }
};

export default function ChefEtablissementDashboard() {

  // --- ÉTATS GLOBAUX ---
  const [chargementInitial, setChargementInitial] = useState(true);
  const [userId, setUserId] = useState(null);
  const [affiliationChef, setAffiliationChef] = useState(null); // ligne affiliations_etablissement (role CHEF, statut ACTIVE)
  const [ecoleConfig, setEcoleConfig] = useState(null);          // ligne etablissements correspondante
  const [modeSetup, setModeSetup] = useState('CHOIX');

  const [inputNomEcole, setInputNomEcole] = useState('');
  const [inputTypeEtablissement, setInputTypeEtablissement] = useState('public');
  const [inputCodeEtablissement, setInputCodeEtablissement] = useState('');
  const [inputSituationGeo, setInputSituationGeo] = useState('');
  const [inputAnneeScolaire, setInputAnneeScolaire] = useState('2025-2026');
  const [inputNombreEleves, setInputNombreEleves] = useState('450');
  const [inputNombreEnseignants, setInputNombreEnseignants] = useState('25');
  const [inputEmailRecuperation, setInputEmailRecuperation] = useState('');

  const [infosChef, setInfosChef] = useState({
    civilite: 'M.', nom: '', prenoms: '', etablissement: '', role: 'Chef d\u2019Établissement', photoProfil: '', emailSecurite: ''
  });

  const [modalProfilChefOuvert, setModalProfilChefOuvert] = useState(false);
  const [formProfilChef, setFormProfilChef] = useState({ ...infosChef });
  const [profilChefOuvert, setProfilChefOuvert] = useState(false);
  const profilChefRef = useRef(null);

  const [modalSecurite, setModalSecurite] = useState(false);
  const [ancienMdp, setAncienMdp] = useState('');
  const [nouveauMdp, setNouveauMdp] = useState('');

  const [modalQuitterEcole, setModalQuitterEcole] = useState(false);
  const [modalDeconnexion, setModalDeconnexion] = useState(false);

  const [menuBurgerChefOuvert, setMenuBurgerChefOuvert] = useState(false);
  const menuBurgerChefRef = useRef(null);

  const [modalConfirmationActionAnnee, setModalConfirmationActionAnnee] = useState({ ouvert: false, actionType: null });
  const [modeEditionEcole, setModeEditionEcole] = useState(false);
  const [formEcoleEdition, setFormEcoleEdition] = useState({});

  // --- CE QUI RESTE EN LOCALSTORAGE POUR L'INSTANT (étapes suivantes) ---
  const [censeursAffiliations, setCenseursAffiliations] = useState(() => safeGetArray('app_chef_censeurs_affiliations', []));
  const [rapportsCenseurs, setRapportsCenseurs] = useState(() => safeGetArray('app_chef_rapports_censeurs', []));
  const [notificationsChef, setNotificationsChef] = useState(() => safeGetArray('app_chef_notifications', []));
  const [notifChefOuvert, setNotifChefOuvert] = useState(false);
  const notifChefRef = useRef(null);
  const [archivesHistoriques, setArchivesHistoriques] = useState(() => safeGetArray('app_chef_archives_historiques', []));
  const [fichiersAdministratifsUploads, setFichiersAdministratifsUploads] = useState(() => safeGetArray('app_chef_fichiers_admin', []));
  const [personnelAdministratifManuel, setPersonnelAdministratifManuel] = useState(() => safeGetArray('app_chef_personnel_admin_manuel', []));
  const [nouveauAdminNom, setNouveauAdminNom] = useState('');
  const [nouveauAdminRole, setNouveauAdminRole] = useState('Éducateur');
  const [nouveauAdminMatricule, setNouveauAdminMatricule] = useState('');
  const [nouveauAdminContact, setNouveauAdminContact] = useState('');
  const [nouveauAdminEmail, setNouveauAdminEmail] = useState('');
  const [nomNouveauFichier, setNomNouveauFichier] = useState('');
  const [anneeFichier, setAnneeFichier] = useState('2025-2026');
  const [fichierSelectionneObj, setFichierSelectionneObj] = useState(null);
  const [activeTab, setActiveTab] = useState('profil_ecole');
  const [filtreProfMatiere, setFiltreProfMatiere] = useState('TOUTES');
  const [filtreProfNiveau, setFiltreProfNiveau] = useState('TOUS');
  const [filtreProfClasse, setFiltreProfClasse] = useState('TOUTES');

  const [message, setMessage] = useState('');
  const showToast = (msg) => { setMessage(msg); setTimeout(() => setMessage(''), 4000); };

  // =========================================================================
  // CHARGEMENT INITIAL — remplace tous les safeGetObject('app_chef_...')
  // =========================================================================
  useEffect(() => {
    const chargerDonnees = async () => {
      const { data: { user }, error: erreurUser } = await supabase.auth.getUser();
      if (erreurUser || !user) {
        showToast("⚠️ Session expirée, veuillez vous reconnecter.");
        setChargementInitial(false);
        return;
      }
      setUserId(user.id);

      // 1. Profil (utilisateurs_profils)
      const { data: profil, error: erreurProfil } = await supabase
        .from('utilisateurs_profils')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (erreurProfil) {
        showToast("⚠️ Impossible de charger le profil : " + erreurProfil.message);
      } else if (profil) {
        setInfosChef(prev => ({
          ...prev,
          nom: profil.nom,
          prenoms: profil.prenom,
          emailSecurite: user.email,
        }));
        setFormProfilChef(prev => ({ ...prev, nom: profil.nom, prenoms: profil.prenom }));
      }

      // 2. Affiliation CHEF active (affiliations_etablissement)
      const { data: affiliation, error: erreurAffiliation } = await supabase
        .from('affiliations_etablissement')
        .select('*, etablissements(*)')
        .eq('user_id', user.id)
        .eq('role', 'CHEF')
        .eq('statut', 'ACTIVE')
        .maybeSingle();

      if (erreurAffiliation) {
        showToast("⚠️ Erreur de chargement de l'établissement : " + erreurAffiliation.message);
      } else if (affiliation) {
        setAffiliationChef(affiliation);
        setEcoleConfig(affiliation.etablissements);
        setFormEcoleEdition(affiliation.etablissements);
        setInfosChef(prev => ({ ...prev, etablissement: affiliation.etablissements?.nom }));
      }
      // Si affiliation est null : le chef n'a pas encore d'établissement actif
      // → on reste sur l'écran de setup (CHOIX/CREER/CONNECTER), comportement identique à avant.

      setChargementInitial(false);
    };

    chargerDonnees();
  }, []);

  // =========================================================================
  // CRÉATION / CONNEXION À UN ÉTABLISSEMENT — remplace handleCreerOuConnecterEcole
  // =========================================================================
  const handleCreerEcole = async (e) => {
    e.preventDefault();
    if (!inputNomEcole.trim()) { showToast("⚠️ Veuillez entrer un nom valide."); return; }
    if (!userId) { showToast("⚠️ Session invalide, reconnectez-vous."); return; }

    // 1. Créer l'établissement
    const { data: nouvelEtablissement, error: erreurEtab } = await supabase
      .from('etablissements')
      .insert({
        code: inputCodeEtablissement.trim() || `ETAB-${Date.now()}`,
        nom: inputNomEcole.trim(),
        pays: inputSituationGeo.trim() || null,
        visibilite: inputTypeEtablissement === 'prive' ? 'PRIVE' : 'PUBLIC',
        parametres_json: {
          nombreEleves: inputNombreEleves,
          nombreEnseignants: inputNombreEnseignants,
        },
      })
      .select()
      .single();

    if (erreurEtab) {
      // Cas fréquent : le "code" existe déjà (contrainte unique) → message clair au lieu de l'erreur brute
      if (erreurEtab.code === '23505') {
        showToast("⚠️ Ce code établissement est déjà utilisé, choisissez-en un autre.");
      } else {
        showToast("⚠️ Erreur création établissement : " + erreurEtab.message);
      }
      return;
    }

    // 2. Créer l'année scolaire de départ
    const { data: nouvelleAnnee, error: erreurAnnee } = await supabase
      .from('annees_scolaires')
      .insert({
        etablissement_id: nouvelEtablissement.id,
        intitule: inputAnneeScolaire.trim() || '2025-2026',
        est_active: true,
      })
      .select()
      .single();

    if (erreurAnnee) {
      showToast("⚠️ Établissement créé, mais erreur sur l'année scolaire : " + erreurAnnee.message);
    }

    // 3. Créer l'affiliation CHEF active pour l'utilisateur courant
    const { data: nouvelleAffiliation, error: erreurAffiliation } = await supabase
      .from('affiliations_etablissement')
      .insert({
        user_id: userId,
        etablissement_id: nouvelEtablissement.id,
        role: 'CHEF',
        statut: 'ACTIVE',
        date_debut: new Date().toISOString().slice(0, 10),
      })
      .select('*, etablissements(*)')
      .single();

    if (erreurAffiliation) {
      // Cas possible : l'utilisateur est déjà chef actif ailleurs (contrainte un_seul_chef_actif_par_user)
      if (erreurAffiliation.code === '23505') {
        showToast("⚠️ Vous êtes déjà chef actif d'un autre établissement. Un chef ne peut diriger qu'un seul établissement à la fois.");
      } else {
        showToast("⚠️ Erreur d'affiliation : " + erreurAffiliation.message);
      }
      return;
    }

    setAffiliationChef(nouvelleAffiliation);
    setEcoleConfig(nouvelleAffiliation.etablissements);
    setFormEcoleEdition(nouvelleAffiliation.etablissements);
    setInfosChef(prev => ({ ...prev, etablissement: nouvelleAffiliation.etablissements?.nom }));
    showToast("🏫 Établissement créé !");
  };

  const handleConnecterEcole = async (e) => {
    e.preventDefault();
    if (!inputNomEcole.trim() || !inputCodeEtablissement.trim()) {
      showToast("⚠️ Nom et code établissement requis.");
      return;
    }
    if (!userId) { showToast("⚠️ Session invalide, reconnectez-vous."); return; }

    // Rejoindre un établissement existant = demande d'affiliation (jamais d'accès direct, §9 de l'architecture)
    const { data: etablissementCible, error: erreurRecherche } = await supabase
      .from('etablissements')
      .select('id, nom')
      .eq('code', inputCodeEtablissement.trim())
      .maybeSingle();

    if (erreurRecherche || !etablissementCible) {
      showToast("⚠️ Aucun établissement trouvé avec ce code.");
      return;
    }

    const { error: erreurDemande } = await supabase
      .from('demandes_affiliation')
      .insert({
        user_id: userId,
        etablissement_id: etablissementCible.id,
        role_demande: 'CHEF',
      });

    if (erreurDemande) {
      showToast("⚠️ Erreur d'envoi de la demande : " + erreurDemande.message);
      return;
    }

    showToast(`📨 Demande envoyée pour "${etablissementCible.nom}". En attente d'approbation.`);
    setModeSetup('CHOIX');
  };

  const handleEnregistrerCarteEcole = async (e) => {
    e.preventDefault();
    if (!ecoleConfig?.id) return;

    const { data: etablissementMaj, error } = await supabase
      .from('etablissements')
      .update({
        nom: formEcoleEdition.nom,
        code: formEcoleEdition.code,
      })
      .eq('id', ecoleConfig.id)
      .select()
      .single();

    if (error) {
      showToast("⚠️ Erreur de mise à jour : " + error.message);
      return;
    }

    setEcoleConfig(etablissementMaj);
    setModeEditionEcole(false);
    showToast("✅ Carte d'identité de l'établissement mise à jour !");
  };

  const handleEnregistrerProfilChef = async (e) => {
    e.preventDefault();
    if (!userId) return;

    const { error } = await supabase
      .from('utilisateurs_profils')
      .update({
        nom: formProfilChef.nom,
        prenom: formProfilChef.prenoms,
      })
      .eq('user_id', userId);

    if (error) {
      showToast("⚠️ Erreur de mise à jour du profil : " + error.message);
      return;
    }

    setInfosChef({ ...formProfilChef });
    setModalProfilChefOuvert(false);
    showToast("✅ Profil mis à jour avec succès !");
  };

  // --- Écran de chargement, le temps de vérifier la session et l'affiliation ---
  if (chargementInitial) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a', color: '#fff' }}>
        Chargement de votre espace...
      </div>
    );
  }
  const nombreClassesAutomatique = useMemo(() => {
    try {
      const programmes = JSON.parse(localStorage.getItem('app_enseignant_programmes_classes')) || {};
      const count = Object.keys(programmes).length;
      return count > 0 ? count : 1;
    } catch { return 1; }
  }, []);

  const listeProfesseursEtablissement = useMemo(() => {
    try {
      const affs = JSON.parse(localStorage.getItem('app_enseignant_affiliations')) || [];
      const profilActuel = JSON.parse(localStorage.getItem('app_enseignant_profil')) || { nom: 'Kouassi', prenoms: 'Jean', matiere: 'EPS', emailSecurite: 'jean.kouassi@prof.ci' };
      
      let enseignantsList = affs.map(a => ({
        id: a.id, nomComplet: a.enseignant || 'M. Kouassi Jean', matiere: profilActuel.matiere || 'EPS', niveau: '6ème / 5ème', classes: a.classes || ['6ème A', '6ème B'], statut: a.statut || 'Validée', ecole: a.ecole, matricule: 'ENS-8821', contact: '0506070809', email: profilActuel.emailSecurite || 'jean.kouassi@prof.ci', dureeService: '1 an (En cours)'
      }));
      return enseignantsList.filter(item => item.ecole === ecoleConfig?.nomEcole);
    } catch { return []; }
  }, [ecoleConfig]);

  const fichesPedagogiquesEcole = useMemo(() => {
    try {
      const archiveCenseur = JSON.parse(localStorage.getItem('app_censeur_archive_ecole')) || [];
      const biblioEnseignant = JSON.parse(localStorage.getItem('app_enseignant_bibliotheque_permanente')) || [];
      let fusion = [...archiveCenseur, ...biblioEnseignant];
      return fusion;
    } catch { return []; }
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
    return {
      totalClasses: nombreClassesAutomatique,
      totalPersonnesConnectees: censeursValidesCount + listeProfesseursEtablissement.length + personnelAdministratifManuel.length
    };
  }, [censeursAffiliations, nombreClassesAutomatique, listeProfesseursEtablissement.length, personnelAdministratifManuel.length]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profilChefRef.current && !profilChefRef.current.contains(event.target)) setProfilChefOuvert(false);
      if (notifChefRef.current && !notifChefRef.current.contains(event.target)) setNotifChefOuvert(false);
      if (menuBurgerChefRef.current && !menuBurgerChefRef.current.contains(event.target)) setMenuBurgerChefOuvert(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const telechargerDocumentPDF = (titre, contenuHTML) => {
    const fenetreImpression = window.open('', '_blank');
    if (!fenetreImpression) {
      showToast("⚠️ Ouverture bloquée par votre navigateur. Autorisez les pop-ups.");
      return;
    }
    
    fenetreImpression.document.write(`
      <html>
        <head>
          <title>${titre}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #1e293b; padding: 20px; margin: 0; }
            .pdf-container { max-width: 800px; margin: 0 auto; background: #fff; padding: 30px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
            .pdf-header { display: flex; flex-wrap: wrap; gap: 15px; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 20px; }
            .btn-group { display: flex; gap: 10px; flex-wrap: wrap; }
            .btn-imprimer { background: #2563eb; color: #fff; border: none; padding: 10px 16px; border-radius: 8px; font-weight: 800; cursor: pointer; font-size: 13px; }
            .btn-retour { background: #ef4444; color: #fff; border: none; padding: 10px 16px; border-radius: 8px; font-weight: 800; cursor: pointer; font-size: 13px; }
            h1 { margin: 0; font-size: 20px; color: #0f172a; }
            p { margin: 8px 0; font-size: 14px; line-height: 1.6; }
            
            @media print {
              body { background: #fff; padding: 0; }
              .pdf-container { box-shadow: none; padding: 0; }
              .pdf-header .btn-group { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="pdf-container">
            <div class="pdf-header">
              <h1>${titre}</h1>
              <div class="btn-group">
                <button class="btn-imprimer" onclick="window.print()">🖨️ Imprimer / Sauvegarder</button>
                <button class="btn-retour" onclick="window.close()">✕ Fermer & Retourner à l'app</button>
              </div>
            </div>
            <div class="pdf-content">
              ${contenuHTML}
            </div>
          </div>
          <script>
            window.onload = function() { setTimeout(function() { window.print(); }, 800); }
          </script>
        </body>
      </html>
    `);
    fenetreImpression.document.close();
    showToast(`📥 Document "${titre}" prêt !`);
  };



  const executerActionAnneeScolaire = () => {
    const { actionType } = modalConfirmationActionAnnee;
    if (actionType === 'ouvrir') {
      setEcoleConfig(prev => ({ ...prev, anneeOuverte: true }));
      showToast("🚀 Nouvelle année scolaire ouverte !");
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
      showToast("🔒 Année scolaire terminée avec succès.");
    }
    setModalConfirmationActionAnnee({ ouvert: false, actionType: null });
  };

  const validerCenseur = (id) => { setCenseursAffiliations(prev => prev.map(c => c.id === id ? { ...c, statut: 'Validé' } : c)); showToast("✅ Censeur validé !"); };
  const rejeterCenseur = (id) => { setCenseursAffiliations(prev => prev.filter(c => c.id !== id)); showToast("❌ Demande rejetée."); };

  const ajouterPersonnelAdministratif = (e) => {
    e.preventDefault();
    if (!nouveauAdminNom.trim()) return;
    const nouveau = { id: Date.now(), nomComplet: nouveauAdminNom.trim(), role: nouveauAdminRole, matricule: nouveauAdminMatricule.trim() || 'MAT-000', contact: nouveauAdminContact.trim() || 'N/A', email: nouveauAdminEmail.trim() || 'N/A' };
    setPersonnelAdministratifManuel(prev => [...prev, nouveau]);
    setNouveauAdminNom(''); setNouveauAdminMatricule(''); setNouveauAdminContact(''); setNouveauAdminEmail('');
    showToast("✅ Personnel administratif ajouté !");
  };
  const supprimerPersonnelAdministratif = (id) => { setPersonnelAdministratifManuel(prev => prev.filter(p => p.id !== id)); showToast("🗑️ Membre retiré."); };

  const uploaderFichierAdministratifreel = (e) => {
    e.preventDefault();
    if (!nomNouveauFichier.trim()) return;
    const nouveauFichier = { id: Date.now(), nom: nomNouveauFichier.trim(), annee: anneeFichier, nomFichierReel: fichierSelectionneObj ? fichierSelectionneObj.name : 'Document_officiel.pdf', dateAjout: new Date().toLocaleDateString() };
    setFichiersAdministratifsUploads(prev => [nouveauFichier, ...prev]);
    setNomNouveauFichier(''); setFichierSelectionneObj(null);
    showToast("📎 Fichier stocké avec succès !");
  };


  const handleChangerPhotoProfilChef = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => { setFormProfilChef(prev => ({ ...prev, photoProfil: reader.result })); };
    reader.readAsDataURL(file);
  };

  if (!ecoleConfig) {
    return (
      <div style={styles.setupContainer}>
        <div style={styles.setupCard}>
          <div style={{ width: '50px', height: '50px', background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', margin: '0 auto 16px auto' }}>🎓</div>
          <h2 style={{ color: '#0f172a', marginBottom: '8px', textAlign: 'center', fontSize: '22px', fontWeight: '800' }}>Espace Chef d'Établissement</h2>
          <p style={{ fontSize: '13px', color: '#64748b', textAlign: 'center', marginBottom: '24px', lineHeight: '1.5' }}>
            Veuillez rattacher votre session à un établissement pour accéder au réseau institutionnel.
          </p>

          {message && <div style={{ ...styles.toastSuccess, marginBottom: '16px' }}>{message}</div>}

          {modeSetup === 'CHOIX' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button onClick={() => setModeSetup('CREER')} className="bouton bouton-principal">🏫 Créer un nouvel établissement</button>
              <button onClick={() => setModeSetup('CONNECTER')} className="bouton bouton-secondaire">🔗 Se connecter à un établissement existant</button>
            </div>
          )}

          {modeSetup === 'CONNECTER' && (
            <form onSubmit={handleConnecterEcole} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div><label style={styles.label}>Nom de l'établissement</label><input type="text" value={inputNomEcole} onChange={(e) => setInputNomEcole(e.target.value)} style={styles.inputStyle} required /></div>
              
              <div>
                <label style={styles.label}>Mot de passe de l'établissement</label>
                <input type="password" value={inputCodeEtablissement} onChange={(e) => setInputCodeEtablissement(e.target.value)} style={styles.inputStyle} required />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                  <button type="button" onClick={() => setModeSetup('OUBLIE_CODE')} style={{ background: 'transparent', border: 'none', color: '#ea580c', fontSize: '12px', fontWeight: '800', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
                    Mot de passe oublié ?
                  </button>
                </div>
              </div>

              <div><label style={styles.label}>Année Scolaire</label><input type="text" value={inputAnneeScolaire} onChange={(e) => setInputAnneeScolaire(e.target.value)} style={styles.inputStyle} required /></div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}><button type="button" onClick={() => setModeSetup('CHOIX')} className="bouton bouton-secondaire" style={{ flex: 1 }}>Retour</button><button type="submit" className="bouton bouton-principal" style={{ flex: 1 }}>Se connecter</button></div>
            </form>
          )}

          {modeSetup === 'OUBLIE_CODE' && (
            <form onSubmit={(e) => { e.preventDefault(); showToast("📩 Instructions envoyées !"); setModeSetup('CONNECTER'); setInputEmailRecuperation(''); }} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div><label style={styles.label}>Email institutionnel</label><input type="email" value={inputEmailRecuperation} onChange={(e) => setInputEmailRecuperation(e.target.value)} style={styles.inputStyle} required /></div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}><button type="button" onClick={() => setModeSetup('CONNECTER')} className="bouton bouton-secondaire" style={{ flex: 1 }}>Retour</button><button type="submit" className="bouton bouton-principal" style={{ flex: 1 }}>Réinitialiser le mot de passe</button></div>
            </form>
          )}

          {modeSetup === 'CREER' && (
            <form onSubmit={handleCreerEcole} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div><label style={styles.label}>Type d'établissement</label><select value={inputTypeEtablissement} onChange={(e) => setInputTypeEtablissement(e.target.value)} style={styles.inputStyle}><option value="public">Public (25 000 FCFA)</option><option value="prive">Privé (50 000 FCFA)</option></select></div>
              <div><label style={styles.label}>Nom de l'établissement</label><input type="text" value={inputNomEcole} onChange={(e) => setInputNomEcole(e.target.value)} style={styles.inputStyle} required /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}><div><label style={styles.label}>Code</label><input type="text" value={inputCodeEtablissement} onChange={(e) => setInputCodeEtablissement(e.target.value)} style={styles.inputStyle} required /></div><div><label style={styles.label}>Année</label><input type="text" value={inputAnneeScolaire} onChange={(e) => setInputAnneeScolaire(e.target.value)} style={styles.inputStyle} required /></div></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}><div><label style={styles.label}>Élèves</label><input type="number" value={inputNombreEleves} onChange={(e) => setInputNombreEleves(e.target.value)} style={styles.inputStyle} required /></div><div><label style={styles.label}>Enseignants</label><input type="number" value={inputNombreEnseignants} onChange={(e) => setInputNombreEnseignants(e.target.value)} style={styles.inputStyle} required /></div></div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}><button type="button" onClick={() => setModeSetup('CHOIX')} className="bouton bouton-secondaire" style={{ flex: 1 }}>Retour</button><button type="submit" className="bouton bouton-principal" style={{ flex: 1 }}>Créer</button></div>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.darkNavbar}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'nowrap', gap: '8px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
          
          {/* SECTION PROFIL ÉPURÉE */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }} ref={profilChefRef}>
            <button onClick={() => setProfilChefOuvert(!profilChefOuvert)} style={styles.navbarTeacherClickableBlock}>
              <div style={styles.avatarNavbarContainer}>
                {infosChef.photoProfil ? <img src={infosChef.photoProfil} alt="Profil" style={styles.avatarNavbarImg} /> : <div style={styles.avatarNavbarPlaceholder}>👤</div>}
              </div>
              <div style={styles.navbarTeacherInfo}>
                <span style={{ fontSize: '12px', fontWeight: '900', color: '#ffffff', whiteSpace: 'nowrap' }}>{infosChef.civilite} {infosChef.nom}</span>
                <span style={{ fontSize: '9px', fontWeight: '700', color: '#38bdf8', textTransform: 'uppercase' }}>Direction</span>
              </div>
              <span style={{ fontSize: '9px', color: '#94a3b8', marginLeft: '2px' }}>{profilChefOuvert ? '▲' : '▼'}</span>
            </button>

            {profilChefOuvert && (
              <div style={{ ...styles.notificationDropdown, left: 0, right: 'auto' }}>
                <div style={styles.dropdownHeader}>Mon Compte Directeur</div>
                <button onClick={() => { setModalProfilChefOuvert(true); setProfilChefOuvert(false); }} className="bouton-option">⚙️ Modifier mon profil</button>
                <button onClick={() => { setModalSecurite(true); setProfilChefOuvert(false); }} className="bouton-option">🔒 Changer mot de passe</button>
                <button onClick={() => { setModalQuitterEcole(true); setProfilChefOuvert(false); }} className="bouton-option" style={{ color: '#ef4444', fontWeight: '800' }}>🚪 Quitter l'école</button>
              </div>
            )}
          </div>

          {/* LOGO CENTRAL (E-cahier ! 📖) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255, 255, 255, 0.08)', padding: '6px 12px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.12)' }}>
            <span style={{ fontSize: '13px', fontWeight: '900', color: '#ffffff', letterSpacing: '0.5px' }}>E-cahier !</span>
            <span style={{ fontSize: '12px' }}>📖</span>
          </div>

          {/* NOTIFICATIONS & MENU BURGER (S'OUVRENT DANS LE BON SENS) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ position: 'relative' }} ref={notifChefRef}>
              <button onClick={() => setNotifChefOuvert(!notifChefOuvert)} style={styles.navDarkBtn}>
                <span>🔔</span>
                {notificationsChef.filter(n => !n.lu).length > 0 && <span style={styles.pastilleAlerte}>{notificationsChef.filter(n => !n.lu).length}</span>}
              </button>
              {notifChefOuvert && (
                <div style={{ ...styles.notificationDropdown, right: 0, left: 'auto' }}>
                  <div style={styles.dropdownHeader}>Notifications</div>
                  {notificationsChef.map(n => (
                     <div key={n.id} style={styles.notifItem}>
                      <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#334155' }}>{n.texte}</p>
                      <span style={{ fontSize: '10px', color: '#94a3b8' }}>{n.date}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ position: 'relative' }} ref={menuBurgerChefRef}>
              <button onClick={() => setMenuBurgerChefOuvert(!menuBurgerChefOuvert)} style={styles.burgerBtn}>☰</button>
              {menuBurgerChefOuvert && (
                <div style={{ ...styles.notificationDropdown, right: 0, left: 'auto', width: '240px' }} className="anim-apparition">
                  <div style={styles.dropdownHeader}>Menu Direction</div>
                  <button onClick={() => { setActiveTab('profil_ecole'); setMenuBurgerChefOuvert(false); }} className="bouton-option">🏛️ Profil & Carte d'Identité</button>
                  <button onClick={() => { setActiveTab('censeurs'); setMenuBurgerChefOuvert(false); }} className="bouton-option">👥 Validation Censeurs</button>
                  <button onClick={() => { setActiveTab('professeurs'); setMenuBurgerChefOuvert(false); }} className="bouton-option">👨‍🏫 Annuaire Personnel</button>
                  <button onClick={() => { setActiveTab('fichiers_pedagogiques'); setMenuBurgerChefOuvert(false); }} className="bouton-option">📚 Fiches Pédagogiques</button>
                  <button onClick={() => { setActiveTab('rapports'); setMenuBurgerChefOuvert(false); }} className="bouton-option">📈 Rapports Détaillés</button>
                  <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '6px', paddingTop: '6px' }}>
                    <button onClick={() => { setModalDeconnexion(true); setMenuBurgerChefOuvert(false); }} className="bouton-option" style={{ color: '#ef4444', fontWeight: '900', textAlign: 'center' }}>🚪 Se déconnecter</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* --- STYLE UNIVERSEL DES BOUTONS HARMONIEUX ET MODERNES --- */}
      <style>{`
        .bouton {
          padding: 8px 16px;
          border-radius: 12px;
          font-weight: 800;
          font-size: 13px;
          cursor: pointer;
          border: none;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.04);
        }
        .bouton:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }
        .bouton-principal {
          background-color: #2563eb;
          color: #ffffff;
        }
        .bouton-secondaire {
          background-color: #f1f5f9;
          color: #334155;
          border: 1px solid #cbd5e1;
        }
        .bouton-succes {
          background-color: #16a34a;
          color: #ffffff;
        }
        .bouton-danger {
          background-color: #ef4444;
          color: #ffffff;
        }
        .bouton-option {
          width: 100%;
          text-align: left;
          padding: 9px 12px;
          background: transparent;
          border: none;
          color: #334155;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          border-radius: 8px;
          margin-bottom: 2px;
          transition: background 0.15s ease;
        }
        .bouton-option:hover {
          background-color: #f1f5f9;
        }
      `}</style>

      <main style={styles.mainContentBody}>
        {message && <div style={styles.toastSuccess}>{message}</div>}

        {modalQuitterEcole && (
          <div style={styles.fondModale}>
            <div style={{ ...styles.cardWide, width: '400px', textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#0f172a', fontSize: '18px', fontWeight: '800' }}>⚠️ Quitter l'établissement</h3>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>Êtes-vous sûr de vouloir rompre l'affiliation avec <strong>{ecoleConfig?.nomEcole}</strong> ?</p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                <button onClick={() => setModalQuitterEcole(false)} className="bouton bouton-secondaire">Retour (Annuler)</button>
                <button onClick={() => { setModalQuitterEcole(false); setEcoleConfig(null); showToast("🔗 Affiliation rompue."); }} className="bouton bouton-danger">Oui, quitter l'école</button>
              </div>
            </div>
          </div>
        )}

        {modalDeconnexion && (
          <div style={styles.fondModale}>
            <div style={{ ...styles.cardWide, width: '400px', textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#0f172a', fontSize: '18px', fontWeight: '800' }}>🚪 Déconnexion</h3>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>Êtes-vous sûr de vouloir vous déconnecter ?</p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                <button onClick={() => setModalDeconnexion(false)} className="bouton bouton-secondaire">Annuler</button>
                <button onClick={() => { setModalDeconnexion(false); localStorage.removeItem('app_chef_statut'); window.location.reload(); }} className="bouton bouton-danger">Oui, me déconnecter</button>
              </div>
            </div>
          </div>
        )}

        {modalSecurite && (
          <div style={styles.fondModale}>
            <div style={{ ...styles.cardWide, width: '460px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px', fontWeight: '800' }}>🔒 Changer mon mot de passe</h3>
                <button onClick={() => setModalSecurite(false)} className="bouton bouton-secondaire" style={{ padding: '6px 10px' }}>✕</button>
              </div>
              <form onSubmit={(e) => {
                e.preventDefault();
                if (!ancienMdp || !nouveauMdp) { showToast("⚠️ Veuillez remplir tous les champs."); return; }
                showToast("🔒 Mot de passe modifié avec succès !");
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
            <h4 style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Nombre total de Classes</h4>
            <p style={{ fontSize: '30px', fontWeight: '900', color: '#2563eb', margin: 0 }}>{statistiquesReseau.totalClasses}</p>
          </div>
          <div style={styles.statCard}>
            <div style={{ fontSize: '28px', marginBottom: '10px' }}>👥</div>
            <h4 style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Personnes Connectées au Réseau</h4>
            <p style={{ fontSize: '30px', fontWeight: '900', color: '#16a34a', margin: 0 }}>{statistiquesReseau.totalPersonnesConnectees}</p>
          </div>
        </div>

        {/* ONGLET : PROFIL & CARTE D'IDENTITÉ */}
        {activeTab === 'profil_ecole' && (
          <div style={styles.cardWide}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', margin: '0 0 4px 0' }}>🏛️ Carte d'Identité & Bibliothèque d'Archives</h2>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Informations modifiables et stockage des documents.</p>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                {!modeEditionEcole ? (
                  <button onClick={() => setModeEditionEcole(true)} className="bouton bouton-principal">✏️ Modifier</button>
                ) : (
                  <button onClick={() => setModeEditionEcole(false)} className="bouton bouton-secondaire">Annuler</button>
                )}
                {!ecoleConfig.anneeOuverte ? (
                  <button onClick={() => setModalConfirmationActionAnnee({ ouvert: true, actionType: 'ouvrir' })} style={styles.boutonPuissantOuvrir}>🟢 Ouvrir l'Année</button>
                ) : (
                  <button onClick={() => setModalConfirmationActionAnnee({ ouvert: true, actionType: 'fermer' })} style={styles.boutonPuissantFermer}>🔒 Clôturer l'Année</button>
                )}
              </div>
            </div>

            {!modeEditionEcole ? (
              <div style={{ backgroundColor: '#f8fafc', padding: '24px', borderRadius: '16px', border: '1px solid #cbd5e1', marginBottom: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                <div><label style={styles.label}>Nom Officiel</label><p style={{ margin: '4px 0 0 0', fontWeight: '800', fontSize: '15px' }}>{ecoleConfig.nomEcole}</p></div>
                <div><label style={styles.label}>Code</label><p style={{ margin: '4px 0 0 0', fontWeight: '800', fontSize: '15px', color: '#2563eb' }}>{ecoleConfig.codeEtablissement}</p></div>
                <div><label style={styles.label}>Classes (Auto)</label><p style={{ margin: '4px 0 0 0', fontWeight: '800', fontSize: '15px', color: '#2563eb' }}>{nombreClassesAutomatique}</p></div>
                <div><label style={styles.label}>Élèves</label><p style={{ margin: '4px 0 0 0', fontWeight: '800', fontSize: '15px', color: '#16a34a' }}>{ecoleConfig.nombreEleves}</p></div>
                <div><label style={styles.label}>Enseignants</label><p style={{ margin: '4px 0 0 0', fontWeight: '800', fontSize: '15px', color: '#16a34a' }}>{ecoleConfig.nombreEnseignants}</p></div>
                <div><label style={styles.label}>Statut</label><p style={{ margin: '4px 0 0 0', fontWeight: '800', fontSize: '15px', color: ecoleConfig.anneeOuverte ? '#16a34a' : '#ef4444' }}>{ecoleConfig.anneeOuverte ? `Active` : 'Clôturée'}</p></div>
              </div>
            ) : (
              <form onSubmit={handleEnregistrerCarteEcole} style={{ backgroundColor: '#f8fafc', padding: '24px', borderRadius: '16px', border: '1px solid #2563eb', marginBottom: '24px', display: 'grid', gap: '14px' }}>
                <input type="text" value={formEcoleEdition.nomEcole || ''} onChange={(e) => setFormEcoleEdition({...formEcoleEdition, nomEcole: e.target.value})} style={styles.inputStyle} required />
                <input type="text" value={formEcoleEdition.codeEtablissement || ''} onChange={(e) => setFormEcoleEdition({...formEcoleEdition, codeEtablissement: e.target.value})} style={styles.inputStyle} required />
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setModeEditionEcole(false)} className="bouton bouton-secondaire" style={{ marginRight: '10px' }}>Annuler</button>
                  <button type="submit" className="bouton bouton-principal">Enregistrer</button>
                </div>
              </form>
            )}

            <div style={{ backgroundColor: '#eff6ff', padding: '20px', borderRadius: '16px', border: '1px solid #bfdbfe', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#1e3a8a', marginBottom: '8px' }}>📤 Uploader un Fichier Administratif</h3>
              <form onSubmit={uploaderFichierAdministratifreel} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <input type="text" placeholder="Nom du document..." value={nomNouveauFichier} onChange={(e) => setNomNouveauFichier(e.target.value)} style={{ ...styles.inputStyle, flex: '2 1 200px', margin: 0 }} required />
                <button type="submit" className="bouton bouton-principal" style={{ flexShrink: 0 }}>Uploader</button>
              </form>
            </div>
          </div>
        )}

        {/* ONGLET : CENSEURS */}
        {activeTab === 'censeurs' && (
          <div style={styles.cardWide}>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', marginBottom: '16px' }}>👥 Validation des Censeurs</h2>
            {censeursAffiliations.length === 0 ? (
              <p style={{ fontStyle: 'italic', color: '#64748b', fontSize: '13px' }}>Aucune demande.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {censeursAffiliations.map(censeur => (
                  <div key={censeur.id} style={styles.itemRow}>
                    <div>
                      <strong style={{ color: '#0f172a', fontSize: '14px' }}>{censeur.nomComplet}</strong>
                      <br /><small>Statut : <span style={{ color: censeur.statut === 'Validé' ? '#16a34a' : '#d97706' }}>{censeur.statut}</span></small>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {censeur.statut !== 'Validé' && <button onClick={() => validerCenseur(censeur.id)} className="bouton bouton-succes">Valider</button>}
                      <button onClick={() => rejeterCenseur(censeur.id)} className="bouton bouton-danger">Rejeter</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ONGLET : PROFESSEURS */}
        {activeTab === 'professeurs' && (
          <div style={styles.cardWide}>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', marginBottom: '16px' }}>👨‍🏫 Annuaire Détaillé du Personnel</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {professeursFiltres.map(prof => (
                <div key={prof.id} style={styles.itemRow}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ backgroundColor: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700' }}>{prof.matiere}</span>
                      <strong style={{ fontSize: '14px', color: '#0f172a' }}>{prof.nomComplet}</strong>
                    </div>
                    <p style={{ fontSize: '12px', color: '#475569', margin: 0 }}>Classes : <strong>{prof.classes ? prof.classes.join(', ') : 'N/A'}</strong></p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ONGLET : FICHES PÉDAGOGIQUES */}
        {activeTab === 'fichiers_pedagogiques' && (
          <div style={styles.cardWide}>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', marginBottom: '20px' }}>📚 Fiches Pédagogiques</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {fichesPedagogiquesEcole.map(fiche => (
                <div key={fiche.id} style={styles.itemRow}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ backgroundColor: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700' }}>{fiche.matiere}</span>
                      <strong style={{ fontSize: '14px', color: '#0f172a' }}>{fiche.titre}</strong>
                    </div>
                    <p style={{ fontSize: '12px', color: '#475569', margin: 0 }}>Enseignant : <strong>{fiche.enseignant}</strong></p>
                  </div>
                  <div>
                    <button 
                      onClick={() => telechargerDocumentPDF(`Fiche : ${fiche.titre}`, `<p><strong>Matière :</strong> ${fiche.matiere}</p><p><strong>Enseignant :</strong> ${fiche.enseignant}</p><p><strong>Classe :</strong> ${fiche.classe}</p><p><strong>Détails :</strong> Fiche validée et approuvée le ${fiche.dateValidation}.</p>`)} 
                      className="bouton bouton-principal" 
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                    >
                      📥 Télécharger / Voir (PDF)
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ONGLET : RAPPORTS */}
        {activeTab === 'rapports' && (
          <div style={styles.cardWide}>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', marginBottom: '16px' }}>📈 Rapports Détaillés</h2>
            {rapportsCenseurs.length === 0 ? (
              <p style={{ fontStyle: 'italic', color: '#64748b', fontSize: '13px' }}>Aucun rapport.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {rapportsCenseurs.map((rapport, index) => (
                  <div key={index} style={styles.itemRow}>
                    <strong style={{ color: '#0f172a' }}>Censeur : {rapport.censeur}</strong>
                    <button onClick={() => telechargerDocumentPDF(`Rapport ${rapport.censeur}`, `<p>Rapport du ${rapport.date}</p>`)} className="bouton bouton-principal" style={{ padding: '6px 12px', fontSize: '12px' }}>📥 Voir PDF</button>
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

const styles = {
  container: { backgroundColor: '#f8fafc', minHeight: '100vh', color: '#1e293b', paddingBottom: '40px', overflowX: 'hidden', boxSizing: 'border-box', width: '100%' },
  setupContainer: { backgroundColor: '#0f172a', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', boxSizing: 'border-box', width: '100%', overflowX: 'hidden' },
  setupCard: { backgroundColor: '#ffffff', padding: '40px', borderRadius: '24px', width: '100%', maxWidth: '440px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid #334155', boxSizing: 'border-box' },
  darkNavbar: { backgroundColor: '#0f172a', color: '#ffffff', padding: '12px 16px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', borderBottom: '1px solid #1e293b', position: 'sticky', top: '0', zIndex: 100, width: '100%', boxSizing: 'border-box' },
  mainContentBody: { padding: '20px 12px', maxWidth: '1200px', margin: '0 auto', boxSizing: 'border-box', width: '100%', overflowX: 'hidden' },
  cardWide: { backgroundColor: '#ffffff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', boxSizing: 'border-box', width: '100%', overflowX: 'hidden' },
  statCard: { backgroundColor: '#ffffff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', boxSizing: 'border-box' },
  itemRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: '12px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', gap: '12px', boxSizing: 'border-box', width: '100%', flexWrap: 'wrap' },
  label: { display: 'block', fontSize: '11px', fontWeight: '800', color: '#475569', marginBottom: '6px', textTransform: 'uppercase' },
  inputStyle: { width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff', color: '#1e293b', outline: 'none', boxSizing: 'border-box' },
  toastSuccess: { backgroundColor: '#0f172a', color: '#f8fafc', padding: '12px 16px', borderRadius: '10px', marginBottom: '16px', fontSize: '13px', fontWeight: '700', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', boxSizing: 'border-box' },
  navbarTeacherClickableBlock: { display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#1e293b', padding: '4px 8px', borderRadius: '10px', border: '1px solid #334155', cursor: 'pointer', textAlign: 'left', boxSizing: 'border-box' },
  avatarNavbarContainer: { width: '30px', height: '30px', borderRadius: '50%', overflow: 'hidden', backgroundColor: '#334155', display: 'flex', justifyContent: 'center', alignItems: 'center', border: '1px solid #475569', flexShrink: 0 },
  avatarNavbarImg: { width: '100%', height: '100%', objectFit: 'cover' },
  avatarNavbarPlaceholder: { fontSize: '14px', color: '#94a3b8' },
  navbarTeacherInfo: { display: 'flex', flexDirection: 'column' },
  notificationDropdown: { position: 'absolute', top: '42px', backgroundColor: '#ffffff', borderRadius: '14px', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.2)', border: '1px solid #e2e8f0', width: '280px', maxWidth: '90vw', zIndex: 110, padding: '10px', boxSizing: 'border-box' },
  dropdownHeader: { padding: '6px 8px', fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0', marginBottom: '6px' },
  notifItem: { backgroundColor: '#f8fafc', padding: '8px', borderRadius: '8px', fontSize: '11px', marginBottom: '4px', border: '1px solid #f1f5f9', boxSizing: 'border-box' },
  navDarkBtn: { backgroundColor: '#1e293b', color: '#f8fafc', border: '1px solid #334155', padding: '6px 10px', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', position: 'relative' },
  fondModale: { position: 'fixed', top: '0', left: '0', right: '0', bottom: '0', background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: '1000', padding: '12px', boxSizing: 'border-box' },
  pastilleAlerte: { backgroundColor: '#ef4444', color: 'white', padding: '1px 4px', borderRadius: '999px', fontSize: '9px', fontWeight: '800', position: 'absolute', top: '-4px', right: '-4px' },
  burgerBtn: { backgroundColor: '#2563eb', color: '#ffffff', border: 'none', padding: '6px 10px', borderRadius: '10px', fontSize: '14px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(37,99,235,0.3)' },
  boutonPuissantOuvrir: { background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)', color: '#ffffff', border: 'none', padding: '10px 18px', borderRadius: '12px', fontWeight: '900', fontSize: '13px', cursor: 'pointer', boxShadow: '0 4px 14px rgba(220,38,38,0.3)' },
  boutonPuissantFermer: { background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)', color: '#ffffff', border: 'none', padding: '10px 18px', borderRadius: '12px', fontWeight: '900', fontSize: '13px', cursor: 'pointer', boxShadow: '0 4px 14px rgba(220,38,38,0.3)' }
};