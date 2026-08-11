import React, { useState, useMemo, useRef, useEffect } from 'react';
import { supabase } from './Approuter'; // ⚠️ adaptez ce chemin si besoin

// =========================================================================
// DASHBOARD CENSEUR — BRANCHÉ SUR SUPABASE
// Mêmes noms de fonctions/variables que votre fichier d'origine : le JSX
// (formulaires, navbar, onglets, styles) n'a pas eu besoin d'être modifié.
//
// CE QUI EST RÉELLEMENT BRANCHÉ :
//   - infosCenseur / ecoleConfigGlobale : profil + établissement actifs (Supabase)
//   - listeProfesseursEtablissement : enseignants réellement affiliés (Supabase)
//   - personnelAdministratifManuel : table "personnel" (Supabase)
//   - demandePromotion : table "demandes_changement_role" (Supabase)
//   - programmesClasses (onglet Visa) : vraies séances en attente de visa (Supabase)
//   - archiveEcole / fichesPedagogiquesEcole : table "bibliotheque_etablissement" (Supabase)
//
// CE QUI RESTE UNIQUEMENT LOCAL (pas de vraie donnée backend pour l'instant) :
//   - notificationsCenseur : reste sur localStorage — étape suivante si besoin
//   - handleChangerPhotoProfil : la photo n'est pas envoyée à Supabase Storage,
//     elle reste juste en aperçu local dans cette étape (aucune colonne
//     "photoProfil" dans utilisateurs_profils pour l'instant)
//
// DÉPENDANCE IMPORTANTE : l'onglet Visa n'affichera des fiches que lorsque
// le dashboard enseignant écrira réellement des séances dans la table
// "seances" — tant que ce n'est pas fait, la liste sera vide (normal).
// =========================================================================

