import React, { useState, useMemo, useRef, useEffect } from 'react';
import { supabase } from './AppRouter';

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
//
// [CORRECTIF AJOUTÉ] La requête "seances" (onglet Visa) ne vérifiait pas si
// Supabase renvoyait une erreur (souvent une policy RLS trop restrictive).
// En cas d'erreur, "seances" devenait silencieusement vide, sans aucun
// message — impossible de savoir pourquoi rien ne s'affichait. Maintenant
// l'erreur est loguée en console ET affichée dans un bandeau (showToast),
// visible même sur téléphone sans avoir besoin d'ouvrir une console.
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
    civilite: 'M.', nom: '', prenoms: '', etablissement: '', role: 'Censeur Pédagogique', niveauCharge: 'Tous Niveaux', photoProfil: '', statutCompte: 'Actif', emailSecurite: '', telephone: ''
  });

  const [modalProfilCenseurOuvert, setModalProfilCenseurOuvert] = useState(false);
  const [formProfilCenseur, setFormProfilCenseur] = useState({ ...infosCenseur });
  const [profilCenseurOuvert, setProfilCenseurOuvert] = useState(false);
  const profilCenseurRef = useRef(null);

  const [modalSecurite, setModalSecurite] = useState(false);
  const [ancienMdp, setAncienMdp] = useState('');
  const [nouveauMdp, setNouveauMdp] = useState('');
  const [emailSaisiChangement, setEmailSaisiChangement] = useState('');

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
  const [demandesAffiliationEnseignants, setDemandesAffiliationEnseignants] = useState([]);
  const [demandeDepartCenseurEnCours, setDemandeDepartCenseurEnCours] = useState(false);
  const [modalDepartCenseurOuvert, setModalDepartCenseurOuvert] = useState(false);
  const [motifDepartCenseur, setMotifDepartCenseur] = useState('');
  const [classesEtablissement, setClassesEtablissement] = useState([]);
  const [enseignantsParClasse, setEnseignantsParClasse] = useState({});
  const [matieresDisponibles, setMatieresDisponibles] = useState([]);
  const [demandesAttributionsRecues, setDemandesAttributionsRecues] = useState([]);
  const [nouvelleClasseNom, setNouvelleClasseNom] = useState('');
  const [nouvelleClasseNiveau, setNouvelleClasseNiveau] = useState('');
  const [nouveauLotNiveau, setNouveauLotNiveau] = useState('');
  const [nouveauLotAvecSeries, setNouveauLotAvecSeries] = useState(false);
  const [nouveauLotNombre, setNouveauLotNombre] = useState('');
  const [nouveauLotStyle, setNouveauLotStyle] = useState('alphabetique');
  const [seriesEtablissement, setSeriesEtablissement] = useState([]);
  const [nouvelleSerieNom, setNouvelleSerieNom] = useState('');
  const [lotSeriesChoisies, setLotSeriesChoisies] = useState({});
  const [nouveauLotSeparateur, setNouveauLotSeparateur] = useState(' ');
  const [lotNiveauxMultiples, setLotNiveauxMultiples] = useState([{ niveau: '', nombre: '', style: 'alphabetique' }]);
  const [formAttribution, setFormAttribution] = useState({ enseignantId: '', classesIds: [], matiereNom: '', matiereIdChoisie: '' });
  const [documentsEtablissement, setDocumentsEtablissement] = useState([]);
  const [nomNouveauFichier, setNomNouveauFichier] = useState('');
  const [categorieNouveauFichier, setCategorieNouveauFichier] = useState('Administratif');
  const [fichierSelectionneObj, setFichierSelectionneObj] = useState(null);
  const [uploadEnCours, setUploadEnCours] = useState(false);

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
        telephone: profil.telephone || '',
      }));
      setFormProfilCenseur(prev => ({ ...prev, nom: profil.nom, prenoms: profil.prenom, etablissement: etab?.nom || '', telephone: profil.telephone || '' }));
    }

    // 3. Année scolaire active de l'établissement
    const { data: annee } = await supabase
      .from('annees_scolaires')
      .select('*')
      .eq('etablissement_id', etablissementId)
      .eq('est_active', true)
      .maybeSingle();
    setAnneeActiveId(annee?.id || null);

    // 3bis. Demandes d'affiliation d'enseignants en attente (le censeur ne
    // peut approuver/refuser QUE les demandes de rôle ENSEIGNANT — devenir
    // CHEF ou CENSEUR reste réservé au chef d'établissement).
    const { data: demandesEnseignants } = await supabase
      .from('demandes_affiliation')
      .select('id, user_id, role_demande, created_at, utilisateurs_profils(nom, prenom)')
      .eq('etablissement_id', etablissementId)
      .eq('role_demande', 'ENSEIGNANT')
      .eq('statut', 'EN_ATTENTE')
      .order('created_at', { ascending: true });
    setDemandesAffiliationEnseignants(demandesEnseignants || []);

    // Demande de départ déjà en cours pour ce censeur ?
    const { data: demandeDepartExistante } = await supabase
      .from('demandes_depart')
      .select('id')
      .eq('user_id', user.id)
      .eq('statut', 'EN_ATTENTE')
      .maybeSingle();
    setDemandeDepartCenseurEnCours(!!demandeDepartExistante);

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
      .select('id, user_id, utilisateurs_profils(nom, prenom, telephone, matieres_enseignant(matiere_id, matieres(nom)))')
      .eq('etablissement_id', etablissementId)
      .eq('role', 'ENSEIGNANT')
      .eq('statut', 'ACTIVE');

    const { data: attributions } = await supabase
      .from('attributions_classes')
      .select('enseignant_id, matiere_id, matieres(nom), classes(nom)')
      .eq('etablissement_id', etablissementId);

    const profsAvecClasses = (affiliationsEnseignants || []).map(a => {
      const attrsDeCetEnseignant = (attributions || []).filter(at => at.enseignant_id === a.user_id);
      const matieresProfil = (a.utilisateurs_profils?.matieres_enseignant || [])
        .map(m => ({ id: m.matiere_id, nom: m.matieres?.nom }))
        .filter(m => m.nom);
      return {
        id: a.id,
        userId: a.user_id,
        nomComplet: `${a.utilisateurs_profils?.prenom || ''} ${a.utilisateurs_profils?.nom || ''}`.trim(),
        matiere: attrsDeCetEnseignant[0]?.matieres?.nom || matieresProfil.map(m => m.nom).join(', ') || 'Non définie',
        matieresProfil,
        classes: attrsDeCetEnseignant.map(at => at.classes?.nom).filter(Boolean),
        matricule: 'N/A',
        contact: a.utilisateurs_profils?.telephone || 'Non défini',
        email: 'N/A',
      };
    });
    const nomsEnseignants = {};
    (affiliationsEnseignants || []).forEach(a => {
      nomsEnseignants[a.user_id] = `${a.utilisateurs_profils?.prenom || ''} ${a.utilisateurs_profils?.nom || ''}`.trim() || 'Enseignant';
    });
    const groupeParClasse = {};
    (attributions || []).forEach(at => {
      const classeNom = at.classes?.nom;
      if (!classeNom) return;
      if (!groupeParClasse[classeNom]) groupeParClasse[classeNom] = [];
      groupeParClasse[classeNom].push({
        enseignant: nomsEnseignants[at.enseignant_id] || 'Inconnu',
        matiere: at.matieres?.nom || 'Non définie',
      });
    });
    setEnseignantsParClasse(groupeParClasse);
    setListeProfesseursEtablissementBrute(profsAvecClasses);

    // 4bis. Classes de l'établissement (année active) + matières disponibles
    // + demandes d'attribution soumises par les enseignants
    if (annee?.id) {
      const { data: classesData } = await supabase
        .from('classes')
        .select('id, nom, niveau')
        .eq('etablissement_id', etablissementId)
        .eq('annee_scolaire_id', annee.id)
        .is('deleted_at', null)
        .order('nom', { ascending: true });
      setClassesEtablissement(classesData || []);

      const { data: seriesData } = await supabase
        .from('series_etablissement')
        .select('id, nom')
        .eq('etablissement_id', etablissementId)
        .order('nom', { ascending: true });
      setSeriesEtablissement(seriesData || []);

      const { data: demandesAttrib } = await supabase
        .from('demandes_attributions_classes')
        .select('id, enseignant_id, classe_id, classe_nom_propose, matiere_id, etablissement_id, annee_scolaire_id, created_at, classes(nom), matieres(nom), utilisateurs_profils:enseignant_id(nom, prenom)')
        .eq('etablissement_id', etablissementId)
        .eq('statut', 'EN_ATTENTE')
        .order('created_at', { ascending: true });
      setDemandesAttributionsRecues((demandesAttrib || []).map(d => ({ ...d, nomClasseEdite: d.classes?.nom || d.classe_nom_propose || '' })));
    }

    const { data: matieresData } = await supabase.from('matieres').select('id, nom').order('nom', { ascending: true });
    setMatieresDisponibles(matieresData || []);

    // Documents d'établissement déjà stockés
    const { data: documentsData } = await supabase
      .from('documents_etablissement')
      .select('id, titre, categorie, created_at, versions_document!fk_doc_version_courante(fichiers_metadonnees(cle_stockage, taille_octets))')
      .eq('etablissement_id', etablissementId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    setDocumentsEtablissement((documentsData || []).map(d => ({
      ...d,
      cle_stockage: d.versions_document?.fichiers_metadonnees?.cle_stockage,
      taille_octets: d.versions_document?.fichiers_metadonnees?.taille_octets,
    })));

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
    // [CORRECTIF] on récupère désormais "error" et on l'affiche s'il y en a une,
    // au lieu de laisser la liste se vider silencieusement (ex. policy RLS).
    const { data: seances, error: erreurSeances } = await supabase
      .from('seances')
      .select(`
        id, date_prevue, statut, contenu_json,
        classes ( nom ),
        lecons (
          id, titre, statut_visa, envoyee_at, visee_at, observation_visa,
          cycles (
            id, titre, competence,
            programmes_annuels ( titre, proprietaire_user_id, matieres(nom),
              utilisateurs_profils:proprietaire_user_id (nom, prenom) )
          )
        )
      `)
      .in('statut', ['ENVOYEE', 'RECUE']);

    if (erreurSeances) {
      console.error('Erreur chargement séances (onglet Visa) :', erreurSeances);
      showToast("⚠️ Erreur de chargement des fiches à viser : " + erreurSeances.message);
    }

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
        cy = { id: cycle?.id, titre: cycle?.titre || '', competence: cycle?.competence || '', lecons: [] };
        groupe[classeNom].cycles.push(cy);
      }
      let lc = cy.lecons.find(l => l.id === sc.lecons?.id);
      if (!lc) {
        lc = {
          id: sc.lecons?.id, titre: sc.lecons?.titre || '', seances: [],
          statutVisa: sc.lecons?.statut_visa || 'NON_ENVOYEE',
          observationVisa: sc.lecons?.observation_visa || '',
        };
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
      .update({ nom: formProfilCenseur.nom, prenom: formProfilCenseur.prenoms, telephone: formProfilCenseur.telephone || null })
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

  // --- Approuver / refuser une demande d'affiliation d'ENSEIGNANT reçue ---
  // (rôle CENSEUR ou CHEF uniquement restent réservés au chef d'établissement)
  const approuverDemandeAffiliationEnseignant = async (demande) => {
    if (!affiliationCenseur) return;
    const { error: erreurAff } = await supabase.from('affiliations_etablissement').insert({
      user_id: demande.user_id,
      etablissement_id: affiliationCenseur.etablissement_id,
      role: 'ENSEIGNANT',
      statut: 'ACTIVE',
      date_debut: new Date().toISOString().slice(0, 10),
    });
    if (erreurAff) { showToast("⚠️ Erreur : " + erreurAff.message); return; }

    const { error: erreurMaj } = await supabase
      .from('demandes_affiliation')
      .update({ statut: 'ACCEPTEE', traite_par_user_id: userId, traite_at: new Date().toISOString() })
      .eq('id', demande.id);
    if (erreurMaj) {
      showToast("⚠️ Affiliation créée, mais la demande n'a pas pu être clôturée : " + erreurMaj.message);
      return;
    }

    setDemandesAffiliationEnseignants(prev => prev.filter(d => d.id !== demande.id));
    showToast("✅ Demande approuvée, l'enseignant a maintenant accès à l'établissement !");
  };

  const refuserDemandeAffiliationEnseignant = async (demande) => {
    const { error } = await supabase
      .from('demandes_affiliation')
      .update({ statut: 'REFUSEE', traite_par_user_id: userId, traite_at: new Date().toISOString() })
      .eq('id', demande.id);
    if (error) { showToast("⚠️ Erreur : " + error.message); return; }
    setDemandesAffiliationEnseignants(prev => prev.filter(d => d.id !== demande.id));
    showToast("❌ Demande refusée.");
  };

  // --- Demande de départ du censeur — validée uniquement par le chef ---
  const soumettreDemandeDepartCenseur = async (e) => {
    e.preventDefault();
    if (!userId || !affiliationCenseur) return;

    const { error } = await supabase
      .from('demandes_depart')
      .insert({
        user_id: userId,
        etablissement_id: affiliationCenseur.etablissement_id,
        affiliation_id: affiliationCenseur.id,
        role_demandeur: 'CENSEUR',
        motif: motifDepartCenseur.trim() || null,
      });

    if (error) { showToast("⚠️ Erreur : " + error.message); return; }

    setDemandeDepartCenseurEnCours(true);
    setModalDepartCenseurOuvert(false);
    setMotifDepartCenseur('');
    showToast("📤 Demande de départ transmise au chef d'établissement pour validation !");
  };

  // --- Créer une classe pour l'année active ---
  const creerClasse = async (e) => {
    e.preventDefault();
    if (!nouvelleClasseNom.trim() || !affiliationCenseur || !anneeActiveId) {
      showToast("⚠️ Aucune année scolaire active — impossible de créer une classe.");
      return;
    }
    const { data: nouvelle, error } = await supabase
      .from('classes')
      .insert({
        etablissement_id: affiliationCenseur.etablissement_id,
        annee_scolaire_id: anneeActiveId,
        nom: nouvelleClasseNom.trim(),
        niveau: nouvelleClasseNiveau.trim() || null,
      })
      .select()
      .single();
    if (error) {
      if (error.code === '23505') showToast("⚠️ Cette classe existe déjà pour cette année.");
      else showToast("⚠️ Erreur : " + error.message);
      return;
    }
    setClassesEtablissement(prev => [...prev, nouvelle].sort((a, b) => a.nom.localeCompare(b.nom)));
    setNouvelleClasseNom(''); setNouvelleClasseNiveau('');
    showToast(`✅ Classe "${nouvelle.nom}" créée !`);
  };

  // --- Créer toutes les classes d'un niveau en une fois ---
  // Évite que chaque enseignant tape le nom d'une classe différemment
  // (ex. "6ème A" vs "6e1" vs "sixième un") : le censeur fixe la convention
  // une seule fois, tout le monde s'en sert ensuite.
  // Deux modes : niveau simple (6ème, 5ème... : nombre de classes + style de
  // numérotation) ou niveau avec séries (Seconde, Première, Terminale : les
  // séries sont choisies parmi celles mémorisées pour l'établissement, avec
  // un nombre de classes propre à chacune).
  const ALPHABET_CLASSES = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  const genererNomsLot = () => {
    const niveau = nouveauLotNiveau.trim();
    if (!niveau) return [];

    if (!nouveauLotAvecSeries) {
      const nombre = parseInt(nouveauLotNombre, 10);
      if (!nombre || nombre < 1) return [];
      const suffixes = nouveauLotStyle === 'alphabetique'
        ? ALPHABET_CLASSES.slice(0, nombre).split('')
        : Array.from({ length: nombre }, (_, i) => String(i + 1));
      return suffixes.map(suf => `${niveau}${nouveauLotSeparateur}${suf}`);
    }

    const noms = [];
    seriesEtablissement.forEach(serie => {
      const nombreBrut = lotSeriesChoisies[serie.id];
      if (nombreBrut === undefined || nombreBrut === '') return;
      const nombre = parseInt(nombreBrut, 10) || 1;
      if (nombre <= 1) {
        noms.push(`${niveau}${nouveauLotSeparateur}${serie.nom}`);
      } else {
        for (let i = 1; i <= nombre; i++) noms.push(`${niveau}${nouveauLotSeparateur}${serie.nom}${i}`);
      }
    });
    return noms;
  };

  // --- Gestion des séries mémorisées pour l'établissement ---
  const ajouterSerieEtablissement = async (e) => {
    e.preventDefault();
    if (!nouvelleSerieNom.trim() || !affiliationCenseur) return;
    const { data, error } = await supabase
      .from('series_etablissement')
      .insert({ etablissement_id: affiliationCenseur.etablissement_id, nom: nouvelleSerieNom.trim() })
      .select().single();
    if (error) {
      if (error.code === '23505') showToast("⚠️ Cette série existe déjà.");
      else showToast("⚠️ Erreur : " + error.message);
      return;
    }
    setSeriesEtablissement(prev => [...prev, data].sort((a, b) => a.nom.localeCompare(b.nom)));
    setNouvelleSerieNom('');
    showToast(`✅ Série "${data.nom}" mémorisée pour l'établissement !`);
  };

  const retirerSerieEtablissement = async (serieId) => {
    const { error } = await supabase.from('series_etablissement').delete().eq('id', serieId);
    if (error) { showToast("⚠️ Erreur : " + error.message); return; }
    setSeriesEtablissement(prev => prev.filter(s => s.id !== serieId));
    setLotSeriesChoisies(prev => { const copie = { ...prev }; delete copie[serieId]; return copie; });
  };

  const creerClassesEnLot = async (e) => {
    e.preventDefault();
    if (!affiliationCenseur || !anneeActiveId) { showToast("⚠️ Aucune année scolaire active."); return; }
    const noms = genererNomsLot();
    if (noms.length === 0) { showToast("⚠️ Merci de compléter le formulaire (niveau + nombre, ou niveau + séries)."); return; }

    const lignes = noms.map(nom => ({
      etablissement_id: affiliationCenseur.etablissement_id,
      annee_scolaire_id: anneeActiveId,
      nom,
      niveau: nouveauLotNiveau.trim(),
    }));

    const { error } = await supabase
      .from('classes')
      .upsert(lignes, { onConflict: 'etablissement_id,annee_scolaire_id,nom', ignoreDuplicates: true });

    if (error) { showToast("⚠️ Erreur : " + error.message); return; }

    // On relit la liste complète pour rester fiable (plutôt que de deviner
    // ce qui a été réellement inséré vs ignoré comme doublon)
    const { data: classesRafraichies } = await supabase
      .from('classes')
      .select('id, nom, niveau')
      .eq('etablissement_id', affiliationCenseur.etablissement_id)
      .eq('annee_scolaire_id', anneeActiveId)
      .is('deleted_at', null)
      .order('nom', { ascending: true });
    setClassesEtablissement(classesRafraichies || []);

    setNouveauLotNiveau(''); setNouveauLotNombre(''); setLotSeriesChoisies({});
    showToast(`✅ ${noms.length} classe(s) prête(s) pour "${nouveauLotNiveau.trim()}" !`);
  };

  // --- Générer plusieurs niveaux simples d'un coup (typiquement le premier
  // cycle : 6ème, 5ème, 4ème, 3ème, chacun avec son propre nombre de classes) ---
  const ajouterLigneLotNiveaux = () => {
    setLotNiveauxMultiples(prev => [...prev, { niveau: '', nombre: '', style: 'alphabetique' }]);
  };

  const retirerLigneLotNiveaux = (index) => {
    setLotNiveauxMultiples(prev => prev.filter((_, i) => i !== index));
  };

  const modifierLigneLotNiveaux = (index, champ, valeur) => {
    setLotNiveauxMultiples(prev => prev.map((ligne, i) => i === index ? { ...ligne, [champ]: valeur } : ligne));
  };

  const genererApercuLotNiveaux = () => {
    const resultat = [];
    lotNiveauxMultiples.forEach(({ niveau, nombre, style }) => {
      const niveauPropre = niveau.trim();
      const n = parseInt(nombre, 10);
      if (!niveauPropre || !n || n < 1) return;
      const suffixes = style === 'alphabetique'
        ? ALPHABET_CLASSES.slice(0, n).split('')
        : Array.from({ length: n }, (_, i) => String(i + 1));
      suffixes.forEach(suf => resultat.push({ nom: `${niveauPropre} ${suf}`, niveau: niveauPropre }));
    });
    return resultat;
  };

  const creerNiveauxEnLot = async (e) => {
    e.preventDefault();
    if (!affiliationCenseur || !anneeActiveId) { showToast("⚠️ Aucune année scolaire active."); return; }
    const classesAGenerer = genererApercuLotNiveaux();
    if (classesAGenerer.length === 0) { showToast("⚠️ Merci de remplir au moins un niveau avec son nombre de classes."); return; }

    const lignes = classesAGenerer.map(c => ({
      etablissement_id: affiliationCenseur.etablissement_id,
      annee_scolaire_id: anneeActiveId,
      nom: c.nom,
      niveau: c.niveau,
    }));

    const { error } = await supabase
      .from('classes')
      .upsert(lignes, { onConflict: 'etablissement_id,annee_scolaire_id,nom', ignoreDuplicates: true });

    if (error) { showToast("⚠️ Erreur : " + error.message); return; }

    const { data: classesRafraichies } = await supabase
      .from('classes')
      .select('id, nom, niveau')
      .eq('etablissement_id', affiliationCenseur.etablissement_id)
      .eq('annee_scolaire_id', anneeActiveId)
      .is('deleted_at', null)
      .order('nom', { ascending: true });
    setClassesEtablissement(classesRafraichies || []);

    const nombreNiveaux = new Set(classesAGenerer.map(c => c.niveau)).size;
    setLotNiveauxMultiples([{ niveau: '', nombre: '', style: 'alphabetique' }]);
    showToast(`✅ ${classesAGenerer.length} classe(s) créée(s) pour ${nombreNiveaux} niveau(x) !`);
  };

  // --- Trouver ou créer une matière par son nom (catalogue global partagé) ---
  const trouverOuCreerMatiere = async (nomMatiere) => {
    const nom = nomMatiere.trim();
    if (!nom) return null;
    const existante = matieresDisponibles.find(m => m.nom.toLowerCase() === nom.toLowerCase());
    if (existante) return existante.id;
    const { data: nouvelle, error } = await supabase.from('matieres').insert({ nom }).select().single();
    if (error) {
      // Conflit possible si créée entre-temps par quelqu'un d'autre — on la relit
      const { data: relue } = await supabase.from('matieres').select('id').eq('nom', nom).maybeSingle();
      if (relue) return relue.id;
      showToast("⚠️ Erreur matière : " + error.message);
      return null;
    }
    setMatieresDisponibles(prev => [...prev, nouvelle]);
    return nouvelle.id;
  };

  // --- Attribution directe d'une classe à un enseignant, par matière ---
  // --- Résout quelle matière utiliser pour une attribution : automatique si
  // l'enseignant n'en a qu'une déclarée, à choisir s'il en a plusieurs,
  // sinon secours en texte libre s'il n'en a aucune sur son profil ---
  const resoudreMatiereChoisie = (enseignant, matiereIdChoisie, matiereNomLibre) => {
    const matieresProfil = enseignant?.matieresProfil || [];
    if (matieresProfil.length === 1) return { nomMatiere: matieresProfil[0].nom, matiereIdDirect: matieresProfil[0].id };
    if (matieresProfil.length > 1) {
      const choisie = matieresProfil.find(m => m.id === matiereIdChoisie);
      return { nomMatiere: choisie?.nom || '', matiereIdDirect: choisie?.id || null };
    }
    return { nomMatiere: matiereNomLibre, matiereIdDirect: null };
  };

  const attribuerClasseDirectement = async (e) => {
    e.preventDefault();
    const enseignantChoisi = listeProfesseursEtablissement.find(p => p.userId === formAttribution.enseignantId);
    const { nomMatiere, matiereIdDirect } = resoudreMatiereChoisie(enseignantChoisi, formAttribution.matiereIdChoisie, formAttribution.matiereNom);

    if (!formAttribution.enseignantId || formAttribution.classesIds.length === 0 || !nomMatiere.trim() || !affiliationCenseur || !anneeActiveId) {
      showToast("⚠️ Merci de choisir l'enseignant, au moins une classe, et une matière.");
      return;
    }
    const matiereId = matiereIdDirect || await trouverOuCreerMatiere(nomMatiere);
    if (!matiereId) return;

    const lignes = formAttribution.classesIds.map(classeId => ({
      enseignant_id: formAttribution.enseignantId,
      classe_id: classeId,
      etablissement_id: affiliationCenseur.etablissement_id,
      annee_scolaire_id: anneeActiveId,
      matiere_id: matiereId,
    }));

    const { error } = await supabase.from('attributions_classes').insert(lignes);
    if (error) {
      if (error.code === '23505') showToast("⚠️ Une ou plusieurs de ces attributions existent déjà.");
      else showToast("⚠️ Erreur : " + error.message);
      return;
    }
    showToast(`✅ ${lignes.length} classe(s) attribuée(s) !`);
    setFormAttribution({ enseignantId: '', classesIds: [], matiereNom: '', matiereIdChoisie: '' });
    chargerTout();
  };

  // --- Gestion des classes d'un enseignant, modifiable à tout moment ---
  const [modalGererClasses, setModalGererClasses] = useState({ ouvert: false, prof: null, attributions: [] });
  const [formAjoutAttribution, setFormAjoutAttribution] = useState({ classeId: '', matiereNom: '', matiereIdChoisie: '' });

  const ouvrirGestionClasses = async (prof) => {
    const { data } = await supabase
      .from('attributions_classes')
      .select('id, classe_id, matiere_id, classes(nom), matieres(nom)')
      .eq('enseignant_id', prof.userId)
      .eq('etablissement_id', affiliationCenseur.etablissement_id);
    setModalGererClasses({ ouvert: true, prof, attributions: data || [] });
    setFormAjoutAttribution({ classeId: '', matiereNom: '' });
  };

  const retirerAttributionEnseignant = (attribution) => {
    setModalConfirmation({
      ouvert: true,
      titre: 'Retirer cette classe ?',
      message: `Retirer "${attribution.classes?.nom}" (${attribution.matieres?.nom}) de la liste de ${modalGererClasses.prof?.nomComplet} ?`,
      actionCallback: async () => {
        const { error } = await supabase.from('attributions_classes').delete().eq('id', attribution.id);
        if (error) { showToast("⚠️ Erreur : " + error.message); return; }
        setModalGererClasses(prev => ({ ...prev, attributions: prev.attributions.filter(a => a.id !== attribution.id) }));
        chargerTout();
        showToast("🗑️ Classe retirée.");
      },
    });
  };

  const ajouterAttributionEnseignant = async (e) => {
    e.preventDefault();
    const { nomMatiere, matiereIdDirect } = resoudreMatiereChoisie(modalGererClasses.prof, formAjoutAttribution.matiereIdChoisie, formAjoutAttribution.matiereNom);
    if (!formAjoutAttribution.classeId || !nomMatiere.trim() || !modalGererClasses.prof) {
      showToast("⚠️ Merci de choisir une classe et une matière.");
      return;
    }
    const matiereId = matiereIdDirect || await trouverOuCreerMatiere(nomMatiere);
    if (!matiereId) return;

    const { data: nouvelle, error } = await supabase.from('attributions_classes').insert({
      enseignant_id: modalGererClasses.prof.userId,
      classe_id: formAjoutAttribution.classeId,
      etablissement_id: affiliationCenseur.etablissement_id,
      annee_scolaire_id: anneeActiveId,
      matiere_id: matiereId,
    }).select('id, classe_id, matiere_id, classes(nom), matieres(nom)').single();

    if (error) {
      if (error.code === '23505') showToast("⚠️ Cette attribution existe déjà.");
      else showToast("⚠️ Erreur : " + error.message);
      return;
    }
    setModalGererClasses(prev => ({ ...prev, attributions: [...prev.attributions, nouvelle] }));
    setFormAjoutAttribution({ classeId: '', matiereNom: '', matiereIdChoisie: '' });
    chargerTout();
    showToast("✅ Classe ajoutée !");
  };

  // --- Traiter une proposition de classe soumise par un enseignant ---
  // Si la proposition référence une classe qui n'existe pas encore
  // (classe_id vide), on la crée maintenant avec le nom éventuellement
  // corrigé par le censeur, puis on rattache la demande à cette classe.
  const approuverDemandeAttribution = async (demande) => {
    let classeId = demande.classe_id;
    const nomFinal = (demande.nomClasseEdite || demande.classe_nom_propose || '').trim();

    if (!classeId) {
      if (!nomFinal) { showToast("⚠️ Merci d'indiquer le nom de la classe avant d'accepter."); return; }

      // Réutilise une classe existante du même nom si elle existe déjà (évite les doublons)
      const { data: classeExistante } = await supabase
        .from('classes')
        .select('id')
        .eq('etablissement_id', demande.etablissement_id)
        .eq('annee_scolaire_id', demande.annee_scolaire_id)
        .eq('nom', nomFinal)
        .maybeSingle();

      if (classeExistante) {
        classeId = classeExistante.id;
      } else {
        const { data: nouvelleClasse, error: erreurClasse } = await supabase
          .from('classes')
          .insert({ etablissement_id: demande.etablissement_id, annee_scolaire_id: demande.annee_scolaire_id, nom: nomFinal })
          .select()
          .single();
        if (erreurClasse) { showToast("⚠️ Erreur création classe : " + erreurClasse.message); return; }
        classeId = nouvelleClasse.id;
        setClassesEtablissement(prev => [...prev, nouvelleClasse].sort((a, b) => a.nom.localeCompare(b.nom)));
      }
    }

    const { error } = await supabase
      .from('demandes_attributions_classes')
      .update({ statut: 'ACCEPTEE', traitee_par_user_id: userId, classe_id: classeId })
      .eq('id', demande.id);
    if (error) { showToast("⚠️ Erreur : " + error.message); return; }
    setDemandesAttributionsRecues(prev => prev.filter(d => d.id !== demande.id));
    showToast("✅ Proposition acceptée, la classe est attribuée !");
    chargerTout();
  };

  const refuserDemandeAttribution = (demande, description) => {
    setModalConfirmation({
      ouvert: true,
      titre: 'Refuser cette proposition ?',
      message: `Refuser la proposition de ${description} ?`,
      actionCallback: async () => {
        const { error } = await supabase
          .from('demandes_attributions_classes')
          .update({ statut: 'REFUSEE', traitee_par_user_id: userId })
          .eq('id', demande.id);
        if (error) { showToast("⚠️ Erreur : " + error.message); return; }
        setDemandesAttributionsRecues(prev => prev.filter(d => d.id !== demande.id));
        showToast("❌ Proposition refusée.");
      },
    });
  };

  // --- Uploader un document d'établissement (réel : Storage + tables liées) ---
  const uploaderFichierAdministratifreel = async (e) => {
    e.preventDefault();
    if (!nomNouveauFichier.trim() || !fichierSelectionneObj || !affiliationCenseur?.etablissement_id || !userId) {
      showToast("⚠️ Merci de choisir un fichier et de lui donner un nom.");
      return;
    }
    setUploadEnCours(true);
    const etablissementId = affiliationCenseur.etablissement_id;
    const cheminStockage = `${etablissementId}/${Date.now()}-${fichierSelectionneObj.name}`;

    const { error: erreurStorage } = await supabase.storage
      .from('documents-etablissements')
      .upload(cheminStockage, fichierSelectionneObj);
    if (erreurStorage) { showToast("⚠️ Erreur d'envoi du fichier : " + erreurStorage.message); setUploadEnCours(false); return; }

    const { data: fichierMeta, error: erreurMeta } = await supabase
      .from('fichiers_metadonnees')
      .insert({
        type_proprietaire: 'ETABLISSEMENT', proprietaire_id: etablissementId, etablissement_id: etablissementId,
        categorie: categorieNouveauFichier, cle_stockage: cheminStockage,
        type_mime: fichierSelectionneObj.type, taille_octets: fichierSelectionneObj.size,
      })
      .select().single();
    if (erreurMeta) { showToast("⚠️ Erreur métadonnées : " + erreurMeta.message); setUploadEnCours(false); return; }

    const { data: document, error: erreurDoc } = await supabase
      .from('documents_etablissement')
      .insert({ etablissement_id: etablissementId, categorie: categorieNouveauFichier, titre: nomNouveauFichier.trim(), auteur_user_id: userId })
      .select().single();
    if (erreurDoc) { showToast("⚠️ Erreur document : " + erreurDoc.message); setUploadEnCours(false); return; }

    const { data: version, error: erreurVersion } = await supabase
      .from('versions_document')
      .insert({ document_id: document.id, numero_version: 1, fichier_id: fichierMeta.id, auteur_user_id: userId })
      .select().single();
    if (erreurVersion) { showToast("⚠️ Erreur version : " + erreurVersion.message); setUploadEnCours(false); return; }

    await supabase.from('documents_etablissement').update({ version_courante_id: version.id }).eq('id', document.id);

    setDocumentsEtablissement(prev => [{ ...document, taille_octets: fichierMeta.taille_octets, cle_stockage: cheminStockage }, ...prev]);
    setNomNouveauFichier(''); setFichierSelectionneObj(null);
    setUploadEnCours(false);
    showToast("📎 Fichier stocké avec succès !");
  };

  const telechargerDocumentEtablissement = async (doc) => {
    const { data, error } = await supabase.storage.from('documents-etablissements').createSignedUrl(doc.cle_stockage, 60);
    if (error) { showToast("⚠️ Erreur : " + error.message); return; }
    window.open(data.signedUrl, '_blank');
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
        seance_origine_id: seanceAViser.id,
        auteur_user_id: userId, // ⚠️ idéalement l'auteur réel de la séance, pas le censeur — à corriger si programmes_annuels expose proprietaire_user_id ici
        titre: seanceAViser.titre,
        contenu_snapshot_json: { matiere: prog.matiere, classe: classeKey, ...seanceAViser },
      });

    if (erreurArchive) { showToast("⚠️ Visa enregistré, mais erreur d'archivage : " + erreurArchive.message); }

    showToast(`✅ Séance visée et archivée !`);
    chargerTout(); // recharge visa + archives pour refléter le nouvel état
  };

  // --- Viser / retourner une fiche de leçon (distincte des séances qu'elle contient) ---
  const viserLecon = async (leconId) => {
    const { error } = await supabase
      .from('lecons')
      .update({ statut_visa: 'VISEE', visee_par_user_id: userId, visee_at: new Date().toISOString() })
      .eq('id', leconId);
    if (error) { showToast("⚠️ Erreur de visa : " + error.message); return; }
    showToast("✅ Fiche de leçon visée !");
    chargerTout();
  };

  const retournerLecon = (leconId) => {
    setModalConfirmation({
      ouvert: true,
      titre: 'Retourner cette fiche de leçon ?',
      message: "L'enseignant devra la corriger avant de pouvoir la renvoyer.",
      actionCallback: async () => {
        const { error } = await supabase
          .from('lecons')
          .update({ statut_visa: 'RETOURNEE', visee_par_user_id: userId, visee_at: new Date().toISOString() })
          .eq('id', leconId);
        if (error) { showToast("⚠️ Erreur : " + error.message); return; }
        showToast("↩️ Fiche de leçon retournée à l'enseignant.");
        chargerTout();
      },
    });
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

  const nombreFichesTotalEnAttente = useMemo(() => {
    return Object.values(programmesClasses || {}).reduce((total, prog) =>
      total + (prog.cycles || []).reduce((sousTotal, cy) =>
        sousTotal + (cy.lecons || []).reduce((s, lc) =>
          s + (lc.seances || []).filter(sc => !sc.viseParCenseur).length, 0), 0), 0);
  }, [programmesClasses]);

  const apercuLotClasses = genererNomsLot();
  const apercuLotNiveauxMultiples = genererApercuLotNiveaux();

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
                  <button onClick={() => { setActiveTab('visa'); setMenuBurgerCenseurOuvert(false); }} className="bouton-option" style={{color: '#2563eb', fontWeight: '800', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <span>✍️ Visa & File d'Attente</span>
                    {nombreFichesTotalEnAttente > 0 && (
                      <span style={{ backgroundColor: '#ef4444', color: '#fff', fontSize: '10px', fontWeight: '900', padding: '1px 7px', borderRadius: '999px' }}>{nombreFichesTotalEnAttente}</span>
                    )}
                  </button>
                  <button onClick={() => { setActiveTab('fichiers_pedagogiques'); setMenuBurgerCenseurOuvert(false); }} className="bouton-option">📚 Archives Pédagogiques</button>
                  <button onClick={() => { setActiveTab('professeurs'); setMenuBurgerCenseurOuvert(false); }} className="bouton-option">👨‍🏫 Annuaire Personnel</button>
                  <button onClick={() => { setActiveTab('classes'); setMenuBurgerCenseurOuvert(false); }} className="bouton-option">🏫 Classes & Attributions</button>
                  <button onClick={() => { setActiveTab('documents'); setMenuBurgerCenseurOuvert(false); }} className="bouton-option">📤 Documents d'Établissement</button>
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
        {modalGererClasses.ouvert && (
          <div style={styles.fondModale}>
            <div style={{ ...styles.cardWide, width: '460px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px', fontWeight: '800' }}>✏️ Classes de {modalGererClasses.prof?.nomComplet}</h3>
                <button onClick={() => setModalGererClasses({ ouvert: false, prof: null, attributions: [] })} className="bouton bouton-secondaire" style={{ padding: '6px 10px' }}>✕</button>
              </div>
              <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '14px' }}>Modifiable à tout moment — corrige une erreur d'attribution sans repasser par une demande.</p>

              {modalGererClasses.attributions.length === 0 ? (
                <p style={{ fontStyle: 'italic', color: '#64748b', fontSize: '13px', marginBottom: '14px' }}>Aucune classe attribuée pour l'instant.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                  {modalGererClasses.attributions.map(attribution => (
                    <div key={attribution.id} style={{ ...styles.itemRow, backgroundColor: '#f8fafc' }}>
                      <span style={{ fontSize: '13px' }}><strong>{attribution.classes?.nom}</strong> — {attribution.matieres?.nom}</span>
                      <button onClick={() => retirerAttributionEnseignant(attribution)} className="bouton bouton-danger" style={{ fontSize: '11px', padding: '4px 8px' }}>Retirer</button>
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={ajouterAttributionEnseignant} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
                <select value={formAjoutAttribution.classeId} onChange={(e) => setFormAjoutAttribution({ ...formAjoutAttribution, classeId: e.target.value })} style={{ ...styles.inputStyle, flex: '1 1 140px', margin: 0 }} required>
                  <option value="">— Classe —</option>
                  {classesEtablissement.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                </select>
                {(() => {
                  const matieresProf = modalGererClasses.prof?.matieresProfil || [];
                  if (matieresProf.length === 1) {
                    return (
                      <div style={{ flex: '1 1 140px', display: 'flex', alignItems: 'center', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '0 12px', fontSize: '13px', fontWeight: '700', color: '#166534' }}>
                        📚 {matieresProf[0].nom}
                      </div>
                    );
                  }
                  if (matieresProf.length > 1) {
                    return (
                      <select value={formAjoutAttribution.matiereIdChoisie} onChange={(e) => setFormAjoutAttribution({ ...formAjoutAttribution, matiereIdChoisie: e.target.value })} style={{ ...styles.inputStyle, flex: '1 1 140px', margin: 0 }} required>
                        <option value="">— Quelle matière ? —</option>
                        {matieresProf.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
                      </select>
                    );
                  }
                  return (
                    <input type="text" list="liste-matieres-censeur" placeholder="Matière (non renseignée)" value={formAjoutAttribution.matiereNom} onChange={(e) => setFormAjoutAttribution({ ...formAjoutAttribution, matiereNom: e.target.value })} style={{ ...styles.inputStyle, flex: '1 1 140px', margin: 0 }} required />
                  );
                })()}
                <button type="submit" className="bouton bouton-principal" style={{ flexShrink: 0 }}>+ Ajouter</button>
              </form>
            </div>
          </div>
        )}

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

        {modalDepartCenseurOuvert && (
          <div style={styles.fondModale}>
            <div style={{ ...styles.cardWide, width: '420px' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#991b1b', fontSize: '18px', fontWeight: '800' }}>Motif de départ</h3>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '14px' }}>Ce motif sera visible par le chef d'établissement qui traitera votre demande.</p>
              <form onSubmit={soumettreDemandeDepartCenseur}>
                <textarea
                  value={motifDepartCenseur}
                  onChange={(e) => setMotifDepartCenseur(e.target.value)}
                  style={{ ...styles.inputStyle, minHeight: '80px', resize: 'vertical', marginBottom: '14px' }}
                  placeholder="Expliquez brièvement la raison de votre départ..."
                  required
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button type="button" onClick={() => { setModalDepartCenseurOuvert(false); setMotifDepartCenseur(''); }} className="bouton bouton-secondaire">Annuler</button>
                  <button type="submit" className="bouton bouton-danger">Envoyer la demande</button>
                </div>
              </form>
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
                <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px', fontWeight: '800' }}>🔒 Sécurité du compte</h3>
                <button onClick={() => setModalSecurite(false)} className="bouton bouton-secondaire" style={{ padding: '6px 10px' }}>✕</button>
              </div>

              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!emailSaisiChangement.trim()) return;
                const { error } = await supabase.auth.updateUser({ email: emailSaisiChangement.trim() });
                if (error) { showToast("⚠️ Erreur : " + error.message); return; }
                showToast("📧 Vérifiez votre boîte mail : un lien de confirmation a été envoyé au nouvel email.");
                setEmailSaisiChangement('');
              }} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #e2e8f0' }}>
                <label style={styles.label}>Changer l'email de connexion</label>
                <p style={{ fontSize: '11px', color: '#64748b', margin: '-6px 0 4px 0' }}>Actuel : {infosCenseur.emailSecurite || '—'}</p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input type="email" placeholder="nouvel-email@exemple.com" value={emailSaisiChangement} onChange={e => setEmailSaisiChangement(e.target.value)} style={{ ...styles.inputStyle, flex: 1 }} required />
                  <button type="submit" className="bouton bouton-principal" style={{ flexShrink: 0 }}>Changer</button>
                </div>
              </form>

              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!nouveauMdp) { showToast("⚠️ Veuillez saisir un nouveau mot de passe."); return; }
                const { error } = await supabase.auth.updateUser({ password: nouveauMdp });
                if (error) { showToast("⚠️ Erreur : " + error.message); return; }
                showToast("🔒 Mot de passe modifié avec succès !");
                setModalSecurite(false);
                setAncienMdp('');
                setNouveauMdp('');
              }} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <label style={styles.label}>Changer mon mot de passe</label>
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
                  <label style={styles.label}>Téléphone</label>
                  <input type="tel" placeholder="+225 XX XX XX XX XX" value={formProfilCenseur.telephone || ''} onChange={(e) => setFormProfilCenseur({...formProfilCenseur, telephone: e.target.value})} style={styles.inputStyle} />
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

                const nombreFichesEnAttente = (prog.cycles || []).reduce((total, cy) =>
                  total + (cy.lecons || []).reduce((sousTotal, lc) =>
                    sousTotal + (lc.seances || []).filter(sc => !sc.viseParCenseur).length, 0), 0);

                if (!hasPendingSeances) return null;

                const isClasseOuverte = classesOuvertesVisa[classeNom];

                return (
                  <div key={classeNom} style={{ marginBottom: '16px', border: '1px solid #cbd5e1', borderRadius: '12px', overflow: 'hidden' }}>
                    <button 
                      onClick={() => toggleClasseVisa(classeNom)}
                      style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', backgroundColor: isClasseOuverte ? '#e0f2fe' : '#f8fafc', border: 'none', cursor: 'pointer', outline: 'none' }}
                    >
                      <div style={{ textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div>
                          <h3 style={{ margin: 0, color: '#0f172a', fontSize: '15px', fontWeight: '800' }}>🏫 Classe : {classeNom}</h3>
                          <span style={{ fontSize: '12px', color: '#475569' }}>Matière : {prog.matiere || 'EPS'} | Enseignant : <strong>{prog.enseignant || 'Inconnu'}</strong></span>
                        </div>
                        {nombreFichesEnAttente > 0 && (
                          <span style={{ backgroundColor: '#ef4444', color: '#fff', fontSize: '11px', fontWeight: '900', padding: '2px 8px', borderRadius: '999px', flexShrink: 0 }}>
                            {nombreFichesEnAttente} nouvelle{nombreFichesEnAttente > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '16px', color: '#2563eb' }}>{isClasseOuverte ? '▲' : '▼'}</span>
                    </button>

                    {isClasseOuverte && (
                      <div style={{ padding: '16px', backgroundColor: '#ffffff' }}>
                        {(prog.cycles || []).map(cy => (
                          <div key={cy.id} style={{ marginBottom: '12px' }}>
                            {(cy.lecons || []).map(lc => (
                              <div key={lc.id}>
                                {(lc.statutVisa === 'ENVOYEE' || lc.statutVisa === 'RECUE') && (
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', backgroundColor: '#eff6ff', padding: '12px 16px', borderRadius: '10px', marginBottom: '8px', borderLeft: '4px solid #2563eb' }}>
                                    <div>
                                      <span style={{ fontSize: '10px', color: '#1e3a8a', textTransform: 'uppercase', fontWeight: '800' }}>📖 Fiche de leçon — {cy.titre}{cy.competence ? ` (${cy.competence})` : ''}</span>
                                      <p style={{ margin: '4px 0 0 0', fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>{lc.titre}</p>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                      <button onClick={() => retournerLecon(lc.id)} className="bouton bouton-danger" style={{ padding: '6px 12px', fontSize: '12px' }}>↩️ Retourner</button>
                                      <button onClick={() => viserLecon(lc.id)} className="bouton bouton-succes" style={{ padding: '6px 12px', fontSize: '12px' }}>✍️ Viser la leçon</button>
                                    </div>
                                  </div>
                                )}
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

            {demandesAffiliationEnseignants.length > 0 && (
              <div style={{ backgroundColor: '#fefce8', padding: '16px', borderRadius: '12px', border: '1px solid #fde68a', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#854d0e', marginBottom: '12px' }}>👥 Demandes d'affiliation d'enseignants en attente</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {demandesAffiliationEnseignants.map(demande => (
                    <div key={demande.id} style={styles.itemRow}>
                      <div>
                        <strong style={{ color: '#0f172a', fontSize: '14px' }}>
                          {demande.utilisateurs_profils?.prenom} {demande.utilisateurs_profils?.nom}
                        </strong>
                        <br /><small>Souhaite rejoindre en tant qu'enseignant</small>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => approuverDemandeAffiliationEnseignant(demande)} className="bouton bouton-succes">Approuver</button>
                        <button
                          onClick={() => setModalConfirmation({
                            ouvert: true,
                            titre: '⚠️ Refuser cette demande ?',
                            message: `Voulez-vous vraiment refuser la demande de ${demande.utilisateurs_profils?.prenom} ${demande.utilisateurs_profils?.nom} ?`,
                            actionCallback: () => refuserDemandeAffiliationEnseignant(demande),
                          })}
                          className="bouton bouton-danger"
                        >Refuser</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
                    <button onClick={() => ouvrirGestionClasses(prof)} className="bouton bouton-secondaire" style={{ fontSize: '11px', padding: '6px 10px', flexShrink: 0 }}>✏️ Modifier ses classes</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------------------------------------------ */}
        {/* ONGLET : CLASSES & ATTRIBUTIONS */}
        {/* ------------------------------------------------------------------------------------------------ */}
        {activeTab === 'classes' && (
          <div style={styles.cardWide}>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', marginBottom: '4px' }}>🏫 Classes & Attributions</h2>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>Créez les classes de l'année, attribuez-les directement, ou traitez les propositions des enseignants.</p>

            {!anneeActiveId && (
              <p style={{ fontSize: '13px', color: '#991b1b', backgroundColor: '#fef2f2', padding: '12px', borderRadius: '10px', marginBottom: '20px' }}>⚠️ Aucune année scolaire active — le chef doit d'abord en ouvrir une.</p>
            )}

            <div style={{ backgroundColor: '#eff6ff', padding: '16px', borderRadius: '12px', border: '1px solid #bfdbfe', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#1e3a8a', marginBottom: '4px' }}>+ Créer les classes d'un niveau (recommandé)</h3>
              <p style={{ fontSize: '12px', color: '#475569', marginBottom: '12px' }}>Vous définissez la convention une seule fois — tout le monde utilise ensuite exactement le même nom, aucun enseignant ne peut l'écrire différemment.</p>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: '700', color: '#1e3a8a', marginBottom: '12px', cursor: 'pointer' }}>
                <input type="checkbox" checked={nouveauLotAvecSeries} onChange={(e) => setNouveauLotAvecSeries(e.target.checked)} />
                Ce niveau a des séries (ex. Seconde, Première, Terminale : A, C, D...)
              </label>

              <form onSubmit={creerClassesEnLot} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div style={{ flex: '1 1 140px' }}>
                  <label style={{ ...styles.label, fontSize: '10px' }}>Niveau</label>
                  <input type="text" placeholder={nouveauLotAvecSeries ? "ex. Seconde" : "ex. 6ème"} value={nouveauLotNiveau} onChange={(e) => setNouveauLotNiveau(e.target.value)} style={{ ...styles.inputStyle, margin: 0 }} required disabled={!anneeActiveId} />
                </div>

                {!nouveauLotAvecSeries ? (
                  <>
                    <div style={{ flex: '1 1 120px' }}>
                      <label style={{ ...styles.label, fontSize: '10px' }}>Nombre de classes</label>
                      <input type="number" min="1" max="26" placeholder="ex. 4" value={nouveauLotNombre} onChange={(e) => setNouveauLotNombre(e.target.value)} style={{ ...styles.inputStyle, margin: 0 }} required disabled={!anneeActiveId} />
                    </div>
                    <div style={{ flex: '1 1 160px' }}>
                      <label style={{ ...styles.label, fontSize: '10px' }}>Numérotation</label>
                      <select value={nouveauLotStyle} onChange={(e) => setNouveauLotStyle(e.target.value)} style={{ ...styles.inputStyle, margin: 0 }} disabled={!anneeActiveId}>
                        <option value="alphabetique">Alphabétique (A, B, C...)</option>
                        <option value="numerique">Numérique (1, 2, 3...)</option>
                      </select>
                    </div>
                  </>
                ) : (
                  <div style={{ flex: '1 1 100%' }}>
                    <label style={{ ...styles.label, fontSize: '10px' }}>Séries de l'établissement</label>

                    <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                      <input type="text" placeholder="Nouvelle série (ex. G2, F4, A...)" value={nouvelleSerieNom} onChange={(e) => setNouvelleSerieNom(e.target.value)} style={{ ...styles.inputStyle, margin: 0, flex: 1 }} disabled={!anneeActiveId} />
                      <button type="button" onClick={ajouterSerieEtablissement} className="bouton bouton-secondaire" style={{ flexShrink: 0, fontSize: '12px' }} disabled={!anneeActiveId}>+ Mémoriser</button>
                    </div>

                    {seriesEtablissement.length === 0 ? (
                      <p style={{ fontSize: '11px', color: '#991b1b', fontStyle: 'italic' }}>Aucune série mémorisée pour l'instant — ajoutez-en une ci-dessus (elle restera disponible pour toujours, sur tous les niveaux).</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {seriesEtablissement.map(serie => {
                          const estCochee = lotSeriesChoisies[serie.id] !== undefined;
                          return (
                            <div key={serie.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #e2e8f0', padding: '6px 10px', borderRadius: '8px', backgroundColor: estCochee ? '#eff6ff' : '#f8fafc', flexWrap: 'wrap' }}>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '13px', flex: '1 1 100px' }}>
                                <input
                                  type="checkbox"
                                  checked={estCochee}
                                  onChange={() => setLotSeriesChoisies(prev => {
                                    const copie = { ...prev };
                                    if (estCochee) delete copie[serie.id]; else copie[serie.id] = '1';
                                    return copie;
                                  })}
                                  disabled={!anneeActiveId}
                                />
                                {serie.nom}
                              </label>
                              {estCochee && (
                                <input
                                  type="number" min="1" max="26" placeholder="Nombre"
                                  value={lotSeriesChoisies[serie.id]}
                                  onChange={(e) => setLotSeriesChoisies(prev => ({ ...prev, [serie.id]: e.target.value }))}
                                  style={{ ...styles.inputStyle, flex: '1 1 90px', margin: 0 }}
                                  disabled={!anneeActiveId}
                                />
                              )}
                              <button type="button" onClick={() => retirerSerieEtablissement(serie.id)} className="bouton bouton-danger" style={{ fontSize: '10px', padding: '4px 8px', flexShrink: 0 }}>Oublier cette série</button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                <div style={{ flex: '1 1 120px' }}>
                  <label style={{ ...styles.label, fontSize: '10px' }}>Entre les deux</label>
                  <select value={nouveauLotSeparateur} onChange={(e) => setNouveauLotSeparateur(e.target.value)} style={{ ...styles.inputStyle, margin: 0 }} disabled={!anneeActiveId}>
                    <option value=" ">Espace (Seconde A)</option>
                    <option value="">Rien (SecondeA)</option>
                    <option value=" - ">Tiret (Seconde - A)</option>
                  </select>
                </div>
                <button type="submit" className="bouton bouton-principal" style={{ flexShrink: 0 }} disabled={!anneeActiveId}>Créer les classes</button>
              </form>

              {nouveauLotNiveau.trim() && apercuLotClasses.length > 0 && (
                <p style={{ fontSize: '11px', color: '#1e3a8a', marginTop: '8px' }}>
                  Aperçu ({apercuLotClasses.length}) : {apercuLotClasses.join(', ')}
                </p>
              )}
            </div>

            <div style={{ backgroundColor: '#f0fdf4', padding: '16px', borderRadius: '12px', border: '1px solid #bbf7d0', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#166534', marginBottom: '4px' }}>+ Générer plusieurs niveaux d'un coup (ex. tout le premier cycle)</h3>
              <p style={{ fontSize: '12px', color: '#475569', marginBottom: '12px' }}>Idéal pour 6ème, 5ème, 4ème, 3ème en une seule opération — un niveau par ligne, chacun avec son propre nombre de classes.</p>

              <form onSubmit={creerNiveauxEnLot}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                  {lotNiveauxMultiples.map((ligne, index) => (
                    <div key={index} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                      <div style={{ flex: '1 1 140px' }}>
                        {index === 0 && <label style={{ ...styles.label, fontSize: '10px' }}>Niveau</label>}
                        <input type="text" placeholder="ex. 6ème" value={ligne.niveau} onChange={(e) => modifierLigneLotNiveaux(index, 'niveau', e.target.value)} style={{ ...styles.inputStyle, margin: 0 }} disabled={!anneeActiveId} />
                      </div>
                      <div style={{ flex: '1 1 100px' }}>
                        {index === 0 && <label style={{ ...styles.label, fontSize: '10px' }}>Nombre</label>}
                        <input type="number" min="1" max="26" placeholder="4" value={ligne.nombre} onChange={(e) => modifierLigneLotNiveaux(index, 'nombre', e.target.value)} style={{ ...styles.inputStyle, margin: 0 }} disabled={!anneeActiveId} />
                      </div>
                      <div style={{ flex: '1 1 140px' }}>
                        {index === 0 && <label style={{ ...styles.label, fontSize: '10px' }}>Style</label>}
                        <select value={ligne.style} onChange={(e) => modifierLigneLotNiveaux(index, 'style', e.target.value)} style={{ ...styles.inputStyle, margin: 0 }} disabled={!anneeActiveId}>
                          <option value="alphabetique">A, B, C...</option>
                          <option value="numerique">1, 2, 3...</option>
                        </select>
                      </div>
                      {lotNiveauxMultiples.length > 1 && (
                        <button type="button" onClick={() => retirerLigneLotNiveaux(index)} className="bouton bouton-danger" style={{ padding: '8px 10px', fontSize: '11px', flexShrink: 0 }}>✕</button>
                      )}
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <button type="button" onClick={ajouterLigneLotNiveaux} className="bouton bouton-secondaire" style={{ fontSize: '12px' }} disabled={!anneeActiveId}>+ Ajouter un niveau</button>
                  <button type="submit" className="bouton bouton-succes" disabled={!anneeActiveId}>Générer {apercuLotNiveauxMultiples.length > 0 ? `les ${apercuLotNiveauxMultiples.length} classes` : 'tout'}</button>
                </div>
              </form>

              {apercuLotNiveauxMultiples.length > 0 && (
                <p style={{ fontSize: '11px', color: '#166534', marginTop: '10px' }}>
                  Aperçu ({apercuLotNiveauxMultiples.length}) : {apercuLotNiveauxMultiples.map(c => c.nom).join(', ')}
                </p>
              )}
            </div>

            <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', marginBottom: '12px' }}>+ Créer une classe isolée (cas particulier)</h3>
              <form onSubmit={creerClasse} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <input type="text" placeholder="Nom (ex. 6ème A)" value={nouvelleClasseNom} onChange={(e) => setNouvelleClasseNom(e.target.value)} style={{ ...styles.inputStyle, flex: '1 1 160px', margin: 0 }} required disabled={!anneeActiveId} />
                <input type="text" placeholder="Niveau (ex. 6ème)" value={nouvelleClasseNiveau} onChange={(e) => setNouvelleClasseNiveau(e.target.value)} style={{ ...styles.inputStyle, flex: '1 1 140px', margin: 0 }} disabled={!anneeActiveId} />
                <button type="submit" className="bouton bouton-secondaire" style={{ flexShrink: 0 }} disabled={!anneeActiveId}>Créer</button>
              </form>
              {classesEtablissement.length > 0 && (
                <p style={{ fontSize: '12px', color: '#475569', marginTop: '12px' }}>
                  Classes existantes : {classesEtablissement.map(c => c.nom).join(', ')}
                </p>
              )}
            </div>

            <div style={{ backgroundColor: '#eff6ff', padding: '16px', borderRadius: '12px', border: '1px solid #bfdbfe', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#1e3a8a', marginBottom: '4px' }}>🎯 Attribuer une ou plusieurs classes à un enseignant</h3>
              <p style={{ fontSize: '12px', color: '#475569', marginBottom: '12px' }}>La matière s'affiche automatiquement depuis le profil de l'enseignant — s'il ne l'a pas encore renseignée, elle reste modifiable ici en dépannage.</p>
              <form onSubmit={attribuerClasseDirectement} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <select value={formAttribution.enseignantId} onChange={(e) => setFormAttribution({ ...formAttribution, enseignantId: e.target.value })} style={{ ...styles.inputStyle, flex: '1 1 200px', margin: 0 }} required disabled={!anneeActiveId}>
                    <option value="">— Choisir un enseignant —</option>
                    {listeProfesseursEtablissement.map(p => <option key={p.userId} value={p.userId}>{p.nomComplet}</option>)}
                  </select>
                  {(() => {
                    const enseignantChoisi = listeProfesseursEtablissement.find(p => p.userId === formAttribution.enseignantId);
                    const matieresProf = enseignantChoisi?.matieresProfil || [];
                    if (matieresProf.length === 1) {
                      return (
                        <div style={{ flex: '1 1 160px', display: 'flex', alignItems: 'center', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '0 12px', fontSize: '13px', fontWeight: '700', color: '#166534' }}>
                          📚 {matieresProf[0].nom}
                        </div>
                      );
                    }
                    if (matieresProf.length > 1) {
                      return (
                        <select value={formAttribution.matiereIdChoisie} onChange={(e) => setFormAttribution({ ...formAttribution, matiereIdChoisie: e.target.value })} style={{ ...styles.inputStyle, flex: '1 1 200px', margin: 0 }} required disabled={!anneeActiveId}>
                          <option value="">— Quelle matière ? —</option>
                          {matieresProf.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
                        </select>
                      );
                    }
                    return (
                      <>
                        <input type="text" list="liste-matieres-censeur" placeholder="Matière (non renseignée sur son profil)" value={formAttribution.matiereNom} onChange={(e) => setFormAttribution({ ...formAttribution, matiereNom: e.target.value })} style={{ ...styles.inputStyle, flex: '1 1 200px', margin: 0 }} required disabled={!anneeActiveId} />
                        <datalist id="liste-matieres-censeur">
                          {matieresDisponibles.map(m => <option key={m.id} value={m.nom} />)}
                        </datalist>
                      </>
                    );
                  })()}
                  <button type="submit" className="bouton bouton-principal" style={{ flexShrink: 0 }} disabled={!anneeActiveId}>Attribuer</button>
                </div>

                <div style={{ backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '10px', maxHeight: '160px', overflowY: 'auto' }}>
                  <p style={{ fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', margin: '0 0 8px 0' }}>Classes (plusieurs possibles)</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {classesEtablissement.map(c => {
                      const estCoche = formAttribution.classesIds.includes(c.id);
                      return (
                        <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid #e2e8f0', padding: '6px 10px', borderRadius: '8px', backgroundColor: estCoche ? '#eff6ff' : '#f8fafc', cursor: 'pointer', fontSize: '12px', fontWeight: '700' }}>
                          <input
                            type="checkbox"
                            checked={estCoche}
                            onChange={() => {
                              const updated = estCoche ? formAttribution.classesIds.filter(id => id !== c.id) : [...formAttribution.classesIds, c.id];
                              setFormAttribution({ ...formAttribution, classesIds: updated });
                            }}
                            disabled={!anneeActiveId}
                          />
                          {c.nom}
                        </label>
                      );
                    })}
                  </div>
                </div>
              </form>
            </div>

            <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', marginBottom: '12px' }}>📥 Propositions des enseignants en attente</h3>
            {demandesAttributionsRecues.length === 0 ? (
              <p style={{ fontStyle: 'italic', color: '#64748b', fontSize: '13px' }}>Aucune proposition en attente.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {demandesAttributionsRecues.map(demande => {
                  const nomEnseignant = `${demande.utilisateurs_profils?.prenom || ''} ${demande.utilisateurs_profils?.nom || ''}`.trim() || 'Enseignant';
                  const estNouvelleClasse = !demande.classe_id;
                  const description = `${nomEnseignant} — ${demande.nomClasseEdite || 'classe'} (${demande.matieres?.nom || 'matière'})`;
                  return (
                    <div key={demande.id} style={styles.itemRow}>
                      <div style={{ flex: 1, minWidth: '220px' }}>
                        <strong style={{ fontSize: '13px' }}>{nomEnseignant}</strong>
                        {estNouvelleClasse && (
                          <span style={{ marginLeft: '8px', fontSize: '10px', backgroundColor: '#fef3c7', color: '#92400e', padding: '2px 6px', borderRadius: '4px', fontWeight: '800' }}>NOUVELLE CLASSE</span>
                        )}
                        <p style={{ fontSize: '12px', color: '#475569', margin: '6px 0 0 0' }}>
                          en <strong>{demande.matieres?.nom || 'matière'}</strong>
                        </p>
                        {estNouvelleClasse ? (
                          <div style={{ marginTop: '6px' }}>
                            <label style={{ ...styles.label, fontSize: '10px' }}>Nom de la classe (corrigible avant validation)</label>
                            <input
                              type="text"
                              value={demande.nomClasseEdite}
                              onChange={(e) => setDemandesAttributionsRecues(prev => prev.map(d => d.id === demande.id ? { ...d, nomClasseEdite: e.target.value } : d))}
                              style={{ ...styles.inputStyle, maxWidth: '220px' }}
                            />
                          </div>
                        ) : (
                          <p style={{ fontSize: '12px', color: '#475569', margin: '2px 0 0 0' }}>Classe : <strong>{demande.nomClasseEdite}</strong></p>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => approuverDemandeAttribution(demande)} className="bouton bouton-succes">Accepter</button>
                        <button onClick={() => refuserDemandeAttribution(demande, description)} className="bouton bouton-danger">Refuser</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', margin: '28px 0 4px 0' }}>🏫 Vue par classe</h3>
            <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px' }}>Chaque classe créée, avec tous les enseignants qui lui sont attribués, groupés par matière. Une classe vide signifie qu'aucun enseignant n'y est encore rattaché.</p>
            {classesEtablissement.length === 0 ? (
              <p style={{ fontStyle: 'italic', color: '#64748b', fontSize: '13px' }}>Aucune classe créée pour l'instant.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {classesEtablissement.map(cl => {
                  const profsDeLaClasse = enseignantsParClasse[cl.nom] || [];
                  return (
                    <div key={cl.id} style={{ ...styles.itemRow, alignItems: 'flex-start', flexDirection: 'column', gap: '6px' }}>
                      <strong style={{ fontSize: '13px', color: '#0f172a' }}>{cl.nom}</strong>
                      {profsDeLaClasse.length === 0 ? (
                        <p style={{ fontSize: '11px', color: '#991b1b', fontStyle: 'italic', margin: 0 }}>⚠️ Aucun enseignant attribué à cette classe.</p>
                      ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {profsDeLaClasse.map((p, i) => (
                            <span key={i} style={{ fontSize: '11px', backgroundColor: '#eff6ff', color: '#1e3a8a', padding: '3px 8px', borderRadius: '6px', fontWeight: '700' }}>
                              {p.enseignant} · {p.matiere}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------------------------------------------ */}
        {/* ONGLET : DOCUMENTS D'ÉTABLISSEMENT */}
        {/* ------------------------------------------------------------------------------------------------ */}
        {activeTab === 'documents' && (
          <div style={styles.cardWide}>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', marginBottom: '4px' }}>📤 Documents d'Établissement</h2>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>Uploadez les documents officiels, administratifs ou pédagogiques de l'établissement.</p>

            <div style={{ backgroundColor: '#eff6ff', padding: '20px', borderRadius: '16px', border: '1px solid #bfdbfe', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#1e3a8a', marginBottom: '8px' }}>+ Nouveau document</h3>
              <form onSubmit={uploaderFichierAdministratifreel} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <input type="text" placeholder="Nom du document..." value={nomNouveauFichier} onChange={(e) => setNomNouveauFichier(e.target.value)} style={{ ...styles.inputStyle, flex: '2 1 200px', margin: 0 }} required />
                <select value={categorieNouveauFichier} onChange={(e) => setCategorieNouveauFichier(e.target.value)} style={{ ...styles.inputStyle, flex: '1 1 160px', margin: 0 }}>
                  <option value="Administratif">Administratif</option>
                  <option value="Pédagogique">Pédagogique</option>
                  <option value="Officiel">Officiel</option>
                  <option value="Autre">Autre</option>
                </select>
                <input type="file" onChange={(e) => setFichierSelectionneObj(e.target.files[0] || null)} style={{ ...styles.inputStyle, flex: '1 1 200px', margin: 0, padding: '8px 10px' }} required />
                <button type="submit" className="bouton bouton-principal" style={{ flexShrink: 0 }} disabled={uploadEnCours}>{uploadEnCours ? 'Envoi...' : 'Uploader'}</button>
              </form>
            </div>

            {documentsEtablissement.length === 0 ? (
              <p style={{ fontStyle: 'italic', color: '#64748b', fontSize: '13px' }}>Aucun document stocké pour l'instant.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {documentsEtablissement.map(doc => (
                  <div key={doc.id} style={styles.itemRow}>
                    <div>
                      <strong style={{ fontSize: '13px' }}>{doc.titre}</strong>
                      <span style={{ marginLeft: '8px', fontSize: '10px', backgroundColor: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>{doc.categorie}</span>
                    </div>
                    <button onClick={() => telechargerDocumentEtablissement(doc)} className="bouton bouton-secondaire" style={{ fontSize: '11px', padding: '6px 10px' }}>📥 Télécharger</button>
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

            <div style={{ backgroundColor: '#fef2f2', padding: '20px', borderRadius: '16px', border: '1px solid #fecaca' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#991b1b', marginBottom: '8px' }}>🚪 Quitter cet établissement</h3>
              <p style={{ fontSize: '12px', color: '#7f1d1d', marginBottom: '12px' }}>Cette demande doit être validée par le chef d'établissement avant de prendre effet. Vous restez actif tant qu'elle n'est pas traitée.</p>
              {demandeDepartCenseurEnCours ? (
                <p style={{ fontSize: '12px', fontWeight: '800', color: '#991b1b' }}>⏳ Demande déjà envoyée, en attente de validation du chef.</p>
              ) : (
                <button
                  onClick={() => setModalConfirmation({
                    ouvert: true,
                    titre: '⚠️ Quitter cet établissement ?',
                    message: "Votre demande sera transmise au chef d'établissement pour validation. Voulez-vous continuer ?",
                    actionCallback: () => setModalDepartCenseurOuvert(true),
                  })}
                  className="bouton bouton-danger"
                >Demander à quitter l'établissement</button>
              )}
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
