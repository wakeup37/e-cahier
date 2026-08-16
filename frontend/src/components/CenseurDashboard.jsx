import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from './AppRouter';

// Catalogue fixe des séries du second cycle (Seconde/Première/Terminale) —
// remplace l'ancien système de séries mémorisées à la volée pour ce niveau.
// Chaque série est taguée GENERAL ou TECHNIQUE pour permettre au censeur de
// ne voir que les séries pertinentes selon le type de son établissement.
const SERIES_SECOND_CYCLE = [
  { code: 'A', label: 'A — Littéraire', type: 'GENERAL' },
  { code: 'B', label: 'B — Sciences Économiques et Sociales', type: 'GENERAL' },
  { code: 'C', label: 'C — Scientifique (Maths-Physique)', type: 'GENERAL' },
  { code: 'D', label: 'D — Scientifique (Maths-SVT)', type: 'GENERAL' },
  { code: 'E', label: 'E — Mathématiques et Techniques', type: 'GENERAL' },
  { code: 'F1', label: 'F1 — Construction / Fabrication Mécanique', type: 'TECHNIQUE' },
  { code: 'F2', label: 'F2 — Électronique', type: 'TECHNIQUE' },
  { code: 'F3', label: 'F3 — Électrotechnique', type: 'TECHNIQUE' },
  { code: 'F4', label: 'F4 — Génie Civil', type: 'TECHNIQUE' },
  { code: 'G1', label: 'G1 — Techniques Administratives et Bureautique', type: 'TECHNIQUE' },
  { code: 'G2', label: 'G2 — Techniques Quantitatives', type: 'TECHNIQUE' },
  { code: 'G3', label: 'G3 — Techniques Commerciales', type: 'TECHNIQUE' },
  { code: 'H1', label: 'H1 — Informatique (option 1)', type: 'TECHNIQUE' },
  { code: 'H2', label: 'H2 — Informatique (option 2)', type: 'TECHNIQUE' },
];

const NIVEAUX_PREMIER_CYCLE = ['6ème', '5ème', '4ème', '3ème'];
const NIVEAUX_SECOND_CYCLE = ['Seconde', 'Première', 'Terminale'];
const TOUS_NIVEAUX = [...NIVEAUX_PREMIER_CYCLE, ...NIVEAUX_SECOND_CYCLE];

// [NOUVEAU] Grille curriculaire officielle — sert à déterminer si une classe
// est réellement "complète" (toutes les matières obligatoires couvertes),
// et non plus juste "au moins un enseignant attribué". Un élément peut être
// soit une matière obligatoire (string), soit un groupe au choix (array —
// un seul enseignant parmi les options suffit, ex. Arts/Musique/Info, LV2).
// Les noms ci-dessous reprennent exactement l'orthographe du catalogue réel
// (ex. "Mathematique" sans accent/singulier, "Allemand (LV2)" avec suffixe).
const MATIERES_BASE_PREMIER_CYCLE = [
  'Français', 'Anglais', 'Mathematique', 'Physique-Chimie', 'SVT', 'EPS', 'EDHC', 'Histoire-Géographie',
  ['Arts Plastiques', 'Éducation Musicale', 'Informatique'],
];
const GROUPE_LV2 = ['Allemand (LV2)', 'Espagnol (LV2)'];

const MATIERES_REQUISES_PAR_NIVEAU = {
  '6ème': MATIERES_BASE_PREMIER_CYCLE,
  '5ème': MATIERES_BASE_PREMIER_CYCLE,
  '4ème': [...MATIERES_BASE_PREMIER_CYCLE, GROUPE_LV2],
  '3ème': [...MATIERES_BASE_PREMIER_CYCLE, GROUPE_LV2],
  // Second cycle : EDHC disparaît ; Première et Terminale ajoutent la Philosophie.
  'Seconde': ['Français', 'Anglais', 'Mathematique', 'Physique-Chimie', 'SVT', 'EPS', 'Histoire-Géographie', ['Arts Plastiques', 'Éducation Musicale', 'Informatique'], GROUPE_LV2],
  'Première': ['Français', 'Anglais', 'Mathematique', 'Physique-Chimie', 'SVT', 'EPS', 'Histoire-Géographie', 'Philosophie', ['Arts Plastiques', 'Éducation Musicale', 'Informatique'], GROUPE_LV2],
  'Terminale': ['Français', 'Anglais', 'Mathematique', 'Physique-Chimie', 'SVT', 'EPS', 'Histoire-Géographie', 'Philosophie', ['Arts Plastiques', 'Éducation Musicale', 'Informatique'], GROUPE_LV2],
};