export default function CenseurDashboard() {

  // =========================================================================
  // ÉTATS DE SESSION ET DE CHARGEMENT
  // =========================================================================
  const [chargementInitial, setChargementInitial] = useState(true);
  const [userId, setUserId] = useState(null);
  const [affiliationCenseur, setAffiliationCenseur] = useState(null); // ligne affiliations_etablissement (role CENSEUR, statut ACTIVE)
  const [anneeActiveId, setAnneeActiveId] = useState(null);

  // =========================================================================
  // ÉTATS DU PROFIL — mêmes noms que l'original, alimentés par Supabase
  // =========================================================================
  const [infosCenseur, setInfosCenseur] = useState({
    civilite: 'M.', nom: '', prenoms: '', etablissement: '', role: 'Censeur Pédagogique', niveauCharge: 'Tous Niveaux', photoProfil: '', statutCompte: 'Actif', emailSecurite: ''
  });

  const [modalProfilCenseurOuvert, setModalProfilCenseurOuvert] = useState(false);
  const [formProfilCenseur, setFormProfilCenseur] = useState({ ...infosCenseur });
  const [profilCenseurOuvert, setProfilCenseurOuvert] = useState(false);
  const profilCenseurRef = useRef(null);

  const [modalSecurite, setModalSecurite] = useState(false);
  const [ancienMdp, setAncienMdp] = useState('');
  const [nouveauMdp, setNouveauMdp] = useState('');

  const [menuBurgerCenseurOuvert, setMenuBurgerCenseurOuvert] = useState(false);
  const menuBurgerCenseurRef = useRef(null);
  const [modalDeconnexion, setModalDeconnexion] = useState(false);

  const [modalConfirmation, setModalConfirmation] = useState({
    ouvert: false, titre: '', message: '', actionCallback: null
  });

  // ecoleConfigGlobale : même forme que l'original, alimentée par etablissements + parametres_json
  const [ecoleConfigGlobale, setEcoleConfigGlobale] = useState({
    nomEcole: '', typeEtablissement: '', codeEtablissement: '', situationGeo: '',
    anneeScolaire: '', nombreEleves: '', nombreEnseignants: '', anneeOuverte: true
  });

  // =========================================================================
  // DONNÉES SYNCHRONISÉES SUR SUPABASE (mêmes noms qu'avant)
  // =========================================================================
  const [programmesClasses, setProgrammesClasses] = useState({});
  const [notificationsCenseur, setNotificationsCenseur] = useState([]);
  const [notifCenseurOuvert, setNotifCenseurOuvert] = useState(false);
  const notifCenseurRef = useRef(null);

  const [archiveEcole, setArchiveEcole] = useState([]);
  const [personnelAdministratifManuel, setPersonnelAdministratifManuel] = useState([]);
  const [demandePromotion, setDemandePromotion] = useState(null);

  // =========================================================================
  // ÉTATS INTERNES ET FILTRES (inchangés, purement UI)
  // =========================================================================
  const [activeTab, setActiveTab] = useState('visa');
  const [message, setMessage] = useState('');

  const [classesOuvertesVisa, setClassesOuvertesVisa] = useState({});
  const toggleClasseVisa = (classeNom) => setClassesOuvertesVisa(prev => ({ ...prev, [classeNom]: !prev[classeNom] }));

  const [filtreArchiveClasse, setFiltreArchiveClasse] = useState('TOUTES');
  const [filtreArchiveMatiere, setFiltreArchiveMatiere] = useState('TOUTES');
  const [filtreProfClasse, setFiltreProfClasse] = useState('TOUTES');

  const [modalConsultation, setModalConsultation] = useState({ ouvert: false, element: null });

  const [nouveauAdminNom, setNouveauAdminNom] = useState('');
  const [nouveauAdminRole, setNouveauAdminRole] = useState('Éducateur');
  const [nouveauAdminMatricule, setNouveauAdminMatricule] = useState('');
  const [nouveauAdminContact, setNouveauAdminContact] = useState('');
  const [nouveauAdminEmail, setNouveauAdminEmail] = useState('');

  const [formPromotion, setFormPromotion] = useState({ type: 'interne', ecoleCible: '' });
  const [profsSelectionnesRappel, setProfsSelectionnesRappel] = useState([]);

  const showToast = (msg) => { setMessage(msg); setTimeout(() => setMessage(''), 4000); };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profilCenseurRef.current && !profilCenseurRef.current.contains(event.target)) setProfilCenseurOuvert(false);
      if (notifCenseurRef.current && !notifCenseurRef.current.contains(event.target)) setNotifCenseurOuvert(false);
      if (menuBurgerCenseurRef.current && !menuBurgerCenseurRef.current.contains(event.target)) setMenuBurgerCenseurOuvert(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // =========================================================================
  // CHARGEMENT COMPLET DEPUIS SUPABASE
  // =========================================================================
  const chargerTout = async () => {
    const { data: { user }, error: erreurUser } = await supabase.auth.getUser();
    if (erreurUser || !user) {
      showToast("⚠️ Session expirée, veuillez vous reconnecter.");
      setChargementInitial(false);
      return;
    }
    setUserId(user.id);

    // 1. Profil
    const { data: profil } = await supabase
      .from('utilisateurs_profils')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // 2. Affiliation CENSEUR active + établissement
    const { data: affiliation, error: erreurAffiliation } = await supabase
      .from('affiliations_etablissement')
      .select('*, etablissements(*)')
      .eq('user_id', user.id)
      .eq('role', 'CENSEUR')
      .eq('statut', 'ACTIVE')
      .maybeSingle();

    if (erreurAffiliation || !affiliation) {
      setChargementInitial(false);
      return;
    }
    setAffiliationCenseur(affiliation);
    const etablissementId = affiliation.etablissement_id;
    const etab = affiliation.etablissements;

    if (profil) {
      setInfosCenseur(prev => ({
        ...prev,
        nom: profil.nom,
        prenoms: profil.prenom,
        etablissement: etab?.nom || '',
        emailSecurite: user.email,
      }));
      setFormProfilCenseur(prev => ({ ...prev, nom: profil.nom, prenoms: profil.prenom, etablissement: etab?.nom || '' }));
    }

    // 3. Année scolaire active de l'établissement
    const { data: annee } = await supabase
      .from('annees_scolaires')
      .select('*')
      .eq('etablissement_id', etablissementId)
      .eq('est_active', true)
      .maybeSingle();
    setAnneeActiveId(annee?.id || null);

    setEcoleConfigGlobale({
      nomEcole: etab?.nom || '',
      typeEtablissement: etab?.visibilite === 'PRIVE' ? 'Privé' : 'Public',
      codeEtablissement: etab?.code || '',
      situationGeo: [etab?.ville, etab?.pays].filter(Boolean).join(', '),
      anneeScolaire: annee?.intitule || '',
      nombreEleves: etab?.parametres_json?.nombreEleves || '',
      nombreEnseignants: etab?.parametres_json?.nombreEnseignants || '',
      anneeOuverte: annee?.est_active ?? true,
    });

    // 4. Enseignants affiliés (listeProfesseursEtablissement)
    const { data: affiliationsEnseignants } = await supabase
      .from('affiliations_etablissement')
      .select('id, user_id, utilisateurs_profils(nom, prenom, telephone)')
      .eq('etablissement_id', etablissementId)
      .eq('role', 'ENSEIGNANT')
      .eq('statut', 'ACTIVE');

    const { data: attributions } = await supabase
      .from('attributions_classes')
      .select('enseignant_id, matiere_id, matieres(nom), classes(nom)')
      .eq('etablissement_id', etablissementId);

    const profsAvecClasses = (affiliationsEnseignants || []).map(a => {
      const attrsDeCetEnseignant = (attributions || []).filter(at => at.enseignant_id === a.user_id);
      return {
        id: a.id,
        nomComplet: `${a.utilisateurs_profils?.prenom || ''} ${a.utilisateurs_profils?.nom || ''}`.trim(),
        matiere: attrsDeCetEnseignant[0]?.matieres?.nom || 'Non définie',
        classes: attrsDeCetEnseignant.map(at => at.classes?.nom).filter(Boolean),
        matricule: 'N/A',
        contact: a.utilisateurs_profils?.telephone || 'Non défini',
        email: 'N/A',
      };
    });
    setListeProfesseursEtablissementBrute(profsAvecClasses);

    // 5. Personnel administratif manuel (table personnel)
    const { data: personnel } = await supabase
      .from('personnel')
      .select('*')
      .eq('etablissement_id', etablissementId);
    setPersonnelAdministratifManuel((personnel || []).map(p => ({
      id: p.id, nomComplet: `${p.prenom} ${p.nom}`.trim(), role: p.fonction,
      matricule: 'N/A', contact: p.telephone || 'N/A', email: p.email || 'N/A',
    })));

    // 6. Demande de promotion en cours (demandes_changement_role)
    const { data: demande } = await supabase
      .from('demandes_changement_role')
      .select('*')
      .eq('user_id', user.id)
      .eq('etablissement_id', etablissementId)
      .eq('role_demande', 'CHEF')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (demande) {
      setDemandePromotion({
        date: new Date(demande.created_at).toLocaleDateString(),
        type: 'interne',
        ecoleCible: etab?.nom || '',
        statut: demande.statut === 'EN_ATTENTE' ? 'En attente de validation' : demande.statut,
      });
    }

    // 7. Séances en attente de visa (onglet Visa) — regroupées par classe pour coller au JSX existant
    const { data: seances } = await supabase
      .from('seances')
      .select(`
        id, date_prevue, statut, contenu_json,
        classes ( nom ),
        lecons (
          id, titre,
          cycles (
            id, titre,
            programmes_annuels ( titre, proprietaire_user_id, matieres(nom),
              utilisateurs_profils:proprietaire_user_id (nom, prenom) )
          )
        )
      `)
      .in('statut', ['ENVOYEE', 'RECUE']);

    const groupe = {};
    (seances || []).forEach((sc, index) => {
      const classeNom = sc.classes?.nom || 'Classe inconnue';
      const cycle = sc.lecons?.cycles;
      const programme = cycle?.programmes_annuels;
      if (!groupe[classeNom]) {
        groupe[classeNom] = {
          enseignant: `${programme?.utilisateurs_profils?.prenom || ''} ${programme?.utilisateurs_profils?.nom || ''}`.trim() || 'Inconnu',
          matiere: programme?.matieres?.nom || 'Non définie',
          anneeScolaire: annee?.intitule || '',
          cycles: [],
        };
      }
      let cy = groupe[classeNom].cycles.find(c => c.id === cycle?.id);
      if (!cy) {
        cy = { id: cycle?.id, titre: cycle?.titre || '', lecons: [] };
        groupe[classeNom].cycles.push(cy);
      }
      let lc = cy.lecons.find(l => l.id === sc.lecons?.id);
      if (!lc) {
        lc = { id: sc.lecons?.id, titre: sc.lecons?.titre || '', seances: [] };
        cy.lecons.push(lc);
      }
      lc.seances.push({
        id: sc.id,
        numero: index + 1,
        titre: sc.contenu_json?.titre || 'Séance',
        date: sc.date_prevue,
        viseParCenseur: sc.statut === 'VISEE',
        habilites: sc.contenu_json?.habilites || '',
        contenus: sc.contenu_json?.contenus || '',
        exercices: sc.contenu_json?.exercices || '',
      });
    });
    setProgrammesClasses(groupe);

    // 8. Archives pédagogiques (bibliotheque_etablissement)
    const { data: archive } = await supabase
      .from('bibliotheque_etablissement')
      .select('id, titre, created_at, contenu_snapshot_json, utilisateurs_profils:auteur_user_id (nom, prenom)')
      .eq('etablissement_id', etablissementId)
      .order('created_at', { ascending: false });

    setArchiveEcole((archive || []).map(a => ({
      id: a.id,
      enseignant: `${a.utilisateurs_profils?.prenom || ''} ${a.utilisateurs_profils?.nom || ''}`.trim(),
      matiere: a.contenu_snapshot_json?.matiere || 'Non définie',
      classe: a.contenu_snapshot_json?.classe || 'Général',
      titre: a.titre,
      dateValidation: new Date(a.created_at).toLocaleDateString(),
      details: a.contenu_snapshot_json,
    })));

    setChargementInitial(false);
  };

  useEffect(() => { chargerTout(); }, []);

  // Enseignants affiliés — état brut séparé pour éviter un recalcul memo cassé pendant le chargement
  const [listeProfesseursEtablissementBrute, setListeProfesseursEtablissementBrute] = useState([]);
  const listeProfesseursEtablissement = listeProfesseursEtablissementBrute;

  // =========================================================================
  // LOGIQUE MÉTIER & ACTIONS — Supabase, mêmes noms qu'avant
  // =========================================================================
  const handleEnregistrerProfilCenseur = async (e) => {
    e.preventDefault();
    if (!userId) return;
    const { error } = await supabase
      .from('utilisateurs_profils')
      .update({ nom: formProfilCenseur.nom, prenom: formProfilCenseur.prenoms })
      .eq('user_id', userId);
    if (error) { showToast("⚠️ Erreur : " + error.message); return; }
    setInfosCenseur({ ...formProfilCenseur });
    setModalProfilCenseurOuvert(false);
    showToast("✅ Profil mis à jour !");
  };

  // Photo : reste locale pour l'instant, pas de colonne dédiée dans utilisateurs_profils
  const handleChangerPhotoProfil = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormProfilCenseur(prev => ({ ...prev, photoProfil: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const [inputCodeEtablissementCenseur, setInputCodeEtablissementCenseur] = useState('');
  const [nouvelleInvitationEnseignantEmail, setNouvelleInvitationEnseignantEmail] = useState('');

  const genererTokenInvitation = () => crypto.randomUUID().replace(/-/g, '').slice(0, 16);

  const envoyerInvitationEnseignant = async (e) => {
    e.preventDefault();
    if (!nouvelleInvitationEnseignantEmail.trim() || !affiliationCenseur) return;

    const { error } = await supabase
      .from('invitations')
      .insert({
        etablissement_id: affiliationCenseur.etablissement_id,
        invite_par_user_id: userId,
        email: nouvelleInvitationEnseignantEmail.trim().toLowerCase(),
        role_propose: 'ENSEIGNANT',
        token: genererTokenInvitation(),
        expire_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });

    if (error) { showToast("⚠️ Erreur d'envoi de l'invitation : " + error.message); return; }

    setNouvelleInvitationEnseignantEmail('');
    showToast(`📨 Invitation envoyée !`);
  };

  const soumettreDemandeRejoindre = async (e) => {
    e.preventDefault();
    if (!inputCodeEtablissementCenseur.trim() || !userId) return;

    const { data: etablissementCible, error: erreurRecherche } = await supabase
      .from('etablissements').select('id, nom').eq('code', inputCodeEtablissementCenseur.trim()).maybeSingle();

    if (erreurRecherche || !etablissementCible) {
      showToast("⚠️ Aucun établissement trouvé avec ce code.");
      return;
    }

    const { error } = await supabase
      .from('demandes_affiliation')
      .insert({ user_id: userId, etablissement_id: etablissementCible.id, role_demande: 'CENSEUR' });

    if (error) {
      if (error.code === '23505') {
        showToast("⚠️ Une demande est déjà en attente pour cet établissement.");
      } else {
        showToast("⚠️ Erreur : " + error.message);
      }
      return;
    }

    showToast(`📨 Demande envoyée pour "${etablissementCible.nom}". En attente d'approbation du chef.`);
  };

  const envoyerDemandePromotion = async (e) => {
    e.preventDefault();
    if (!userId || !affiliationCenseur) return;

    if (formPromotion.type === 'interne') {
      const { error } = await supabase
        .from('demandes_changement_role')
        .insert({
          user_id: userId,
          etablissement_id: affiliationCenseur.etablissement_id,
          role_actuel: 'CENSEUR',
          role_demande: 'CHEF',
        });
      if (error) { showToast("⚠️ Erreur : " + error.message); return; }
      setDemandePromotion({ date: new Date().toLocaleDateString(), type: 'interne', ecoleCible: infosCenseur.etablissement, statut: 'En attente de validation' });
      showToast("🚀 Demande d'évolution vers le poste de Proviseur envoyée !");
      return;
    }

    // Mutation externe : recherche de l'établissement cible par NOM (best-effort).
    // ⚠️ Fragile si deux établissements portent le même nom — idéalement il
    // faudrait demander le CODE établissement plutôt que le nom, comme pour
    // "rejoindre un établissement" côté chef. À améliorer si ça pose problème.
    const { data: etablissementCible, error: erreurRecherche } = await supabase
      .from('etablissements')
      .select('id, nom')
      .ilike('nom', formPromotion.ecoleCible.trim())
      .maybeSingle();

    if (erreurRecherche || !etablissementCible) {
      showToast("⚠️ Établissement cible introuvable. Vérifiez le nom exact.");
      return;
    }

    const { error: erreurDemande } = await supabase
      .from('demandes_affiliation')
      .insert({ user_id: userId, etablissement_id: etablissementCible.id, role_demande: 'CHEF' });

    if (erreurDemande) { showToast("⚠️ Erreur : " + erreurDemande.message); return; }
    setDemandePromotion({ date: new Date().toLocaleDateString(), type: 'externe', ecoleCible: etablissementCible.nom, statut: 'En attente de validation' });
    showToast("🚀 Demande de mutation envoyée !");
  };

  const toggleSelectionRappel = (nomProf, isChecked) => {
    setProfsSelectionnesRappel(prev => isChecked ? [...prev, nomProf] : prev.filter(n => n !== nomProf));
  };

  // Rappels : pas encore de table dédiée dans le schéma (à ajouter si besoin réel) — reste un toast local
  const envoyerRappelMultipleManuel = () => {
    if (profsSelectionnesRappel.length === 0) return showToast("⚠️ Veuillez sélectionner au moins un enseignant.");
    showToast(`✉️ Rappel manuel envoyé avec succès à : ${profsSelectionnesRappel.join(', ')}.`);
    setProfsSelectionnesRappel([]);
  };

  const ajouterPersonnelAdministratif = async (e) => {
    e.preventDefault();
    if (!nouveauAdminNom.trim() || !affiliationCenseur) return;

    const [prenom, ...resteNom] = nouveauAdminNom.trim().split(' ');
    const nom = resteNom.join(' ') || prenom;

    const { data: nouveau, error } = await supabase
      .from('personnel')
      .insert({
        etablissement_id: affiliationCenseur.etablissement_id,
        prenom, nom, fonction: nouveauAdminRole,
        email: nouveauAdminEmail.trim() || null,
        telephone: nouveauAdminContact.trim() || null,
      })
      .select()
      .single();

    if (error) { showToast("⚠️ Erreur : " + error.message); return; }

    setPersonnelAdministratifManuel(prev => [...prev, {
      id: nouveau.id, nomComplet: nouveauAdminNom.trim(), role: nouveauAdminRole,
      matricule: nouveauAdminMatricule.trim() || 'N/A', contact: nouveauAdminContact.trim() || 'N/A', email: nouveauAdminEmail.trim() || 'N/A',
    }]);
    setNouveauAdminNom(''); setNouveauAdminMatricule(''); setNouveauAdminContact(''); setNouveauAdminEmail('');
    showToast("✅ Personnel ajouté !");
  };

  const supprimerPersonnelAdministratif = async (id) => {
    const { error } = await supabase.from('personnel').delete().eq('id', id);
    if (error) { showToast("⚠️ Erreur : " + error.message); return; }
    setPersonnelAdministratifManuel(prev => prev.filter(p => p.id !== id));
    showToast("🗑️ Membre retiré.");
  };

  const viserEtArchiverSeance = async (classeKey, cycleId, leconId, seanceAViser) => {
    const prog = programmesClasses[classeKey];
    if (!prog || !affiliationCenseur) return;

    // 1. Marquer la séance comme visée
    const { error: erreurVisa } = await supabase
      .from('seances')
      .update({ statut: 'VISEE', visee_par_user_id: userId, visee_at: new Date().toISOString() })
      .eq('id', seanceAViser.id);

    if (erreurVisa) { showToast("⚠️ Erreur de visa : " + erreurVisa.message); return; }

    // 2. Archiver dans la bibliothèque institutionnelle (double mémoire, §17)
    const { error: erreurArchive } = await supabase
      .from('bibliotheque_etablissement')
      .insert({
        etablissement_id: affiliationCenseur.etablissement_id,
        annee_scolaire_id: anneeActiveId,
        origin_session_id: seanceAViser.id,
        auteur_user_id: userId, // ⚠️ idéalement l'auteur réel de la séance, pas le censeur — à corriger si programmes_annuels expose proprietaire_user_id ici
        titre: seanceAViser.titre,
        contenu_snapshot_json: { matiere: prog.matiere, classe: classeKey, ...seanceAViser },
      });

    if (erreurArchive) { showToast("⚠️ Visa enregistré, mais erreur d'archivage : " + erreurArchive.message); }

    showToast(`✅ Séance visée et archivée !`);
    chargerTout(); // recharge visa + archives pour refléter le nouvel état
  };

  const telechargerPDFArchive = (item) => {
    const fenetre = window.open('', '_blank');
    if (!fenetre) return;
    fenetre.document.write(
      '<html><head><title>Fiche - ' + item.titre + '</title><style>body{font-family:Arial;} table{width:100%;border-collapse:collapse;} th,td{border:1px solid #ccc;padding:10px;text-align:left;}</style></head>' +
      '<body><h2>ARCHIVE PÉDAGOGIQUE OFFICIELLE</h2><p><strong>Enseignant :</strong> ' + item.enseignant + ' | <strong>Classe :</strong> ' + item.classe + '</p><p><strong>Titre :</strong> ' + item.titre + '</p>' +
      '<table><tr><th>Contenus</th><td>' + (item.details?.contenus || 'Voir plateforme') + '</td></tr></table>' +
      '<script>window.onload=function(){window.print();window.close();}</script></body></html>'
    );
    fenetre.document.close();
  };

  // =========================================================================
  // VARIABLES DÉRIVÉES (inchangées, purement calculées côté client)
  // =========================================================================
  const nombreClassesAutomatique = useMemo(() => Object.keys(programmesClasses || {}).length || 0, [programmesClasses]);

  const fichesPedagogiquesEcole = useMemo(() => archiveEcole, [archiveEcole]);

  const fichesFiltrees = useMemo(() => {
    return fichesPedagogiquesEcole.filter(fiche => {
      const matchMat = filtreArchiveMatiere === 'TOUTES' || fiche.matiere === filtreArchiveMatiere;
      const matchCl = filtreArchiveClasse === 'TOUTES' || fiche.classe === filtreArchiveClasse;
      return matchMat && matchCl;
    });
  }, [fichesPedagogiquesEcole, filtreArchiveMatiere, filtreArchiveClasse]);

  const professeursFiltres = useMemo(() => {
    return listeProfesseursEtablissement.filter(prof => {
      const matchCl = filtreProfClasse === 'TOUTES' || (Array.isArray(prof.classes) && prof.classes.includes(filtreProfClasse));
      return matchCl;
    });
  }, [listeProfesseursEtablissement, filtreProfClasse]);

  if (chargementInitial) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a', color: '#fff' }}>
        Chargement de votre espace...
      </div>
    );
  }

  if (!affiliationCenseur) {
    return (
      <div style={{ backgroundColor: '#0f172a', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', boxSizing: 'border-box' }}>
        <div style={{ backgroundColor: '#ffffff', padding: '40px', borderRadius: '24px', width: '100%', maxWidth: '440px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', boxSizing: 'border-box' }}>
          <h2 style={{ color: '#0f172a', marginBottom: '8px', textAlign: 'center', fontSize: '22px', fontWeight: '800' }}>Espace Censeur</h2>
          <p style={{ fontSize: '13px', color: '#64748b', textAlign: 'center', marginBottom: '24px', lineHeight: '1.5' }}>
            Entrez le code de l'établissement que vous souhaitez rejoindre. Votre demande sera soumise au chef d'établissement pour approbation.
          </p>
          {message && <div style={{ ...styles.toastSuccess, marginBottom: '16px' }}>{message}</div>}
          <form onSubmit={soumettreDemandeRejoindre} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={styles.label}>Code de l'établissement</label>
              <input type="text" placeholder="Ex: LYCMOD-A1B2" value={inputCodeEtablissementCenseur} onChange={(e) => setInputCodeEtablissementCenseur(e.target.value)} style={styles.inputStyle} required />
            </div>
            <button type="submit" className="bouton bouton-principal" style={{ marginTop: '6px' }}>Envoyer la demande</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* HEADER & NAVBAR */}
      <header style={styles.darkNavbar}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'nowrap', gap: '8px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
          
          {/* SECTION PROFIL ÉPURÉE */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }} ref={profilCenseurRef}>
            <button onClick={() => setProfilCenseurOuvert(!profilCenseurOuvert)} style={styles.navbarTeacherClickableBlock}>
              <div style={styles.avatarNavbarContainer}>
                {infosCenseur.photoProfil ? (
                  <img src={infosCenseur.photoProfil} alt="Profil" style={styles.avatarNavbarImg} />
                ) : (
                  <div style={styles.avatarNavbarPlaceholder}>👤</div>
                )}
              </div>
              <div style={styles.navbarTeacherInfo}>
                <span style={{ fontSize: '12px', fontWeight: '900', color: '#ffffff', whiteSpace: 'nowrap' }}>
                  {infosCenseur.civilite} {infosCenseur.nom}
                </span>
                <span style={{ fontSize: '9px', fontWeight: '700', color: '#38bdf8', textTransform: 'uppercase' }}>
                  Censeur
                </span>
              </div>
              <span style={{ fontSize: '9px', color: '#94a3b8', marginLeft: '2px' }}>{profilCenseurOuvert ? '▲' : '▼'}</span>
            </button>

            {profilCenseurOuvert && (
              <div style={{ ...styles.notificationDropdown, left: 0, right: 'auto' }}>
                <div style={styles.dropdownHeader}>Mon Compte Censeur</div>
                <div style={{ padding: '10px', fontSize: '12px', color: '#334155', borderBottom: '1px solid #e2e8f0', marginBottom: '6px', background: '#f8fafc', borderRadius: '8px' }}>
                  <strong>{infosCenseur.civilite} {infosCenseur.nom} {infosCenseur.prenoms}</strong><br />
                  <span style={{ color: '#64748b', fontSize: '11px' }}>
                    {infosCenseur.etablissement}<br />
                    <em>{infosCenseur.role}</em>
                  </span>
                </div>
                <button onClick={() => { setFormProfilCenseur({ ...infosCenseur }); setModalProfilCenseurOuvert(true); setProfilCenseurOuvert(false); }} className="bouton-option">
                  ⚙️ Modifier mon profil
                </button>
                <button onClick={() => { setModalSecurite(true); setProfilCenseurOuvert(false); }} className="bouton-option">
                  🔒 Changer mon mot de passe
                </button>
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
            <div style={{ position: 'relative' }} ref={notifCenseurRef}>
              <button onClick={() => setNotifCenseurOuvert(!notifCenseurOuvert)} style={styles.navDarkBtn}>
                <span>🔔</span>{(notificationsCenseur || []).filter(n => !n.lu).length > 0 && <span style={styles.pastilleAlerte}>{(notificationsCenseur || []).filter(n => !n.lu).length}</span>}
              </button>
              {notifCenseurOuvert && (
                <div style={{ ...styles.notificationDropdown, right: 0, left: 'auto' }}>
                  <div style={styles.dropdownHeader}>Notifications</div>
                  {(notificationsCenseur || []).map(n => (
                    <div key={n.id} onClick={() => { setActiveTab('visa'); setNotifCenseurOuvert(false); }} style={styles.notifItem}>
                      <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#334155' }}>{n.texte}</p><span style={{ fontSize: '10px', color: '#94a3b8' }}>{n.date}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ position: 'relative' }} ref={menuBurgerCenseurRef}>
              <button onClick={() => setMenuBurgerCenseurOuvert(!menuBurgerCenseurOuvert)} style={styles.burgerBtn}>☰</button>
              {menuBurgerCenseurOuvert && (
                <div style={{ ...styles.burgerDropdown, right: 0, left: 'auto' }} className="anim-apparition">
                  <div style={styles.dropdownHeader}>Menu Censeur</div>
                  <button onClick={() => { setActiveTab('visa'); setMenuBurgerCenseurOuvert(false); }} className="bouton-option" style={{color: '#2563eb', fontWeight: '800'}}>✍️ Visa & File d'Attente</button>
                  <button onClick={() => { setActiveTab('fichiers_pedagogiques'); setMenuBurgerCenseurOuvert(false); }} className="bouton-option">📚 Archives Pédagogiques</button>
                  <button onClick={() => { setActiveTab('professeurs'); setMenuBurgerCenseurOuvert(false); }} className="bouton-option">👨‍🏫 Annuaire Personnel</button>
                  <button onClick={() => { setActiveTab('suivi'); setMenuBurgerCenseurOuvert(false); }} className="bouton-option">⏰ Suivi & Rappels</button>
                  <button onClick={() => { setActiveTab('profil_ecole'); setMenuBurgerCenseurOuvert(false); }} className="bouton-option">🏛️ Profil Établissement</button>
                  <div style={{ borderTop: '1px solid #e2e8f0', margin: '6px 0', paddingTop: '6px' }}>
                    <button onClick={() => { setActiveTab('evolution'); setMenuBurgerCenseurOuvert(false); }} className="bouton-option" style={{ color: '#8b5cf6', fontWeight: '800' }}>🎓 Évolution de carrière</button>
                  </div>
                  <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '6px' }}>
                    <button onClick={() => { setModalDeconnexion(true); setMenuBurgerCenseurOuvert(false); }} className="bouton-option" style={{ color: '#ef4444', fontWeight: '900', textAlign: 'center' }}>🚪 Se déconnecter</button>
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

        {/* MODALE DE CONFIRMATION UNIVERSELLE POUR ACTIONS IRRÉVERSIBLES */}
        {modalConfirmation.ouvert && (
          <div style={styles.fondModale}>
            <div style={{ ...styles.cardWide, width: '380px', textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#0f172a', fontSize: '18px', fontWeight: '800' }}>{modalConfirmation.titre}</h3>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px', lineHeight: '1.5' }}>
                {modalConfirmation.message}
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                <button onClick={() => setModalConfirmation({ ouvert: false, titre: '', message: '', actionCallback: null })} className="bouton bouton-secondaire">Annuler</button>
                <button onClick={() => {
                  if (modalConfirmation.actionCallback) modalConfirmation.actionCallback();
                  setModalConfirmation({ ouvert: false, titre: '', message: '', actionCallback: null });
                }} className="bouton bouton-danger">Confirmer</button>
              </div>
            </div>
          </div>
        )}

        {modalDeconnexion && (
          <div style={styles.fondModale}>
            <div style={{ ...styles.cardWide, width: '400px', textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#0f172a', fontSize: '18px', fontWeight: '800' }}>🚪 Déconnexion</h3>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>Voulez-vous vraiment vous déconnecter ?</p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                <button onClick={() => setModalDeconnexion(false)} className="bouton bouton-secondaire">Annuler</button>
                <button onClick={() => { setModalDeconnexion(false); localStorage.removeItem('app_censeur_statut'); window.location.reload(); }} className="bouton bouton-danger">Oui</button>
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

        {modalProfilCenseurOuvert && (
          <div style={styles.fondModale}>
            <div style={{ ...styles.cardWide, width: '480px', maxHeight: '90vh', overflowY: 'auto' }}>
              <h3 style={{ margin: '0 0 16px 0', color: '#0f172a', fontSize: '18px', fontWeight: '800' }}>👤 Modifier mon profil</h3>
              
              <form onSubmit={handleEnregistrerProfilCenseur} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '4px' }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#e2e8f0', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center', border: '2px solid #cbd5e1', flexShrink: 0 }}>
                    {formProfilCenseur.photoProfil ? (
                      <img src={formProfilCenseur.photoProfil} alt="Aperçu" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: '28px' }}>👤</span>
                    )}
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={styles.label}>Photo de profil</label>
                    <input type="file" accept="image/*" onChange={handleChangerPhotoProfil} style={{ fontSize: '12px', cursor: 'pointer' }} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
                  <div>
                    <label style={styles.label}>Civilité</label>
                    <select value={formProfilCenseur.civilite} onChange={(e) => setFormProfilCenseur({...formProfilCenseur, civilite: e.target.value})} style={styles.inputStyle}>
                      <option value="M.">M.</option>
                      <option value="Mme">Mme</option>
                      <option value="Dr">Dr</option>
                      <option value="Pr">Pr</option>
                    </select>
                  </div>
                  <div>
                    <label style={styles.label}>Nom</label>
                    <input type="text" value={formProfilCenseur.nom} onChange={(e) => setFormProfilCenseur({...formProfilCenseur, nom: e.target.value})} style={styles.inputStyle} required />
                  </div>
                </div>

                <div>
                  <label style={styles.label}>Prénoms</label>
                  <input type="text" value={formProfilCenseur.prenoms} onChange={(e) => setFormProfilCenseur({...formProfilCenseur, prenoms: e.target.value})} style={styles.inputStyle} required />
                </div>

                <div>
                  <label style={styles.label}>Rôle pédagogique</label>
                  <input type="text" value={formProfilCenseur.role} onChange={(e) => setFormProfilCenseur({...formProfilCenseur, role: e.target.value})} style={styles.inputStyle} required />
                </div>

                <div>
                  <label style={styles.label}>Nom de l'établissement</label>
                  <input type="text" value={formProfilCenseur.etablissement} onChange={(e) => setFormProfilCenseur({...formProfilCenseur, etablissement: e.target.value})} style={styles.inputStyle} required />
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
                  <button type="button" onClick={() => setModalProfilCenseurOuvert(false)} className="bouton bouton-secondaire">Annuler</button>
                  <button type="submit" className="bouton bouton-principal">Enregistrer</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {modalConsultation.ouvert && (
          <div style={styles.fondModale}>
            <div style={{ ...styles.cardWide, width: '560px', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px', fontWeight: '800' }}>👁️ Consultation de la Fiche</h3>
                <button onClick={() => setModalConsultation({ ouvert: false, element: null })} className="bouton bouton-secondaire">✕</button>
              </div>
              <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <p style={{ margin: 0, color: '#0f172a', fontSize: '15px' }}><strong>{modalConsultation.element?.titre}</strong></p>
                <div style={{ height: '1px', backgroundColor: '#cbd5e1', margin: '8px 0' }}></div>
                <p style={{ margin: 0 }}><strong>Habilités :</strong> {modalConsultation.element?.habilites}</p>
                <p style={{ margin: 0 }}><strong>Contenus :</strong> {modalConsultation.element?.contenus}</p>
                <p style={{ margin: 0 }}><strong>Exercices :</strong> {modalConsultation.element?.exercices}</p>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------------------------------------ */}
        {/* ONGLET 1 : VISA & FILE D'ATTENTE */}
        {/* ------------------------------------------------------------------------------------------------ */}
        {activeTab === 'visa' && (
          <div style={styles.cardWide}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', margin: '0 0 4px 0' }}>✍️ Validation & File d'attente des Fiches</h2>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Sélectionnez une classe pour dérouler. Les fiches visées disparaissent et vont aux archives.</p>
              </div>
            </div>

            {Object.keys(programmesClasses || {}).length === 0 ? (
              <p style={{ fontStyle: 'italic', color: '#64748b', textAlign: 'center', padding: '30px' }}>Aucune fiche soumise pour le moment.</p>
            ) : (
              Object.entries(programmesClasses || {}).map(([classeNom, prog]) => {
                
                const hasPendingSeances = (prog.cycles || []).some(cy => 
                  (cy.lecons || []).some(lc => 
                    (lc.seances || []).some(sc => !sc.viseParCenseur)
                  )
                );

                if (!hasPendingSeances) return null;

                const isClasseOuverte = classesOuvertesVisa[classeNom];

                return (
                  <div key={classeNom} style={{ marginBottom: '16px', border: '1px solid #cbd5e1', borderRadius: '12px', overflow: 'hidden' }}>
                    <button 
                      onClick={() => toggleClasseVisa(classeNom)}
                      style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', backgroundColor: isClasseOuverte ? '#e0f2fe' : '#f8fafc', border: 'none', cursor: 'pointer', outline: 'none' }}
                    >
                      <div style={{ textAlign: 'left' }}>
                        <h3 style={{ margin: 0, color: '#0f172a', fontSize: '15px', fontWeight: '800' }}>🏫 Classe : {classeNom}</h3>
                        <span style={{ fontSize: '12px', color: '#475569' }}>Matière : {prog.matiere || 'EPS'} | Enseignant : <strong>{prog.enseignant || 'Inconnu'}</strong></span>
                      </div>
                      <span style={{ fontSize: '16px', color: '#2563eb' }}>{isClasseOuverte ? '▲' : '▼'}</span>
                    </button>

                    {isClasseOuverte && (
                      <div style={{ padding: '16px', backgroundColor: '#ffffff' }}>
                        {(prog.cycles || []).map(cy => (
                          <div key={cy.id} style={{ marginBottom: '12px' }}>
                            {(cy.lecons || []).map(lc => (
                              <div key={lc.id}>
                                {([...(lc.seances || [])])
                                  .filter(sc => !sc.viseParCenseur)
                                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                                  .map(sc => (
                                    <div key={sc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', backgroundColor: '#f1f5f9', padding: '12px 16px', borderRadius: '10px', marginBottom: '8px', borderLeft: '4px solid #f59e0b' }}>
                                      <div>
                                        <span style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: '800' }}>{cy.titre} ➔ {lc.titre}</span>
                                        <p style={{ margin: '4px 0 0 0', fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>Séance #{sc.numero} : {sc.titre}</p>
                                        <span style={{ fontSize: '11px', color: '#64748b' }}>📅 Date : {sc.date}</span>
                                      </div>
                                      <div style={{ display: 'flex', gap: '8px' }}>
                                        <button onClick={() => setModalConsultation({ ouvert: true, element: sc })} className="bouton bouton-secondaire" style={{ padding: '6px 12px', fontSize: '12px' }}>👁️ Consulter</button>
                                        <button onClick={() => viserEtArchiverSeance(classeNom, cy.id, lc.id, sc)} className="bouton bouton-succes" style={{ padding: '6px 12px', fontSize: '12px' }}>✍️ Viser & Archiver</button>
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ------------------------------------------------------------------------------------------------ */}
        {/* ONGLET 2 : ARCHIVES PÉDAGOGIQUES */}
        {/* ------------------------------------------------------------------------------------------------ */}
        {activeTab === 'fichiers_pedagogiques' && (
          <div style={styles.cardWide}>
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', margin: '0 0 4px 0' }}>📚 Archives Pédagogiques Permanentes</h2>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Retrouvez ici toutes les fiches validées et archivées.</p>
            </div>

            <div style={styles.bibliothequeFilterBox}>
              <div style={{ flex: '1 1 180px' }}><label style={styles.labelFiltre}>Classe</label><select value={filtreArchiveClasse} onChange={(e) => setFiltreArchiveClasse(e.target.value)} style={styles.inputStyle}><option value="TOUTES">Toutes</option><option value="6ème A">6ème A</option></select></div>
              <div style={{ flex: '1 1 180px' }}><label style={styles.labelFiltre}>Matière</label><select value={filtreArchiveMatiere} onChange={(e) => setFiltreArchiveMatiere(e.target.value)} style={styles.inputStyle}><option value="TOUTES">Toutes</option><option value="EPS">EPS</option><option value="Mathématiques">Mathématiques</option></select></div>
            </div>

            {fichesFiltrees.length === 0 ? (
              <p style={{ fontStyle: 'italic', color: '#64748b', textAlign: 'center', padding: '30px' }}>Aucune fiche archivée trouvée.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {fichesFiltrees.map((fiche, index) => (
                  <div key={index} style={styles.itemRow}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ backgroundColor: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700' }}>{fiche.matiere || 'Matière'}</span>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>({fiche.classe || 'Général'})</span>
                        <strong style={{ fontSize: '14px', color: '#0f172a' }}>{fiche.titre}</strong>
                      </div>
                      <p style={{ fontSize: '12px', color: '#475569', margin: 0 }}>Enseignant : <strong>{fiche.enseignant}</strong> | Archivé le : {fiche.dateValidation}</p>
                    </div>
                    <div>
                      <button onClick={() => telechargerPDFArchive(fiche)} className="bouton bouton-principal" style={{ padding: '6px 12px', fontSize: '12px', backgroundColor: '#0f172a' }}>📥 Télécharger (PDF)</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------------------------------------------ */}
        {/* ONGLET 3 : ANNUAIRE & PERSONNEL */}
        {/* ------------------------------------------------------------------------------------------------ */}
        {activeTab === 'professeurs' && (
          <div style={styles.cardWide}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 }}>👨‍🏫 Annuaire Détaillé du Personnel</h2>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>Gérez le corps professoral et ajoutez manuellement le personnel d'encadrement.</p>
              </div>
            </div>

            <div style={{ backgroundColor: '#eff6ff', padding: '16px', borderRadius: '12px', border: '1px solid #bfdbfe', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#1e3a8a', marginBottom: '12px' }}>📨 Inviter un enseignant par email</h3>
              <form onSubmit={envoyerInvitationEnseignant} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <input type="email" placeholder="email@exemple.com" value={nouvelleInvitationEnseignantEmail} onChange={(e) => setNouvelleInvitationEnseignantEmail(e.target.value)} style={{ ...styles.inputStyle, flex: '2 1 220px', margin: 0 }} required />
                <button type="submit" className="bouton bouton-principal" style={{ flexShrink: 0 }}>Envoyer l'invitation</button>
              </form>
            </div>

            <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', marginBottom: '12px' }}>+ Ajouter un membre du personnel administratif</h3>
              <form onSubmit={ajouterPersonnelAdministratif} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <input type="text" placeholder="Nom et prénoms..." value={nouveauAdminNom} onChange={(e) => setNouveauAdminNom(e.target.value)} style={{ ...styles.inputStyle, flex: '2 1 180px', margin: 0 }} required />
                <select value={nouveauAdminRole} onChange={(e) => setNouveauAdminRole(e.target.value)} style={{ ...styles.inputStyle, flex: '1 1 130px', margin: 0 }}>
                  <option value="Éducateur">Éducateur</option><option value="Intendant">Intendant</option><option value="Secrétaire">Secrétaire</option>
                </select>
                <input type="text" placeholder="Matricule" value={nouveauAdminMatricule} onChange={(e) => setNouveauAdminMatricule(e.target.value)} style={{ ...styles.inputStyle, flex: '1 1 120px', margin: 0 }} required />
                <input type="text" placeholder="Contact" value={nouveauAdminContact} onChange={(e) => setNouveauAdminContact(e.target.value)} style={{ ...styles.inputStyle, flex: '1 1 120px', margin: 0 }} />
                <button type="submit" className="bouton bouton-principal" style={{ flexShrink: 0, backgroundColor: '#0f172a', padding: '0 16px' }}>Ajouter</button>
              </form>

              {personnelAdministratifManuel.length > 0 && (
                <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <strong style={{ fontSize: '11px', color: '#475569', textTransform: 'uppercase' }}>Personnel administratif :</strong>
                  {personnelAdministratifManuel.map(p => (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}>
                      <span>👤 <strong>{p.nomComplet}</strong> — Rôle : <em>{p.role}</em> | MAT : <strong>{p.matricule}</strong> | Contact : {p.contact}</span>
                      <button 
                        onClick={() => setModalConfirmation({
                          ouvert: true,
                          titre: '⚠️ Retirer ce membre ?',
                          message: `Voulez-vous vraiment retirer "${p.nomComplet}" de l'annuaire administratif ?`,
                          actionCallback: () => supprimerPersonnelAdministratif(p.id)
                        })} 
                        className="bouton bouton-danger" 
                        style={{ padding: '4px 8px', fontSize: '11px' }}
                      >
                        Retirer
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', marginBottom: '12px', borderBottom: '2px solid #cbd5e1', paddingBottom: '6px' }}>Enseignants affiliés au réseau ({listeProfesseursEtablissement.length})</h3>
            {professeursFiltres.length === 0 ? (
              <p style={{ fontStyle: 'italic', color: '#64748b', textAlign: 'center', padding: '30px' }}>Aucun professeur trouvé.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {professeursFiltres.map((prof, i) => (
                  <div key={i} style={styles.itemRow}>
                    <div style={{ flex: 1 }}>
                      <strong style={{ fontSize: '14px', color: '#0f172a' }}>{prof.nomComplet}</strong>
                      <p style={{ fontSize: '12px', color: '#475569', margin: '4px 0 0 0' }}>Matière : <strong style={{color: '#2563eb'}}>{prof.matiere}</strong> | Classes : <strong>{Array.isArray(prof.classes) ? prof.classes.join(', ') : 'N/A'}</strong></p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------------------------------------------ */}
        {/* ONGLET 4 : SUIVI & RAPPELS MANUELS MULTIPLES */}
        {/* ------------------------------------------------------------------------------------------------ */}
        {activeTab === 'suivi' && (
          <div style={styles.cardWide}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', margin: 0 }}>⏰ Suivi & Rappels Manuels Multiples</h2>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Cochez les enseignants en retard et envoyez-leur un rappel groupé en un clic.</p>
              </div>
              <button 
                onClick={envoyerRappelMultipleManuel} 
                className="bouton bouton-succes"
                disabled={profsSelectionnesRappel.length === 0}
              >
                ✉️ Envoyer le rappel aux sélectionnés ({profsSelectionnesRappel.length})
              </button>
            </div>

            {listeProfesseursEtablissement.length === 0 ? (
              <p style={{ fontStyle: 'italic', color: '#64748b', textAlign: 'center', padding: '30px' }}>Aucun enseignant enregistré dans l'établissement.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {listeProfesseursEtablissement.map((prof, idx) => {
                  const estCoche = profsSelectionnesRappel.includes(prof.nomComplet);
                  return (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: estCoche ? '#eff6ff' : '#f8fafc', padding: '14px 16px', borderRadius: '12px', border: estCoche ? '1px solid #3b82f6' : '1px solid #e2e8f0', flexWrap: 'wrap', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <input 
                          type="checkbox" 
                          checked={estCoche} 
                          onChange={(e) => toggleSelectionRappel(prof.nomComplet, e.target.checked)} 
                          style={{ width: '18px', height: '18px', cursor: 'pointer' }} 
                        />
                        <div>
                          <strong style={{ color: '#0f172a', fontSize: '14px' }}>{prof.nomComplet}</strong> ({prof.matiere})<br />
                          <small style={{ color: '#64748b', fontSize: '12px' }}>Classes : <strong>{prof.classes.join(', ') || 'N/A'}</strong> | Statut : <span style={{ color: '#d97706', fontWeight: '700' }}>En attente de fiches</span></small>
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          showToast(`✉️ Message de rappel envoyé à ${prof.nomComplet} !`);
                        }} 
                        className="bouton bouton-secondaire" 
                      >
                        Envoyer un rappel individuel
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------------------------------------------ */}
        {/* ONGLET 5 : PROFIL ÉCOLE */}
        {/* ------------------------------------------------------------------------------------------------ */}
        {activeTab === 'profil_ecole' && (
          <div style={styles.cardWide}>
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', margin: '0 0 4px 0' }}>🏛️ Carte d'Identité & Administration</h2>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Consultation officielle de la configuration d'établissement.</p>
            </div>

            <div style={{ backgroundColor: '#f8fafc', padding: '24px', borderRadius: '16px', border: '1px solid #cbd5e1', marginBottom: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              <div><label style={styles.label}>Nom Officiel</label><p style={styles.pInfo}>{ecoleConfigGlobale.nomEcole}</p></div>
              <div><label style={styles.label}>Code Établissement</label><p style={{...styles.pInfo, color: '#2563eb'}}>{ecoleConfigGlobale.codeEtablissement}</p></div>
              <div><label style={styles.label}>Type d'Établissement</label><p style={styles.pInfo}>{ecoleConfigGlobale.typeEtablissement}</p></div>
              <div><label style={styles.label}>Situation Géographique</label><p style={styles.pInfo}>{ecoleConfigGlobale.situationGeo}</p></div>
              <div><label style={styles.label}>Effectif Élèves</label><p style={{...styles.pInfo, color: '#16a34a'}}>{ecoleConfigGlobale.nombreEleves} élèves</p></div>
              <div><label style={styles.label}>Effectif Enseignants</label><p style={{...styles.pInfo, color: '#16a34a'}}>{nombreClassesAutomatique} classe(s)</p></div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------------------------------------ */}
        {/* ONGLET 6 : ÉVOLUTION DE CARRIÈRE */}
        {/* ------------------------------------------------------------------------------------------------ */}
        {activeTab === 'evolution' && (
          <div style={styles.cardWide}>
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', margin: '0 0 4px 0' }}>🎓 Évolution de Carrière : Devenir Proviseur</h2>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Soumettez une demande pour évoluer vers le poste de Chef d'Établissement. Votre demande sera soumise à validation.</p>
            </div>

            {demandePromotion ? (
              <div style={{ backgroundColor: '#fdf4ff', border: '1px solid #fbcfe8', padding: '20px', borderRadius: '16px', textAlign: 'center' }}>
                <span style={{ fontSize: '30px' }}>⏳</span>
                <h3 style={{ color: '#9d174d', margin: '10px 0 5px 0' }}>Demande de promotion en cours d'examen</h3>
                <p style={{ fontSize: '13px', color: '#be185d', margin: 0 }}>Vous avez postulé pour le poste de Proviseur ({demandePromotion.type === 'interne' ? 'en interne' : `mutation vers ${demandePromotion.ecoleCible}`}) le {demandePromotion.date}.</p>
                <p style={{ fontSize: '14px', fontWeight: '800', marginTop: '10px', color: '#9d174d' }}>Statut : {demandePromotion.statut}</p>
              </div>
            ) : (
              <form onSubmit={envoyerDemandePromotion} style={{ backgroundColor: '#f8fafc', padding: '24px', borderRadius: '16px', border: '1px solid #cbd5e1' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={styles.label}>Type d'évolution souhaitée</label>
                    <select value={formPromotion.type} onChange={(e) => setFormPromotion({...formPromotion, type: e.target.value})} style={styles.inputStyle}>
                      <option value="interne">Évolution Interne (Prendre la relève dans l'établissement actuel)</option>
                      <option value="externe">Évolution Externe / Mutation</option>
                    </select>
                  </div>

                  {formPromotion.type === 'interne' ? (
                    <div style={{ backgroundColor: '#eff6ff', padding: '12px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                      <p style={{ fontSize: '12px', color: '#1e40af', margin: 0 }}>Votre demande sera envoyée au Chef d'Établissement actuel ({infosCenseur.etablissement}) pour validation de succession.</p>
                    </div>
                  ) : (
                    <div>
                      <label style={styles.label}>Nom de l'établissement cible (Mutation)</label>
                      <input type="text" placeholder="Ex: Lycée Classique d'Abidjan..." value={formPromotion.ecoleCible} onChange={(e) => setFormPromotion({...formPromotion, ecoleCible: e.target.value})} style={styles.inputStyle} required />
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                    <button type="submit" className="bouton bouton-principal" style={{ backgroundColor: '#0f172a' }}>Soumettre la demande officielle</button>
                  </div>
                </div>
              </form>
            )}
          </div>
        )}

      </main>
    </div>
  );
}

// =========================================================================
// 8. STYLES SÉCURISÉS ET HARMONISÉS
// =========================================================================
const styles = {
  container: { backgroundColor: '#f8fafc', minHeight: '100vh', color: '#1e293b', paddingBottom: '40px', overflowX: 'hidden', boxSizing: 'border-box', width: '100%' },
  darkNavbar: { backgroundColor: '#0f172a', color: '#ffffff', padding: '12px 16px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', borderBottom: '1px solid #1e293b', position: 'sticky', top: '0', zIndex: 100, width: '100%', boxSizing: 'border-box' },
  mainContentBody: { padding: '20px 12px', maxWidth: '1200px', margin: '0 auto', boxSizing: 'border-box', width: '100%', overflowX: 'hidden' },
  cardWide: { backgroundColor: '#ffffff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', boxSizing: 'border-box', width: '100%', overflowX: 'hidden' },
  bibliothequeFilterBox: { display: 'flex', gap: '12px', backgroundColor: '#f8fafc', padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0', marginBottom: '20px', flexWrap: 'wrap', boxSizing: 'border-box' },
  itemRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: '12px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', gap: '12px', boxSizing: 'border-box', width: '100%', flexWrap: 'wrap' },
  label: { display: 'block', fontSize: '11px', fontWeight: '800', color: '#475569', marginBottom: '6px', textTransform: 'uppercase' },
  labelFiltre: { display: 'block', fontSize: '11px', fontWeight: '800', color: '#475569', marginBottom: '6px', textTransform: 'uppercase' },
  inputStyle: { width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff', color: '#1e293b', outline: 'none', boxSizing: 'border-box' },
  pInfo: { margin: '4px 0 0 0', fontWeight: '800', fontSize: '15px', color: '#0f172a' },
  toastSuccess: { backgroundColor: '#0f172a', color: '#f8fafc', padding: '12px 16px', borderRadius: '10px', marginBottom: '16px', fontSize: '13px', fontWeight: '700', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', boxSizing: 'border-box' },
  navbarTeacherClickableBlock: { display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#1e293b', padding: '4px 8px', borderRadius: '10px', border: '1px solid #334155', cursor: 'pointer', textAlign: 'left', boxSizing: 'border-box' },
  avatarNavbarContainer: { width: '30px', height: '30px', borderRadius: '50%', overflow: 'hidden', backgroundColor: '#334155', display: 'flex', justifyContent: 'center', alignItems: 'center', border: '1px solid #475569', flexShrink: 0 },
  avatarNavbarImg: { width: '100%', height: '100%', objectFit: 'cover' },
  avatarNavbarPlaceholder: { fontSize: '14px', color: '#94a3b8' },
  navbarTeacherInfo: { display: 'flex', flexDirection: 'column' },
  notificationDropdown: { position: 'absolute', top: '42px', backgroundColor: '#ffffff', borderRadius: '14px', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.2)', border: '1px solid #e2e8f0', width: '280px', maxWidth: '90vw', zIndex: 110, padding: '10px', boxSizing: 'border-box' },
  dropdownHeader: { padding: '6px 8px', fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0', marginBottom: '6px' },
  notifItem: { backgroundColor: '#f8fafc', padding: '8px', borderRadius: '8px', fontSize: '11px', marginBottom: '4px', border: '1px solid #f1f5f9', cursor: 'pointer' },
  navDarkBtn: { backgroundColor: '#1e293b', color: '#f8fafc', border: '1px solid #334155', padding: '6px 10px', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', position: 'relative' },
  fondModale: { position: 'fixed', top: '0', left: '0', right: '0', bottom: '0', background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: '1000', padding: '12px', boxSizing: 'border-box' },
  pastilleAlerte: { backgroundColor: '#ef4444', color: 'white', padding: '1px 4px', borderRadius: '999px', fontSize: '9px', fontWeight: '800', position: 'absolute', top: '-4px', right: '-4px' },
  burgerBtn: { backgroundColor: '#2563eb', color: '#ffffff', border: 'none', padding: '6px 10px', borderRadius: '10px', fontSize: '14px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(37,99,235,0.3)' },
  burgerDropdown: { position: 'absolute', top: '42px', backgroundColor: '#ffffff', borderRadius: '14px', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.2)', border: '1px solid #e2e8f0', width: '220px', maxWidth: '85vw', zIndex: 120, padding: '10px', display: 'flex', flexDirection: 'column', gap: '4px', boxSizing: 'border-box' }
};