// Normalisation tolérante (accents/casse/ponctuation) — les matières sont
// nommées librement par le censeur dans le catalogue, donc "S.V.T", "svt",
// "SVT" doivent tous matcher la même exigence.
const normaliserNomMatiere = (nom) => (nom || '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9]/g, '');

export default function CenseurDashboard() {

  // =========================================================================
  // ÉTATS DE SESSION ET DE CHARGEMENT
  // =========================================================================
  const [chargementInitial, setChargementInitial] = useState(true);
  const [userId, setUserId] = useState(null);
  const [affiliationCenseur, setAffiliationCenseur] = useState(null);
  const [anneeActiveId, setAnneeActiveId] = useState(null);

  const [personnesEnLigne, setPersonnesEnLigne] = useState([]);
  
  // USE-EFFECT SÉCURISÉ POUR LA PRÉSENCE (Évite l'écran blanc)
  useEffect(() => {
    if (!affiliationCenseur?.etablissement_id) return;
    try {
      const topic = `presence-etablissement-${affiliationCenseur.etablissement_id}`;
      const interval = setInterval(() => {
        try {
          const canal = supabase.getChannels().find(c => c.topic === `realtime:${topic}`);
          if (canal) {
            const etat = canal.presenceState();
            setPersonnesEnLigne(Object.values(etat).flat());
          }
        } catch (e) {
          console.warn("Erreur lecture présence", e);
        }
      }, 3000);
      return () => clearInterval(interval);
    } catch (err) {
      console.warn("Erreur initialisation présence", err);
    }
  }, [affiliationCenseur?.etablissement_id]);

  // =========================================================================
  // NOUVEAU : SYSTÈME DE NOTIFICATIONS IN-APP
  // =========================================================================
  const envoyerNotification = async (destinataireUserId, type, message, lienCible, etablissementId) => {
    if (!destinataireUserId) return { error: null };
    const { error } = await supabase.from('notifications').insert({
      user_id: destinataireUserId,
      type,
      payload_json: { message, lien_cible: lienCible, etablissement_id: etablissementId },
      canaux: ['in_app'],
    });
    if (error) console.error('envoyerNotification a échoué :', error);
    return { error };
  };

  // Cloche : lecture + temps réel des notifications de l'utilisateur connecté
  useEffect(() => {
    if (!userId) return;
    const canal = supabase
      .channel(`notifications-${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, (payload) => {
        const n = payload.new;
        setNotificationsCenseur(prev => [{
          id: n.id,
          texte: n.payload_json?.message || '',
          date: new Date(n.created_at).toLocaleDateString(),
          lu: false,
          lienCible: n.payload_json?.lien_cible,
        }, ...prev]);
      })
      .subscribe();
    return () => { supabase.removeChannel(canal); };
  }, [userId]);

  const marquerNotificationLue = async (notif) => {
    setActiveTab(notif.lienCible || 'visa');
    setNotifCenseurOuvert(false);
    await supabase.from('notifications').update({ lue_at: new Date().toISOString() }).eq('id', notif.id);
    setNotificationsCenseur(prev => prev.filter(x => x.id !== notif.id));
  };

  // =========================================================================
  // ÉTATS DU PROFIL & CONFIGURATION GLOBALE
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

  const [ecoleConfigGlobale, setEcoleConfigGlobale] = useState({
    nomEcole: '', typeEtablissement: '', codeEtablissement: '', situationGeo: '',
    anneeScolaire: '', nombreEleves: '', nombreEnseignants: '', anneeOuverte: true, typeEnseignement: 'GENERAL'
  });

  // =========================================================================
  // DONNÉES SYNCHRONISÉES SUR SUPABASE
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
  const [nouveauLotNombre, setNouveauLotNombre] = useState('');
  const [nouveauLotStyle, setNouveauLotStyle] = useState('alphabetique');
  const [nouveauLotSeparateur, setNouveauLotSeparateur] = useState(' ');
  // --- Second cycle (Seconde/Première/Terminale) : catalogue fixe de séries ---
  const [niveauSecondCycle, setNiveauSecondCycle] = useState('Seconde');
  const [seriesChoisiesSecondCycle, setSeriesChoisiesSecondCycle] = useState({});
  const [separateurSecondCycle, setSeparateurSecondCycle] = useState(' ');
  const [lotNiveauxMultiples, setLotNiveauxMultiples] = useState([{ niveau: '', nombre: '', style: 'alphabetique' }]);
  const [formAttribution, setFormAttribution] = useState({ enseignantId: '', classesIds: [], matiereNom: '', matiereIdsChoisies: [] });

  // --- Onglet Programme & Progression ---
  const [enseignantChoisiProgression, setEnseignantChoisiProgression] = useState('');
  const [programmeProgressionCharge, setProgrammeProgressionCharge] = useState({});
  const [chargementProgression, setChargementProgression] = useState(false);
  // [NOUVEAU] Vue d'ensemble globale — progression tous enseignants confondus,
  // avec détail dépliable par classe et par enseignant.
  const [vueEnsembleProgression, setVueEnsembleProgression] = useState(null);
  const [chargementVueEnsemble, setChargementVueEnsemble] = useState(false);
  const [detailProgressionOuvert, setDetailProgressionOuvert] = useState(false);
  const [cyclesOuvertsProgression, setCyclesOuvertsProgression] = useState({});
  const toggleCycleProgression = (cycleId) => setCyclesOuvertsProgression(prev => ({ ...prev, [cycleId]: !prev[cycleId] }));
  const [matiereProgrammeOuverte, setMatiereProgrammeOuverte] = useState(null);
  const [brouillonProgrammeMatiere, setBrouillonProgrammeMatiere] = useState({ niveaux: [], series: [] });
  const [documentsEtablissement, setDocumentsEtablissement] = useState([]);
  const [nomNouveauFichier, setNomNouveauFichier] = useState('');
  const [categorieNouveauFichier, setCategorieNouveauFichier] = useState('Administratif');
  const [fichierSelectionneObj, setFichierSelectionneObj] = useState(null);
  const [uploadEnCours, setUploadEnCours] = useState(false);

  // =========================================================================
  // ÉTATS INTERNES ET FILTRES
  // =========================================================================
  const [activeTab, setActiveTab] = useState('visa');
  const [message, setMessage] = useState('');

  const [classesOuvertesVisa, setClassesOuvertesVisa] = useState({});
  const toggleClasseVisa = (classeNom) => setClassesOuvertesVisa(prev => ({ ...prev, [classeNom]: !prev[classeNom] }));
  const [classesOuvertesArchive, setClassesOuvertesArchive] = useState({});
  const toggleClasseArchive = (classeNom) => setClassesOuvertesArchive(prev => ({ ...prev, [classeNom]: !prev[classeNom] }));

  const [filtreArchiveClasse, setFiltreArchiveClasse] = useState('TOUTES');
  const [filtreArchiveMatiere, setFiltreArchiveMatiere] = useState('TOUTES');
  const [filtreArchiveAnnee, setFiltreArchiveAnnee] = useState('TOUTES');
  const [filtreArchiveTexte, setFiltreArchiveTexte] = useState('');
  const [filtreProfClasse, setFiltreProfClasse] = useState('TOUTES');

  const [modalConsultation, setModalConsultation] = useState({ ouvert: false, element: null });

  const [nouveauAdminNom, setNouveauAdminNom] = useState('');
  const [nouveauAdminRole, setNouveauAdminRole] = useState('Éducateur');
  const [nouveauAdminMatricule, setNouveauAdminMatricule] = useState('');
  const [nouveauAdminContact, setNouveauAdminContact] = useState('');
  const [nouveauAdminEmail, setNouveauAdminEmail] = useState('');

  const [formPromotion, setFormPromotion] = useState({ type: 'interne', ecoleCible: '' });
  const [profsSelectionnesRappel, setProfsSelectionnesRappel] = useState([]); // stocke maintenant les userId

  const showToast = (msg) => { setMessage(msg); setTimeout(() => setMessage(''), 8000); };

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

    // [OPTIMISÉ] Ces deux requêtes ne dépendent que de l'utilisateur connecté
    // — aucune raison qu'elles s'attendent l'une l'autre.
    const [{ data: profil }, { data: affiliation, error: erreurAffiliation }] = await Promise.all([
      supabase.from('utilisateurs_profils').select('*').eq('user_id', user.id).single(),
      supabase.from('affiliations_etablissement').select('*, etablissements(*)').eq('user_id', user.id).eq('role', 'CENSEUR').eq('statut', 'ACTIVE').maybeSingle(),
    ]);

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

    // [OPTIMISÉ] Toutes ces requêtes ne dépendent que de etablissementId (ou
    // de user.id) — aucune n'a besoin de l'année scolaire active, donc elles
    // partent toutes en même temps plutôt qu'à la queue leu leu. C'est le
    // gros du gain : ~11 allers-retours réseau qui se chevauchent au lieu de
    // s'additionner.
    const [
      { data: annee },
      { data: demandesEnseignantsBrutes, error: erreurDemandesAffiliation },
      { data: demandeDepartExistante },
      { data: affiliationsEnseignantsBrutes },
      { data: matieresEnseignants },
      { data: matieresData },
      { data: documentsData },
      { data: personnel },
      { data: demande },
      { data: seances, error: erreurSeances },
      { data: archive },
      { data: notifs },
    ] = await Promise.all([
      supabase.from('annees_scolaires').select('*').eq('etablissement_id', etablissementId).eq('est_active', true).maybeSingle(),
      // [CORRIGÉ] Jointure automatique remplacée par une requête séparée
      // (voir plus bas) pour éviter l'ambiguïté PostgREST demandes_affiliation/utilisateurs_profils.
      supabase.from('demandes_affiliation').select('id, user_id, role_demande, created_at').eq('etablissement_id', etablissementId).eq('role_demande', 'ENSEIGNANT').eq('statut', 'EN_ATTENTE').order('created_at', { ascending: true }),
      supabase.from('demandes_depart').select('id').eq('user_id', user.id).eq('statut', 'EN_ATTENTE').maybeSingle(),
      supabase.from('affiliations_etablissement').select('id, user_id').eq('etablissement_id', etablissementId).eq('role', 'ENSEIGNANT').eq('statut', 'ACTIVE'),
      supabase.from('matieres_enseignant').select('user_id, matiere_id, matieres(nom, niveaux_applicables, series_applicables)').eq('etablissement_id', etablissementId),
      supabase.from('matieres').select('id, nom, niveaux_applicables, series_applicables').order('nom', { ascending: true }),
      supabase.from('documents_etablissement').select('id, titre, categorie, created_at, versions_document!fk_doc_version_courante(fichiers_metadonnees(cle_stockage, taille_octets))').eq('etablissement_id', etablissementId).is('deleted_at', null).order('created_at', { ascending: false }),
      supabase.from('personnel').select('*').eq('etablissement_id', etablissementId),
      supabase.from('demandes_changement_role').select('*').eq('user_id', user.id).eq('etablissement_id', etablissementId).eq('role_demande', 'CHEF').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('seances').select(`
        id, date_prevue, statut, contenu_json,
        statut_visa, envoyee_at, visee_at, observation_visa,
        classes ( nom ),
        lecons (
          id, titre,
          cycles (
            id, titre, competence,
            programmes_annuels ( titre, proprietaire_user_id, matieres(nom),
              utilisateurs_profils:proprietaire_user_id (nom, prenom) )
          )
        )
      `).in('statut', ['ENVOYEE', 'RECUE']),
      supabase.from('bibliotheque_etablissement').select('id, titre, created_at, contenu_snapshot_json, annee_scolaire_id, annees_scolaires(intitule), utilisateurs_profils:auteur_user_id (nom, prenom)').eq('etablissement_id', etablissementId).order('created_at', { ascending: false }),
      supabase.from('notifications').select('*').eq('user_id', user.id).is('lue_at', null).order('created_at', { ascending: false }),
    ]);

    setAnneeActiveId(annee?.id || null);

    if (erreurDemandesAffiliation) {
      console.error('Erreur chargement demandes d\'affiliation :', erreurDemandesAffiliation);
      showToast("⚠️ Erreur de chargement des demandes d'affiliation : " + erreurDemandesAffiliation.message);
    }

    // [OPTIMISÉ] Ces deux relectures de profils, et les deux requêtes qui
    // dépendent de l'année scolaire active, ne dépendent QUE des résultats
    // de la vague précédente — elles aussi partent en parallèle entre elles,
    // dans une deuxième vague (obligée d'attendre la première pour connaître
    // annee.id et les listes d'ids demandeurs/enseignants).
    const idsDemandeurs = [...new Set((demandesEnseignantsBrutes || []).map(d => d.user_id))];
    const idsEnseignants = [...new Set((affiliationsEnseignantsBrutes || []).map(a => a.user_id))];

    const [
      { data: profilsDemandeurs },
      { data: profilsEnseignants },
      { data: attributions },
      { data: classesData },
      { data: demandesAttrib },
    ] = await Promise.all([
      idsDemandeurs.length > 0
        ? supabase.from('utilisateurs_profils').select('user_id, nom, prenom').in('user_id', idsDemandeurs)
        : Promise.resolve({ data: [] }),
      idsEnseignants.length > 0
        ? supabase.from('utilisateurs_profils').select('user_id, nom, prenom, telephone').in('user_id', idsEnseignants)
        : Promise.resolve({ data: [] }),
      supabase.from('attributions_classes').select('enseignant_id, matiere_id, matieres(nom), classes(nom)').eq('etablissement_id', etablissementId).eq('annee_scolaire_id', annee?.id || '00000000-0000-0000-0000-000000000000'),
      annee?.id
        ? supabase.from('classes').select('id, nom, niveau, serie').eq('etablissement_id', etablissementId).eq('annee_scolaire_id', annee.id).is('deleted_at', null).order('nom', { ascending: true })
        : Promise.resolve({ data: [] }),
      annee?.id
        ? supabase.from('demandes_attributions_classes').select('id, enseignant_id, classe_id, classe_nom_propose, matiere_id, etablissement_id, annee_scolaire_id, created_at, classes(nom), matieres(nom), utilisateurs_profils:enseignant_id(nom, prenom)').eq('etablissement_id', etablissementId).eq('statut', 'EN_ATTENTE').order('created_at', { ascending: true })
        : Promise.resolve({ data: [] }),
    ]);

    // --- Demandes d'affiliation enseignants (rattachement des profils + dédoublonnage) ---
    const profilParId = {};
    (profilsDemandeurs || []).forEach(p => { profilParId[p.user_id] = p; });
    let demandesEnseignants = (demandesEnseignantsBrutes || []).map(d => ({ ...d, utilisateurs_profils: profilParId[d.user_id] || null }));
    // [NOUVEAU] Sécurité supplémentaire : même si des doublons existent déjà
    // en base (créés avant le correctif anti-doublon), on n'affiche qu'une
    // seule fois chaque personne — la plus ancienne demande est conservée.
    const demandesEnseignantsDedupliquees = [];
    const usersDejaVus = new Set();
    demandesEnseignants.forEach(d => {
      if (usersDejaVus.has(d.user_id)) return;
      usersDejaVus.add(d.user_id);
      demandesEnseignantsDedupliquees.push(d);
    });
    setDemandesAffiliationEnseignants(demandesEnseignantsDedupliquees);

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
      typeEnseignement: etab?.parametres_json?.typeEnseignement || 'GENERAL',
    });

    // --- Enseignants affiliés (rattachement des profils) ---
    const profilEnseignantParId = {};
    (profilsEnseignants || []).forEach(p => { profilEnseignantParId[p.user_id] = p; });
    let affiliationsEnseignants = (affiliationsEnseignantsBrutes || []).map(a => ({ ...a, utilisateurs_profils: profilEnseignantParId[a.user_id] || null }));

    const profsAvecClasses = (affiliationsEnseignants || []).map(a => {
      const attrsDeCetEnseignant = (attributions || []).filter(at => at.enseignant_id === a.user_id);
      const matieresProfil = (matieresEnseignants || [])
        .filter(m => m.user_id === a.user_id)
        .map(m => ({ id: m.matiere_id, nom: m.matieres?.nom, niveauxApplicables: m.matieres?.niveaux_applicables || [], seriesApplicables: m.matieres?.series_applicables || [] }))
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

    setClassesEtablissement(classesData || []);
    setDemandesAttributionsRecues((demandesAttrib || []).map(d => ({ ...d, nomClasseEdite: d.classes?.nom || d.classe_nom_propose || '' })));

    setMatieresDisponibles(matieresData || []);

    setDocumentsEtablissement((documentsData || []).map(d => ({
      ...d,
      cle_stockage: d.versions_document?.fichiers_metadonnees?.cle_stockage,
      taille_octets: d.versions_document?.fichiers_metadonnees?.taille_octets,
    })));

    setPersonnelAdministratifManuel((personnel || []).map(p => ({
      id: p.id, nomComplet: `${p.prenom} ${p.nom}`.trim(), role: p.fonction,
      matricule: 'N/A', contact: p.telephone || 'N/A', email: p.email || 'N/A',
    })));

    if (demande) {
      setDemandePromotion({
        date: new Date(demande.created_at).toLocaleDateString(),
        type: 'interne',
        ecoleCible: etab?.nom || '',
        statut: demande.statut === 'EN_ATTENTE' ? 'En attente de validation' : demande.statut,
      });
    }

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
          enseignantUserId: programme?.proprietaire_user_id || null,
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

    setArchiveEcole((archive || []).map(a => ({
      id: a.id,
      enseignant: `${a.utilisateurs_profils?.prenom || ''} ${a.utilisateurs_profils?.nom || ''}`.trim(),
      matiere: a.contenu_snapshot_json?.matiere || 'Non définie',
      classe: a.contenu_snapshot_json?.classe || 'Général',
      titre: a.titre,
      anneeScolaire: a.annees_scolaires?.intitule || '',
      dateValidation: new Date(a.created_at).toLocaleDateString(),
      details: a.contenu_snapshot_json,
    })));

    setNotificationsCenseur((notifs || []).map(n => ({
      id: n.id,
      texte: n.payload_json?.message || '',
      date: new Date(n.created_at).toLocaleDateString(),
      lu: false,
      lienCible: n.payload_json?.lien_cible,
    })));

    setChargementInitial(false);
  };

  useEffect(() => { chargerTout(); }, []);

  const [listeProfesseursEtablissementBrute, setListeProfesseursEtablissementBrute] = useState([]);
  const listeProfesseursEtablissement = listeProfesseursEtablissementBrute;

  // =========================================================================
  // LOGIQUE MÉTIER & ACTIONS
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
  // [NOUVEAU] Empêche l'envoi de plusieurs demandes identiques en cas de
  // clics multiples sur "Envoyer la demande" — voir soumettreDemandeRejoindre.
  const [envoiDemandeRejoindreEnCours, setEnvoiDemandeRejoindreEnCours] = useState(false);
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

    // [CORRIGÉ] Si la même personne a envoyé sa demande plusieurs fois
    // (double-clic, etc.), il ne faut créer qu'UNE seule affiliation (fait
    // ci-dessus) mais clôturer TOUS ses doublons encore en attente — sinon
    // les autres réapparaissent dans la liste et semblent être une
    // personne différente à traiter.
    const { error: erreurMaj } = await supabase
      .from('demandes_affiliation')
      .update({ statut: 'ACCEPTEE', traite_par_user_id: userId, traite_at: new Date().toISOString() })
      .eq('user_id', demande.user_id)
      .eq('etablissement_id', affiliationCenseur.etablissement_id)
      .eq('role_demande', 'ENSEIGNANT')
      .eq('statut', 'EN_ATTENTE');
    if (erreurMaj) {
      showToast("⚠️ Affiliation créée, mais la demande n'a pas pu être clôturée : " + erreurMaj.message);
      return;
    }

    await envoyerNotification(
      demande.user_id, 'DEMANDE_AFFILIATION_ACCEPTEE',
      `✅ Votre demande pour rejoindre l'établissement en tant qu'enseignant a été acceptée !`,
      'affiliation', affiliationCenseur.etablissement_id
    );

    setDemandesAffiliationEnseignants(prev => prev.filter(d => d.user_id !== demande.user_id));
    showToast("✅ Demande approuvée, l'enseignant a maintenant accès à l'établissement !");
  };

  const refuserDemandeAffiliationEnseignant = async (demande) => {
    // [CORRIGÉ] Même logique que l'approbation : on refuse d'un coup tous
    // les doublons de la même personne, pas seulement celui cliqué.
    const { error } = await supabase
      .from('demandes_affiliation')
      .update({ statut: 'REFUSEE', traite_par_user_id: userId, traite_at: new Date().toISOString() })
      .eq('user_id', demande.user_id)
      .eq('etablissement_id', affiliationCenseur.etablissement_id)
      .eq('role_demande', 'ENSEIGNANT')
      .eq('statut', 'EN_ATTENTE');
    if (error) { showToast("⚠️ Erreur : " + error.message); return; }

    await envoyerNotification(
      demande.user_id, 'DEMANDE_AFFILIATION_REFUSEE',
      `❌ Votre demande pour rejoindre l'établissement en tant qu'enseignant a été refusée.`,
      'affiliation', affiliationCenseur.etablissement_id
    );

    setDemandesAffiliationEnseignants(prev => prev.filter(d => d.user_id !== demande.user_id));
    showToast("❌ Demande refusée.");
  };

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

  const [classeEnRenommage, setClasseEnRenommage] = useState({ id: null, nom: '' });
  // [NOUVEAU] Recherche rapide dans la liste "Classes existantes" — utile
  // dès qu'un établissement a beaucoup de classes.
  const [rechercheClasseTexte, setRechercheClasseTexte] = useState('');

  const renommerClasse = async (e) => {
    e.preventDefault();
    if (!classeEnRenommage.nom.trim()) return;
    const { data, error } = await supabase
      .from('classes')
      .update({ nom: classeEnRenommage.nom.trim() })
      .eq('id', classeEnRenommage.id)
      .select()
      .single();
    if (error) {
      if (error.code === '23505') showToast("⚠️ Une classe porte déjà ce nom pour cette année.");
      else showToast("⚠️ Erreur : " + error.message);
      return;
    }
    setClassesEtablissement(prev => prev.map(c => c.id === data.id ? data : c).sort((a, b) => a.nom.localeCompare(b.nom)));
    setClasseEnRenommage({ id: null, nom: '' });
    showToast("✅ Classe renommée !");
  };

  // Suppression douce (deleted_at) — la classe disparaît des formulaires
  // d'attribution/création, mais les fiches et attributions déjà existantes
  // restent intactes et consultables dans l'historique.
  const supprimerClasse = (classe) => {
    setModalConfirmation({
      ouvert: true,
      titre: `Supprimer "${classe.nom}" ?`,
      message: "Elle disparaîtra des formulaires d'attribution et de création de fiches. Les fiches et attributions déjà existantes pour cette classe restent consultables dans l'historique, mais plus rien de nouveau ne pourra lui être rattaché.",
      actionCallback: async () => {
        const { error } = await supabase.from('classes').update({ deleted_at: new Date().toISOString() }).eq('id', classe.id);
        if (error) { showToast("⚠️ Erreur : " + error.message); return; }
        setClassesEtablissement(prev => prev.filter(c => c.id !== classe.id));
        showToast(`🗑️ Classe "${classe.nom}" supprimée.`);
      },
    });
  };

  const ALPHABET_CLASSES = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  const genererNomsLot = () => {
    const niveau = nouveauLotNiveau.trim();
    if (!niveau) return [];
    const nombre = parseInt(nouveauLotNombre, 10);
    if (!nombre || nombre < 1) return [];
    const suffixes = nouveauLotStyle === 'alphabetique'
      ? ALPHABET_CLASSES.slice(0, nombre).split('')
      : Array.from({ length: nombre }, (_, i) => String(i + 1));
    return suffixes.map(suf => `${niveau}${nouveauLotSeparateur}${suf}`);
  };

  const creerClassesEnLot = async (e) => {
    e.preventDefault();
    if (!affiliationCenseur || !anneeActiveId) { showToast("⚠️ Aucune année scolaire active."); return; }
    const noms = genererNomsLot();
    if (noms.length === 0) { showToast("⚠️ Merci de compléter le formulaire (niveau + nombre)."); return; }

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

    const { data: classesRafraichies } = await supabase
      .from('classes')
      .select('id, nom, niveau, serie')
      .eq('etablissement_id', affiliationCenseur.etablissement_id)
      .eq('annee_scolaire_id', anneeActiveId)
      .is('deleted_at', null)
      .order('nom', { ascending: true });
    setClassesEtablissement(classesRafraichies || []);

    setNouveauLotNiveau(''); setNouveauLotNombre('');
    showToast(`✅ ${noms.length} classe(s) prête(s) pour "${nouveauLotNiveau.trim()}" !`);
  };

  // --- Second cycle (Seconde/Première/Terminale) : niveau → séries → nombre par série ---
  const genererNomsSecondCycle = () => {
    const items = [];
    Object.entries(seriesChoisiesSecondCycle).forEach(([code, nombreBrut]) => {
      if (nombreBrut === undefined || nombreBrut === '') return;
      const nombre = parseInt(nombreBrut, 10) || 1;
      if (nombre <= 1) {
        items.push({ nom: `${niveauSecondCycle}${separateurSecondCycle}${code}`, serie: code });
      } else {
        for (let i = 1; i <= nombre; i++) items.push({ nom: `${niveauSecondCycle}${separateurSecondCycle}${code}${i}`, serie: code });
      }
    });
    return items;
  };

  const creerClassesSecondCycle = async (e) => {
    e.preventDefault();
    if (!affiliationCenseur || !anneeActiveId) { showToast("⚠️ Aucune année scolaire active."); return; }
    const items = genererNomsSecondCycle();
    if (items.length === 0) { showToast("⚠️ Choisissez au moins une série avec un nombre de classes."); return; }

    const lignes = items.map(({ nom, serie }) => ({
      etablissement_id: affiliationCenseur.etablissement_id,
      annee_scolaire_id: anneeActiveId,
      nom,
      niveau: niveauSecondCycle,
      serie,
    }));

    const { error } = await supabase
      .from('classes')
      .upsert(lignes, { onConflict: 'etablissement_id,annee_scolaire_id,nom', ignoreDuplicates: true });

    if (error) { showToast("⚠️ Erreur : " + error.message); return; }

    const { data: classesRafraichies } = await supabase
      .from('classes')
      .select('id, nom, niveau, serie')
      .eq('etablissement_id', affiliationCenseur.etablissement_id)
      .eq('annee_scolaire_id', anneeActiveId)
      .is('deleted_at', null)
      .order('nom', { ascending: true });
    setClassesEtablissement(classesRafraichies || []);

    setSeriesChoisiesSecondCycle({});
    showToast(`✅ ${items.length} classe(s) créée(s) pour ${niveauSecondCycle} !`);
  };

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
      .select('id, nom, niveau, serie')
      .eq('etablissement_id', affiliationCenseur.etablissement_id)
      .eq('annee_scolaire_id', anneeActiveId)
      .is('deleted_at', null)
      .order('nom', { ascending: true });
    setClassesEtablissement(classesRafraichies || []);

    const nombreNiveaux = new Set(classesAGenerer.map(c => c.niveau)).size;
    setLotNiveauxMultiples([{ niveau: '', nombre: '', style: 'alphabetique' }]);
    showToast(`✅ ${classesAGenerer.length} classe(s) créée(s) pour ${nombreNiveaux} niveau(x) !`);
  };

  const trouverOuCreerMatiere = async (nomMatiere) => {
    const nom = nomMatiere.trim();
    if (!nom) return null;
    const existante = matieresDisponibles.find(m => m.nom.toLowerCase() === nom.toLowerCase());
    if (existante) return existante.id;
    const { data: nouvelle, error } = await supabase.from('matieres').insert({ nom }).select().single();
    if (error) {
      const { data: relue } = await supabase.from('matieres').select('id').eq('nom', nom).maybeSingle();
      if (relue) return relue.id;
      showToast("⚠️ Erreur matière : " + error.message);
      return null;
    }
    setMatieresDisponibles(prev => [...prev, nouvelle]);
    return nouvelle.id;
  };

  // Le censeur décide librement quelle matière convient à quel niveau/série
  // — les programmes changent dans le temps, rien n'est figé côté code.
  // La fonction reste disponible (au cas où) mais ne filtre plus rien :
  // toute matière est toujours considérée applicable à toute classe.
  const matiereApplicableAClasse = (matiere, classe) => true;

  const matieresPourClasse = (classeOuClasses) => matieresDisponibles;

  // [NOUVEAU] Évalue la complétude réelle d'une classe : compare les matières
  // couvertes (via enseignantsParClasse) à la grille curriculaire officielle
  // du niveau. Retourne aussi la liste des matières encore manquantes, pour
  // affichage. Si le niveau de la classe n'est pas reconnu dans la grille
  // (ex. classe créée sans niveau renseigné), on retombe sur l'ancien
  // comportement "au moins un enseignant attribué" pour ne rien casser.
  const evaluerCompletudeClasse = (classe) => {
    const profsDeLaClasse = enseignantsParClasse[classe.nom] || [];
    const matieresCouvertes = new Set(profsDeLaClasse.map(p => normaliserNomMatiere(p.matiere)));
    const grille = MATIERES_REQUISES_PAR_NIVEAU[classe.niveau];

    if (!grille) {
      return { complete: profsDeLaClasse.length > 0, matieresManquantes: [], grilleConnue: false };
    }

    const matieresManquantes = [];
    grille.forEach(exigence => {
      if (Array.isArray(exigence)) {
        const satisfait = exigence.some(nom => matieresCouvertes.has(normaliserNomMatiere(nom)));
        if (!satisfait) matieresManquantes.push(exigence.join(' ou '));
      } else {
        if (!matieresCouvertes.has(normaliserNomMatiere(exigence))) matieresManquantes.push(exigence);
      }
    });

    return { complete: matieresManquantes.length === 0, matieresManquantes, grilleConnue: true };
  };

  const enregistrerProgrammeMatiere = async (matiereId, niveaux, series) => {
    const { data, error } = await supabase
      .from('matieres')
      .update({ niveaux_applicables: niveaux, series_applicables: series })
      .eq('id', matiereId)
      .select('id, nom, niveaux_applicables, series_applicables')
      .single();
    if (error) { showToast("⚠️ Erreur : " + error.message); return; }
    setMatieresDisponibles(prev => prev.map(m => m.id === matiereId ? data : m));
    setMatiereProgrammeOuverte(null);
    showToast(`✅ Programme mis à jour pour "${data.nom}" !`);
  };

  const ouvrirProgrammeMatiere = (matiere) => {
    setMatiereProgrammeOuverte(matiere.id);
    setBrouillonProgrammeMatiere({
      niveaux: matiere.niveaux_applicables || [],
      series: matiere.series_applicables || [],
    });
  };

  // Le censeur peut ajouter une nouvelle matière ou renommer une matière
  // existante à tout moment — le catalogue doit pouvoir évoluer (nouvelle
  // matière introduite, appellation qui change) sans jamais passer par SQL.
  const [nouvelleMatiereNomCatalogue, setNouvelleMatiereNomCatalogue] = useState('');
  const [matiereEnRenommage, setMatiereEnRenommage] = useState({ id: null, nom: '' });

  const ajouterMatiereAuCatalogue = async (e) => {
    e.preventDefault();
    const id = await trouverOuCreerMatiere(nouvelleMatiereNomCatalogue);
    if (id) {
      setNouvelleMatiereNomCatalogue('');
      showToast("✅ Matière ajoutée au catalogue !");
    }
  };

  const renommerMatiere = async (e) => {
    e.preventDefault();
    if (!matiereEnRenommage.nom.trim()) return;
    const { data, error } = await supabase
      .from('matieres')
      .update({ nom: matiereEnRenommage.nom.trim() })
      .eq('id', matiereEnRenommage.id)
      .select('id, nom, niveaux_applicables, series_applicables')
      .single();
    if (error) {
      if (error.code === '23505') showToast("⚠️ Une matière porte déjà ce nom.");
      else showToast("⚠️ Erreur : " + error.message);
      return;
    }
    setMatieresDisponibles(prev => prev.map(m => m.id === data.id ? data : m));
    setMatiereEnRenommage({ id: null, nom: '' });
    showToast("✅ Matière renommée !");
  };

  const attribuerClasseDirectement = async (e) => {
    e.preventDefault();
    if (!formAttribution.enseignantId || formAttribution.classesIds.length === 0 || !affiliationCenseur || !anneeActiveId) {
      showToast("⚠️ Merci de choisir l'enseignant et au moins une classe.");
      return;
    }
    if (formAttribution.matiereIdsChoisies.length === 0) {
      showToast("⚠️ Merci de cocher au moins une matière.");
      return;
    }
    const matiereIds = formAttribution.matiereIdsChoisies;

    const lignes = [];
    formAttribution.classesIds.forEach(classeId => {
      matiereIds.forEach(matiereId => {
        lignes.push({
          enseignant_id: formAttribution.enseignantId,
          classe_id: classeId,
          etablissement_id: affiliationCenseur.etablissement_id,
          annee_scolaire_id: anneeActiveId,
          matiere_id: matiereId,
        });
      });
    });

    const { error } = await supabase.from('attributions_classes').insert(lignes);
    if (error) {
      if (error.code === '23505') showToast("⚠️ Une ou plusieurs de ces attributions existent déjà.");
      else showToast("⚠️ Erreur : " + error.message);
      return;
    }
    showToast(`✅ ${lignes.length} attribution(s) créée(s) (${formAttribution.classesIds.length} classe(s) × ${matiereIds.length} matière(s)) !`);

    await envoyerNotification(
      formAttribution.enseignantId, 'CLASSE_ATTRIBUEE',
      `🏫 On vous a attribué ${lignes.length} attribution(s) de classe/matière`,
      'cycles', affiliationCenseur.etablissement_id
    );

    setFormAttribution({ enseignantId: '', classesIds: [], matiereNom: '', matiereIdsChoisies: [] });
    chargerTout();
  };

  const [modalGererClasses, setModalGererClasses] = useState({ ouvert: false, prof: null, attributions: [] });
  const [formAjoutAttribution, setFormAjoutAttribution] = useState({ classeId: '', matiereNom: '', matiereIdsChoisies: [] });

  const ouvrirGestionClasses = async (prof) => {
    const { data } = await supabase
      .from('attributions_classes')
      .select('id, classe_id, matiere_id, classes(nom), matieres(nom)')
      .eq('enseignant_id', prof.userId)
      .eq('etablissement_id', affiliationCenseur.etablissement_id)
      .eq('annee_scolaire_id', anneeActiveId || '00000000-0000-0000-0000-000000000000');
    setModalGererClasses({ ouvert: true, prof, attributions: data || [] });
    setFormAjoutAttribution({ classeId: '', matiereNom: '', matiereIdsChoisies: [] });
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
    if (!formAjoutAttribution.classeId || !modalGererClasses.prof) {
      showToast("⚠️ Merci de choisir une classe.");
      return;
    }
    if (formAjoutAttribution.matiereIdsChoisies.length === 0) {
      showToast("⚠️ Merci de cocher au moins une matière.");
      return;
    }
    const matiereIds = formAjoutAttribution.matiereIdsChoisies;

    const lignes = matiereIds.map(matiereId => ({
      enseignant_id: modalGererClasses.prof.userId,
      classe_id: formAjoutAttribution.classeId,
      etablissement_id: affiliationCenseur.etablissement_id,
      annee_scolaire_id: anneeActiveId,
      matiere_id: matiereId,
    }));

    const { data: nouvelles, error } = await supabase.from('attributions_classes').insert(lignes).select('id, classe_id, matiere_id, classes(nom), matieres(nom)');

    if (error) {
      if (error.code === '23505') showToast("⚠️ Une ou plusieurs de ces attributions existent déjà.");
      else showToast("⚠️ Erreur : " + error.message);
      return;
    }
    setModalGererClasses(prev => ({ ...prev, attributions: [...prev.attributions, ...(nouvelles || [])] }));

    for (const nouvelle of (nouvelles || [])) {
      await envoyerNotification(
        modalGererClasses.prof.userId, 'CLASSE_ATTRIBUEE',
        `🏫 On vous a attribué la classe "${nouvelle.classes?.nom}" en ${nouvelle.matieres?.nom}`,
        'cycles', affiliationCenseur.etablissement_id
      );
    }

    setFormAjoutAttribution({ classeId: '', matiereNom: '', matiereIdsChoisies: [] });
    chargerTout();
    showToast(`✅ ${lignes.length} matière(s) ajoutée(s) !`);
  };

  const approuverDemandeAttribution = async (demande) => {
    let classeId = demande.classe_id;
    const nomFinal = (demande.nomClasseEdite || demande.classe_nom_propose || '').trim();

    if (!classeId) {
      if (!nomFinal) { showToast("⚠️ Merci d'indiquer le nom de la classe avant d'accepter."); return; }

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

    await envoyerNotification(
      demande.enseignant_id, 'PROPOSITION_ACCEPTEE',
      `✅ Votre proposition de classe "${nomFinal}" a été acceptée !`,
      'cycles', demande.etablissement_id
    );

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

        await envoyerNotification(
          demande.enseignant_id, 'PROPOSITION_REFUSEE',
          `❌ Votre proposition de classe a été refusée.`,
          'cycles', demande.etablissement_id
        );

        setDemandesAttributionsRecues(prev => prev.filter(d => d.id !== demande.id));
        showToast("❌ Proposition refusée.");
      },
    });
  };

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
    if (envoiDemandeRejoindreEnCours) return;
    setEnvoiDemandeRejoindreEnCours(true);

    const { data: etablissementCible, error: erreurRecherche } = await supabase
      .from('etablissements').select('id, nom').eq('code', inputCodeEtablissementCenseur.trim()).maybeSingle();

    if (erreurRecherche || !etablissementCible) {
      showToast("⚠️ Aucun établissement trouvé avec ce code.");
      setEnvoiDemandeRejoindreEnCours(false);
      return;
    }

    // [NOUVEAU] Vérifie qu'aucune demande identique n'est déjà en attente
    // avant d'en créer une nouvelle — évite les doublons (plusieurs clics
    // sur "Envoyer la demande") qui obligeaient ensuite le chef à traiter
    // la même personne plusieurs fois.
    const { data: demandeExistante } = await supabase
      .from('demandes_affiliation')
      .select('id')
      .eq('user_id', userId)
      .eq('etablissement_id', etablissementCible.id)
      .eq('role_demande', 'CENSEUR')
      .eq('statut', 'EN_ATTENTE')
      .maybeSingle();

    if (demandeExistante) {
      showToast("⚠️ Une demande est déjà en attente pour cet établissement.");
      setEnvoiDemandeRejoindreEnCours(false);
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
      setEnvoiDemandeRejoindreEnCours(false);
      return;
    }

    showToast(`📨 Demande envoyée pour "${etablissementCible.nom}". En attente d'approbation du chef.`);
    setEnvoiDemandeRejoindreEnCours(false);
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

  const toggleSelectionRappel = (profUserId, isChecked) => {
    setProfsSelectionnesRappel(prev => isChecked ? [...prev, profUserId] : prev.filter(id => id !== profUserId));
  };

  const envoyerRappelMultipleManuel = async () => {
    if (profsSelectionnesRappel.length === 0) return showToast("⚠️ Veuillez sélectionner au moins un enseignant.");

    let echecs = 0;
    let dernierMessageErreur = '';
    for (const profId of profsSelectionnesRappel) {
      const { error } = await envoyerNotification(
        profId,
        'ALERT',
        "Rappel Censeur : Vous avez des fiches pédagogiques en attente de soumission. Merci de régulariser la situation.",
        'cycles',
        affiliationCenseur.etablissement_id
      );
      if (error) { echecs++; dernierMessageErreur = error.message; }
    }

    if (echecs > 0) {
      showToast(`⚠️ ${echecs} rappel(s) sur ${profsSelectionnesRappel.length} n'ont pas pu être envoyés. Erreur Supabase : ${dernierMessageErreur}`);
    } else {
      showToast(`✉️ Notification de rappel envoyée avec succès à ${profsSelectionnesRappel.length} enseignant(s) !`);
    }
    setProfsSelectionnesRappel([]);
  };

  // =========================================================================
  // PROGRAMME & PROGRESSION — vue lecture seule du programme d'un enseignant,
  // avec statistiques de progression, et génération de rapports ponctuels.
  // =========================================================================
  const calculerProgrammeEtStatsEnseignant = async (enseignantUserId) => {
    if (!enseignantUserId || !anneeActiveId) return { groupe: {}, totaux: { nbSeances: 0, nbVisees: 0, nbReportees: 0, nbEnRetard: 0 } };

    const { data: programmesPossedes } = await supabase
      .from('programmes_annuels').select('id')
      .eq('proprietaire_user_id', enseignantUserId)
      .eq('annee_scolaire_id', anneeActiveId);
    const idsProgrammes = (programmesPossedes || []).map(p => p.id);

    const groupe = {};
    const totaux = { nbSeances: 0, nbVisees: 0, nbReportees: 0, nbEnRetard: 0 };
    if (idsProgrammes.length === 0) return { groupe, totaux };

    const { data: cyclesData } = await supabase
      .from('cycles')
      .select('id, titre, statut, competence, date_debut, date_fin, nombre_lecons_prevu, classe_nom, programme_annuel_id')
      .in('programme_annuel_id', idsProgrammes)
      .order('created_at', { ascending: true });

    const idsCycles = (cyclesData || []).map(c => c.id);
    const { data: leconsData } = idsCycles.length > 0
      ? await supabase.from('lecons').select('id, titre, statut, statut_visa, cycle_id').in('cycle_id', idsCycles).order('created_at', { ascending: true })
      : { data: [] };

    const idsLecons = (leconsData || []).map(l => l.id);
    const { data: seancesData } = idsLecons.length > 0
      ? await supabase.from('seances').select('id, date_prevue, statut, contenu_json, lecon_id, motif_report').in('lecon_id', idsLecons).order('created_at', { ascending: true })
      : { data: [] };

    const aujourdHui = new Date().toISOString().slice(0, 10);

    (cyclesData || []).forEach(cycle => {
      const classeNom = cycle.classe_nom || 'Sans classe';
      if (!groupe[classeNom]) groupe[classeNom] = { cycles: [] };

      const leconsDuCycle = (leconsData || []).filter(l => l.cycle_id === cycle.id).map(lecon => {
        const seancesDeLaLecon = (seancesData || []).filter(s => s.lecon_id === lecon.id).map((sc, i) => ({
          id: sc.id, numero: i + 1, titre: sc.contenu_json?.titre || 'Séance',
          date: sc.date_prevue, statut: sc.statut, motifReport: sc.motif_report || '',
        }));
        return { id: lecon.id, titre: lecon.titre, statutVisa: lecon.statut_visa, seances: seancesDeLaLecon };
      });

      const toutesSeances = leconsDuCycle.flatMap(l => l.seances);
      const nbVisees = toutesSeances.filter(s => s.statut === 'VISEE').length;
      const nbReportees = toutesSeances.filter(s => s.statut === 'REPORTEE').length;
      const nbEnRetard = toutesSeances.filter(s => ['BROUILLON', 'PROGRAMMEE'].includes(s.statut) && s.date && s.date <= aujourdHui).length;

      totaux.nbSeances += toutesSeances.length;
      totaux.nbVisees += nbVisees;
      totaux.nbReportees += nbReportees;
      totaux.nbEnRetard += nbEnRetard;

      groupe[classeNom].cycles.push({
        id: cycle.id, titre: cycle.titre, competence: cycle.competence || '',
        dateDebut: cycle.date_debut || '', dateFin: cycle.date_fin || '',
        nombreLeconsPrevu: cycle.nombre_lecons_prevu || null,
        lecons: leconsDuCycle,
        stats: {
          nbSeances: toutesSeances.length, nbVisees, nbReportees, nbEnRetard,
          progression: toutesSeances.length > 0 ? Math.round((nbVisees / toutesSeances.length) * 100) : 0,
        },
      });
    });

    return { groupe, totaux };
  };

  const chargerProgrammeEnseignantChoisi = async (enseignantUserId) => {
    setEnseignantChoisiProgression(enseignantUserId);
    if (!enseignantUserId) { setProgrammeProgressionCharge({}); return; }
    setChargementProgression(true);
    const { groupe } = await calculerProgrammeEtStatsEnseignant(enseignantUserId);
    setProgrammeProgressionCharge(groupe);
    setChargementProgression(false);
  };

  // [OPTIMISÉ] Version en requêtes groupées : au lieu d'appeler
  // calculerProgrammeEtStatsEnseignant() une fois par enseignant (donc
  // N enseignants × 4 requêtes séquentielles = très lent avec un gros
  // établissement), on récupère TOUT en 4 requêtes au total quel que soit
  // le nombre d'enseignants (programmes → cycles → leçons → séances, chacune
  // avec un .in(...) sur la liste complète des ids obtenus à l'étape d'avant),
  // puis on reconstruit les agrégats côté JavaScript.
  const chargerVueEnsembleProgression = async () => {
    if (!anneeActiveId || listeProfesseursEtablissement.length === 0) {
      setVueEnsembleProgression({ nbSeances: 0, nbVisees: 0, nbEnRetard: 0, progressionGlobale: 0, nbClassesCompletes: 0, nbClassesSuivies: 0, parClasseEnseignant: [] });
      return;
    }
    setChargementVueEnsemble(true);

    const idsEnseignants = listeProfesseursEtablissement.map(p => p.userId);
    const profParId = {};
    listeProfesseursEtablissement.forEach(p => { profParId[p.userId] = p; });

    const { data: programmesData } = await supabase
      .from('programmes_annuels').select('id, proprietaire_user_id')
      .in('proprietaire_user_id', idsEnseignants)
      .eq('annee_scolaire_id', anneeActiveId);

    const proprietaireParProgramme = {};
    (programmesData || []).forEach(p => { proprietaireParProgramme[p.id] = p.proprietaire_user_id; });
    const idsProgrammes = (programmesData || []).map(p => p.id);

    if (idsProgrammes.length === 0) {
      setVueEnsembleProgression({ nbSeances: 0, nbVisees: 0, nbEnRetard: 0, progressionGlobale: 0, nbClassesCompletes: 0, nbClassesSuivies: 0, parClasseEnseignant: [] });
      setChargementVueEnsemble(false);
      return;
    }

    const { data: cyclesData } = await supabase
      .from('cycles')
      .select('id, classe_nom, programme_annuel_id')
      .in('programme_annuel_id', idsProgrammes);
    const idsCycles = (cyclesData || []).map(c => c.id);

    const { data: leconsData } = idsCycles.length > 0
      ? await supabase.from('lecons').select('id, cycle_id').in('cycle_id', idsCycles)
      : { data: [] };
    const idsLecons = (leconsData || []).map(l => l.id);

    const { data: seancesData } = idsLecons.length > 0
      ? await supabase.from('seances').select('statut, date_prevue, lecon_id').in('lecon_id', idsLecons)
      : { data: [] };

    const aujourdHui = new Date().toISOString().slice(0, 10);
    const cycleParId = {};
    (cyclesData || []).forEach(c => { cycleParId[c.id] = c; });
    const leconParId = {};
    (leconsData || []).forEach(l => { leconParId[l.id] = l; });

    // Regroupe les séances par (enseignant, classe) directement, sans repasser
    // par la structure imbriquée cycles/leçons — on n'a besoin que des totaux ici.
    const statsParEnseignantClasse = {};
    (seancesData || []).forEach(sc => {
      const lecon = leconParId[sc.lecon_id];
      const cycle = lecon ? cycleParId[lecon.cycle_id] : null;
      if (!cycle) return;
      const enseignantId = proprietaireParProgramme[cycle.programme_annuel_id];
      if (!enseignantId) return;
      const classeNom = cycle.classe_nom || 'Sans classe';
      const cle = `${enseignantId}||${classeNom}`;
      if (!statsParEnseignantClasse[cle]) statsParEnseignantClasse[cle] = { enseignantId, classeNom, nbSeances: 0, nbVisees: 0, nbEnRetard: 0 };
      const s = statsParEnseignantClasse[cle];
      s.nbSeances += 1;
      if (sc.statut === 'VISEE') s.nbVisees += 1;
      if (['BROUILLON', 'PROGRAMMEE'].includes(sc.statut) && sc.date_prevue && sc.date_prevue <= aujourdHui) s.nbEnRetard += 1;
    });

    const totalEcole = { nbSeances: 0, nbVisees: 0, nbEnRetard: 0 };
    const parClasseEnseignant = [];
    Object.values(statsParEnseignantClasse).forEach(s => {
      const prof = profParId[s.enseignantId];
      if (!prof || s.nbSeances === 0) return;
      totalEcole.nbSeances += s.nbSeances;
      totalEcole.nbVisees += s.nbVisees;
      totalEcole.nbEnRetard += s.nbEnRetard;
      parClasseEnseignant.push({
        classe: s.classeNom, enseignant: prof.nomComplet, matiere: prof.matiere,
        nbSeances: s.nbSeances, nbVisees: s.nbVisees, nbEnRetard: s.nbEnRetard,
        progression: Math.round((s.nbVisees / s.nbSeances) * 100),
      });
    });

    const nbClassesCompletes = parClasseEnseignant.filter(c => c.progression === 100).length;

    setVueEnsembleProgression({
      nbSeances: totalEcole.nbSeances,
      nbVisees: totalEcole.nbVisees,
      nbEnRetard: totalEcole.nbEnRetard,
      progressionGlobale: totalEcole.nbSeances > 0 ? Math.round((totalEcole.nbVisees / totalEcole.nbSeances) * 100) : 0,
      nbClassesCompletes,
      nbClassesSuivies: parClasseEnseignant.length,
      parClasseEnseignant: parClasseEnseignant.sort((a, b) => a.classe.localeCompare(b.classe)),
    });
    setChargementVueEnsemble(false);
  };

  useEffect(() => {
    if (activeTab === 'progression' && anneeActiveId) chargerVueEnsembleProgression();
  }, [activeTab, anneeActiveId, listeProfesseursEtablissement.length]);

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

    const { error: erreurVisa } = await supabase
      .from('seances')
      .update({ statut: 'VISEE', visee_par_user_id: userId, visee_at: new Date().toISOString() })
      .eq('id', seanceAViser.id);

    if (erreurVisa) { showToast("⚠️ Erreur de visa : " + erreurVisa.message); return; }

    const { error: erreurArchive } = await supabase
      .from('bibliotheque_etablissement')
      .insert({
        etablissement_id: affiliationCenseur.etablissement_id,
        annee_scolaire_id: anneeActiveId,
        seance_origine_id: seanceAViser.id,
        auteur_user_id: userId,
        titre: seanceAViser.titre,
        contenu_snapshot_json: { matiere: prog.matiere, classe: classeKey, ...seanceAViser },
      });

    if (erreurArchive) { showToast("⚠️ Visa enregistré, mais erreur d'archivage : " + erreurArchive.message); }

    if (prog.enseignantUserId) {
      await envoyerNotification(
        prog.enseignantUserId, 'FICHE_VISEE',
        `✅ Votre séance "${seanceAViser.titre}" (${classeKey}) a été visée par le censeur`,
        'cycles', affiliationCenseur.etablissement_id
      );
    }

    showToast(`✅ Séance visée et archivée !`);
    chargerTout();
  };

  const viserLecon = async (leconId, enseignantUserId, leconTitre) => {
    const { error } = await supabase
      .from('lecons')
      .update({ statut_visa: 'VISEE', visee_par_user_id: userId, visee_at: new Date().toISOString() })
      .eq('id', leconId);
    if (error) { showToast("⚠️ Erreur de visa : " + error.message); return; }
    
    await envoyerNotification(
      enseignantUserId,
      'SUCCESS',
      `Votre fiche de leçon "${leconTitre}" a été visée par le censeur.`,
      'cycles',
      affiliationCenseur.etablissement_id
    );

    showToast("✅ Fiche de leçon visée !");
    chargerTout();
  };

  const retournerLecon = (leconId, enseignantUserId, leconTitre) => {
    setModalConfirmation({
      ouvert: true,
      titre: 'Retourner cette fiche de leçon ?',
      message: "L'enseignant devra la corriger avant de pouvoir la renvoyer. Une notification lui sera envoyée.",
      actionCallback: async () => {
        const { error } = await supabase
          .from('lecons')
          .update({ statut_visa: 'RETOURNEE', visee_par_user_id: userId, visee_at: new Date().toISOString() })
          .eq('id', leconId);
        if (error) { showToast("⚠️ Erreur : " + error.message); return; }
        
        await envoyerNotification(
          enseignantUserId,
          'ALERT',
          `⚠️ Votre fiche de leçon "${leconTitre}" a été retournée par le censeur pour corrections.`,
          'cycles',
          affiliationCenseur.etablissement_id
        );

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
  // VARIABLES DÉRIVÉES
  // =========================================================================
  const nombreClassesAutomatique = classesEtablissement.length;

  const fichesPedagogiquesEcole = useMemo(() => archiveEcole, [archiveEcole]);

  // Options de filtre générées dynamiquement depuis les fiches réellement
  // présentes — plus aucune option codée en dur qui ne correspond à rien.
  const classesArchiveDisponibles = useMemo(() => {
    return [...new Set(fichesPedagogiquesEcole.map(f => f.classe).filter(Boolean))].sort();
  }, [fichesPedagogiquesEcole]);
  const matieresArchiveDisponibles = useMemo(() => {
    return [...new Set(fichesPedagogiquesEcole.map(f => f.matiere).filter(Boolean))].sort();
  }, [fichesPedagogiquesEcole]);
  const anneesArchiveDisponibles = useMemo(() => {
    return [...new Set(fichesPedagogiquesEcole.map(f => f.anneeScolaire).filter(Boolean))].sort().reverse();
  }, [fichesPedagogiquesEcole]);

  const fichesFiltrees = useMemo(() => {
    const texte = filtreArchiveTexte.trim().toLowerCase();
    return fichesPedagogiquesEcole.filter(fiche => {
      const matchMat = filtreArchiveMatiere === 'TOUTES' || fiche.matiere === filtreArchiveMatiere;
      const matchCl = filtreArchiveClasse === 'TOUTES' || fiche.classe === filtreArchiveClasse;
      const matchAnnee = filtreArchiveAnnee === 'TOUTES' || fiche.anneeScolaire === filtreArchiveAnnee;
      const matchTexte = !texte || (fiche.titre || '').toLowerCase().includes(texte) || (fiche.enseignant || '').toLowerCase().includes(texte);
      return matchMat && matchCl && matchAnnee && matchTexte;
    });
  }, [fichesPedagogiquesEcole, filtreArchiveMatiere, filtreArchiveClasse, filtreArchiveAnnee, filtreArchiveTexte]);

  // Fiches archivées rangées par classe — un même établissement a souvent
  // plusieurs classes, ce groupement évite de tout mélanger dans une liste unique.
  const fichesParClasse = useMemo(() => {
    const groupes = {};
    fichesFiltrees.forEach(fiche => {
      const classe = fiche.classe || 'Sans classe';
      if (!groupes[classe]) groupes[classe] = [];
      groupes[classe].push(fiche);
    });
    return Object.entries(groupes).sort(([a], [b]) => a.localeCompare(b));
  }, [fichesFiltrees]);

  const nombreFichesTotalEnAttente = useMemo(() => {
    return Object.values(programmesClasses || {}).reduce((total, prog) =>
      total + (prog.cycles || []).reduce((sousTotal, cy) =>
        sousTotal + (cy.lecons || []).reduce((s, lc) =>
          s + (lc.seances || []).filter(sc => !sc.viseParCenseur).length, 0), 0), 0);
  }, [programmesClasses]);

  const apercuLotClasses = genererNomsLot();
  const apercuSecondCycle = genererNomsSecondCycle();
  // Ne propose que les séries pertinentes selon le type d'établissement
  // (défini par le chef à la création/édition de l'école) — un lycée
  // général ne voit pas F1-F4/G1-G3/H1-H2, et inversement.
  const seriesSecondCycleFiltrees = useMemo(() => {
    const type = ecoleConfigGlobale.typeEnseignement || 'GENERAL';
    if (type === 'MIXTE') return SERIES_SECOND_CYCLE;
    return SERIES_SECOND_CYCLE.filter(s => s.type === type);
  }, [ecoleConfigGlobale.typeEnseignement]);
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
            <button type="submit" className="bouton bouton-principal" style={{ marginTop: '6px' }} disabled={envoiDemandeRejoindreEnCours}>{envoiDemandeRejoindreEnCours ? 'Envoi...' : 'Envoyer la demande'}</button>
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
                <span style={{ fontSize: '12px', fontWeight: '900', color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', maxWidth: '100%' }}>
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255, 255, 255, 0.08)', padding: '6px 12px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.12)' }}>
            <span style={{ fontSize: '13px', fontWeight: '900', color: '#ffffff', letterSpacing: '0.5px' }}>E-cahier !</span>
            <span style={{ fontSize: '12px' }}>📖</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ position: 'relative' }} ref={notifCenseurRef}>
              <button onClick={() => setNotifCenseurOuvert(!notifCenseurOuvert)} style={styles.navDarkBtn}>
                <span>🔔</span>{(notificationsCenseur || []).length > 0 && <span style={styles.pastilleAlerte}>{(notificationsCenseur || []).length}</span>}
              </button>
              {notifCenseurOuvert && (
                <div style={{ ...styles.notificationDropdown, right: 0, left: 'auto' }}>
                  <div style={styles.dropdownHeader}>Notifications</div>
                  {(notificationsCenseur || []).length === 0 ? (
                    <p style={{ fontSize: '11px', color: '#94a3b8', padding: '8px', fontStyle: 'italic' }}>Aucune nouvelle notification.</p>
                  ) : (
                    (notificationsCenseur || []).map(n => (
                      <div key={n.id} onClick={() => marquerNotificationLue(n)} style={styles.notifItem}>
                        <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#334155' }}>{n.texte}</p><span style={{ fontSize: '10px', color: '#94a3b8' }}>{n.date}</span>
                      </div>
                    ))
                  )}
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
                  <button onClick={() => { setActiveTab('progression'); setMenuBurgerCenseurOuvert(false); }} className="bouton-option">📊 Programme & Progression</button>
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

      <style>{`
        .bouton {
          padding: 9px 17px;
          border-radius: 14px;
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

        {modalGererClasses.ouvert && (
          <div style={styles.fondModale}>
            <div style={{ ...styles.cardWide, width: '460px', maxHeight: '85vh', overflowY: 'auto' }}>
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

              <form onSubmit={ajouterAttributionEnseignant} style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
                <select value={formAjoutAttribution.classeId} onChange={(e) => setFormAjoutAttribution({ ...formAjoutAttribution, classeId: e.target.value, matiereIdsChoisies: [] })} style={styles.inputStyle} required>
                  <option value="">— Classe —</option>
                  {classesEtablissement.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                </select>
                {(() => {
                  const classeChoisie = classesEtablissement.find(c => c.id === formAjoutAttribution.classeId);
                  const matieresProposees = matieresPourClasse(classeChoisie ? [classeChoisie] : []);
                  return (
                    <div>
                      {matieresProposees.length === 0 ? (
                        <p style={{ fontSize: '11px', color: '#991b1b', margin: 0 }}>Aucune matière au catalogue ne correspond à cette classe.</p>
                      ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '160px', overflowY: 'auto' }}>
                          {matieresProposees.map(m => {
                            const estCochee = formAjoutAttribution.matiereIdsChoisies.includes(m.id);
                            return (
                              <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid #e2e8f0', padding: '5px 8px', borderRadius: '8px', backgroundColor: estCochee ? '#f0fdf4' : '#f8fafc', cursor: 'pointer', fontSize: '11px', fontWeight: '700', color: estCochee ? '#166534' : '#334155' }}>
                                <input
                                  type="checkbox"
                                  checked={estCochee}
                                  onChange={() => {
                                    const updated = estCochee ? formAjoutAttribution.matiereIdsChoisies.filter(id => id !== m.id) : [...formAjoutAttribution.matiereIdsChoisies, m.id];
                                    setFormAjoutAttribution({ ...formAjoutAttribution, matiereIdsChoisies: updated });
                                  }}
                                />
                                📚 {m.nom}
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()}
                <button type="submit" className="bouton bouton-principal" style={{ alignSelf: 'flex-start' }}>+ Ajouter</button>
              </form>
            </div>
          </div>
        )}

        {modalConfirmation.ouvert && (
          <div style={styles.fondModale}>
            <div style={{ ...styles.cardWide, width: '380px', textAlign: 'center', maxHeight: '85vh', overflowY: 'auto' }}>
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
            <div style={{ ...styles.cardWide, width: '420px', maxHeight: '85vh', overflowY: 'auto' }}>
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
            <div style={{ ...styles.cardWide, width: '400px', textAlign: 'center', maxHeight: '85vh', overflowY: 'auto' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#0f172a', fontSize: '18px', fontWeight: '800' }}>🚪 Déconnexion</h3>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>Voulez-vous vraiment vous déconnecter ?</p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                <button onClick={() => setModalDeconnexion(false)} className="bouton bouton-secondaire">Annuler</button>
                <button onClick={async () => { setModalDeconnexion(false); await supabase.auth.signOut(); window.location.reload(); }} className="bouton bouton-danger">Oui</button>
              </div>
            </div>
          </div>
        )}

        {modalSecurite && (
          <div style={styles.fondModale}>
            <div style={{ ...styles.cardWide, width: '460px', maxHeight: '85vh', overflowY: 'auto' }}>
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
                            +{nombreFichesEnAttente} fiche{nombreFichesEnAttente > 1 ? 's' : ''}
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
                                      <button onClick={() => retournerLecon(lc.id, prog.enseignantUserId, lc.titre)} className="bouton bouton-danger" style={{ padding: '6px 12px', fontSize: '12px' }}>↩️ Retourner</button>
                                      <button onClick={() => viserLecon(lc.id, prog.enseignantUserId, lc.titre)} className="bouton bouton-succes" style={{ padding: '6px 12px', fontSize: '12px' }}>✍️ Viser la leçon</button>
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
              <div style={{ flex: '2 1 220px' }}>
                <label style={styles.labelFiltre}>Recherche (titre de fiche ou enseignant)</label>
                <input type="text" placeholder="Ex : révisions, Kouassi..." value={filtreArchiveTexte} onChange={(e) => setFiltreArchiveTexte(e.target.value)} style={styles.inputStyle} />
              </div>
              <div style={{ flex: '1 1 160px' }}>
                <label style={styles.labelFiltre}>Année scolaire</label>
                <select value={filtreArchiveAnnee} onChange={(e) => setFiltreArchiveAnnee(e.target.value)} style={styles.inputStyle}>
                  <option value="TOUTES">Toutes</option>
                  {anneesArchiveDisponibles.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div style={{ flex: '1 1 160px' }}>
                <label style={styles.labelFiltre}>Classe</label>
                <select value={filtreArchiveClasse} onChange={(e) => setFiltreArchiveClasse(e.target.value)} style={styles.inputStyle}>
                  <option value="TOUTES">Toutes</option>
                  {classesArchiveDisponibles.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ flex: '1 1 160px' }}>
                <label style={styles.labelFiltre}>Matière</label>
                <select value={filtreArchiveMatiere} onChange={(e) => setFiltreArchiveMatiere(e.target.value)} style={styles.inputStyle}>
                  <option value="TOUTES">Toutes</option>
                  {matieresArchiveDisponibles.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>

            {fichesFiltrees.length === 0 ? (
              <p style={{ fontStyle: 'italic', color: '#64748b', textAlign: 'center', padding: '30px' }}>Aucune fiche archivée trouvée.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {fichesParClasse.map(([classe, fiches]) => {
                  const estOuverte = !!classesOuvertesArchive[classe];
                  return (
                    <div key={classe} style={{ border: '1px solid #cbd5e1', borderRadius: '12px', overflow: 'hidden' }}>
                      <button
                        onClick={() => toggleClasseArchive(classe)}
                        style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', backgroundColor: estOuverte ? '#e0f2fe' : '#f8fafc', border: 'none', cursor: 'pointer', outline: 'none' }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>🏫 {classe}</span>
                          <span style={{ backgroundColor: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: '700' }}>{fiches.length} fiche{fiches.length > 1 ? 's' : ''}</span>
                        </span>
                        <span style={{ fontSize: '16px', color: '#2563eb' }}>{estOuverte ? '▲' : '▼'}</span>
                      </button>

                      {estOuverte && (
                        <div style={{ padding: '14px 16px', backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {fiches.map((fiche, index) => (
                            <div key={index} style={styles.itemRow}>
                              <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                                  <span style={{ backgroundColor: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700' }}>{fiche.matiere || 'Matière'}</span>
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
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------------------------------------------ */}
        {/* ONGLET : PROGRAMME & PROGRESSION */}
        {/* ------------------------------------------------------------------------------------------------ */}
        {activeTab === 'progression' && (
          <div style={styles.cardWide}>
            <div style={{ marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 }}>📊 Programme & Progression</h2>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>Consultez le programme annuel de chaque enseignant et sa progression.</p>
            </div>

            {/* [NOUVEAU] Vue d'ensemble — chiffres globaux avant de choisir un
                enseignant précis. "Progression globale" se déplie pour montrer
                le détail classe par classe et enseignant par enseignant. */}
            {anneeActiveId && vueEnsembleProgression && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                  <button
                    onClick={() => setDetailProgressionOuvert(!detailProgressionOuvert)}
                    style={{ textAlign: 'left', cursor: 'pointer', border: '1px solid #bfdbfe', backgroundColor: '#eff6ff', borderRadius: '12px', padding: '14px 16px' }}
                  >
                    <p style={{ fontSize: '10px', fontWeight: '800', color: '#1e3a8a', textTransform: 'uppercase', margin: '0 0 4px 0' }}>Progression globale {detailProgressionOuvert ? '▲' : '▼'}</p>
                    <p style={{ fontSize: '22px', fontWeight: '900', color: '#1e3a8a', margin: 0 }}>{vueEnsembleProgression.progressionGlobale}%</p>
                  </button>
                  <div style={{ border: '1px solid #bbf7d0', backgroundColor: '#f0fdf4', borderRadius: '12px', padding: '14px 16px' }}>
                    <p style={{ fontSize: '10px', fontWeight: '800', color: '#166534', textTransform: 'uppercase', margin: '0 0 4px 0' }}>Classes complètes</p>
                    <p style={{ fontSize: '22px', fontWeight: '900', color: '#166534', margin: 0 }}>{vueEnsembleProgression.nbClassesCompletes}/{vueEnsembleProgression.nbClassesSuivies}</p>
                  </div>
                  <div style={{ border: '1px solid #fecaca', backgroundColor: '#fef2f2', borderRadius: '12px', padding: '14px 16px' }}>
                    <p style={{ fontSize: '10px', fontWeight: '800', color: '#991b1b', textTransform: 'uppercase', margin: '0 0 4px 0' }}>Séances en retard</p>
                    <p style={{ fontSize: '22px', fontWeight: '900', color: '#991b1b', margin: 0 }}>{vueEnsembleProgression.nbEnRetard}</p>
                  </div>
                </div>

                {detailProgressionOuvert && (
                  <div style={{ marginTop: '10px', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                    {vueEnsembleProgression.parClasseEnseignant.length === 0 ? (
                      <p style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic', padding: '14px' }}>Aucune donnée de progression pour l'instant.</p>
                    ) : (
                      vueEnsembleProgression.parClasseEnseignant.map((c, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', padding: '10px 14px', borderBottom: i < vueEnsembleProgression.parClasseEnseignant.length - 1 ? '1px solid #f1f5f9' : 'none', backgroundColor: '#fff', flexWrap: 'wrap' }}>
                          <div>
                            <strong style={{ fontSize: '13px', color: '#0f172a' }}>{c.classe}</strong>
                            <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '8px' }}>{c.enseignant} · {c.matiere}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '80px', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                              <div style={{ width: `${c.progression}%`, height: '100%', backgroundColor: c.progression === 100 ? '#16a34a' : c.progression >= 40 ? '#2563eb' : '#f59e0b' }}></div>
                            </div>
                            <span style={{ fontSize: '12px', fontWeight: '800', color: '#334155', minWidth: '32px', textAlign: 'right' }}>{c.progression}%</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
              <select value={enseignantChoisiProgression} onChange={(e) => chargerProgrammeEnseignantChoisi(e.target.value)} style={{ ...styles.inputStyle, flex: '1 1 240px', margin: 0 }}>
                <option value="">— Choisir un enseignant —</option>
                {listeProfesseursEtablissement.map(p => <option key={p.userId} value={p.userId}>{p.nomComplet}</option>)}
              </select>
            </div>

            {!enseignantChoisiProgression ? (
              <p style={{ fontStyle: 'italic', color: '#64748b', textAlign: 'center', padding: '30px' }}>Choisissez un enseignant pour consulter son programme annuel et sa progression.</p>
            ) : chargementProgression ? (
              <p style={{ fontStyle: 'italic', color: '#64748b', textAlign: 'center', padding: '30px' }}>Chargement...</p>
            ) : Object.keys(programmeProgressionCharge).length === 0 ? (
              <p style={{ fontStyle: 'italic', color: '#64748b', textAlign: 'center', padding: '30px' }}>Aucun programme trouvé pour cet enseignant sur l'année en cours.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {Object.entries(programmeProgressionCharge).map(([classeNom, prog]) => (
                  <div key={classeNom} style={{ border: '1px solid #cbd5e1', borderRadius: '12px', padding: '16px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', margin: '0 0 12px 0' }}>🏫 {classeNom}</h3>
                    {(prog.cycles || []).map(cycle => {
                      const estOuvert = !!cyclesOuvertsProgression[cycle.id];
                      return (
                        <div key={cycle.id} style={{ border: '1px solid #e2e8f0', borderRadius: '10px', marginBottom: '10px', overflow: 'hidden' }}>
                          <button onClick={() => toggleCycleProgression(cycle.id)} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', backgroundColor: estOuvert ? '#eff6ff' : '#f8fafc', border: 'none', cursor: 'pointer' }}>
                            <div style={{ textAlign: 'left' }}>
                              <strong style={{ fontSize: '13px', color: '#0f172a' }}>📁 {cycle.titre}</strong>
                              <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '8px' }}>{cycle.competence}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{ width: '70px', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                                  <div style={{ width: `${cycle.stats.progression}%`, height: '100%', backgroundColor: cycle.stats.progression >= 70 ? '#16a34a' : cycle.stats.progression >= 40 ? '#f59e0b' : '#ef4444' }}></div>
                                </div>
                                <span style={{ fontSize: '11px', fontWeight: '800', color: '#334155' }}>{cycle.stats.progression}%</span>
                              </div>
                              {cycle.stats.nbEnRetard > 0 && <span style={{ fontSize: '10px', backgroundColor: '#fee2e2', color: '#991b1b', padding: '2px 6px', borderRadius: '4px', fontWeight: '800' }}>{cycle.stats.nbEnRetard} en retard</span>}
                              {cycle.stats.nbReportees > 0 && <span style={{ fontSize: '10px', backgroundColor: '#ffedd5', color: '#9a3412', padding: '2px 6px', borderRadius: '4px', fontWeight: '800' }}>{cycle.stats.nbReportees} reportée(s)</span>}
                              <span style={{ fontSize: '13px' }}>{estOuvert ? '▲' : '▼'}</span>
                            </div>
                          </button>
                          {estOuvert && (
                            <div style={{ padding: '12px 14px', backgroundColor: '#fff' }}>
                              <p style={{ fontSize: '11px', color: '#64748b', margin: '0 0 10px 0' }}>
                                {cycle.stats.nbVisees} visée(s) / {cycle.stats.nbSeances} séance(s) au total
                                {cycle.nombreLeconsPrevu ? ` — ${cycle.nombreLeconsPrevu} leçon(s) prévue(s)` : ''}
                              </p>
                              {(cycle.lecons || []).map(lecon => (
                                <div key={lecon.id} style={{ marginBottom: '8px', paddingLeft: '8px', borderLeft: '2px solid #e2e8f0' }}>
                                  <p style={{ fontSize: '12px', fontWeight: '700', color: '#334155', margin: '0 0 4px 0' }}>📖 {lecon.titre}</p>
                                  {(lecon.seances || []).map(sc => (
                                    <div key={sc.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#475569', padding: '2px 0' }}>
                                      <span>Séance #{sc.numero} — {sc.titre} ({sc.date || 'sans date'})</span>
                                      <span style={{
                                        fontSize: '9px', fontWeight: '800', padding: '1px 6px', borderRadius: '4px',
                                        backgroundColor: sc.statut === 'VISEE' ? '#dcfce7' : sc.statut === 'REPORTEE' ? '#ffedd5' : sc.statut === 'ENVOYEE' || sc.statut === 'RECUE' ? '#e0f2fe' : '#f1f5f9',
                                        color: sc.statut === 'VISEE' ? '#166534' : sc.statut === 'REPORTEE' ? '#9a3412' : sc.statut === 'ENVOYEE' || sc.statut === 'RECUE' ? '#0369a1' : '#64748b',
                                      }}>{sc.statut}</span>
                                      {sc.motifReport && <span style={{ fontStyle: 'italic', color: '#9a3412' }}>({sc.motifReport})</span>}
                                    </div>
                                  ))}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
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
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>Créez les classes de l'année, attribuez-les directement, ou traitez les propositions des enseignants.</p>

            {/* [NOUVEAU] Résumé en un coup d'œil — évite de scroller jusqu'à
                "Vue par classe" pour savoir où en est la couverture. */}
            {classesEtablissement.length > 0 && (() => {
              const nbCompletes = classesEtablissement.filter(cl => evaluerCompletudeClasse(cl).complete).length;
              const nbTotal = classesEtablissement.length;
              const pourcentage = nbTotal > 0 ? Math.round((nbCompletes / nbTotal) * 100) : 0;
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 16px', marginBottom: '20px', flexWrap: 'wrap' }}>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', whiteSpace: 'nowrap' }}>
                    {nbCompletes}/{nbTotal} classe{nbTotal > 1 ? 's' : ''} avec au moins un enseignant
                  </div>
                  <div style={{ flex: 1, minWidth: '120px', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{ width: `${pourcentage}%`, height: '100%', backgroundColor: pourcentage === 100 ? '#16a34a' : pourcentage >= 50 ? '#2563eb' : '#f59e0b', borderRadius: '999px', transition: 'width 0.3s ease' }}></div>
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: '#334155' }}>{pourcentage}%</div>
                </div>
              );
            })()}

            {!anneeActiveId && (
              <p style={{ fontSize: '13px', color: '#991b1b', backgroundColor: '#fef2f2', padding: '12px', borderRadius: '10px', marginBottom: '20px' }}>⚠️ Aucune année scolaire active — le chef doit d'abord en ouvrir une.</p>
            )}

            <div style={{ backgroundColor: '#eff6ff', padding: '16px', borderRadius: '12px', border: '1px solid #bfdbfe', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#1e3a8a', marginBottom: '4px' }}>+ Créer les classes d'un niveau (premier cycle — 6ème, 5ème, 4ème, 3ème...)</h3>
              <p style={{ fontSize: '12px', color: '#475569', marginBottom: '12px' }}>Vous définissez la convention une seule fois — tout le monde utilise ensuite exactement le même nom, aucun enseignant ne peut l'écrire différemment.</p>

              <form onSubmit={creerClassesEnLot} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div style={{ flex: '1 1 140px' }}>
                  <label style={{ ...styles.label, fontSize: '10px' }}>Niveau</label>
                  <input type="text" placeholder="ex. 6ème" value={nouveauLotNiveau} onChange={(e) => setNouveauLotNiveau(e.target.value)} style={{ ...styles.inputStyle, margin: 0 }} required disabled={!anneeActiveId} />
                </div>
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
                <div style={{ flex: '1 1 120px' }}>
                  <label style={{ ...styles.label, fontSize: '10px' }}>Entre les deux</label>
                  <select value={nouveauLotSeparateur} onChange={(e) => setNouveauLotSeparateur(e.target.value)} style={{ ...styles.inputStyle, margin: 0 }} disabled={!anneeActiveId}>
                    <option value=" ">Espace (6ème A)</option>
                    <option value="">Rien (6èmeA)</option>
                    <option value=" - ">Tiret (6ème - A)</option>
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

            <div style={{ backgroundColor: '#f5f3ff', padding: '16px', borderRadius: '12px', border: '1px solid #ddd6fe', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#4c1d95', marginBottom: '4px' }}>+ Créer les classes du Second Cycle (Seconde, Première, Terminale)</h3>
              <p style={{ fontSize: '12px', color: '#475569', marginBottom: '4px' }}>Choisissez le niveau, puis les séries concernées, puis combien de classes pour chaque série — le nom se génère tout seul (ex. Seconde C1, Seconde C2...).</p>
              <p style={{ fontSize: '11px', color: '#7c3aed', fontWeight: '700', marginBottom: '12px' }}>
                Séries affichées selon le type d'établissement ({{ GENERAL: 'Général', TECHNIQUE: 'Technique', MIXTE: 'Général et Technique' }[ecoleConfigGlobale.typeEnseignement] || 'Général'}) — modifiable par le chef d'établissement dans le profil de l'école.
              </p>

              <form onSubmit={creerClassesSecondCycle}>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '14px' }}>
                  <div style={{ flex: '1 1 160px' }}>
                    <label style={{ ...styles.label, fontSize: '10px' }}>1. Niveau</label>
                    <select value={niveauSecondCycle} onChange={(e) => { setNiveauSecondCycle(e.target.value); setSeriesChoisiesSecondCycle({}); }} style={{ ...styles.inputStyle, margin: 0 }} disabled={!anneeActiveId}>
                      <option value="Seconde">Seconde</option>
                      <option value="Première">Première</option>
                      <option value="Terminale">Terminale</option>
                    </select>
                  </div>
                  <div style={{ flex: '1 1 160px' }}>
                    <label style={{ ...styles.label, fontSize: '10px' }}>Entre niveau et série</label>
                    <select value={separateurSecondCycle} onChange={(e) => setSeparateurSecondCycle(e.target.value)} style={{ ...styles.inputStyle, margin: 0 }} disabled={!anneeActiveId}>
                      <option value=" ">Espace (Seconde C1)</option>
                      <option value="">Rien (SecondeC1)</option>
                      <option value=" - ">Tiret (Seconde - C1)</option>
                    </select>
                  </div>
                </div>

                <label style={{ ...styles.label, fontSize: '10px', marginBottom: '8px', display: 'block' }}>2. Séries — cochez celles présentes en {niveauSecondCycle}, puis indiquez le nombre de classes</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
                  {seriesSecondCycleFiltrees.map(serie => {
                    const estCochee = seriesChoisiesSecondCycle[serie.code] !== undefined;
                    return (
                      <div key={serie.code} style={{ display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #e2e8f0', padding: '6px 10px', borderRadius: '8px', backgroundColor: estCochee ? '#f5f3ff' : '#f8fafc', flexWrap: 'wrap' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '13px', flex: '1 1 220px' }}>
                          <input
                            type="checkbox"
                            checked={estCochee}
                            onChange={() => setSeriesChoisiesSecondCycle(prev => {
                              const copie = { ...prev };
                              if (estCochee) delete copie[serie.code]; else copie[serie.code] = '1';
                              return copie;
                            })}
                            disabled={!anneeActiveId}
                          />
                          {serie.label}
                        </label>
                        {estCochee && (
                          <>
                            <label style={{ fontSize: '10px', color: '#64748b', fontWeight: '700' }}>Nombre de classes :</label>
                            <input
                              type="number" min="1" max="26" placeholder="ex. 3"
                              value={seriesChoisiesSecondCycle[serie.code]}
                              onChange={(e) => setSeriesChoisiesSecondCycle(prev => ({ ...prev, [serie.code]: e.target.value }))}
                              style={{ ...styles.inputStyle, flex: '1 1 90px', margin: 0 }}
                              disabled={!anneeActiveId}
                            />
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>

                <button type="submit" className="bouton bouton-principal" style={{ backgroundColor: '#7c3aed' }} disabled={!anneeActiveId}>3. Générer les classes</button>
              </form>

              {apercuSecondCycle.length > 0 && (
                <p style={{ fontSize: '11px', color: '#4c1d95', marginTop: '10px' }}>
                  Aperçu ({apercuSecondCycle.length}) : {apercuSecondCycle.join(', ')}
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
                <div style={{ marginTop: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                    <p style={{ fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', margin: 0 }}>Classes existantes — renommer ou supprimer</p>
                    {classesEtablissement.length > 6 && (
                      <input
                        type="text"
                        placeholder="🔍 Rechercher une classe..."
                        value={rechercheClasseTexte}
                        onChange={(e) => setRechercheClasseTexte(e.target.value)}
                        style={{ ...styles.inputStyle, margin: 0, maxWidth: '220px', fontSize: '12px', padding: '6px 10px' }}
                      />
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '240px', overflowY: 'auto' }}>
                    {classesEtablissement
                      .filter(c => c.nom.toLowerCase().includes(rechercheClasseTexte.trim().toLowerCase()))
                      .map(c => {
                      const enRenommage = classeEnRenommage.id === c.id;
                      return (
                        <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 10px', flexWrap: 'wrap' }}>
                          {enRenommage ? (
                            <form onSubmit={renommerClasse} style={{ display: 'flex', gap: '6px', flex: 1 }}>
                              <input type="text" value={classeEnRenommage.nom} onChange={(e) => setClasseEnRenommage(prev => ({ ...prev, nom: e.target.value }))} style={{ ...styles.inputStyle, margin: 0, flex: 1 }} autoFocus required />
                              <button type="submit" className="bouton bouton-succes" style={{ fontSize: '11px', padding: '6px 10px' }}>✓</button>
                              <button type="button" onClick={() => setClasseEnRenommage({ id: null, nom: '' })} className="bouton bouton-secondaire" style={{ fontSize: '11px', padding: '6px 10px' }}>✕</button>
                            </form>
                          ) : (
                            <>
                              <span style={{ fontSize: '13px', fontWeight: '700', flex: 1 }}>{c.nom}</span>
                              <button type="button" onClick={() => setClasseEnRenommage({ id: c.id, nom: c.nom })} className="bouton bouton-secondaire" style={{ fontSize: '11px', padding: '5px 9px' }}>✏️ Renommer</button>
                              <button type="button" onClick={() => supprimerClasse(c)} className="bouton bouton-danger" style={{ fontSize: '11px', padding: '5px 9px' }}>🗑️ Supprimer</button>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div style={{ backgroundColor: '#eff6ff', padding: '16px', borderRadius: '12px', border: '1px solid #bfdbfe', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#1e3a8a', marginBottom: '4px' }}>🎯 Attribuer une ou plusieurs classes à un enseignant</h3>
              <p style={{ fontSize: '12px', color: '#475569', marginBottom: '4px' }}>Cochez plusieurs matières pour un enseignant polyvalent. Pour donner à un même enseignant des matières différentes selon les classes (ex. Maths sur 6e A/B, Physique-Chimie sur 4e A), faites deux attributions séparées : cochez d'abord les classes et la matière du premier groupe, validez, puis recommencez pour le second groupe.</p>
              <p style={{ fontSize: '11px', color: '#166534', marginBottom: '12px', fontWeight: '700' }}>💡 Une fois les classes cochées, les matières déjà attribuées sur au moins une d'entre elles apparaissent grisées ci-dessous — pour changer l'enseignant d'une matière déjà couverte, utilisez plutôt "✏️ Modifier ses classes" depuis l'Annuaire Personnel.</p>
              <form onSubmit={attribuerClasseDirectement} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '10px', maxHeight: '160px', overflowY: 'auto' }}>
                  <p style={{ fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', margin: '0 0 8px 0' }}>1. Classes (plusieurs possibles)</p>
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
                              setFormAttribution({ ...formAttribution, classesIds: updated, matiereIdsChoisies: [] });
                            }}
                            disabled={!anneeActiveId}
                          />
                          {c.nom}
                        </label>
                      );
                    })}
                  </div>
                </div>

                <select value={formAttribution.enseignantId} onChange={(e) => setFormAttribution({ ...formAttribution, enseignantId: e.target.value, matiereIdsChoisies: [] })} style={{ ...styles.inputStyle, margin: 0 }} required disabled={!anneeActiveId}>
                  <option value="">— 2. Choisir un enseignant —</option>
                  {listeProfesseursEtablissement.map(p => <option key={p.userId} value={p.userId}>{p.nomComplet}</option>)}
                </select>

                {(() => {
                  const classesSelectionnees = classesEtablissement.filter(c => formAttribution.classesIds.includes(c.id));
                  const matieresProposees = matieresPourClasse(classesSelectionnees);

                  // [NOUVEAU] Pour chaque matière proposée, on vérifie si elle est
                  // déjà attribuée sur au moins une des classes cochées — dans ce
                  // cas la matière est grisée pour CETTE sélection de classes,
                  // afin d'éviter d'attribuer deux fois la même matière à la même
                  // classe par erreur. Les autres matières de la même classe
                  // restent librement sélectionnables.
                  const conflitsParMatiere = {};
                  matieresProposees.forEach(m => {
                    const conflits = [];
                    classesSelectionnees.forEach(classe => {
                      (enseignantsParClasse[classe.nom] || []).forEach(entree => {
                        if (entree.matiere === m.nom) conflits.push(`${classe.nom} : ${entree.enseignant}`);
                      });
                    });
                    if (conflits.length > 0) conflitsParMatiere[m.id] = conflits;
                  });

                  return (
                    <div style={{ backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '10px' }}>
                      <p style={{ fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', margin: '0 0 8px 0' }}>3. Matière(s) — plusieurs possibles</p>
                      {matieresProposees.length === 0 ? (
                        <p style={{ fontSize: '11px', color: '#991b1b', margin: 0 }}>Aucune matière au catalogue ne correspond au niveau/série de la sélection.</p>
                      ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {matieresProposees.map(m => {
                            const estCochee = formAttribution.matiereIdsChoisies.includes(m.id);
                            const conflits = conflitsParMatiere[m.id];
                            const dejaAttribuee = !!conflits;
                            return (
                              <label
                                key={m.id}
                                title={dejaAttribuee ? conflits.join(' | ') : ''}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid #e2e8f0', padding: '6px 10px', borderRadius: '8px',
                                  backgroundColor: dejaAttribuee ? '#f1f5f9' : (estCochee ? '#f0fdf4' : '#f8fafc'),
                                  cursor: dejaAttribuee ? 'not-allowed' : 'pointer',
                                  fontSize: '12px', fontWeight: '700',
                                  color: dejaAttribuee ? '#94a3b8' : (estCochee ? '#166534' : '#334155'),
                                  opacity: dejaAttribuee ? 0.7 : 1,
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={estCochee}
                                  onChange={() => {
                                    if (dejaAttribuee) return;
                                    const updated = estCochee ? formAttribution.matiereIdsChoisies.filter(id => id !== m.id) : [...formAttribution.matiereIdsChoisies, m.id];
                                    setFormAttribution({ ...formAttribution, matiereIdsChoisies: updated });
                                  }}
                                  disabled={!anneeActiveId || dejaAttribuee}
                                />
                                📚 {m.nom}
                                {dejaAttribuee && <span style={{ fontSize: '10px' }}>🔒</span>}
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()}

                <button type="submit" className="bouton bouton-principal" disabled={!anneeActiveId}>Attribuer</button>
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
                  const { complete: estComplete, matieresManquantes, grilleConnue } = evaluerCompletudeClasse(cl);
                  return (
                    <div key={cl.id} style={{ ...styles.itemRow, alignItems: 'flex-start', flexDirection: 'column', gap: '6px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '9px', height: '9px', borderRadius: '50%', backgroundColor: estComplete ? '#16a34a' : '#ef4444', flexShrink: 0 }} title={estComplete ? 'Classe complète' : 'Classe incomplète'}></span>
                        <strong style={{ fontSize: '13px', color: '#0f172a' }}>{cl.nom}</strong>
                        {!grilleConnue && (
                          <span style={{ fontSize: '9px', backgroundColor: '#fef3c7', color: '#92400e', padding: '1px 6px', borderRadius: '4px', fontWeight: '800' }} title="Niveau non renseigné ou non reconnu — on vérifie juste qu'au moins un enseignant est attribué.">Niveau inconnu</span>
                        )}
                      </span>
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
                      {grilleConnue && matieresManquantes.length > 0 && (
                        <p style={{ fontSize: '11px', color: '#c2410c', margin: 0 }}>
                          ⚠️ Manque : {matieresManquantes.join(', ')}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', margin: '28px 0 4px 0' }}>📖 Catalogue des matières</h3>
            <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px' }}>
              Ajoutez une nouvelle matière ou renommez-en une à tout moment — les programmes changent, rien n'est figé. Le niveau/série indiqué ci-dessous est juste une note pour vous repérer ; il ne bloque plus aucune attribution, vous pouvez proposer n'importe quelle matière à n'importe quel niveau. Ce catalogue est partagé entre tous les établissements.
            </p>

            <form onSubmit={ajouterMatiereAuCatalogue} style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
              <input type="text" placeholder="Nouvelle matière (ex. Informatique)" value={nouvelleMatiereNomCatalogue} onChange={(e) => setNouvelleMatiereNomCatalogue(e.target.value)} style={{ ...styles.inputStyle, margin: 0, flex: 1 }} required />
              <button type="submit" className="bouton bouton-principal" style={{ flexShrink: 0 }}>+ Ajouter</button>
            </form>

            {matieresDisponibles.length === 0 ? (
              <p style={{ fontStyle: 'italic', color: '#64748b', fontSize: '13px' }}>Aucune matière au catalogue pour l'instant.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {matieresDisponibles.map(m => {
                  const estOuverte = matiereProgrammeOuverte === m.id;
                  const enRenommage = matiereEnRenommage.id === m.id;
                  const niveauxDefinis = m.niveaux_applicables || [];
                  const seriesDefinies = m.series_applicables || [];
                  return (
                    <div key={m.id} style={{ border: '1px solid #e2e8f0', borderRadius: '10px', backgroundColor: '#f8fafc' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', flexWrap: 'wrap', gap: '8px' }}>
                        {enRenommage ? (
                          <form onSubmit={renommerMatiere} style={{ display: 'flex', gap: '6px', flex: 1 }}>
                            <input type="text" value={matiereEnRenommage.nom} onChange={(e) => setMatiereEnRenommage(prev => ({ ...prev, nom: e.target.value }))} style={{ ...styles.inputStyle, margin: 0, flex: 1 }} autoFocus required />
                            <button type="submit" className="bouton bouton-succes" style={{ fontSize: '11px', padding: '6px 10px' }}>✓</button>
                            <button type="button" onClick={() => setMatiereEnRenommage({ id: null, nom: '' })} className="bouton bouton-secondaire" style={{ fontSize: '11px', padding: '6px 10px' }}>✕</button>
                          </form>
                        ) : (
                          <>
                            <div>
                              <strong style={{ fontSize: '13px' }}>{m.nom}</strong>
                              <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0 0' }}>
                                {niveauxDefinis.length === 0 ? 'Note libre : aucun niveau précisé' : niveauxDefinis.join(', ')}
                                {seriesDefinies.length > 0 && ` — séries : ${seriesDefinies.join(', ')}`}
                              </p>
                            </div>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button type="button" onClick={() => setMatiereEnRenommage({ id: m.id, nom: m.nom })} className="bouton bouton-secondaire" style={{ fontSize: '11px', padding: '6px 10px' }}>✏️ Renommer</button>
                              <button type="button" onClick={() => estOuverte ? setMatiereProgrammeOuverte(null) : ouvrirProgrammeMatiere(m)} className="bouton bouton-secondaire" style={{ fontSize: '11px', padding: '6px 10px' }}>
                                {estOuverte ? 'Fermer' : '🏷️ Note niveau/série'}
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                      {estOuverte && (
                        <div style={{ padding: '0 12px 14px 12px' }}>
                          <label style={{ ...styles.label, fontSize: '10px' }}>Niveaux (vide = tous niveaux)</label>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                            {TOUS_NIVEAUX.map(niveau => {
                              const coche = brouillonProgrammeMatiere.niveaux.includes(niveau);
                              return (
                                <label key={niveau} style={{ display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #e2e8f0', padding: '4px 8px', borderRadius: '6px', backgroundColor: coche ? '#eff6ff' : '#fff', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>
                                  <input
                                    type="checkbox" checked={coche}
                                    onChange={() => setBrouillonProgrammeMatiere(prev => ({
                                      ...prev,
                                      niveaux: coche ? prev.niveaux.filter(n => n !== niveau) : [...prev.niveaux, niveau],
                                    }))}
                                  />
                                  {niveau}
                                </label>
                              );
                            })}
                          </div>
                          <label style={{ ...styles.label, fontSize: '10px' }}>Séries du second cycle (vide = toutes séries des niveaux cochés)</label>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                            {seriesSecondCycleFiltrees.map(serie => {
                              const coche = brouillonProgrammeMatiere.series.includes(serie.code);
                              return (
                                <label key={serie.code} style={{ display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #e2e8f0', padding: '4px 8px', borderRadius: '6px', backgroundColor: coche ? '#f5f3ff' : '#fff', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>
                                  <input
                                    type="checkbox" checked={coche}
                                    onChange={() => setBrouillonProgrammeMatiere(prev => ({
                                      ...prev,
                                      series: coche ? prev.series.filter(s => s !== serie.code) : [...prev.series, serie.code],
                                    }))}
                                  />
                                  {serie.code}
                                </label>
                              );
                            })}
                          </div>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button type="button" onClick={() => setMatiereProgrammeOuverte(null)} className="bouton bouton-secondaire" style={{ fontSize: '12px' }}>Annuler</button>
                            <button type="button" onClick={() => enregistrerProgrammeMatiere(m.id, brouillonProgrammeMatiere.niveaux, brouillonProgrammeMatiere.series)} className="bouton bouton-principal" style={{ fontSize: '12px' }}>Enregistrer</button>
                          </div>
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
                  const estCoche = profsSelectionnesRappel.includes(prof.userId);
                  return (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: estCoche ? '#eff6ff' : '#f8fafc', padding: '14px 16px', borderRadius: '12px', border: estCoche ? '1px solid #3b82f6' : '1px solid #e2e8f0', flexWrap: 'wrap', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <input 
                          type="checkbox" 
                          checked={estCoche} 
                          onChange={(e) => toggleSelectionRappel(prof.userId, e.target.checked)} 
                          style={{ width: '18px', height: '18px', cursor: 'pointer' }} 
                        />
                        <div>
                          <strong style={{ color: '#0f172a', fontSize: '14px' }}>{prof.nomComplet}</strong> ({prof.matiere})<br />
                          <small style={{ color: '#64748b', fontSize: '12px' }}>Classes : <strong>{prof.classes.join(', ') || 'N/A'}</strong> | Statut : <span style={{ color: '#d97706', fontWeight: '700' }}>En attente de fiches</span></small>
                        </div>
                      </div>
                      <button 
                        onClick={async () => {
                          const { error } = await envoyerNotification(
                            prof.userId,
                            'ALERT',
                            "Rappel Censeur : Vous avez des fiches pédagogiques en attente de soumission.",
                            'cycles',
                            affiliationCenseur.etablissement_id
                          );
                          if (error) {
                            showToast(`⚠️ Échec de l'envoi à ${prof.nomComplet} : ${error.message}`);
                          } else {
                            showToast(`✉️ Message de rappel envoyé à ${prof.nomComplet} !`);
                          }
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
              <div><label style={styles.label}>Effectif Classes</label><p style={{...styles.pInfo, color: '#16a34a'}}>{nombreClassesAutomatique} classe(s)</p></div>
              <div><label style={styles.label}>Effectif Enseignants</label><p style={{...styles.pInfo, color: '#16a34a'}}>{listeProfesseursEtablissement.length} enseignant(s)</p></div>
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
  container: { backgroundColor: '#f7f9fc', minHeight: '100vh', color: '#1e293b', paddingBottom: '40px', overflowX: 'hidden', boxSizing: 'border-box', width: '100%' },
  darkNavbar: { backgroundColor: '#0f172a', color: '#ffffff', padding: '12px 16px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', borderBottom: '1px solid #1e293b', position: 'sticky', top: '0', zIndex: 100, width: '100%', boxSizing: 'border-box' },
  mainContentBody: { padding: '20px 12px', maxWidth: '1200px', margin: '0 auto', boxSizing: 'border-box', width: '100%', overflowX: 'hidden' },
  cardWide: { backgroundColor: '#ffffff', padding: '24px', borderRadius: '20px', border: '1px solid #edf1f7', boxShadow: '0 2px 8px rgba(15,23,42,0.04), 0 12px 32px -16px rgba(15,23,42,0.06)', boxSizing: 'border-box', width: '100%', overflowX: 'hidden' },
  bibliothequeFilterBox: { display: 'flex', gap: '12px', backgroundColor: '#f7f9fc', padding: '16px', borderRadius: '16px', border: '1px solid #edf1f7', marginBottom: '20px', flexWrap: 'wrap', boxSizing: 'border-box' },
  itemRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f7f9fc', padding: '14px 16px', borderRadius: '14px', border: '1px solid #edf1f7', gap: '12px', boxSizing: 'border-box', width: '100%', flexWrap: 'wrap', transition: 'border-color 0.15s ease' },
  label: { display: 'block', fontSize: '11px', fontWeight: '800', color: '#475569', marginBottom: '6px', textTransform: 'uppercase' },
  labelFiltre: { display: 'block', fontSize: '11px', fontWeight: '800', color: '#475569', marginBottom: '6px', textTransform: 'uppercase' },
  inputStyle: { width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff', color: '#1e293b', outline: 'none', boxSizing: 'border-box' },
  pInfo: { margin: '4px 0 0 0', fontWeight: '800', fontSize: '15px', color: '#0f172a' },
  toastSuccess: { backgroundColor: '#0f172a', color: '#f8fafc', padding: '12px 16px', borderRadius: '12px', marginBottom: '16px', fontSize: '13px', fontWeight: '700', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', boxSizing: 'border-box' },
  navbarTeacherClickableBlock: { display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#1e293b', padding: '4px 8px', borderRadius: '10px', border: '1px solid #334155', cursor: 'pointer', textAlign: 'left', boxSizing: 'border-box', minWidth: 0, maxWidth: '48vw', flexShrink: 1 },
  avatarNavbarContainer: { width: '30px', height: '30px', borderRadius: '50%', overflow: 'hidden', backgroundColor: '#334155', display: 'flex', justifyContent: 'center', alignItems: 'center', border: '1px solid #475569', flexShrink: 0 },
  avatarNavbarImg: { width: '100%', height: '100%', objectFit: 'cover' },
  avatarNavbarPlaceholder: { fontSize: '14px', color: '#94a3b8' },
  navbarTeacherInfo: { display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' },
  notificationDropdown: { position: 'absolute', top: '42px', backgroundColor: '#ffffff', borderRadius: '16px', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.2)', border: '1px solid #edf1f7', width: '280px', maxWidth: '90vw', zIndex: 110, padding: '10px', boxSizing: 'border-box' },
  dropdownHeader: { padding: '6px 8px', fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', borderBottom: '1px solid #edf1f7', marginBottom: '6px' },
  notifItem: { backgroundColor: '#f7f9fc', padding: '10px', borderRadius: '10px', fontSize: '11px', marginBottom: '4px', border: '1px solid #edf1f7', cursor: 'pointer' },
  navDarkBtn: { backgroundColor: '#1e293b', color: '#f8fafc', border: '1px solid #334155', padding: '6px 10px', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', position: 'relative' },
  fondModale: { position: 'fixed', top: '0', left: '0', right: '0', bottom: '0', background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: '1000', padding: '12px', boxSizing: 'border-box' },
  pastilleAlerte: { backgroundColor: '#ef4444', color: 'white', padding: '1px 4px', borderRadius: '999px', fontSize: '9px', fontWeight: '800', position: 'absolute', top: '-4px', right: '-4px' },
  burgerBtn: { backgroundColor: '#2563eb', color: '#ffffff', border: 'none', padding: '6px 10px', borderRadius: '10px', fontSize: '14px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(37,99,235,0.3)' },
  burgerDropdown: { position: 'absolute', top: '42px', backgroundColor: '#ffffff', borderRadius: '16px', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.2)', border: '1px solid #edf1f7', width: '220px', maxWidth: '85vw', zIndex: 120, padding: '10px', display: 'flex', flexDirection: 'column', gap: '4px', boxSizing: 'border-box' },
  // [NOUVEAU] État vide engageant : icône + message + éventuel bouton d'action.
  emptyState: { textAlign: 'center', padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' },
  emptyStateIcon: { fontSize: '32px', opacity: 0.5 },
  emptyStateText: { fontSize: '13px', color: '#64748b', maxWidth: '320px', lineHeight: '1.5' },
};
