import React, { useState, useMemo, useRef, useEffect } from 'react';
import { supabase } from './AppRouter';

// =========================================================================
// DASHBOARD ENSEIGNANT — BRANCHÉ SUR SUPABASE (passe partielle, assumée)
// Mêmes noms de fonctions/variables que l'original : le JSX n'a pas eu
// besoin d'être modifié.
//
// RÉELLEMENT BRANCHÉ SUR SUPABASE :
//   - infosEnseignant (profil) → utilisateurs_profils
//   - affiliations (liste des établissements) → affiliations_etablissement
//   - programmesClasses (lecture) → seances/lecons/cycles/programmes_annuels
//   - gererValidationAssistant : branches 'cycle', 'lecon', 'seance' (PAS 'programme_annuel')
//   - soumettreAuCenseur : uniquement pour une séance (statut → ENVOYEE)
//
// RESTE VOLONTAIREMENT EN LOCAL POUR CETTE PASSE (localStorage, comme avant) :
//   - rapportsSeances, demandesDepart, demandePromotionCenseur,
//     propositionsCenseur, notifications, modeSansAffiliation (paiement),
//     classesSansAffiliation, executerDuplicationIntelligente,
//     sauvegarderEdition (modification d'un élément existant),
//     la branche 'programme_annuel'
//     du générateur, marquerLeconTerminee/marquerCycleTermine,
//     soumettreAuCenseur pour type 'cycle'/'lecon'/'programme'
//   → Ces actions modifient encore uniquement l'état local en mémoire :
//     elles fonctionnent pendant la session mais ne survivent pas à un
//     rechargement de page. À câbler dans une passe suivante.
//
// LIMITE ARCHITECTURALE À CONNAÎTRE : le "mode sans affiliation" (classes
// personnelles) n'a pas d'équivalent dans le schéma actuel — la table
// "classes" exige un établissement. Les séances créées en mode sans
// affiliation sont donc enregistrées avec classe_id = null (autorisé),
// ce qui fonctionne mais ne "range" pas la séance dans une classe réelle.
// =========================================================================

export default function EnseignantDashboard() {

  // =========================================================================
  // SESSION
  // =========================================================================
  const [chargementInitial, setChargementInitial] = useState(true);
  const [userId, setUserId] = useState(null);
  // Cache : etablissement_id (ou 'SANS_AFFILIATION') -> programme_annuel_id
  const programmesAnnuelsCache = useRef({});
  // Cache : "etablissementId|classeNom" -> classe_id réel (table classes)
  const classesIdCache = useRef({});

  // --- GESTION DES AFFILIATIONS MULTI-ÉTABLISSEMENTS & DEMANDES DE DÉPART ---
  const [affiliations, setAffiliations] = useState([]);

  const [demandesDepart, setDemandesDepart] = useState([]);

  const [modalDepart, setModalDepart] = useState({ ouvert: false, ecoleId: null, ecoleNom: '', motif: '' });
  const [modalProposerClasse, setModalProposerClasse] = useState({ ouvert: false, affiliation: null, classesDisponibles: [], matieresDisponibles: [], classeNom: '', matiereNom: '' });
  const [modalChoixEcoleProposerClasse, setModalChoixEcoleProposerClasse] = useState(false);
  const [demandesAttributionsEnvoyees, setDemandesAttributionsEnvoyees] = useState([]);

  const [modalConfirmation, setModalConfirmation] = useState({ ouvert: false, titre: '', message: '', actionCallback: null });

  const [modeSansAffiliation, setModeSansAffiliation] = useState(() => {
    return localStorage.getItem('app_enseignant_mode_sans_aff') === 'true';
  });
  useEffect(() => { localStorage.setItem('app_enseignant_mode_sans_aff', modeSansAffiliation); }, [modeSansAffiliation]);

  const [classesSansAffiliation, setClassesSansAffiliation] = useState(() => {
    try { return JSON.parse(localStorage.getItem('app_enseignant_classes_libres')) || ['Classe Autonome 1', 'Classe Autonome 2']; }
    catch { return ['Classe Autonome 1', 'Classe Autonome 2']; }
  });
  useEffect(() => { localStorage.setItem('app_enseignant_classes_libres', JSON.stringify(classesSansAffiliation)); }, [classesSansAffiliation]);

  const [nouvelleClasseLibre, setNouvelleClasseLibre] = useState('');

  const classesActivesValidees = useMemo(() => {
    let classes = [];
    affiliations.forEach(aff => {
      if (aff.statut === 'Validée' && Array.isArray(aff.classes)) {
        aff.classes.forEach(cl => { if (!classes.includes(cl)) classes.push(cl); });
      }
    });
    // Les classes personnelles (mode sans affiliation) s'AJOUTENT à celles
    // des établissements affiliés — elles ne les remplacent plus. Un
    // enseignant peut ainsi être affilié à une école ET gérer en parallèle
    // des classes personnelles pour une autre école qui n'utilise pas l'app.
    if (modeSansAffiliation) {
      (classesSansAffiliation || []).forEach(cl => { if (!classes.includes(cl)) classes.push(cl); });
    }
    return classes;
  }, [modeSansAffiliation, classesSansAffiliation, affiliations]);

  const [activeTab, setActiveTab] = useState('cycles');
  const [message, setMessage] = useState('');

  const [menuBurgerOuvert, setMenuBurgerOuvert] = useState(false);
  const menuBurgerRef = useRef(null);

  const [modalDeconnexion, setModalDeconnexion] = useState(false);
  const [modalSecurite, setModalSecurite] = useState(false);
  const [ancienMdp, setAncienMdp] = useState('');
  const [nouveauMdp, setNouveauMdp] = useState('');
  const [emailSaisiChangement, setEmailSaisiChangement] = useState('');

  const [rapportsSeances, setRapportsSeances] = useState(() => {
    try { return JSON.parse(localStorage.getItem('app_enseignant_rapports')) || []; }
    catch { return []; }
  });
  useEffect(() => { localStorage.setItem('app_enseignant_rapports', JSON.stringify(rapportsSeances)); }, [rapportsSeances]);

  const [modalRapport, setModalRapport] = useState({
    ouvert: false, seanceTitre: '', ecolesCibles: [], classesCibles: [], motifReport: '', nouvelleDatePrevue: '', contenuRapport: '', difficultes: ''
  });

  const [propositionsCenseur, setPropositionsCenseur] = useState(() => {
    try { return JSON.parse(localStorage.getItem('app_enseignant_propositions')) || []; }
    catch { return []; }
  });
  useEffect(() => { localStorage.setItem('app_enseignant_propositions', JSON.stringify(propositionsCenseur)); }, [propositionsCenseur]);

  const [modalPaiement, setModalPaiement] = useState(false);
  const [methodePaiement, setMethodePaiement] = useState('wave');

  // =========================================================================
  // NOTIFICATIONS (cloche) — même principe que Censeur/ChefEtablissement :
  // chargement des non lues dans chargerTout() + abonnement Realtime pour
  // une réception instantanée, sans recharger la page.
  // =========================================================================
  const [notifications, setNotifications] = useState([]);
  const [notifOuvert, setNotifOuvert] = useState(false);
  const notifRef = useRef(null);

  useEffect(() => {
    if (!userId) return;
    const canal = supabase
      .channel(`notifications-${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, (payload) => {
        const n = payload.new;
        setNotifications(prev => [{
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

  // Onglets réellement navigables sur ce dashboard — un lien reçu du
  // censeur/chef (ex. 'visa', 'classes', 'profil_ecole') ne correspond à
  // aucun de ces onglets ; dans ce cas on retombe simplement sur le
  // programme annuel plutôt que de naviguer vers un onglet inexistant.
  const ONGLETS_ENSEIGNANT = ['cycles', 'bibliotheque', 'affiliation', 'rapports'];

  const marquerNotificationLue = async (notif) => {
    if (notif.lienCible) setActiveTab(ONGLETS_ENSEIGNANT.includes(notif.lienCible) ? notif.lienCible : 'cycles');
    setNotifOuvert(false);
    await supabase.from('notifications').update({ lue_at: new Date().toISOString() }).eq('id', notif.id);
    setNotifications(prev => prev.filter(x => x.id !== notif.id));
  };

  // --- PROFIL (Supabase) ---
  const [infosEnseignant, setInfosEnseignant] = useState({
    civilite: 'M.', nom: '', prenoms: '', ville: '', matiere: '', matiereIds: [], photoProfil: '',
    etablissementSaisi: '', classesSelectionneesEnCours: [], emailSecurite: '', telephone: ''
  });
  const [matieresCatalogue, setMatieresCatalogue] = useState([]);

  const [modalProfilOuvert, setModalProfilOuvert] = useState(false);
  const [formProfil, setFormProfil] = useState({ ...infosEnseignant });
  const [profilOuvert, setProfilOuvert] = useState(false);
  const profilRef = useRef(null);

  const [demandePromotionCenseur, setDemandePromotionCenseur] = useState(() => {
    try { return JSON.parse(localStorage.getItem('app_enseignant_demande_promotion')) || null; }
    catch { return null; }
  });
  useEffect(() => { localStorage.setItem('app_enseignant_demande_promotion', JSON.stringify(demandePromotionCenseur)); }, [demandePromotionCenseur]);

  const [modalPromotion, setModalPromotion] = useState(false);
  const [formPromotion, setFormPromotion] = useState({ type: 'interne', ecoleCible: '' });

  const [champEnEditionPleinEcran, setChampEnEditionPleinEcran] = useState(null);
  const [champASupprimer, setChampASupprimer] = useState(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profilRef.current && !profilRef.current.contains(event.target)) setProfilOuvert(false);
      if (notifRef.current && !notifRef.current.contains(event.target)) setNotifOuvert(false);
      if (menuBurgerRef.current && !menuBurgerRef.current.contains(event.target)) setMenuBurgerOuvert(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [classeSelectionneeVue, setClasseSelectionneeVue] = useState(null);

  // --- BIBLIOTHÈQUE PERSONNELLE — vraie table Supabase (bibliotheque_personnelle).
  // Chaque ligne pointe vers une séance déjà créée (reference_id) ; le
  // contenu réel est relu depuis la table seances au chargement.
  const [bibliotheque, setBibliotheque] = useState([]);
  const [filtreBiblioTexte, setFiltreBiblioTexte] = useState('');

  const chargerBibliotheque = async (uid) => {
    const idUtilisateur = uid || userId;
    if (!idUtilisateur) return;
    const { data: lignes } = await supabase
      .from('bibliotheque_personnelle')
      .select('id, reference_id, titre, created_at')
      .eq('user_id', idUtilisateur)
      .eq('type_item', 'SEANCE')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    const idsSeances = (lignes || []).map(l => l.reference_id).filter(Boolean);
    let seancesParId = {};
    if (idsSeances.length > 0) {
      const { data: seancesData } = await supabase
        .from('seances')
        .select('id, contenu_json, date_prevue, classes(nom)')
        .in('id', idsSeances);
      (seancesData || []).forEach(s => { seancesParId[s.id] = s; });
    }

    setBibliotheque((lignes || []).map(l => {
      const seance = seancesParId[l.reference_id];
      return {
        id: l.id,
        referenceId: l.reference_id,
        nom: l.titre || seance?.contenu_json?.titre || 'Fiche',
        classeOrigine: seance?.classes?.nom || '',
        dateOrigine: seance?.date_prevue || '',
        contenuJson: seance?.contenu_json || {},
      };
    }));
  };

  const enregistrerDansBibliotheque = async (seanceId, titre) => {
    if (!userId) return;
    const { error } = await supabase.from('bibliotheque_personnelle').insert({
      user_id: userId, type_item: 'SEANCE', reference_id: seanceId, titre: titre || 'Fiche',
    });
    if (error) { showToast("⚠️ Erreur : " + error.message); return; }
    showToast("💾 Fiche enregistrée dans votre bibliothèque !");
    chargerBibliotheque(userId);
  };

  const [modalChoixBibliotheque, setModalChoixBibliotheque] = useState({ ouvert: false, cycleId: null, leconId: null });

  const utiliserFicheDeLaBibliotheque = (item) => {
    const { titre, lieu, ...autresChamps } = item.contenuJson || {};
    const { cycleId, leconId } = modalChoixBibliotheque;
    setModalChoixBibliotheque({ ouvert: false, cycleId: null, leconId: null });
    setModalAssistant(prev => ({
      ...prev,
      ouvert: true, niveauCible: 'seance',
      cycleIdCible: cycleId, leconIdCible: leconId,
      titreSeance: titre || item.nom, lieuSeance: lieu || '', valeursChamps: autresChamps,
      classesCiblesCycle: classeSelectionneeVue ? [classeSelectionneeVue] : [],
      datesParClasseCycle: {}, dateSeance: new Date().toISOString().split('T')[0],
    }));
  };

  // --- PROGRAMMES (Supabase en lecture, écriture partielle) ---
  const [programmesClasses, setProgrammesClasses] = useState({});

  const [champsPersonnalises, setChampsPersonnalises] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('app_enseignant_champs_perso')) || [
        { id: 'habilites', label: '🎯 Habilités', type: 'textarea' },
        { id: 'contenus', label: '📚 Contenus Pédagogiques', type: 'textarea' },
        { id: 'exercices', label: '⚡ Exercices d\'Application', type: 'textarea' },
        { id: 'evaluations', label: '📝 Modalités d\'Évaluation', type: 'textarea' }
      ];
    } catch {
      return [
        { id: 'habilites', label: '🎯 Habilités', type: 'textarea' },
        { id: 'contenus', label: '📚 Contenus Pédagogiques', type: 'textarea' },
        { id: 'exercices', label: '⚡ Exercices d\'Application', type: 'textarea' },
        { id: 'evaluations', label: '📝 Modalités d\'Évaluation', type: 'textarea' }
      ];
    }
  });
  useEffect(() => { localStorage.setItem('app_enseignant_champs_perso', JSON.stringify(champsPersonnalises)); }, [champsPersonnalises]);

  const [champsPersonnalisesLecon, setChampsPersonnalisesLecon] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('app_enseignant_champs_perso_lecon')) || [
        { id: 'habilites', label: '🎯 Habiletés (générales à la leçon)', type: 'textarea' },
        { id: 'contenus', label: '📚 Contenus Pédagogiques (généraux à la leçon)', type: 'textarea' },
      ];
    } catch {
      return [
        { id: 'habilites', label: '🎯 Habiletés (générales à la leçon)', type: 'textarea' },
        { id: 'contenus', label: '📚 Contenus Pédagogiques (généraux à la leçon)', type: 'textarea' },
      ];
    }
  });
  useEffect(() => { localStorage.setItem('app_enseignant_champs_perso_lecon', JSON.stringify(champsPersonnalisesLecon)); }, [champsPersonnalisesLecon]);

  const [cyclesOuverts, setCyclesOuverts] = useState({});
  const [leconsOuvertes, setLeconsOuvertes] = useState({});
  const toggleCycle = (cycleId) => setCyclesOuverts(prev => ({ ...prev, [cycleId]: !prev[cycleId] }));
  const toggleLecon = (leconId) => setLeconsOuvertes(prev => ({ ...prev, [leconId]: !prev[leconId] }));

  // En arrivant sur une classe qui a déjà un programme, ses cycles s'ouvrent
  // automatiquement (on voit tout de suite les leçons) — les leçons, elles,
  // restent repliées par défaut pour ne pas surcharger l'écran de séances.
  useEffect(() => {
    if (!classeSelectionneeVue) return;
    const cycles = programmesClasses?.[classeSelectionneeVue]?.cycles;
    if (!Array.isArray(cycles) || cycles.length === 0) return;
    setCyclesOuverts(prev => {
      const maj = { ...prev };
      cycles.forEach(c => { if (maj[c.id] === undefined) maj[c.id] = true; });
      return maj;
    });
  }, [classeSelectionneeVue, programmesClasses]);

  const [modalAssistant, setModalAssistant] = useState({
    ouvert: false, niveauCible: 'cycle', cycleIdCible: null, leconIdCible: null,
    titreProgramme: '', cyclesProgramme: [{ id: Date.now(), titre: 'Cycle 1', duree: '3 semaines', nbLecons: 2 }],
    titreCycle: '', competenceCycle: '',
    dateDebutCycle: new Date().toISOString().split('T')[0], dateFinCycle: new Date().toISOString().split('T')[0], nombreLeconsPrevu: '',
    titreLecon: '', nombreSeancesLecon: '3', valeursChampsLecon: {}, titreSeance: '',
    dateSeance: new Date().toISOString().split('T')[0], lieuSeance: '',
    valeursChamps: {}, fichiersMultimedias: [], ecolesCiblesCycle: [], classesCiblesCycle: [], datesParClasseCycle: {}, periodesParClasseCycle: {}, referenceLeconValeurs: {}, planLecons: [], planSeances: []
  });

  const [modalEdition, setModalEdition] = useState({ ouvert: false, type: null, cycleId: null, leconId: null, seanceId: null, donnees: {} });

  const [modalAffiliation, setModalAffiliation] = useState(false);
  const [nouvelleEcoleSaisie, setNouvelleEcoleSaisie] = useState('');
  const [nouvellesClassesSaisies, setNouvellesClassesSaisies] = useState('6ème A, 5ème A');

  const [modalDuplicationIntelligente, setModalDuplicationIntelligente] = useState({
    ouvert: false, itemSource: null, typeSource: '', classesCibles: [], datesParClasse: {}
  });

  const showToast = (msg) => { setMessage(msg); setTimeout(() => setMessage(''), 4000); };

  // =========================================================================
  // CHARGEMENT DEPUIS SUPABASE
  // =========================================================================
  const chargerTout = async () => {
    const { data: { user }, error: erreurUser } = await supabase.auth.getUser();
    if (erreurUser || !user) {
      showToast("⚠️ Session expirée, veuillez vous reconnecter.");
      setChargementInitial(false);
      return;
    }
    setUserId(user.id);
    chargerBibliotheque(user.id);

    const { data: profil } = await supabase
      .from('utilisateurs_profils').select('*').eq('user_id', user.id).single();

    const { data: catalogueMatieres } = await supabase.from('matieres').select('id, nom').order('nom', { ascending: true });
    setMatieresCatalogue(catalogueMatieres || []);

    const { data: mesMatieres } = await supabase
      .from('matieres_enseignant').select('matiere_id, matieres(nom)').eq('user_id', user.id);
    const matiereIdsActuels = (mesMatieres || []).map(m => m.matiere_id);
    const nomsMatieresActuelles = (mesMatieres || []).map(m => m.matieres?.nom).filter(Boolean);

    const { data: affiliationsData } = await supabase
      .from('affiliations_etablissement')
      .select('id, statut, etablissement_id, etablissements(nom)')
      .eq('user_id', user.id)
      .eq('role', 'ENSEIGNANT');

    const { data: attributions } = await supabase
      .from('attributions_classes')
      .select('etablissement_id, classes(nom)')
      .eq('enseignant_id', user.id);

    const mapStatut = (s) => (s === 'ACTIVE' ? 'Validée' : (s === 'EN_ATTENTE' || s === 'INVITATION') ? 'En attente' : s);

    const affiliationsFormatees = (affiliationsData || []).map(a => ({
      id: a.id,
      etablissementId: a.etablissement_id,
      ecole: a.etablissements?.nom || '',
      statut: mapStatut(a.statut),
      classes: (attributions || [])
        .filter(at => at.etablissement_id === a.etablissement_id)
        .map(at => at.classes?.nom)
        .filter(Boolean),
    }));
    setAffiliations(affiliationsFormatees);

    // Demandes de départ déjà soumises (pour ne pas en permettre une deuxième
    // pendant que la première est encore en attente)
    const { data: demandesDepartData } = await supabase
      .from('demandes_depart')
      .select('id, affiliation_id, motif, statut, created_at')
      .eq('user_id', user.id)
      .eq('statut', 'EN_ATTENTE');
    setDemandesDepart((demandesDepartData || []).map(d => ({
      id: d.id, ecoleId: d.affiliation_id, motif: d.motif,
      dateDemande: new Date(d.created_at).toLocaleDateString(), statut: 'En attente de validation',
    })));

    // Notifications non lues (cloche)
    const { data: notifs } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .is('lue_at', null)
      .order('created_at', { ascending: false });
    setNotifications((notifs || []).map(n => ({
      id: n.id,
      texte: n.payload_json?.message || '',
      date: new Date(n.created_at).toLocaleDateString(),
      lu: false,
      lienCible: n.payload_json?.lien_cible,
    })));

    if (profil) {
      const premiereEcole = affiliationsFormatees.find(a => a.statut === 'Validée')?.ecole || '';
      setInfosEnseignant(prev => ({
        ...prev, nom: profil.nom, prenoms: profil.prenom,
        emailSecurite: user.email, etablissementSaisi: premiereEcole, telephone: profil.telephone || '',
        matiere: nomsMatieresActuelles.join(', '), matiereIds: matiereIdsActuels,
      }));
      setFormProfil(prev => ({ ...prev, nom: profil.nom, prenoms: profil.prenom, etablissementSaisi: premiereEcole, telephone: profil.telephone || '', matiereIds: matiereIdsActuels }));
    }

    // Programme complet de l'enseignant : on part des CYCLES (visibles même
    // sans aucune leçon/séance encore remplie), puis on descend vers les
    // leçons, puis les séances — plus aucune dépendance à l'existence d'une
    // séance pour qu'un cycle ou une leçon reste visible après rechargement.
    const { data: programmesPossedes } = await supabase
      .from('programmes_annuels').select('id').eq('proprietaire_user_id', user.id);
    const idsProgrammes = (programmesPossedes || []).map(p => p.id);

    const groupe = {};

    if (idsProgrammes.length > 0) {
      const { data: cyclesData } = await supabase
        .from('cycles')
        .select('id, titre, statut, competence, date_debut, date_fin, nombre_lecons_prevu, plan_lecons, classe_nom, programme_annuel_id')
        .in('programme_annuel_id', idsProgrammes)
        .order('created_at', { ascending: true });

      const idsCycles = (cyclesData || []).map(c => c.id);
      const { data: leconsData } = idsCycles.length > 0
        ? await supabase.from('lecons')
            .select('id, titre, statut, statut_visa, contenu_json, plan_seances, cycle_id')
            .in('cycle_id', idsCycles)
            .order('created_at', { ascending: true })
        : { data: [] };

      const idsLecons = (leconsData || []).map(l => l.id);
      const { data: seancesData } = idsLecons.length > 0
        ? await supabase.from('seances')
            .select('id, date_prevue, statut, contenu_json, lecon_id')
            .in('lecon_id', idsLecons)
            .order('created_at', { ascending: true })
        : { data: [] };

      (cyclesData || []).forEach(cycle => {
        const classeNom = cycle.classe_nom || 'Sans classe';
        if (!groupe[classeNom]) groupe[classeNom] = { anneeScolaire: '', cycles: [] };

        const leconsDuCycle = (leconsData || []).filter(l => l.cycle_id === cycle.id).map(lecon => {
          const seancesDeLaLecon = (seancesData || []).filter(s => s.lecon_id === lecon.id).map((sc, i) => ({
            id: sc.id,
            numero: i + 1,
            titre: sc.contenu_json?.titre || 'Séance',
            date: sc.date_prevue,
            lieu: sc.contenu_json?.lieu || '',
            valeursChamps: sc.contenu_json || {},
            statut: 'En cours',
            soumisAuCenseur: sc.statut !== 'BROUILLON',
            statutReel: sc.statut,
            fichiersMultimedias: [],
          }));
          return {
            id: lecon.id, titre: lecon.titre, nombreSeancesPrevues: seancesDeLaLecon.length,
            contenuJson: lecon.contenu_json || {}, planSeances: lecon.plan_seances || [],
            statut: lecon.statut === 'TERMINEE' ? 'Terminée' : 'En cours',
            soumisAuCenseur: lecon.statut_visa && lecon.statut_visa !== 'NON_ENVOYEE',
            seances: seancesDeLaLecon,
          };
        });

        groupe[classeNom].cycles.push({
          id: cycle.id, titre: cycle.titre, competence: cycle.competence || '',
          dateDebut: cycle.date_debut || '', dateFin: cycle.date_fin || '',
          nombreLeconsPrevu: cycle.nombre_lecons_prevu || null, planLecons: cycle.plan_lecons || [],
          statut: cycle.statut === 'TERMINEE' ? 'Terminé' : 'En cours',
          soumisAuCenseur: false,
          lecons: leconsDuCycle,
        });
      });
    }

    setProgrammesClasses(groupe);

    setChargementInitial(false);
  };

  useEffect(() => { chargerTout(); }, []);

  // =========================================================================
  // HELPERS DE RÉSOLUTION DE CONTEXTE (établissement / année / classe réelle)
  // =========================================================================
  const resoudreContexteClasse = async (classeNom) => {
    // Une classe personnelle (créée en mode sans affiliation) n'est jamais
    // rattachée à un établissement réel — même si l'enseignant est par
    // ailleurs affilié à une autre école.
    const estClassePersonnelle = Array.isArray(classesSansAffiliation) && classesSansAffiliation.includes(classeNom);
    if (estClassePersonnelle) return { etablissementId: null, anneeScolaireId: null, classeId: null };

    const affiliation = affiliations.find(a => a.statut === 'Validée' && a.classes.includes(classeNom));
    if (!affiliation) return { etablissementId: null, anneeScolaireId: null, classeId: null };

    // On retrouve l'établissement_id réel depuis la table (le formatage local ne le garde pas)
    const { data: aff } = await supabase
      .from('affiliations_etablissement').select('etablissement_id').eq('id', affiliation.id).single();
    const etablissementId = aff?.etablissement_id;

    const { data: annee } = await supabase
      .from('annees_scolaires').select('id').eq('etablissement_id', etablissementId).eq('est_active', true).maybeSingle();

    const cleClasse = `${etablissementId}|${classeNom}`;
    let classeId = classesIdCache.current[cleClasse];
    if (!classeId) {
      const { data: classeRow } = await supabase
        .from('classes').select('id').eq('etablissement_id', etablissementId).eq('nom', classeNom).maybeSingle();
      classeId = classeRow?.id || null;
      classesIdCache.current[cleClasse] = classeId;
    }

    return { etablissementId, anneeScolaireId: annee?.id || null, classeId };
  };

  const getOuCreerProgrammeAnnuel = async (etablissementId, anneeScolaireId) => {
    const cle = etablissementId || 'SANS_AFFILIATION';
    if (programmesAnnuelsCache.current[cle]) return { id: programmesAnnuelsCache.current[cle], erreur: null };

    const affiliationCorrespondante = affiliations.find(a => a.statut === 'Validée'); // simplification : 1er établissement actif trouvé
    let affiliationId = null;
    if (etablissementId && affiliationCorrespondante) {
      const { data } = await supabase
        .from('affiliations_etablissement').select('id').eq('user_id', userId).eq('etablissement_id', etablissementId).eq('statut', 'ACTIVE').maybeSingle();
      affiliationId = data?.id || null;
    }

    const { data: existant } = await supabase
      .from('programmes_annuels').select('id')
      .eq('proprietaire_user_id', userId)
      .eq('affiliation_id', affiliationId)
      .maybeSingle();

    if (existant) {
      programmesAnnuelsCache.current[cle] = existant.id;
      return { id: existant.id, erreur: null };
    }

    const { data: nouveau, error } = await supabase
      .from('programmes_annuels')
      .insert({
        proprietaire_user_id: userId,
        affiliation_id: affiliationId,
        annee_scolaire_id: anneeScolaireId,
        titre: 'Programme principal',
      })
      .select('id').single();

    if (error) return { id: null, erreur: error.message };
    programmesAnnuelsCache.current[cle] = nouveau.id;
    return { id: nouveau.id, erreur: null };
  };

  // =========================================================================
  // LOGIQUE MÉTIER — Supabase pour les parties clés, reste en local sinon
  // =========================================================================
  const handleEnregistrerProfil = async (e) => {
    e.preventDefault();
    if (!userId) return;
    const { error } = await supabase
      .from('utilisateurs_profils').update({ nom: formProfil.nom, prenom: formProfil.prenoms, telephone: formProfil.telephone || null }).eq('user_id', userId);
    if (error) { showToast("⚠️ Erreur : " + error.message); return; }

    // Synchronise les matières déclarées : on remplace l'ensemble par la
    // sélection actuelle (simple et sûr — un enseignant en a rarement plus
    // de 2 ou 3, pas besoin d'un diff plus fin)
    const { error: erreurSuppression } = await supabase.from('matieres_enseignant').delete().eq('user_id', userId);
    if (erreurSuppression) { showToast("⚠️ Erreur matières : " + erreurSuppression.message); return; }
    if (formProfil.matiereIds.length > 0) {
      const { error: erreurInsertion } = await supabase
        .from('matieres_enseignant')
        .insert(formProfil.matiereIds.map(matiere_id => ({ user_id: userId, matiere_id })));
      if (erreurInsertion) { showToast("⚠️ Erreur matières : " + erreurInsertion.message); return; }
    }

    const nomsChoisis = matieresCatalogue.filter(m => formProfil.matiereIds.includes(m.id)).map(m => m.nom);
    setInfosEnseignant({ ...formProfil, matiere: nomsChoisis.join(', ') });
    setModalProfilOuvert(false);
    showToast("✅ Profil mis à jour avec succès !");
  };

  // Photo : reste locale (pas de colonne dédiée dans utilisateurs_profils pour l'instant)
  const handleChangerPhotoProfil = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setFormProfil(prev => ({ ...prev, photoProfil: reader.result }));
    reader.readAsDataURL(file);
  };

  // Reste local pour cette passe (pas de table dédiée à la promotion enseignant->censeur
  // distincte de demandes_changement_role — à unifier avec le dashboard censeur ensuite)
  const envoyerDemandePromotionCenseur = (e) => {
    e.preventDefault();
    setDemandePromotionCenseur({
      date: new Date().toLocaleDateString(), type: formPromotion.type,
      ecoleCible: formPromotion.type === 'interne' ? infosEnseignant.etablissementSaisi : formPromotion.ecoleCible,
      statut: 'En attente de validation'
    });
    setModalPromotion(false);
    showToast("🚀 Demande d'évolution vers le poste de Censeur envoyée au chef d'établissement !");
  };

  const soumettreDemandeDepart = async (e) => {
    e.preventDefault();
    if (!modalDepart.ecoleId || !userId) return;

    // On retrouve l'établissement réel de cette affiliation (le formatage
    // local ne garde que le nom de l'école, pas son id).
    const { data: aff } = await supabase
      .from('affiliations_etablissement')
      .select('etablissement_id, role')
      .eq('id', modalDepart.ecoleId)
      .single();

    if (!aff) { showToast("⚠️ Affiliation introuvable."); return; }

    const { error } = await supabase
      .from('demandes_depart')
      .insert({
        user_id: userId,
        etablissement_id: aff.etablissement_id,
        affiliation_id: modalDepart.ecoleId,
        role_demandeur: 'ENSEIGNANT',
        motif: modalDepart.motif || null,
      });

    if (error) {
      showToast("⚠️ Erreur : " + error.message);
      return;
    }

    const nouvelleDemande = {
      id: modalDepart.ecoleId, ecoleId: modalDepart.ecoleId, ecoleNom: modalDepart.ecoleNom, motif: modalDepart.motif,
      dateDemande: new Date().toLocaleDateString(), statut: 'En attente du visa du censeur ou du chef'
    };
    setDemandesDepart(prev => [nouvelleDemande, ...prev]);
    setModalDepart({ ouvert: false, ecoleId: null, ecoleNom: '', motif: '' });
    showToast("📤 Demande de départ transmise pour validation !");
  };

  // --- Proposer une classe (de l'année en cours) au censeur de cet établissement ---
  const ouvrirModalProposerClasse = async (affiliation) => {
    const { data: annee } = await supabase
      .from('annees_scolaires')
      .select('id')
      .eq('etablissement_id', affiliation.etablissementId)
      .eq('est_active', true)
      .maybeSingle();

    if (!annee) {
      showToast("⚠️ Aucune année scolaire active pour cet établissement.");
      return;
    }

    const { data: classesData } = await supabase
      .from('classes')
      .select('id, nom')
      .eq('etablissement_id', affiliation.etablissementId)
      .eq('annee_scolaire_id', annee.id)
      .is('deleted_at', null)
      .order('nom', { ascending: true });

    const { data: matieresData } = await supabase.from('matieres').select('id, nom').order('nom', { ascending: true });

    setModalProposerClasse({
      ouvert: true, affiliation: { ...affiliation, anneeScolaireId: annee.id },
      classesDisponibles: classesData || [], matieresDisponibles: matieresData || [],
      classeNom: '', matiereNom: '',
    });
  };

  const soumettreDemandeAttributionClasse = async (e) => {
    e.preventDefault();
    const { affiliation, classeNom, matiereNom } = modalProposerClasse;
    if (!classeNom.trim() || !matiereNom.trim() || !userId) {
      showToast("⚠️ Merci d'indiquer une classe et une matière.");
      return;
    }
    const matiere = modalProposerClasse.matieresDisponibles.find(m => m.nom.toLowerCase() === matiereNom.trim().toLowerCase());
    if (!matiere) {
      showToast("⚠️ Cette matière n'existe pas encore — demandez au censeur de la créer d'abord.");
      return;
    }

    // Si le nom tapé correspond exactement à une classe déjà créée par le
    // censeur, on la référence directement. Sinon, c'est une PROPOSITION de
    // nouvelle classe : le censeur pourra en corriger le nom avant validation.
    const classeExistante = modalProposerClasse.classesDisponibles.find(c => c.nom.toLowerCase() === classeNom.trim().toLowerCase());

    const { error } = await supabase.from('demandes_attributions_classes').insert({
      enseignant_id: userId,
      classe_id: classeExistante ? classeExistante.id : null,
      classe_nom_propose: classeExistante ? null : classeNom.trim(),
      etablissement_id: affiliation.etablissementId,
      annee_scolaire_id: affiliation.anneeScolaireId,
      matiere_id: matiere.id,
    });

    if (error) {
      if (error.code === '23505') showToast("⚠️ Une proposition identique existe déjà.");
      else showToast("⚠️ Erreur : " + error.message);
      return;
    }

    setModalProposerClasse({ ouvert: false, affiliation: null, classesDisponibles: [], matieresDisponibles: [], classeNom: '', matiereNom: '' });
    showToast("📤 Proposition envoyée au censeur/chef pour validation !");
  };

  const supprimerClasseLibre = (classeNom) => {
    setClassesSansAffiliation(prev => Array.isArray(prev) ? prev.filter(c => c !== classeNom) : []);
    showToast(`🗑️ Classe "${classeNom}" supprimée avec succès !`);
  };

  // Reste en local pour cette passe (voir note en tête de fichier)
  const executerDuplicationIntelligente = (e) => {
    e.preventDefault();
    const { itemSource, typeSource, classesCibles, datesParClasse } = modalDuplicationIntelligente;
    if (!Array.isArray(classesCibles) || classesCibles.length === 0) {
      showToast("⚠️ Veuillez sélectionner au moins une classe cible.");
      return;
    }
    classesCibles.forEach(classeCible => {
      const dateCible = (datesParClasse && datesParClasse[classeCible]) || new Date().toISOString().split('T')[0];
      const progCible = programmesClasses[classeCible] || { anneeScolaire: '2025-2026', cycles: [] };
      if (typeSource === 'cycle') {
        const nouveauCycle = {
          ...itemSource, id: Date.now() + Math.random(), titre: `${itemSource.titre} (Dupliqué - ${classeCible})`,
          lecons: Array.isArray(itemSource.lecons) ? itemSource.lecons.map(lc => ({
            ...lc, id: Date.now() + Math.random(),
            seances: Array.isArray(lc.seances) ? lc.seances.map(sc => ({ ...sc, id: Date.now() + Math.random(), date: dateCible })) : []
          })) : []
        };
        setProgrammesClasses(prev => ({ ...prev, [classeCible]: { ...progCible, cycles: [...(progCible.cycles || []), nouveauCycle] } }));
      } else if (typeSource === 'lecon') {
        const nouvelleLecon = {
          ...itemSource, id: Date.now() + Math.random(), titre: `${itemSource.titre} (Dupliqué - ${classeCible})`,
          seances: Array.isArray(itemSource.seances) ? itemSource.seances.map(sc => ({ ...sc, id: Date.now() + Math.random(), date: dateCible })) : []
        };
        setProgrammesClasses(prev => {
          let cyclesMaj = Array.isArray(progCible.cycles) ? [...progCible.cycles] : [];
          if (cyclesMaj.length === 0) {
            cyclesMaj.push({ id: Date.now(), titre: 'Cycle Général', competence: 'Compétence', dateDebut: '2026-01-01', dateFin: '2026-06-30', statut: 'En cours', lecons: [nouvelleLecon] });
          } else {
            cyclesMaj[0] = { ...cyclesMaj[0], lecons: [...(cyclesMaj[0].lecons || []), nouvelleLecon] };
          }
          return { ...prev, [classeCible]: { ...progCible, cycles: cyclesMaj } };
        });
      } else if (typeSource === 'seance') {
        const nouvelleSeance = { ...itemSource, id: Date.now() + Math.random(), titre: `${itemSource.titre} (Dupliqué - ${classeCible})`, date: dateCible };
        setProgrammesClasses(prev => {
          let cyclesMaj = Array.isArray(progCible.cycles) ? [...progCible.cycles] : [];
          if (cyclesMaj.length === 0) {
            cyclesMaj.push({ id: Date.now(), titre: 'Cycle Général', competence: 'Compétence', dateDebut: '2026-01-01', dateFin: '2026-06-30', statut: 'En cours',
              lecons: [{ id: Date.now() + 1, titre: 'Leçon Générale', nombreSeancesPrevues: 3, statut: 'En cours', seances: [nouvelleSeance] }] });
          } else {
            let premierCycle = { ...cyclesMaj[0] };
            let leconsMaj = Array.isArray(premierCycle.lecons) ? [...premierCycle.lecons] : [];
            if (leconsMaj.length === 0) {
              leconsMaj.push({ id: Date.now() + 1, titre: 'Leçon Générale', nombreSeancesPrevues: 3, statut: 'En cours', seances: [nouvelleSeance] });
            } else {
              let premiereLecon = { ...leconsMaj[0] };
              premiereLecon.seances = [...(premiereLecon.seances || []), nouvelleSeance];
              leconsMaj[0] = premiereLecon;
            }
            premierCycle.lecons = leconsMaj;
            cyclesMaj[0] = premierCycle;
          }
          return { ...prev, [classeCible]: { ...progCible, cycles: cyclesMaj } };
        });
      }
    });
    showToast("✨ Duplication intelligente effectuée avec succès !");
    setModalDuplicationIntelligente({ ouvert: false, itemSource: null, typeSource: '', classesCibles: [], datesParClasse: {} });
  };

  const soumettreRapportSeance = (e) => {
    e.preventDefault();
    if (!modalRapport.seanceTitre || !Array.isArray(modalRapport.classesCibles) || modalRapport.classesCibles.length === 0) {
      showToast("⚠️ Veuillez renseigner le titre et sélectionner au moins une classe.");
      return;
    }
    const nouveauRapport = { id: Date.now(), date: new Date().toLocaleDateString(), ...modalRapport, enseignant: `${infosEnseignant.civilite} ${infosEnseignant.nom} ${infosEnseignant.prenoms}` };
    setRapportsSeances(prev => [nouveauRapport, ...(Array.isArray(prev) ? prev : [])]);
    setModalRapport({ ouvert: false, seanceTitre: '', ecolesCibles: [], classesCibles: [], motifReport: '', nouvelleDatePrevue: '', contenuRapport: '', difficultes: '' });
    showToast("📤 Rapport de séance et compte rendu transmis au censeur avec succès !");
  };

  const initialiserProgrammeClasse = (classe) => {
    if (programmesClasses[classe]) return;
    setProgrammesClasses(prev => ({ ...(prev || {}), [classe]: { anneeScolaire: '2025-2026', cycles: [] } }));
  };

  // =========================================================================
  // ASSISTANT DE CRÉATION — Supabase pour 'cycle'/'lecon'/'seance', local pour 'programme_annuel'
  // =========================================================================
  const gererValidationAssistant = async (e) => {
    e.preventDefault();
    const { niveauCible, cycleIdCible, leconIdCible, titreCycle, competenceCycle, dateDebutCycle, dateFinCycle, nombreLeconsPrevu, titreLecon, nombreSeancesLecon,
      titreSeance, dateSeance, lieuSeance, valeursChamps, classesCiblesCycle, datesParClasseCycle, cyclesProgramme, titreProgramme } = modalAssistant;

    // --- Branche PROGRAMME ANNUEL COMPLET : vraie création Supabase ---
    // Le professeur trace d'abord le squelette de son année (une suite de
    // cycles, juste titre + compétence + nombre de leçons prévu). Chaque
    // cycle devient un vrai cycle en base pour chaque classe cible — les
    // leçons/séances se rempliront ensuite au fil de l'année, cycle par cycle.
    if (niveauCible === 'programme_annuel') {
      if (!Array.isArray(classesCiblesCycle) || classesCiblesCycle.length === 0) {
        showToast("⚠️ Veuillez sélectionner au moins une classe cible pour ce programme.");
        return;
      }
      const listeCycles = Array.isArray(cyclesProgramme) ? cyclesProgramme : [];
      if (listeCycles.length === 0) {
        showToast("⚠️ Ajoutez au moins un cycle avec un titre.");
        return;
      }

      let compteurCrees = 0;
      const echecs = [];
      for (const classeCible of classesCiblesCycle) {
        const { etablissementId, anneeScolaireId } = await resoudreContexteClasse(classeCible);
        const { id: programmeAnnuelId, erreur: erreurProgramme } = await getOuCreerProgrammeAnnuel(etablissementId, anneeScolaireId);
        if (!programmeAnnuelId) { echecs.push(`${classeCible} (${erreurProgramme || 'établissement introuvable — cette classe est-elle bien attribuée par le censeur ?'})`); continue; }

        for (const cp of listeCycles) {
          const numeroCycle = (programmesClasses[classeCible]?.cycles?.length || 0) + 1;
          const { data: nouveauCycle, error } = await supabase
            .from('cycles').insert({
              programme_annuel_id: programmeAnnuelId, titre: `Cycle ${numeroCycle}`, statut: 'EN_COURS',
              competence: cp.competence || null,
              date_debut: cp.dateDebut || null,
              date_fin: cp.dateFin || null,
              nombre_lecons_prevu: cp.nbLecons ? parseInt(cp.nbLecons, 10) : null,
              classe_nom: classeCible,
            }).select().single();
          if (error) { echecs.push(`${classeCible} (${error.message})`); continue; }

          compteurCrees++;
          if (!programmesClasses[classeCible]) initialiserProgrammeClasse(classeCible);
          setProgrammesClasses(prev => {
            const progCible = prev[classeCible] || { anneeScolaire: '', cycles: [] };
            const cycleLocal = { id: nouveauCycle.id, titre: nouveauCycle.titre, competence: nouveauCycle.competence || '', dateDebut: nouveauCycle.date_debut || '', dateFin: nouveauCycle.date_fin || '', nombreLeconsPrevu: nouveauCycle.nombre_lecons_prevu || null, planLecons: [], statut: 'En cours', soumisAuCenseur: false, lecons: [] };
            return { ...prev, [classeCible]: { ...progCible, cycles: [...(progCible.cycles || []), cycleLocal] } };
          });
        }
      }

      if (compteurCrees === 0) {
        showToast(`❌ Aucun cycle créé. Échec : ${echecs.join(' | ')}`);
      } else if (echecs.length > 0) {
        showToast(`✨ ${compteurCrees} cycle(s) créé(s). ⚠️ Échec pour : ${echecs.join(' | ')}`);
      } else {
        showToast(`✨ Programme annuel créé : ${compteurCrees} cycle(s) au total !`);
      }
      setModalAssistant({ ...modalAssistant, ouvert: false });
      return;
    }

    // --- Branche CYCLE : vraie création Supabase, sûre multi-établissements ---
    // Chaque classe cochée reçoit désormais SON PROPRE cycle en base, avec sa
    // propre période — même au sein d'un même établissement, deux classes
    // n'ont pas forcément cours les mêmes jours, la période peut varier.
    if (niveauCible === 'cycle') {
      const ciblesCycle = Array.isArray(classesCiblesCycle) && classesCiblesCycle.length > 0
        ? classesCiblesCycle : (classeSelectionneeVue ? [classeSelectionneeVue] : []);
      if (ciblesCycle.length === 0) {
        showToast("⚠️ Veuillez sélectionner au moins une classe cible pour ce cycle.");
        return;
      }

      const etablissementsConcernes = new Set();
      let compteurCrees = 0;
      const echecs = [];

      for (const classeCible of ciblesCycle) {
        const { etablissementId, anneeScolaireId } = await resoudreContexteClasse(classeCible);
        const { id: programmeAnnuelId, erreur: erreurProgramme } = await getOuCreerProgrammeAnnuel(etablissementId, anneeScolaireId);
        if (!programmeAnnuelId) { echecs.push(`${classeCible} (${erreurProgramme || 'établissement introuvable — cette classe est-elle bien attribuée par le censeur ?'})`); continue; }
        etablissementsConcernes.add(etablissementId || 'SANS_AFFILIATION');

        const periode = (modalAssistant.periodesParClasseCycle && modalAssistant.periodesParClasseCycle[classeCible]) || {};
        const numeroCycle = (programmesClasses[classeCible]?.cycles?.length || 0) + 1;

        const { data: nouveauCycle, error } = await supabase
          .from('cycles').insert({
            programme_annuel_id: programmeAnnuelId, titre: `Cycle ${numeroCycle}`, statut: 'EN_COURS',
            competence: competenceCycle || null,
            date_debut: periode.debut || dateDebutCycle || null,
            date_fin: periode.fin || dateFinCycle || null,
            nombre_lecons_prevu: nombreLeconsPrevu ? parseInt(nombreLeconsPrevu, 10) : null,
            plan_lecons: Array.isArray(modalAssistant.planLecons) ? modalAssistant.planLecons : [],
            classe_nom: classeCible,
          }).select().single();
        if (error) { echecs.push(`${classeCible} (${error.message})`); continue; }

        compteurCrees++;
        if (!programmesClasses[classeCible]) initialiserProgrammeClasse(classeCible);
        setProgrammesClasses(prev => {
          const progCible = prev[classeCible] || { anneeScolaire: '', cycles: [] };
          const cycleLocal = { id: nouveauCycle.id, titre: nouveauCycle.titre, competence: nouveauCycle.competence || '', dateDebut: nouveauCycle.date_debut || '', dateFin: nouveauCycle.date_fin || '', nombreLeconsPrevu: nouveauCycle.nombre_lecons_prevu || null, planLecons: nouveauCycle.plan_lecons || [], statut: 'En cours', soumisAuCenseur: false, lecons: [] };
          return { ...prev, [classeCible]: { ...progCible, cycles: [...(progCible.cycles || []), cycleLocal] } };
        });
      }

      const nbEtablissements = etablissementsConcernes.size;
      if (compteurCrees === 0) {
        showToast(`❌ Aucun cycle créé. Échec : ${echecs.join(' | ')}`);
      } else if (echecs.length > 0) {
        showToast(`✨ Cycle créé pour ${compteurCrees} classe(s). ⚠️ Échec pour : ${echecs.join(' | ')}`);
      } else {
        showToast(`✨ Cycle créé pour ${compteurCrees} classe(s) (${nbEtablissements} établissement${nbEtablissements > 1 ? 's' : ''} concerné${nbEtablissements > 1 ? 's' : ''}) !`);
      }
    }

    // --- Branche LEÇON : vraie création Supabase, multi-classes ---
    // La liaison entre établissements se fait par titre de cycle (aucun
    // identifiant technique commun n'existe entre deux bases d'écoles
    // différentes) — seules les classes ayant déjà un cycle du même titre
    // reçoivent la nouvelle leçon.
    else if (niveauCible === 'lecon') {
      const ciblesLecon = Array.isArray(classesCiblesCycle) && classesCiblesCycle.length > 0
        ? classesCiblesCycle : (classeSelectionneeVue ? [classeSelectionneeVue] : []);
      if (ciblesLecon.length === 0 || !classeSelectionneeVue) return;

      const cycleReference = (programmesClasses[classeSelectionneeVue]?.cycles || []).find(c => c.id === cycleIdCible);
      if (!cycleReference) { showToast("⚠️ Cycle introuvable."); return; }

      let compteurCreees = 0;
      for (const classeCible of ciblesLecon) {
        const cycleCorrespondant = (programmesClasses[classeCible]?.cycles || []).find(c => c.titre === cycleReference.titre);
        if (!cycleCorrespondant) {
          showToast(`⚠️ "${classeCible}" n'a pas de cycle "${cycleReference.titre}" — ignorée.`);
          continue;
        }

        const { data: nouvelleLecon, error } = await supabase
          .from('lecons').insert({
            cycle_id: cycleCorrespondant.id, titre: titreLecon || 'Nouvelle Leçon', statut: 'EN_COURS',
            contenu_json: modalAssistant.valeursChampsLecon || {},
            plan_seances: Array.isArray(modalAssistant.planSeances) ? modalAssistant.planSeances : [],
          }).select().single();
        if (error) { showToast(`⚠️ Erreur pour ${classeCible} : ` + error.message); continue; }

        compteurCreees++;
        setProgrammesClasses(prev => {
          const progClasse = prev[classeCible];
          const cyclesMaj = (progClasse?.cycles || []).map(c => c.id !== cycleCorrespondant.id ? c : {
            ...c, lecons: [...(c.lecons || []), {
              id: nouvelleLecon.id, titre: nouvelleLecon.titre, nombreSeancesPrevues: parseInt(nombreSeancesLecon) || 3,
              contenuJson: nouvelleLecon.contenu_json || {},
              planSeances: nouvelleLecon.plan_seances || [],
              statut: 'En cours', soumisAuCenseur: false, seances: [],
            }]
          });
          return { ...prev, [classeCible]: { ...progClasse, cycles: cyclesMaj } };
        });
      }
      showToast(`✨ Leçon créée pour ${compteurCreees} classe(s) !`);
    }

    // --- Branche SÉANCE : vraie création Supabase, multi-classes + une date
    // propre à chaque classe (même logique de liaison par titre que ci-dessus) ---
    else if (niveauCible === 'seance') {
      const ciblesSeance = Array.isArray(classesCiblesCycle) && classesCiblesCycle.length > 0
        ? classesCiblesCycle : (classeSelectionneeVue ? [classeSelectionneeVue] : []);
      if (ciblesSeance.length === 0 || !classeSelectionneeVue) return;

      const cycleReference = (programmesClasses[classeSelectionneeVue]?.cycles || []).find(c => c.id === cycleIdCible);
      const leconReference = cycleReference?.lecons?.find(l => l.id === leconIdCible);
      if (!cycleReference || !leconReference) { showToast("⚠️ Leçon introuvable."); return; }

      let compteurCreees = 0;
      for (const classeCible of ciblesSeance) {
        const cycleCorrespondant = (programmesClasses[classeCible]?.cycles || []).find(c => c.titre === cycleReference.titre);
        const leconCorrespondante = cycleCorrespondant?.lecons?.find(l => l.titre === leconReference.titre);
        if (!leconCorrespondante) {
          showToast(`⚠️ "${classeCible}" n'a pas la leçon "${leconReference.titre}" — ignorée.`);
          continue;
        }

        const { classeId } = await resoudreContexteClasse(classeCible);
        const dateCiblee = (datesParClasseCycle && datesParClasseCycle[classeCible]) || dateSeance || null;

        const { data: nouvelleSeance, error } = await supabase
          .from('seances')
          .insert({
            lecon_id: leconCorrespondante.id,
            classe_id: classeId,
            date_prevue: dateCiblee,
            contenu_json: { titre: titreSeance || 'Séance pédagogique', lieu: lieuSeance || '', ...(valeursChamps || {}) },
            statut: 'BROUILLON',
          })
          .select().single();
        if (error) { showToast(`⚠️ Erreur pour ${classeCible} : ` + error.message); continue; }

        compteurCreees++;
        setProgrammesClasses(prev => {
          const progClasse = prev[classeCible];
          const cyclesMaj = (progClasse?.cycles || []).map(c => c.id !== cycleCorrespondant.id ? c : {
            ...c,
            lecons: (c.lecons || []).map(l => l.id !== leconCorrespondante.id ? l : {
              ...l,
              seances: [...(l.seances || []), {
                id: nouvelleSeance.id, numero: (l.seances || []).length + 1, titre: titreSeance || 'Séance pédagogique',
                date: dateCiblee, lieu: lieuSeance, valeursChamps: valeursChamps || {}, fichiersMultimedias: [], statut: 'En cours', soumisAuCenseur: false,
              }]
            })
          });
          return { ...prev, [classeCible]: { ...progClasse, cycles: cyclesMaj } };
        });
      }
      showToast(`✨ Séance créée pour ${compteurCreees} classe(s), chacune avec sa propre date !`);
    }

    setModalAssistant({
      ouvert: false, niveauCible: 'programme', cycleIdCible: null, leconIdCible: null,
      titreCycle: '', competenceCycle: '', dateDebutCycle: '', dateFinCycle: '', nombreLeconsPrevu: '',
      titreLecon: '', nombreSeancesLecon: '3', valeursChampsLecon: {}, titreSeance: '',
      dateSeance: new Date().toISOString().split('T')[0], lieuSeance: '',
      valeursChamps: {}, fichiersMultimedias: [], ecolesCiblesCycle: [], classesCiblesCycle: [], datesParClasseCycle: {}, periodesParClasseCycle: {}, referenceLeconValeurs: {}, planLecons: [], planSeances: [],
      titreProgramme: '', cyclesProgramme: [{ id: Date.now(), titre: 'Cycle 1', duree: '3 semaines', nbLecons: 2 }]
    });
  };

  // --- Envoi au censeur : vraie mise à jour Supabase pour une séance, local sinon ---
  const soumettreAuCenseur = async (type, cycleId, leconId = null, seanceId = null) => {
    const prog = programmesClasses[classeSelectionneeVue];
    if (!prog || !Array.isArray(prog.cycles)) return;

    if (type === 'seance' && seanceId) {
      // Retrouve la date prévue de cette séance dans le mirroir local, pour
      // décider si elle arrive maintenant ou est programmée pour plus tard.
      let dateSeance = null;
      (prog.cycles || []).forEach(c => (c.lecons || []).forEach(l => (l.seances || []).forEach(s => {
        if (s.id === seanceId) dateSeance = s.date;
      })));

      const aujourdHui = new Date().toISOString().slice(0, 10);
      const arriveMaintenant = !dateSeance || dateSeance <= aujourdHui;
      const statutCible = arriveMaintenant ? 'ENVOYEE' : 'PROGRAMMEE';

     const { error } = await supabase
  .from('seances')
  .update({ 
    statut: statutCible, 
    envoyee_at: arriveMaintenant ? new Date().toISOString() : null,
    statut_visa: 'SOUMISE'
  })
  .eq('id', seanceId);

      if (error) { showToast("⚠️ Erreur : " + error.message); return; }

      const cyclesMaj = prog.cycles.map(c => c.id !== cycleId ? c : {
        ...c,
        lecons: (c.lecons || []).map(l => l.id !== leconId ? l : {
          ...l, seances: (l.seances || []).map(s => s.id === seanceId ? { ...s, soumisAuCenseur: true, statutReel: statutCible } : s)
        })
      });
      setProgrammesClasses({ ...(programmesClasses || {}), [classeSelectionneeVue]: { ...prog, cycles: cyclesMaj } });

      showToast(arriveMaintenant
        ? "🚀 Fiche envoyée — visible chez le censeur dès maintenant !"
        : `📅 Fiche programmée — elle arrivera automatiquement chez le censeur le ${dateSeance}, pas avant.`);
      return;
    }

    // --- Branche LEÇON : vraie création Supabase — obligatoirement précédée
    // d'au moins une séance déjà envoyée (jamais une leçon "vide" chez le censeur) ---
    if (type === 'lecon' && leconId) {
      const { data: seancesDeLaLecon } = await supabase
        .from('seances').select('id, statut').eq('lecon_id', leconId);
      const auMoinsUneSeanceEnvoyee = (seancesDeLaLecon || []).some(s => ['ENVOYEE', 'RECUE', 'VISEE', 'PROGRAMMEE'].includes(s.statut));

      if (!auMoinsUneSeanceEnvoyee) {
        showToast("⚠️ Envoyez d'abord au moins une séance de cette leçon — une fiche de leçon ne peut pas être envoyée seule.");
        return;
      }

      const { error } = await supabase
        .from('lecons')
        .update({ statut_visa: 'ENVOYEE', envoyee_at: new Date().toISOString() })
        .eq('id', leconId);
      if (error) { showToast("⚠️ Erreur : " + error.message); return; }

      const cyclesMaj = prog.cycles.map(c => c.id !== cycleId ? c : {
        ...c, lecons: (c.lecons || []).map(l => l.id === leconId ? { ...l, soumisAuCenseur: true } : l)
      });
      setProgrammesClasses({ ...(programmesClasses || {}), [classeSelectionneeVue]: { ...prog, cycles: cyclesMaj } });
      showToast("🚀 Fiche de leçon envoyée au censeur !");
      return;
    }

    const cyclesMaj = prog.cycles.map(c => {
      if (c.id === cycleId) {
        if (type === 'programme' || type === 'cycle') return { ...c, soumisAuCenseur: true };
        return c;
      }
      return c;
    });
    setProgrammesClasses({ ...(programmesClasses || {}), [classeSelectionneeVue]: { ...prog, cycles: cyclesMaj } });
    showToast("🚀 Élément envoyé au censeur !");
  };

  const marquerLeconTerminee = async (cycleId, leconId) => {
    const { error } = await supabase.from('lecons').update({ statut: 'TERMINEE' }).eq('id', leconId);
    if (error) { showToast("⚠️ Erreur : " + error.message); return; }
    const prog = programmesClasses[classeSelectionneeVue];
    if (!prog || !Array.isArray(prog.cycles)) return;
    const cyclesMaj = prog.cycles.map(c => c.id === cycleId ? { ...c, lecons: Array.isArray(c.lecons) ? c.lecons.map(l => l.id === leconId ? { ...l, statut: 'Terminée' } : l) : [] } : c);
    setProgrammesClasses({ ...(programmesClasses || {}), [classeSelectionneeVue]: { ...prog, cycles: cyclesMaj } });
    showToast("🏁 Leçon terminée !");
  };

  const marquerCycleTermine = async (cycleId) => {
    const { error } = await supabase.from('cycles').update({ statut: 'TERMINEE' }).eq('id', cycleId);
    if (error) { showToast("⚠️ Erreur : " + error.message); return; }
    const prog = programmesClasses[classeSelectionneeVue];
    if (!prog || !Array.isArray(prog.cycles)) return;
    const cyclesMaj = prog.cycles.map(c => c.id === cycleId ? { ...c, statut: 'Terminé' } : c);
    setProgrammesClasses({ ...(programmesClasses || {}), [classeSelectionneeVue]: { ...prog, cycles: cyclesMaj } });
    showToast("🏆 Cycle terminé !");
  };

  const ouvrirModalEdition = (type, cycleId, leconId = null, seanceId = null) => {
    const prog = programmesClasses[classeSelectionneeVue];
    if (!prog || !Array.isArray(prog.cycles)) return;
    const cycle = prog.cycles.find(c => c.id === cycleId);
    if (!cycle) return;
    let donnees = {};
    if (type === 'cycle') donnees = { titre: cycle.titre, competence: cycle.competence, dateDebut: cycle.dateDebut, dateFin: cycle.dateFin };
    else if (type === 'lecon') {
      const lecon = Array.isArray(cycle.lecons) ? cycle.lecons.find(l => l.id === leconId) : null;
      if (lecon) donnees = { titre: lecon.titre, nombreSeancesPrevues: lecon.nombreSeancesPrevues };
    } else if (type === 'seance') {
      const lecon = Array.isArray(cycle.lecons) ? cycle.lecons.find(l => l.id === leconId) : null;
      const seance = lecon && Array.isArray(lecon.seances) ? lecon.seances.find(s => s.id === seanceId) : null;
      if (seance) donnees = { titre: seance.titre, date: seance.date, lieu: seance.lieu, ...(seance.valeursChamps || {}) };
    }
    setModalEdition({ ouvert: true, type, cycleId, leconId, seanceId, donnees });
  };

  // Reste en local pour cette passe
  const sauvegarderEdition = (e) => {
    e.preventDefault();
    const { type, cycleId, leconId, seanceId, donnees } = modalEdition;
    const prog = programmesClasses[classeSelectionneeVue];
    if (!prog || !Array.isArray(prog.cycles)) return;
    const cyclesMaj = prog.cycles.map(c => {
      if (c.id === cycleId) {
        if (type === 'cycle') return { ...c, ...(donnees || {}) };
        return {
          ...c,
          lecons: Array.isArray(c.lecons) ? c.lecons.map(l => {
            if (l.id === leconId) {
              if (type === 'lecon') return { ...l, ...(donnees || {}) };
              return {
                ...l,
                seances: Array.isArray(l.seances) ? l.seances.map(s => {
                  if (s.id === seanceId) {
                    let valeursChampsMaj = { ...(s.valeursChamps || {}) };
                    if (Array.isArray(champsPersonnalises)) {
                      champsPersonnalises.forEach(champ => { if (donnees && donnees[champ.id] !== undefined) valeursChampsMaj[champ.id] = donnees[champ.id]; });
                    }
                    return { ...s, titre: (donnees && donnees.titre) || s.titre, date: (donnees && donnees.date) || s.date, lieu: (donnees && donnees.lieu) || s.lieu, valeursChamps: valeursChampsMaj };
                  }
                  return s;
                }) : []
              };
            }
            return l;
          }) : []
        };
      }
      return c;
    });
    setProgrammesClasses({ ...(programmesClasses || {}), [classeSelectionneeVue]: { ...prog, cycles: cyclesMaj } });
    setModalEdition({ ouvert: false, type: null, cycleId: null, leconId: null, seanceId: null, donnees: {} });
    showToast("✅ Modification enregistrée (local uniquement pour l'instant) !");
  };

  // --- Demande d'affiliation : vraie insertion Supabase ---
  const soumettreDemandeAffiliation = async (e) => {
    e.preventDefault();
    if (!nouvelleEcoleSaisie.trim() || !userId) return;

    const { data: etablissementCible, error: erreurRecherche } = await supabase
      .from('etablissements').select('id, nom').eq('code', nouvelleEcoleSaisie.trim()).maybeSingle();

    if (erreurRecherche || !etablissementCible) {
      showToast("⚠️ Établissement introuvable. Vérifiez le nom exact (idéalement demandez le code établissement).");
      return;
    }

    const { error } = await supabase
      .from('demandes_affiliation').insert({ user_id: userId, etablissement_id: etablissementCible.id, role_demande: 'ENSEIGNANT' });

    if (error) { showToast("⚠️ Erreur : " + error.message); return; }

    setModalAffiliation(false);
    setNouvelleEcoleSaisie('');
    showToast("🚀 Demande d'affiliation transmise !");
  };

  const telechargerPDFEntite = (titreEntite, sousTitre, contenuTableau) => {
    const fenetreImpression = window.open('', '_blank');
    if (!fenetreImpression) return;
    fenetreImpression.document.write(
      '<html><head><title>' + titreEntite + '</title><style>' +
      'body { font-family: Arial, sans-serif; padding: 30px; color: #1e293b; line-height: 1.5; background: #fff; }' +
      '.header-doc { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; }' +
      '.header-doc h2 { margin: 0; color: #0f172a; font-size: 16px; text-transform: uppercase; font-weight: 800; }' +
      '.meta { background: #f8fafc; padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #cbd5e1; font-size: 13px; }' +
      '.meta p { margin: 4px 0; } table { width: 100%; border-collapse: collapse; margin-top: 15px; }' +
      'th, td { border: 1px solid #cbd5e1; padding: 12px 14px; font-size: 13px; text-align: left; vertical-align: top; }' +
      'th { background-color: #f1f5f9; font-weight: 700; color: #0f172a; width: 30%; } td { color: #334155; width: 70%; }' +
      '</style></head><body>' +
      '<div class="header-doc"><h2>' + infosEnseignant.etablissementSaisi + '</h2>' +
      '<p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">E-cahier Numérique de Suivi Pédagogique</p></div>' +
      '<div class="meta"><p><strong>Enseignant(e) :</strong> ' + infosEnseignant.civilite + ' ' + infosEnseignant.nom + ' ' + infosEnseignant.prenoms + ' (' + infosEnseignant.matiere + ')</p>' +
      '<p><strong>Classe :</strong> ' + (classeSelectionneeVue || 'Toutes') + ' | <strong>Type :</strong> ' + titreEntite + '</p>' +
      '<p><strong>Détails :</strong> ' + sousTitre + '</p></div>' +
      contenuTableau +
      '<script>window.onload = function() { setTimeout(function() { window.print(); }, 300); }</script></body></html>'
    );
    fenetreImpression.document.close();
    showToast(`📥 Document "${titreEntite}" prêt pour impression / téléchargement !`);
  };

  const telechargerFicheSeancePDF = (seance, lecon, cycle) => {
    let champsHtml = '<table>';
    if (Array.isArray(champsPersonnalises)) {
      champsPersonnalises.forEach(champ => {
        const valeur = (seance && seance.valeursChamps && seance.valeursChamps[champ.id]) || 'N/A';
        champsHtml += `<tr><th>${champ.label}</th><td>${String(valeur).replace(/\n/g, '<br>')}</td></tr>`;
      });
    }
    if (seance && Array.isArray(seance.fichiersMultimedias) && seance.fichiersMultimedias.length) {
      champsHtml += `<tr><th>📎 Fichiers Multimedias</th><td>${seance.fichiersMultimedias.join(', ')}</td></tr>`;
    }
    champsHtml += '</table>';
    telechargerPDFEntite(`Fiche de Séance - ${seance?.titre || 'Séance'}`, `Cycle: ${cycle?.titre || ''} | Compétence : ${cycle?.competence || 'N/A'} | Leçon: ${lecon?.titre || ''}`, champsHtml);
  };

  const telechargerLeconPDF = (lecon, cycle) => {
    let htmlContent = `<h3 style="color: #0f172a; font-size: 16px; border-bottom: 2px solid #2563eb; padding-bottom: 6px;">📖 Leçon : ${lecon.titre}</h3>`;
    htmlContent += `<p style="font-size: 13px; color: #475569;"><strong>Cycle parent :</strong> ${cycle.titre} | <strong>Compétence :</strong> ${cycle.competence || 'N/A'} | <strong>Séances prévues :</strong> ${lecon.nombreSeancesPrevues}</p>`;
    if (Array.isArray(champsPersonnalisesLecon) && lecon.contenuJson && Object.keys(lecon.contenuJson).length > 0) {
      htmlContent += '<table>';
      champsPersonnalisesLecon.forEach(champ => {
        const val = lecon.contenuJson[champ.id];
        if (val) htmlContent += `<tr><th>${champ.label}</th><td>${String(val).replace(/\n/g, '<br>')}</td></tr>`;
      });
      htmlContent += '</table>';
    }
    if (Array.isArray(lecon.seances) && lecon.seances.length > 0) {
      lecon.seances.forEach(sc => {
        htmlContent += `<div style="margin-top: 20px; border: 1px solid #cbd5e1; border-radius: 10px; padding: 14px; background: #f8fafc;">`;
        htmlContent += `<h4 style="margin: 0 0 8px 0; color: #2563eb; font-size: 14px;">⚡ Séance #${sc.numero} : ${sc.titre} (Date : ${sc.date})</h4><table>`;
        if (Array.isArray(champsPersonnalises)) {
          champsPersonnalises.forEach(champ => {
            const val = (sc.valeursChamps && sc.valeursChamps[champ.id]) || 'N/A';
            htmlContent += `<tr><th>${champ.label}</th><td>${String(val).replace(/\n/g, '<br>')}</td></tr>`;
          });
        }
        htmlContent += `</table></div>`;
      });
    } else {
      htmlContent += `<p style="font-style: italic; color: #94a3b8;">Aucune séance enregistrée pour cette leçon.</p>`;
    }
    telechargerPDFEntite(`Leçon - ${lecon.titre}`, `Regroupement complet de la leçon`, htmlContent);
  };

  const telechargerCyclePDF = (cycle) => {
    let htmlContent = `<h3 style="color: #0f172a; font-size: 16px; border-bottom: 2px solid #16a34a; padding-bottom: 6px;">📁 Cycle : ${cycle.titre}</h3>`;
    htmlContent += `<p style="font-size: 13px; color: #475569;"><strong>Compétence :</strong> ${cycle.competence} | <strong>Période :</strong> Du ${cycle.dateDebut} au ${cycle.dateFin}</p>`;
    if (Array.isArray(cycle.lecons) && cycle.lecons.length > 0) {
      cycle.lecons.forEach(lc => {
        htmlContent += `<div style="margin-top: 25px; border-top: 2px dashed #cbd5e1; padding-top: 15px;"><h4 style="color: #1e293b; font-size: 15px; margin: 0 0 6px 0;">📖 Leçon : ${lc.titre}</h4>`;
        if (Array.isArray(lc.seances) && lc.seances.length > 0) {
          lc.seances.forEach(sc => {
            htmlContent += `<div style="margin-top: 12px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; background: #fdfdfd;">`;
            htmlContent += `<h5 style="margin: 0 0 6px 0; color: #2563eb; font-size: 13px;">Séance #${sc.numero} : ${sc.titre} (${sc.date})</h5><table>`;
            if (Array.isArray(champsPersonnalises)) {
              champsPersonnalises.forEach(champ => {
                const val = (sc.valeursChamps && sc.valeursChamps[champ.id]) || 'N/A';
                htmlContent += `<tr><th>${champ.label}</th><td>${String(val).replace(/\n/g, '<br>')}</td></tr>`;
              });
            }
            htmlContent += `</table></div>`;
          });
        }
        htmlContent += `</div>`;
      });
    } else {
      htmlContent += `<p style="font-style: italic; color: #94a3b8;">Aucune leçon enregistrée dans ce cycle.</p>`;
    }
    telechargerPDFEntite(`Cycle - ${cycle.titre}`, `Regroupement complet du cycle`, htmlContent);
  };

  const telechargerProgrammeAnnuelPDF = (progClasse, classeNom) => {
    let htmlContent = '<h3 style="color: #0f172a; font-size: 15px; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px;">Programme Annuel Complet</h3>';
    if (progClasse && Array.isArray(progClasse.cycles)) {
      progClasse.cycles.forEach(cy => {
        htmlContent += `<div style="margin-top: 15px; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; background: #f8fafc;">`;
        htmlContent += `<h4 style="margin: 0 0 6px 0; color: #2563eb; font-size: 14px;">📁 ${cy.titre} (Du ${cy.dateDebut} au ${cy.dateFin})</h4>`;
        htmlContent += `<p style="margin: 0 0 8px 0; font-size: 12px;"><strong>Compétence :</strong> ${cy.competence}</p>`;
        if (Array.isArray(cy.lecons)) {
          cy.lecons.forEach(lc => {
            htmlContent += `<div style="margin-left: 10px; margin-top: 8px; border-top: 1px dashed #cbd5e1; padding-top: 6px;">`;
            htmlContent += `<p style="margin: 0 0 4px 0; font-size: 12px;"><strong>📖 Leçon :</strong> ${lc.titre}</p>`;
            if (Array.isArray(lc.seances)) {
              lc.seances.forEach(sc => { htmlContent += `<p style="margin: 2px 0 2px 15px; font-size: 11px; color: #475569;">• Séance #${sc.numero}: ${sc.titre} (${sc.date})</p>`; });
            }
            htmlContent += `</div>`;
          });
        }
        htmlContent += `</div>`;
      });
    }
    telechargerPDFEntite(`Programme Annuel - ${classeNom}`, `Année scolaire ${progClasse?.anneeScolaire || ''}`, htmlContent);
  };

  const bibliothequeFiltree = useMemo(() => {
    if (!Array.isArray(bibliotheque)) return [];
    if (!filtreBiblioTexte) return bibliotheque;
    return bibliotheque.filter(b => b.nom && b.nom.toLowerCase().includes(filtreBiblioTexte.toLowerCase()));
  }, [bibliotheque, filtreBiblioTexte]);

  if (chargementInitial) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a', color: '#fff' }}>
        Chargement de votre espace...
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.darkNavbar}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'nowrap', gap: '8px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
          
          {/* SECTION PROFIL ÉPURÉE */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }} ref={profilRef}>
            <button onClick={() => setProfilOuvert(!profilOuvert)} style={styles.navbarTeacherClickableBlock}>
              <div style={styles.avatarNavbarContainer}>
                {infosEnseignant.photoProfil ? (
                  <img src={infosEnseignant.photoProfil} alt="Profil" style={styles.avatarNavbarImg} />
                ) : (
                  <div style={styles.avatarNavbarPlaceholder}>👤</div>
                )}
              </div>
              <div style={styles.navbarTeacherInfo}>
                <span style={{ fontSize: '12px', fontWeight: '900', color: '#ffffff', whiteSpace: 'nowrap' }}>
                  {infosEnseignant.civilite} {infosEnseignant.nom}
                </span>
                <span style={{ fontSize: '9px', fontWeight: '700', color: '#38bdf8', textTransform: 'uppercase' }}>
                  Enseignant
                </span>
              </div>
              <span style={{ fontSize: '9px', color: '#94a3b8', marginLeft: '2px' }}>{profilOuvert ? '▲' : '▼'}</span>
            </button>

            {profilOuvert && (
              <div style={{ ...styles.notificationDropdown, left: 0, right: 'auto' }}>
                <div style={styles.dropdownHeader}>Mon Compte Enseignant</div>
                <div style={{ padding: '10px', fontSize: '12px', color: '#334155', borderBottom: '1px solid #e2e8f0', marginBottom: '6px', background: '#f8fafc', borderRadius: '8px' }}>
                  <strong>{infosEnseignant.civilite} {infosEnseignant.nom} {infosEnseignant.prenoms}</strong><br />
                  <span style={{ color: '#64748b', fontSize: '11px' }}>
                    {infosEnseignant.etablissementSaisi}<br />
                    <em>{infosEnseignant.matiere}</em>
                  </span>
                </div>
                <button onClick={() => { setFormProfil({ ...infosEnseignant }); setModalProfilOuvert(true); setProfilOuvert(false); }} className="bouton-option">
                  ⚙️ Modifier mon profil
                </button>
                <button onClick={() => { setModalSecurite(true); setProfilOuvert(false); }} className="bouton-option">
                  🔒 Changer mon mot de passe
                </button>
                <button onClick={() => { setModalPromotion(true); setProfilOuvert(false); }} className="bouton-option" style={{ color: '#8b5cf6', fontWeight: '800' }}>
                  🎓 Devenir Censeur (Évolution)
                </button>
                <button onClick={() => {
                  if (!modeSansAffiliation) {
                    setModalPaiement(true);
                  } else {
                    setModeSansAffiliation(false);
                    showToast("Mode sans affiliation désactivé.");
                  }
                  setProfilOuvert(false);
                }} className="bouton-option" style={{ color: '#d97706', fontWeight: '800' }}>
                  {modeSansAffiliation ? '🔄 Désactiver les classes personnelles' : '💳 Débloquer les classes personnelles'}
                </button>
              </div>
            )}
          </div>

          {/* LOGO CENTRAL (ENTRE PROFIL ET NOTIFICATIONS) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255, 255, 255, 0.08)', padding: '6px 12px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.12)' }}>
            <span style={{ fontSize: '13px', fontWeight: '900', color: '#ffffff', letterSpacing: '0.5px' }}>E-cahier !</span>
            <span style={{ fontSize: '12px' }}>📖</span>
          </div>

          {/* MENU BURGER & NOTIFICATIONS SÉCURISÉS DANS LE BON SENS */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            
            <div style={{ position: 'relative' }} ref={notifRef}>
              <button onClick={() => setNotifOuvert(!notifOuvert)} style={styles.navDarkBtn}>
                <span>🔔</span>
                {notifications.length > 0 && <span style={styles.pastilleAlerte}>{notifications.length}</span>}
              </button>
              {notifOuvert && (
                <div style={{ ...styles.notificationDropdown, right: 0, left: 'auto' }}>
                  <div style={styles.dropdownHeader}>Notifications & Validations</div>
                  {notifications.length === 0 ? (
                    <p style={{ fontSize: '11px', color: '#94a3b8', padding: '8px', fontStyle: 'italic' }}>Aucune nouvelle notification.</p>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id} onClick={() => marquerNotificationLue(n)} style={{ ...styles.notifItem, cursor: 'pointer' }}>
                        <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#334155', lineHeight: '1.4' }}>{n.texte}</p>
                        <span style={{ fontSize: '10px', color: '#94a3b8' }}>{n.date}</span>
                      </div>
                    ))
                  )}
                  {Array.isArray(propositionsCenseur) && propositionsCenseur.length > 0 && (
                    <div style={{ marginTop: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: '800', color: '#2563eb' }}>Propositions d'affiliation :</span>
                      {propositionsCenseur.map(p => (
                        <div key={p.id} style={{ backgroundColor: '#eff6ff', padding: '8px', borderRadius: '8px', marginTop: '6px', fontSize: '12px', border: '1px solid #bfdbfe' }}>
                          <strong>{p.ecole}</strong> ({p.censeur})<br/>
                          <button onClick={() => {
                            const nouvelleAff = { id: Date.now(), ecole: p.ecole, statut: 'Validée', classes: p.classes || [] };
                            setAffiliations(prev => [...prev, nouvelleAff]);
                            setPropositionsCenseur(prev => prev.filter(prop => prop.id !== p.id));
                            setModeSansAffiliation(false);
                            showToast(`✅ Affiliation acceptée pour ${p.ecole} !`);
                          }} className="bouton bouton-succes" style={{ padding: '6px 12px', fontSize: '11px', marginTop: '6px' }}>Accepter l'affiliation</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ position: 'relative' }} ref={menuBurgerRef}>
              <button onClick={() => setMenuBurgerOuvert(!menuBurgerOuvert)} style={styles.burgerBtn} title="Menu des fonctionnalités">
                ☰
              </button>

              {menuBurgerOuvert && (
                <div style={{ ...styles.burgerDropdown, right: 0, left: 'auto' }}>
                  <div style={styles.dropdownHeader}>Menu de Navigation</div>
                  <button onClick={() => { setActiveTab('cycles'); setMenuBurgerOuvert(false); }} className="bouton-option">📊 Programme Annuel</button>
                  <button onClick={() => { setActiveTab('bibliotheque'); setMenuBurgerOuvert(false); }} className="bouton-option">📁 Bibliothèque Permanente</button>
                  <button onClick={() => {
                    const affsValidees = (affiliations || []).filter(a => a.statut === 'Validée');
                    setMenuBurgerOuvert(false);
                    if (affsValidees.length === 0) { showToast("⚠️ Vous devez être affilié à un établissement pour proposer une classe."); return; }
                    if (affsValidees.length === 1) { ouvrirModalProposerClasse(affsValidees[0]); return; }
                    setModalChoixEcoleProposerClasse(true);
                  }} className="bouton-option">🏫 Proposer une classe</button>
                  <button onClick={() => { setActiveTab('affiliation'); setMenuBurgerOuvert(false); }} className="bouton-option">🏫 Gestion des Écoles & Demandes de Départ</button>
                  <button onClick={() => { setActiveTab('rapports'); setMenuBurgerOuvert(false); }} className="bouton-option">📝 Rapports de Séance</button>
                  <button onClick={() => { setModalAffiliation(true); setMenuBurgerOuvert(false); }} className="bouton-option" style={{ color: '#16a34a', fontWeight: '800' }}>+ Demander une Affiliation</button>
                  
                  <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '6px', paddingTop: '6px' }}>
                    <button onClick={() => { setModalDeconnexion(true); setMenuBurgerOuvert(false); }} className="bouton-option" style={{ color: '#ef4444', fontWeight: '900', textAlign: 'center' }}>
                      🚪 Se déconnecter
                    </button>
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
              <h3 style={{ margin: '0 0 10px 0', color: '#0f172a', fontSize: '18px', fontWeight: '800' }}>🚪 Confirmation de Déconnexion</h3>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px', lineHeight: '1.5' }}>
                Êtes-vous sûr de vouloir vous déconnecter de votre session E-cahier ?
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                <button onClick={() => setModalDeconnexion(false)} className="bouton bouton-secondaire">Annuler</button>
                <button onClick={() => {
                  setModalDeconnexion(false);
                  localStorage.removeItem('app_enseignant_statut');
                  window.location.reload();
                }} className="bouton bouton-danger">Oui, me déconnecter</button>
              </div>
            </div>
          </div>
        )}

        {modalDepart.ouvert && (
          <div style={styles.fondModale}>
            <div style={{ ...styles.cardWide, width: '460px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px', fontWeight: '800' }}>🚪 Demande de Départ / Mutation</h3>
                <button onClick={() => setModalDepart({ ouvert: false, ecoleId: null, ecoleNom: '', motif: '' })} className="bouton bouton-secondaire" style={{ padding: '6px 10px' }}>✕</button>
              </div>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px', lineHeight: '1.4' }}>
                Vous demandez à quitter l'établissement <strong>{modalDepart.ecoleNom}</strong>. Conformément aux règles administratives, cette demande sera transmise au censeur pour <strong>visa officiel</strong>.
              </p>
              <form onSubmit={soumettreDemandeDepart} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={styles.label}>Motif du départ / Mutation (obligatoire)</label>
                  <textarea 
                    value={modalDepart.motif} 
                    onChange={(e) => setModalDepart(prev => ({ ...prev, motif: e.target.value }))} 
                    placeholder="Précisez la raison..." 
                    style={{ ...styles.inputStyle, height: '90px', resize: 'vertical' }} 
                    required 
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button type="button" onClick={() => setModalDepart({ ouvert: false, ecoleId: null, ecoleNom: '', motif: '' })} className="bouton bouton-secondaire">Annuler</button>
                  <button type="submit" className="bouton bouton-danger">Soumettre pour visa du censeur</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {modalChoixEcoleProposerClasse && (
          <div style={styles.fondModale}>
            <div style={{ ...styles.cardWide, width: '400px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px', fontWeight: '800' }}>🏫 Pour quel établissement ?</h3>
                <button onClick={() => setModalChoixEcoleProposerClasse(false)} className="bouton bouton-secondaire" style={{ padding: '6px 10px' }}>✕</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {(affiliations || []).filter(a => a.statut === 'Validée').map(aff => (
                  <button
                    key={aff.id}
                    onClick={() => { setModalChoixEcoleProposerClasse(false); ouvrirModalProposerClasse(aff); }}
                    className="bouton bouton-secondaire"
                    style={{ textAlign: 'left', padding: '12px 14px' }}
                  >
                    {aff.ecole}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {modalProposerClasse.ouvert && (
          <div style={styles.fondModale}>
            <div style={{ ...styles.cardWide, width: '460px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px', fontWeight: '800' }}>🏫 Proposer une classe</h3>
                <button onClick={() => setModalProposerClasse({ ouvert: false, affiliation: null, classesDisponibles: [], matieresDisponibles: [], classeNom: '', matiereNom: '' })} className="bouton bouton-secondaire" style={{ padding: '6px 10px' }}>✕</button>
              </div>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px', lineHeight: '1.4' }}>
                Votre proposition sera transmise au censeur ou au chef de <strong>{modalProposerClasse.affiliation?.ecole}</strong> pour validation.
              </p>
              {modalProposerClasse.classesDisponibles.length === 0 ? (
                <p style={{ fontSize: '13px', color: '#991b1b', fontStyle: 'italic' }}>Aucune classe créée pour l'année en cours dans cet établissement pour l'instant — demandez au censeur d'en créer d'abord.</p>
              ) : (
                <form onSubmit={soumettreDemandeAttributionClasse} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={styles.label}>Classe</label>
                    <select
                      value={modalProposerClasse.classeNom}
                      onChange={(e) => setModalProposerClasse(prev => ({ ...prev, classeNom: e.target.value }))}
                      style={styles.inputStyle} required
                    >
                      <option value="">— Choisir une classe —</option>
                      {modalProposerClasse.classesDisponibles.map(c => <option key={c.id} value={c.nom}>{c.nom}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={styles.label}>Matière</label>
                    <select value={modalProposerClasse.matiereNom} onChange={(e) => setModalProposerClasse(prev => ({ ...prev, matiereNom: e.target.value }))} style={styles.inputStyle} required>
                      <option value="">— Choisir une matière —</option>
                      {modalProposerClasse.matieresDisponibles.map(m => <option key={m.id} value={m.nom}>{m.nom}</option>)}
                    </select>
                    {modalProposerClasse.matieresDisponibles.length === 0 && (
                      <p style={{ fontSize: '11px', color: '#991b1b', marginTop: '4px' }}>Aucune matière au catalogue — demandez au censeur d'en créer une d'abord.</p>
                    )}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                    <button type="button" onClick={() => setModalProposerClasse({ ouvert: false, affiliation: null, classesDisponibles: [], matieresDisponibles: [], classeNom: '', matiereNom: '' })} className="bouton bouton-secondaire">Annuler</button>
                    <button type="submit" className="bouton bouton-principal">Envoyer la proposition</button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {champASupprimer && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 99999, padding: '16px' }}>
            <div style={{ ...styles.cardWide, width: '380px', textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#0f172a', fontSize: '18px', fontWeight: '800' }}>⚠️ Supprimer ce champ ?</h3>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px', lineHeight: '1.5' }}>
                Êtes-vous sûr de vouloir retirer ce champ de la fiche ? Cette action est irréversible.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                <button onClick={() => setChampASupprimer(null)} className="bouton bouton-secondaire">Annuler</button>
                <button onClick={() => {
                  const listeCible = champASupprimer.contexte === 'lecon' ? setChampsPersonnalisesLecon : setChampsPersonnalises;
                  listeCible(prev => Array.isArray(prev) ? prev.filter(c => c.id !== champASupprimer.id) : []);
                  setChampASupprimer(null);
                  showToast("🗑️ Champ supprimé avec succès !");
                }} className="bouton bouton-danger">Oui, supprimer</button>
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
                <p style={{ fontSize: '11px', color: '#64748b', margin: '-6px 0 4px 0' }}>Actuel : {infosEnseignant.emailSecurite || '—'}</p>
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

        {modalPromotion && (
          <div style={styles.fondModale}>
            <div style={{ ...styles.cardWide, width: '480px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px', fontWeight: '800' }}>🎓 Évolution de Carrière : Devenir Censeur</h3>
                <button onClick={() => setModalPromotion(false)} className="bouton bouton-secondaire" style={{ padding: '6px 10px' }}>✕</button>
              </div>

              <form onSubmit={envoyerDemandePromotionCenseur} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={styles.label}>Type d'évolution souhaitée</label>
                  <select value={formPromotion.type} onChange={(e) => setFormPromotion({...formPromotion, type: e.target.value})} style={styles.inputStyle}>
                    <option value="interne">Évolution Interne (Prendre la relève dans l'établissement actuel)</option>
                    <option value="externe">Évolution Externe / Mutation (Devenir Censeur dans un autre établissement)</option>
                  </select>
                </div>

                {formPromotion.type === 'interne' ? (
                  <div style={{ backgroundColor: '#eff6ff', padding: '12px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                    <p style={{ fontSize: '12px', color: '#1e40af', margin: 0 }}>Votre demande sera envoyée au Chef d'Établissement actuel ({infosEnseignant.etablissementSaisi}) pour validation de succession.</p>
                  </div>
                ) : (
                  <div>
                    <label style={styles.label}>Nom de l'établissement cible (Mutation)</label>
                    <input type="text" placeholder="Ex: Lycée Classique d'Abidjan..." value={formPromotion.ecoleCible} onChange={(e) => setFormPromotion({...formPromotion, ecoleCible: e.target.value})} style={styles.inputStyle} required />
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button type="button" onClick={() => setModalPromotion(false)} className="bouton bouton-secondaire">Annuler</button>
                  <button type="submit" className="bouton bouton-principal">Soumettre la demande officielle</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {modalRapport.ouvert && (
          <div style={styles.fondModale}>
            <div style={{ ...styles.cardWide, width: '520px', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px', fontWeight: '800' }}>📋 Soumettre un Rapport de Séance & Compte Rendu</h3>
                <button onClick={() => setModalRapport({ ouvert: false, seanceTitre: '', ecolesCibles: [], classesCibles: [], motifReport: '', nouvelleDatePrevue: '', contenuRapport: '', difficultes: '' })} className="bouton bouton-secondaire" style={{ padding: '6px 10px' }}>✕</button>
              </div>

              <form onSubmit={soumettreRapportSeance} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={styles.label}>Séance concernée</label>
                  <input type="text" placeholder="Ex: Séance d'initiation..." value={modalRapport.seanceTitre} onChange={e => setModalRapport({...modalRapport, seanceTitre: e.target.value})} style={styles.inputStyle} required />
                </div>

                <div>
                  <label style={{ ...styles.label, marginBottom: '6px' }}>Établissements concernés :</label>
                  {Array.isArray(affiliations) && affiliations.map(aff => {
                    const estCoche = modalRapport.ecolesCibles.includes(aff.ecole);
                    return (
                      <label key={aff.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '700', marginBottom: '4px', cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={estCoche}
                          onChange={() => {
                            const updated = estCoche 
                              ? modalRapport.ecolesCibles.filter(e => e !== aff.ecole)
                              : [...modalRapport.ecolesCibles, aff.ecole];
                            setModalRapport(prev => ({ ...prev, ecolesCibles: updated }));
                          }}
                        />
                        {aff.ecole}
                      </label>
                    );
                  })}
                </div>

                <div>
                  <label style={{ ...styles.label, marginBottom: '6px' }}>Classes concernées (Multi-classes) :</label>
                  {Array.isArray(classesActivesValidees) && classesActivesValidees.map(cl => {
                    const estCoche = modalRapport.classesCibles.includes(cl);
                    return (
                      <label key={cl} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '700', marginBottom: '4px', cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={estCoche}
                          onChange={() => {
                            const updated = estCoche 
                              ? modalRapport.classesCibles.filter(c => c !== cl)
                              : [...modalRapport.classesCibles, cl];
                            setModalRapport(prev => ({ ...prev, classesCibles: updated }));
                          }}
                        />
                        Classe {cl}
                      </label>
                    );
                  })}
                </div>

                <div>
                  <label style={styles.label}>Motif du report (optionnel)</label>
                  <input type="text" placeholder="Ex: Intempéries, absence professeur..." value={modalRapport.motifReport} onChange={e => setModalRapport({...modalRapport, motifReport: e.target.value})} style={styles.inputStyle} />
                </div>
                <div>
                  <label style={styles.label}>📅 Nouvelle date de report prévue (optionnel)</label>
                  <input type="date" value={modalRapport.nouvelleDatePrevue} onChange={e => setModalRapport({...modalRapport, nouvelleDatePrevue: e.target.value})} style={styles.inputStyle} />
                </div>
                <div>
                  <label style={styles.label}>Compte rendu / Observations / Difficultés</label>
                  <textarea placeholder="Détails complémentaires..." value={modalRapport.contenuRapport} onChange={e => setModalRapport({...modalRapport, contenuRapport: e.target.value})} style={{ ...styles.inputStyle, height: '80px', resize: 'vertical' }} required />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button type="button" onClick={() => setModalRapport({ ouvert: false, seanceTitre: '', ecolesCibles: [], classesCibles: [], motifReport: '', nouvelleDatePrevue: '', contenuRapport: '', difficultes: '' })} className="bouton bouton-secondaire">Annuler</button>
                  <button type="submit" className="bouton" style={{ fontWeight: '800', backgroundColor: '#d97706', color: '#fff' }}>📤 Transmettre le rapport</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {modalDuplicationIntelligente.ouvert && (
          <div style={styles.fondModale}>
            <div style={{ ...styles.cardWide, width: '480px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px', fontWeight: '800' }}>⚡ Duplication Intelligente</h3>
                <button onClick={() => setModalDuplicationIntelligente({ ouvert: false, itemSource: null, typeSource: '', classesCibles: [], datesParClasse: {} })} className="bouton bouton-secondaire" style={{ padding: '6px 10px' }}>✕</button>
              </div>

              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
                Dupliquez instantanément cet élément vers d'autres classes avec attribution de dates personnalisées.
              </p>

              <form onSubmit={executerDuplicationIntelligente} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ ...styles.label, marginBottom: '8px' }}>Sélectionner les classes cibles :</label>
                  {Array.isArray(classesActivesValidees) && classesActivesValidees.map(cl => {
                    const estCoche = modalDuplicationIntelligente.classesCibles.includes(cl);
                    return (
                      <div key={cl} style={{ border: '1px solid #e2e8f0', padding: '10px', borderRadius: '10px', backgroundColor: '#f8fafc', marginBottom: '6px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '13px', color: '#0f172a' }}>
                          <input 
                            type="checkbox" 
                            checked={estCoche}
                            onChange={() => {
                              const updated = estCoche 
                                ? modalDuplicationIntelligente.classesCibles.filter(c => c !== cl)
                                : [...modalDuplicationIntelligente.classesCibles, cl];
                              setModalDuplicationIntelligente(prev => ({ ...prev, classesCibles: updated }));
                            }} 
                          />
                          Classe {cl}
                        </label>
                        {estCoche && (
                          <div style={{ marginTop: '6px', marginLeft: '22px' }}>
                            <label style={{ fontSize: '11px', color: '#475569', display: 'block', marginBottom: '2px', fontWeight: '700' }}>Date pour {cl} :</label>
                            <input 
                              type="date" 
                              value={(modalDuplicationIntelligente.datesParClasse && modalDuplicationIntelligente.datesParClasse[cl]) || ''} 
                              onChange={(e) => {
                                const val = e.target.value;
                                setModalDuplicationIntelligente(prev => ({
                                  ...prev,
                                  datesParClasse: { ...(prev.datesParClasse || {}), [cl]: val }
                                }));
                              }} 
                              style={{ ...styles.inputStyle, padding: '6px 10px' }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button type="button" onClick={() => setModalDuplicationIntelligente({ ouvert: false, itemSource: null, typeSource: '', classesCibles: [], datesParClasse: {} })} className="bouton bouton-secondaire">Annuler</button>
                  <button type="submit" className="bouton bouton-principal">Lancer la duplication</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {modalProfilOuvert && (
          <div style={styles.fondModale}>
            <div style={{ ...styles.cardWide, width: '480px', maxHeight: '90vh', overflowY: 'auto' }}>
              <h3 style={{ margin: '0 0 16px 0', color: '#0f172a', fontSize: '18px', fontWeight: '800' }}>👤 Modifier mon profil</h3>
              
              <form onSubmit={handleEnregistrerProfil} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '4px' }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#e2e8f0', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center', border: '2px solid #cbd5e1', flexShrink: 0 }}>
                    {formProfil.photoProfil ? (
                      <img src={formProfil.photoProfil} alt="Aperçu" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                    <select value={formProfil.civilite} onChange={(e) => setFormProfil({...formProfil, civilite: e.target.value})} style={styles.inputStyle}>
                      <option value="M.">M.</option>
                      <option value="Mme">Mme</option>
                      <option value="Dr">Dr</option>
                      <option value="Pr">Pr</option>
                    </select>
                  </div>
                  <div>
                    <label style={styles.label}>Nom</label>
                    <input type="text" value={formProfil.nom} onChange={(e) => setFormProfil({...formProfil, nom: e.target.value})} style={styles.inputStyle} required />
                  </div>
                </div>

                <div>
                  <label style={styles.label}>Prénoms</label>
                  <input type="text" value={formProfil.prenoms} onChange={(e) => setFormProfil({...formProfil, prenoms: e.target.value})} style={styles.inputStyle} required />
                </div>

                <div>
                  <label style={styles.label}>Matière(s) enseignée(s)</label>
                  <p style={{ fontSize: '11px', color: '#64748b', margin: '-2px 0 8px 0' }}>Cochez-en plusieurs si vous enseignez plus d'une matière.</p>
                  {matieresCatalogue.length === 0 ? (
                    <p style={{ fontSize: '11px', color: '#991b1b' }}>Aucune matière au catalogue pour l'instant — demandez à votre censeur d'en créer une.</p>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {matieresCatalogue.map(m => {
                        const estCochee = formProfil.matiereIds.includes(m.id);
                        return (
                          <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid #e2e8f0', padding: '6px 10px', borderRadius: '8px', backgroundColor: estCochee ? '#eff6ff' : '#f8fafc', cursor: 'pointer', fontSize: '12px', fontWeight: '700' }}>
                            <input
                              type="checkbox"
                              checked={estCochee}
                              onChange={() => {
                                const updated = estCochee ? formProfil.matiereIds.filter(id => id !== m.id) : [...formProfil.matiereIds, m.id];
                                setFormProfil({ ...formProfil, matiereIds: updated });
                              }}
                            />
                            {m.nom}
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div>
                  <label style={styles.label}>Nom de l'établissement</label>
                  <input type="text" value={formProfil.etablissementSaisi} onChange={(e) => setFormProfil({...formProfil, etablissementSaisi: e.target.value})} style={styles.inputStyle} required />
                </div>

                <div>
                  <label style={styles.label}>Ville</label>
                  <input type="text" value={formProfil.ville} onChange={(e) => setFormProfil({...formProfil, ville: e.target.value})} style={styles.inputStyle} required />
                </div>

                <div>
                  <label style={styles.label}>Téléphone</label>
                  <input type="tel" placeholder="+225 XX XX XX XX XX" value={formProfil.telephone || ''} onChange={(e) => setFormProfil({...formProfil, telephone: e.target.value})} style={styles.inputStyle} />
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
                  <button type="button" onClick={() => setModalProfilOuvert(false)} className="bouton bouton-secondaire">Annuler</button>
                  <button type="submit" className="bouton bouton-principal">Enregistrer</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {modalPaiement && (
          <div style={styles.fondModale}>
            <div style={{ ...styles.cardWide, width: '480px' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#0f172a', fontSize: '18px', fontWeight: '800' }}>💳 Abonnement Mode Sans Affiliation</h3>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px', lineHeight: '1.5' }}>
                Définissez vos propres classes en toute autonomie. Montant : <strong style={{ color: '#d97706' }}>1 900 FCFA / mois</strong>.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                <label style={styles.label}>Moyen de paiement :</label>
                
                <div onClick={() => setMethodePaiement('wave')} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', border: methodePaiement === 'wave' ? '2px solid #2563eb' : '1px solid #cbd5e1', borderRadius: '12px', cursor: 'pointer', backgroundColor: '#f8fafc' }}>
                  <div style={{ width: '42px', height: '42px', backgroundColor: '#0083ff', borderRadius: '10px', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: '900', fontSize: '15px' }}>W</div>
                  <div style={{ flex: 1 }}><strong>Wave Mobile Money</strong></div>
                </div>

                <div onClick={() => setMethodePaiement('orange')} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', border: methodePaiement === 'orange' ? '2px solid #2563eb' : '1px solid #cbd5e1', borderRadius: '12px', cursor: 'pointer', backgroundColor: '#f8fafc' }}>
                  <div style={{ width: '42px', height: '42px', backgroundColor: '#ff6600', borderRadius: '10px', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: '900', fontSize: '12px' }}>OM</div>
                  <div style={{ flex: 1 }}><strong>Orange Money</strong></div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setModalPaiement(false)} className="bouton bouton-secondaire">Annuler</button>
                <button type="button" onClick={() => {
                  setModeSansAffiliation(true);
                  setModalPaiement(false);
                  showToast("💳 Paiement validé ! Mode Sans Affiliation activé.");
                }} className="bouton bouton-principal">Procéder au paiement (1 900 FCFA)</button>
              </div>
            </div>
          </div>
        )}

        {modalAffiliation && (
          <div style={styles.fondModale}>
            <div style={{ ...styles.cardWide, width: '460px' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#0f172a', fontSize: '18px', fontWeight: '800' }}>🏫 Demande d'Affiliation à une École</h3>
              <form onSubmit={soumettreDemandeAffiliation} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={styles.label}>Code de l'établissement</label>
                  <input type="text" placeholder="Ex: LYCMOD-A1B2" value={nouvelleEcoleSaisie} onChange={(e) => setNouvelleEcoleSaisie(e.target.value)} style={styles.inputStyle} required />
                </div>
                <div>
                  <label style={styles.label}>Classes concernées (séparées par des virgules)</label>
                  <input type="text" placeholder="Ex: 6ème A, 5ème B" value={nouvellesClassesSaisies} onChange={(e) => setNouvellesClassesSaisies(e.target.value)} style={styles.inputStyle} required />
                </div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                  <button type="button" onClick={() => setModalAffiliation(false)} className="bouton bouton-secondaire">Annuler</button>
                  <button type="submit" className="bouton bouton-principal">Soumettre la demande</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {champEnEditionPleinEcran && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 99999, padding: '16px' }}>
            <div style={{ ...styles.cardWide, width: '90vw', maxWidth: '650px', height: '80vh', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRadius: '24px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                  <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px', fontWeight: '800' }}>✍️ Rédiger : {champEnEditionPleinEcran.label}</h3>
                  <button onClick={() => setChampEnEditionPleinEcran(null)} className="bouton bouton-secondaire" style={{ padding: '6px 12px' }}>✕</button>
                </div>
                <textarea 
                  autoFocus
                  value={champEnEditionPleinEcran.valeurTemporaire}
                  onChange={(e) => {
                    const val = e.target.value;
                    setChampEnEditionPleinEcran(prev => ({ ...prev, valeurTemporaire: val }));
                  }}
                  placeholder="Écrivez votre contenu ici..."
                  style={{ ...styles.inputStyle, height: '45vh', resize: 'none', fontSize: '15px', lineHeight: '1.6', padding: '16px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
                <button type="button" onClick={() => setChampEnEditionPleinEcran(null)} className="bouton bouton-secondaire">Annuler</button>
                <button 
                  type="button" 
                  onClick={() => {
                    const cle = champEnEditionPleinEcran.contexte === 'lecon' ? 'valeursChampsLecon' : 'valeursChamps';
                    setModalAssistant(prev => ({
                      ...prev,
                      [cle]: { ...(prev[cle] || {}), [champEnEditionPleinEcran.id]: champEnEditionPleinEcran.valeurTemporaire }
                    }));
                    setChampEnEditionPleinEcran(null);
                    showToast("✨ Texte validé avec succès !");
                  }} 
                  className="bouton bouton-succes"
                  style={{ padding: '10px 24px', fontWeight: '900', fontSize: '14px' }}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}

        {modalAssistant.ouvert && (
          <div style={styles.fondModale}>
            <div style={{ ...styles.cardWide, width: '640px', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px', fontWeight: '800' }}>
                  {modalAssistant.niveauCible === 'programme_annuel' && '📊 Créer un Programme Annuel Complet'}
                  {modalAssistant.niveauCible === 'cycle' && '✨ Créer un Cycle Multi-Écoles & Multi-Classes'}
                  {modalAssistant.niveauCible === 'lecon' && '📖 Créer une nouvelle Leçon'}
                  {modalAssistant.niveauCible === 'seance' && '📝 Créer une Séance'}
                </h3>
                <button onClick={() => setModalAssistant({ ...modalAssistant, ouvert: false })} className="bouton bouton-secondaire" style={{ padding: '6px 10px' }}>✕</button>
              </div>

              {modalAssistant.niveauCible === 'seance' && (
              <div style={{ marginBottom: '20px', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #cbd5e1' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <label style={{ ...styles.label, color: '#2563eb', fontSize: '13px', margin: 0 }}>⚙️ Structure & Champs de la fiche :</label>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '14px' }}>
                  {Array.isArray(champsPersonnalises) && champsPersonnalises.map((champ, index) => (
                    <div key={champ.id} style={{ backgroundColor: '#fff', padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: '10px', color: '#64748b', fontWeight: '800', display: 'block', marginBottom: '4px' }}>ÉNONCÉ DU CHAMP #{index + 1}</label>
                          <input 
                            type="text" 
                            value={champ.label} 
                            onChange={(e) => {
                              const val = e.target.value;
                              setChampsPersonnalises(prev => prev.map(c => c.id === champ.id ? { ...c, label: val } : c));
                            }}
                            style={{ ...styles.inputStyle, padding: '10px 12px', fontSize: '13px', fontWeight: '800', backgroundColor: '#f8fafc' }}
                          />
                        </div>

                        {champsPersonnalises.length > 1 && (
                          <button 
                            type="button" 
                            onClick={() => setChampASupprimer({ id: champ.id, contexte: 'seance' })}
                            style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', fontWeight: '900', fontSize: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', flexShrink: 0, marginTop: '16px' }}
                          >
                            −
                          </button>
                        )}
                      </div>

                      <div>
                        <label style={{ fontSize: '10px', color: '#64748b', fontWeight: '800', display: 'block', marginBottom: '4px' }}>CONTENU</label>
                        {modalAssistant.referenceLeconValeurs && modalAssistant.referenceLeconValeurs[champ.id] && (
                          (() => {
                            const reference = modalAssistant.referenceLeconValeurs[champ.id];
                            return (
                              <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '8px 10px', marginBottom: '8px' }}>
                                <p style={{ fontSize: '10px', color: '#1e3a8a', fontWeight: '800', margin: '0 0 4px 0' }}>📋 Proposé par la leçon (facultatif, à adapter ou ignorer) :</p>
                                <p style={{ fontSize: '11px', color: '#334155', margin: '0 0 6px 0', whiteSpace: 'pre-wrap' }}>{reference}</p>
                                <button
                                  type="button"
                                  onClick={() => setModalAssistant(prev => ({ ...prev, valeursChamps: { ...(prev.valeursChamps || {}), [champ.id]: reference } }))}
                                  style={{ fontSize: '11px', fontWeight: '700', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                                >
                                  ↳ Reprendre ce texte pour cette séance
                                </button>
                              </div>
                            );
                          })()
                        )}
                        <textarea 
                          onClick={() => {
                            setChampEnEditionPleinEcran({
                              id: champ.id,
                              contexte: 'seance',
                              label: champ.label,
                              valeurTemporaire: (modalAssistant.valeursChamps && modalAssistant.valeursChamps[champ.id]) || ''
                            });
                          }}
                          readOnly
                          value={(modalAssistant.valeursChamps && modalAssistant.valeursChamps[champ.id]) || ''}
                          placeholder="Propre à cette séance — cliquez pour écrire, ou reprenez la proposition ci-dessus"
                          style={{ ...styles.inputStyle, height: '65px', resize: 'none', backgroundColor: '#fdfdfd', fontSize: '12px', cursor: 'pointer', color: '#334155' }} 
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <button 
                  type="button" 
                  onClick={() => {
                    const newId = `champ_${Date.now()}`;
                    setChampsPersonnalises(prev => [...(Array.isArray(prev) ? prev : []), { id: newId, label: 'Nouveau champ', type: 'textarea' }]);
                    showToast("➕ Champ ajouté !");
                  }} 
                  className="bouton bouton-succes"
                  style={{ width: '100%', marginBottom: '10px' }}
                >
                  + Ajouter un champ
                </button>
              </div>
              )}

              {modalAssistant.niveauCible === 'lecon' && (
              <div style={{ marginBottom: '20px', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #cbd5e1' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <label style={{ ...styles.label, color: '#2563eb', fontSize: '13px', margin: 0 }}>⚙️ Structure & Champs de la fiche de leçon :</label>
                </div>
                <p style={{ fontSize: '11px', color: '#64748b', margin: '-6px 0 12px 0' }}>Comme pour la séance : ajoutez, renommez ou retirez librement des champs — chaque matière peut avoir ses propres besoins.</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '14px' }}>
                  {Array.isArray(champsPersonnalisesLecon) && champsPersonnalisesLecon.map((champ, index) => (
                    <div key={champ.id} style={{ backgroundColor: '#fff', padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: '10px', color: '#64748b', fontWeight: '800', display: 'block', marginBottom: '4px' }}>ÉNONCÉ DU CHAMP #{index + 1}</label>
                          <input 
                            type="text" 
                            value={champ.label} 
                            onChange={(e) => {
                              const val = e.target.value;
                              setChampsPersonnalisesLecon(prev => prev.map(c => c.id === champ.id ? { ...c, label: val } : c));
                            }}
                            style={{ ...styles.inputStyle, padding: '10px 12px', fontSize: '13px', fontWeight: '800', backgroundColor: '#f8fafc' }}
                          />
                        </div>

                        {champsPersonnalisesLecon.length > 1 && (
                          <button 
                            type="button" 
                            onClick={() => setChampASupprimer({ id: champ.id, contexte: 'lecon' })}
                            style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', fontWeight: '900', fontSize: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', flexShrink: 0, marginTop: '16px' }}
                          >
                            −
                          </button>
                        )}
                      </div>

                      <div>
                        <label style={{ fontSize: '10px', color: '#64748b', fontWeight: '800', display: 'block', marginBottom: '4px' }}>CONTENU</label>
                        <textarea 
                          onClick={() => {
                            setChampEnEditionPleinEcran({
                              id: champ.id,
                              contexte: 'lecon',
                              label: champ.label,
                              valeurTemporaire: (modalAssistant.valeursChampsLecon && modalAssistant.valeursChampsLecon[champ.id]) || ''
                            });
                          }}
                          readOnly
                          value={(modalAssistant.valeursChampsLecon && modalAssistant.valeursChampsLecon[champ.id]) || ''}
                          placeholder="Cliquez pour écrire — général à toute la leçon"
                          style={{ ...styles.inputStyle, height: '65px', resize: 'none', backgroundColor: '#fdfdfd', fontSize: '12px', cursor: 'pointer', color: '#334155' }} 
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <button 
                  type="button" 
                  onClick={() => {
                    const newId = `champ_${Date.now()}`;
                    setChampsPersonnalisesLecon(prev => [...(Array.isArray(prev) ? prev : []), { id: newId, label: 'Nouveau champ', type: 'textarea' }]);
                    showToast("➕ Champ ajouté !");
                  }} 
                  className="bouton bouton-succes"
                  style={{ width: '100%', marginBottom: '10px' }}
                >
                  + Ajouter un champ
                </button>
              </div>
              )}

              <form onSubmit={gererValidationAssistant} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {modalAssistant.niveauCible === 'programme_annuel' && (
                  <>
                    <div>
                      <label style={styles.label}>Titre du programme annuel</label>
                      <input type="text" value={modalAssistant.titreProgramme} onChange={(e) => setModalAssistant({...modalAssistant, titreProgramme: e.target.value})} style={styles.inputStyle} required />
                    </div>

                    <div style={{ backgroundColor: '#f0fdf4', padding: '12px', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
                      <label style={{ ...styles.label, marginBottom: '8px', color: '#166534' }}>📚 Cycles du programme (titres et références — les leçons se rempliront plus tard, cycle par cycle)</label>
                      {(Array.isArray(modalAssistant.cyclesProgramme) ? modalAssistant.cyclesProgramme : []).map((cp, index) => (
                        <div key={cp.id} style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px', marginBottom: '8px' }}>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                            <div style={{ flex: 1, backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '6px 10px', fontWeight: '900', color: '#166534', fontSize: '13px' }}>
                              Cycle N° {(programmesClasses?.[classeSelectionneeVue]?.cycles?.length || 0) + index + 1}
                            </div>
                            {modalAssistant.cyclesProgramme.length > 1 && (
                              <button type="button" onClick={() => setModalAssistant(prev => ({ ...prev, cyclesProgramme: prev.cyclesProgramme.filter(c => c.id !== cp.id) }))} style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', fontWeight: '900', cursor: 'pointer', flexShrink: 0 }}>−</button>
                            )}
                          </div>
                          <input
                            type="text" placeholder="Compétence visée (facultatif)" value={cp.competence || ''}
                            onChange={(e) => setModalAssistant(prev => ({ ...prev, cyclesProgramme: prev.cyclesProgramme.map(c => c.id === cp.id ? { ...c, competence: e.target.value } : c) }))}
                            style={{ ...styles.inputStyle, margin: '0 0 6px 0' }}
                          />
                          <input
                            type="number" min="1" placeholder="Nombre de leçons prévu (facultatif)" value={cp.nbLecons || ''}
                            onChange={(e) => setModalAssistant(prev => ({ ...prev, cyclesProgramme: prev.cyclesProgramme.map(c => c.id === cp.id ? { ...c, nbLecons: e.target.value } : c) }))}
                            style={{ ...styles.inputStyle, margin: '0 0 6px 0' }}
                          />
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <div style={{ flex: 1 }}>
                              <label style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', display: 'block', marginBottom: '2px' }}>Début</label>
                              <input
                                type="date" value={cp.dateDebut || ''}
                                onChange={(e) => setModalAssistant(prev => ({ ...prev, cyclesProgramme: prev.cyclesProgramme.map(c => c.id === cp.id ? { ...c, dateDebut: e.target.value } : c) }))}
                                style={{ ...styles.inputStyle, margin: 0 }}
                              />
                            </div>
                            <div style={{ flex: 1 }}>
                              <label style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', display: 'block', marginBottom: '2px' }}>Fin</label>
                              <input
                                type="date" value={cp.dateFin || ''}
                                onChange={(e) => setModalAssistant(prev => ({ ...prev, cyclesProgramme: prev.cyclesProgramme.map(c => c.id === cp.id ? { ...c, dateFin: e.target.value } : c) }))}
                                style={{ ...styles.inputStyle, margin: 0 }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => setModalAssistant(prev => ({ ...prev, cyclesProgramme: [...(prev.cyclesProgramme || []), { id: Date.now() + Math.random(), titre: `Cycle ${(prev.cyclesProgramme?.length || 0) + 1}`, competence: '', nbLecons: '', dateDebut: '', dateFin: '' }] }))}
                        className="bouton bouton-secondaire" style={{ width: '100%' }}
                      >
                        + Ajouter un cycle
                      </button>
                    </div>

                    <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                      <label style={{ ...styles.label, marginBottom: '8px', color: '#0f172a' }}>🏫 Classes cibles :</label>
                      {Array.isArray(classesActivesValidees) && classesActivesValidees.map(cl => {
                        const estCoche = Array.isArray(modalAssistant.classesCiblesCycle) && modalAssistant.classesCiblesCycle.includes(cl);
                        return (
                          <div key={cl} style={{ border: '1px solid #e2e8f0', padding: '10px', borderRadius: '8px', backgroundColor: '#fff', marginBottom: '6px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '13px' }}>
                              <input 
                                type="checkbox" 
                                checked={estCoche}
                                onChange={() => {
                                  const ciblesActuelles = Array.isArray(modalAssistant.classesCiblesCycle) ? modalAssistant.classesCiblesCycle : [];
                                  const updated = estCoche ? ciblesActuelles.filter(c => c !== cl) : [...ciblesActuelles, cl];
                                  setModalAssistant(prev => ({ ...prev, classesCiblesCycle: updated }));
                                }} 
                              />
                              Classe {cl}
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                {modalAssistant.niveauCible === 'cycle' && (
                  <>
                    <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
                      <span style={{ fontSize: '11px', fontWeight: '800', color: '#1e3a8a', textTransform: 'uppercase' }}>Cycle N°</span>
                      <p style={{ fontSize: '22px', fontWeight: '900', color: '#1e3a8a', margin: '2px 0 0 0' }}>
                        {(programmesClasses?.[classeSelectionneeVue]?.cycles?.length || 0) + 1}
                      </p>
                      <p style={{ fontSize: '10px', color: '#64748b', margin: '2px 0 0 0' }}>Numéroté automatiquement, rien à saisir.</p>
                    </div>
                    <div>
                      <label style={styles.label}>Compétence visée</label>
                      <input type="text" value={modalAssistant.competenceCycle} onChange={(e) => setModalAssistant({...modalAssistant, competenceCycle: e.target.value})} style={styles.inputStyle} required />
                      <p style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Apparaîtra sur toutes les fiches (leçons et séances) de ce cycle.</p>
                    </div>
                    <div>
                      <label style={styles.label}>Leçons prévues</label>
                      <input
                        type="number" min="1" placeholder="ex. 2" value={modalAssistant.nombreLeconsPrevu || ''}
                        onChange={(e) => {
                          const n = parseInt(e.target.value, 10) || 0;
                          setModalAssistant(prev => {
                            const planActuel = Array.isArray(prev.planLecons) ? prev.planLecons : [];
                            const planAjuste = Array.from({ length: n }, (_, i) => planActuel[i] || '');
                            return { ...prev, nombreLeconsPrevu: e.target.value, planLecons: planAjuste };
                          });
                        }}
                        style={styles.inputStyle}
                      />
                    </div>
                    {Array.isArray(modalAssistant.planLecons) && modalAssistant.planLecons.length > 0 && (
                      <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                        <label style={{ ...styles.label, marginBottom: '8px', color: '#0f172a' }}>Titres des leçons (facultatif — vous pourrez les nommer plus tard aussi)</label>
                        {modalAssistant.planLecons.map((titre, i) => (
                          <input
                            key={i} type="text" placeholder={`Leçon ${i + 1} (facultatif)`} value={titre}
                            onChange={(e) => setModalAssistant(prev => {
                              const copie = [...prev.planLecons];
                              copie[i] = e.target.value;
                              return { ...prev, planLecons: copie };
                            })}
                            style={{ ...styles.inputStyle, marginBottom: '6px' }}
                          />
                        ))}
                      </div>
                    )}
                    <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                      <label style={{ ...styles.label, marginBottom: '8px', color: '#0f172a' }}>🏫 Classes cibles, chacune avec sa propre période :</label>
                      <p style={{ fontSize: '11px', color: '#64748b', margin: '0 0 8px 0' }}>Chaque classe garde son propre cycle en base — utile si les classes n'ont pas cours le même jour, la période peut varier de l'une à l'autre.</p>
                      {Array.isArray(classesActivesValidees) && classesActivesValidees.map(cl => {
                        const estCoche = Array.isArray(modalAssistant.classesCiblesCycle) && modalAssistant.classesCiblesCycle.includes(cl);
                        const periode = (modalAssistant.periodesParClasseCycle && modalAssistant.periodesParClasseCycle[cl]) || {};
                        return (
                          <div key={cl} style={{ border: '1px solid #e2e8f0', padding: '8px 10px', borderRadius: '8px', backgroundColor: '#fff', marginBottom: '6px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '13px' }}>
                              <input
                                type="checkbox"
                                checked={estCoche}
                                onChange={() => {
                                  const ciblesActuelles = Array.isArray(modalAssistant.classesCiblesCycle) ? modalAssistant.classesCiblesCycle : [];
                                  const updated = estCoche ? ciblesActuelles.filter(c => c !== cl) : [...ciblesActuelles, cl];
                                  setModalAssistant(prev => ({ ...prev, classesCiblesCycle: updated }));
                                }}
                              />
                              {cl}
                            </label>
                            {estCoche && (
                              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                <div style={{ flex: 1 }}>
                                  <label style={{ ...styles.label, fontSize: '10px' }}>Début</label>
                                  <input
                                    type="date" value={periode.debut || ''}
                                    onChange={(e) => setModalAssistant(prev => ({ ...prev, periodesParClasseCycle: { ...(prev.periodesParClasseCycle || {}), [cl]: { ...periode, debut: e.target.value } } }))}
                                    style={{ ...styles.inputStyle, margin: 0 }}
                                  />
                                </div>
                                <div style={{ flex: 1 }}>
                                  <label style={{ ...styles.label, fontSize: '10px' }}>Fin</label>
                                  <input
                                    type="date" value={periode.fin || ''}
                                    onChange={(e) => setModalAssistant(prev => ({ ...prev, periodesParClasseCycle: { ...(prev.periodesParClasseCycle || {}), [cl]: { ...periode, fin: e.target.value } } }))}
                                    style={{ ...styles.inputStyle, margin: 0 }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                {modalAssistant.niveauCible === 'lecon' && (
                  <>
                    <div>
                      <label style={styles.label}>Titre de la leçon</label>
                      <input type="text" value={modalAssistant.titreLecon} onChange={(e) => setModalAssistant({...modalAssistant, titreLecon: e.target.value})} style={styles.inputStyle} required />
                    </div>
                    <div>
                      <label style={styles.label}>Nombre de séances</label>
                      <input
                        type="number" min="1" value={modalAssistant.nombreSeancesLecon}
                        onChange={(e) => {
                          const n = parseInt(e.target.value, 10) || 0;
                          setModalAssistant(prev => {
                            const planActuel = Array.isArray(prev.planSeances) ? prev.planSeances : [];
                            const planAjuste = Array.from({ length: n }, (_, i) => planActuel[i] || '');
                            return { ...prev, nombreSeancesLecon: e.target.value, planSeances: planAjuste };
                          });
                        }}
                        style={styles.inputStyle} required
                      />
                    </div>
                    {Array.isArray(modalAssistant.planSeances) && modalAssistant.planSeances.length > 0 && (
                      <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                        <label style={{ ...styles.label, marginBottom: '8px', color: '#0f172a' }}>Titres des séances (facultatif — vous pourrez les nommer plus tard aussi)</label>
                        {modalAssistant.planSeances.map((titre, i) => (
                          <input
                            key={i} type="text" placeholder={`Séance ${i + 1} (facultatif)`} value={titre}
                            onChange={(e) => setModalAssistant(prev => {
                              const copie = [...prev.planSeances];
                              copie[i] = e.target.value;
                              return { ...prev, planSeances: copie };
                            })}
                            style={{ ...styles.inputStyle, marginBottom: '6px' }}
                          />
                        ))}
                      </div>
                    )}
                    <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                      <label style={{ ...styles.label, marginBottom: '8px', color: '#0f172a' }}>🏫 Ajouter aussi cette leçon à :</label>
                      <p style={{ fontSize: '11px', color: '#64748b', margin: '0 0 8px 0' }}>Seules les classes ayant déjà un cycle du même titre seront proposées.</p>
                      {Array.isArray(classesActivesValidees) && classesActivesValidees.map(cl => {
                        const estCoche = Array.isArray(modalAssistant.classesCiblesCycle) ? modalAssistant.classesCiblesCycle.includes(cl) : cl === classeSelectionneeVue;
                        return (
                          <label key={cl} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '13px', border: '1px solid #e2e8f0', padding: '8px 10px', borderRadius: '8px', backgroundColor: '#fff', marginBottom: '6px' }}>
                            <input
                              type="checkbox"
                              checked={estCoche}
                              onChange={() => {
                                const ciblesActuelles = Array.isArray(modalAssistant.classesCiblesCycle) ? modalAssistant.classesCiblesCycle : [classeSelectionneeVue].filter(Boolean);
                                const updated = estCoche ? ciblesActuelles.filter(c => c !== cl) : [...ciblesActuelles, cl];
                                setModalAssistant(prev => ({ ...prev, classesCiblesCycle: updated }));
                              }}
                            />
                            {cl}
                          </label>
                        );
                      })}
                    </div>
                  </>
                )}

                {modalAssistant.niveauCible === 'seance' && (
                  <>
                    <div>
                      <label style={styles.label}>Titre de la séance</label>
                      <input type="text" value={modalAssistant.titreSeance} onChange={(e) => setModalAssistant({...modalAssistant, titreSeance: e.target.value})} style={styles.inputStyle} required />
                    </div>
                    <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                      <label style={{ ...styles.label, marginBottom: '8px', color: '#0f172a' }}>📅 Classes cibles et date propre à chacune :</label>
                      <p style={{ fontSize: '11px', color: '#64748b', margin: '0 0 8px 0' }}>Seules les classes ayant déjà cette leçon (même titre) seront proposées.</p>
                      {Array.isArray(classesActivesValidees) && classesActivesValidees.map(cl => {
                        const estCoche = Array.isArray(modalAssistant.classesCiblesCycle) ? modalAssistant.classesCiblesCycle.includes(cl) : cl === classeSelectionneeVue;
                        return (
                          <div key={cl} style={{ display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #e2e8f0', padding: '8px 10px', borderRadius: '8px', backgroundColor: '#fff', marginBottom: '6px', flexWrap: 'wrap' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '13px', flex: '1 1 140px' }}>
                              <input
                                type="checkbox"
                                checked={estCoche}
                                onChange={() => {
                                  const ciblesActuelles = Array.isArray(modalAssistant.classesCiblesCycle) ? modalAssistant.classesCiblesCycle : [classeSelectionneeVue].filter(Boolean);
                                  const updated = estCoche ? ciblesActuelles.filter(c => c !== cl) : [...ciblesActuelles, cl];
                                  setModalAssistant(prev => ({ ...prev, classesCiblesCycle: updated }));
                                }}
                              />
                              {cl}
                            </label>
                            {estCoche && (
                              <input
                                type="date"
                                value={modalAssistant.datesParClasseCycle?.[cl] || modalAssistant.dateSeance || ''}
                                onChange={(e) => setModalAssistant(prev => ({ ...prev, datesParClasseCycle: { ...(prev.datesParClasseCycle || {}), [cl]: e.target.value } }))}
                                style={{ ...styles.inputStyle, flex: '1 1 150px', margin: 0 }}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
                  <button type="button" onClick={() => setModalAssistant({ ...modalAssistant, ouvert: false })} className="bouton bouton-secondaire">Annuler</button>
                  <button type="submit" className="bouton bouton-principal">Valider & Enregistrer</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {modalEdition.ouvert && (
          <div style={styles.fondModale}>
            <div style={{ ...styles.cardWide, width: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
              <h3 style={{ margin: '0 0 16px 0', color: '#0f172a', fontSize: '18px', fontWeight: '800' }}>✏️ Modifier {modalEdition.type}</h3>
              <form onSubmit={sauvegarderEdition} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {modalEdition.donnees && Object.entries(modalEdition.donnees).map(([key, val]) => (
                  <div key={key}>
                    <label style={styles.label}>{key.toUpperCase()}</label>
                    <input 
                      type="text" 
                      value={val || ''} 
                      onChange={(e) => setModalEdition(prev => ({ ...prev, donnees: { ...(prev.donnees || {}), [key]: e.target.value } }))} 
                      style={styles.inputStyle} 
                    />
                  </div>
                ))}
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
                  <button type="button" onClick={() => setModalEdition({ ouvert: false, type: null, cycleId: null, leconId: null, seanceId: null, donnees: {} })} className="bouton bouton-secondaire">Annuler</button>
                  <button type="submit" className="bouton bouton-principal">Enregistrer</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {modalChoixBibliotheque.ouvert && (
          <div style={styles.fondModale}>
            <div style={{ ...styles.cardWide, width: '520px', maxHeight: '80vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px', fontWeight: '800' }}>♻️ Réutiliser une fiche</h3>
                <button onClick={() => setModalChoixBibliotheque({ ouvert: false, cycleId: null, leconId: null })} className="bouton bouton-secondaire" style={{ padding: '6px 10px' }}>✕</button>
              </div>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '14px' }}>Choisissez une fiche déjà enregistrée — vous pourrez la modifier, choisir les classes cibles et les dates avant de l'envoyer, exactement comme une fiche neuve.</p>

              {bibliothequeFiltree.length === 0 ? (
                <p style={{ fontStyle: 'italic', color: '#94a3b8', fontSize: '13px', textAlign: 'center', padding: '20px' }}>Aucune fiche enregistrée dans votre bibliothèque pour l'instant.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {bibliothequeFiltree.map(item => (
                    <div key={item.id} style={styles.itemRow}>
                      <div style={{ flex: 1 }}>
                        <strong style={{ fontSize: '13px', color: '#0f172a' }}>{item.nom}</strong>
                        {(item.classeOrigine || item.dateOrigine) && (
                          <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0 0' }}>
                            {item.classeOrigine && `Créée pour ${item.classeOrigine}`}{item.dateOrigine && ` — ${item.dateOrigine}`}
                          </p>
                        )}
                      </div>
                      <button onClick={() => utiliserFicheDeLaBibliotheque(item)} className="bouton bouton-principal" style={{ fontSize: '12px', padding: '6px 12px', flexShrink: 0 }}>Utiliser</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ONGLET : PROGRAMME ANNUEL */}
        {activeTab === 'cycles' && (
          <div>
            {!classeSelectionneeVue ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 }}>Programme Annuel & Gestion par Classe</h2>
                    <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>Cliquez sur une classe pour consulter son programme annuel.</p>
                  </div>
                  {modeSansAffiliation && (
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <input 
                        type="text" 
                        placeholder="Nom de votre nouvelle classe..." 
                        value={nouvelleClasseLibre} 
                        onChange={(e) => setNouvelleClasseLibre(e.target.value)}
                        style={{ ...styles.inputStyle, width: '220px' }}
                      />
                      <button onClick={() => {
                        if (!nouvelleClasseLibre.trim()) return;
                        setClassesSansAffiliation(prev => [...(Array.isArray(prev) ? prev : []), nouvelleClasseLibre.trim()]);
                        setNouvelleClasseLibre('');
                        showToast("Classe libre ajoutée avec succès !");
                      }} className="bouton bouton-principal">+ Ajouter</button>
                    </div>
                  )}
                </div>

                <div style={styles.grilleClasses}>
                  {Array.isArray(classesActivesValidees) && classesActivesValidees.map(cl => {
                    const progExiste = programmesClasses && !!programmesClasses[cl];
                    return (
                      <div key={cl} style={styles.carteClasseItem}>
                        <div onClick={() => { setClasseSelectionneeVue(cl); if (!progExiste) initialiserProgrammeClasse(cl); }} style={{ cursor: 'pointer' }}>
                          <span style={{ fontSize: '16px', fontWeight: '800', color: '#1e293b' }}>🏫 {cl}</span>
                          <p style={{ fontSize: '12px', color: '#64748b', margin: '6px 0 12px 0' }}>
                            {progExiste && programmesClasses[cl]?.cycles ? `${programmesClasses[cl].cycles.length} cycle(s) au programme` : 'Cliquez pour initialiser'}
                          </p>
                          <span style={{ fontSize: '12px', fontWeight: '800', color: '#2563eb' }}>Ouvrir le programme →</span>
                        </div>

                        {/* BOUTON SUPPRESSION CLASSE SÉCURISÉ PAR MODALE — uniquement sur les
                            classes personnelles, jamais sur une classe affiliée à un établissement */}
                        {Array.isArray(classesSansAffiliation) && classesSansAffiliation.includes(cl) && (
                          <div style={{ marginTop: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '8px', textAlign: 'right' }}>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setModalConfirmation({
                                  ouvert: true,
                                  titre: '⚠️ Supprimer cette classe ?',
                                  message: `Voulez-vous vraiment supprimer la classe "${cl}" ? Cette action est irréversible.`,
                                  actionCallback: () => supprimerClasseLibre(cl)
                                });
                              }} 
                              className="bouton bouton-danger"
                              style={{ padding: '6px 10px', fontSize: '11px' }}
                            >
                              🗑️ Supprimer
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <button onClick={() => setClasseSelectionneeVue(null)} className="bouton bouton-secondaire" style={{ marginBottom: '8px' }}>← Retour aux classes</button>
                    <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', margin: 0 }}>Programme : <span style={{ color: '#2563eb' }}>{classeSelectionneeVue}</span></h2>
                  </div>
                  {Array.isArray(programmesClasses?.[classeSelectionneeVue]?.cycles) && programmesClasses[classeSelectionneeVue].cycles.length > 0 && (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button onClick={() => telechargerProgrammeAnnuelPDF(programmesClasses?.[classeSelectionneeVue], classeSelectionneeVue)} className="bouton bouton-secondaire">
                        📥 Télécharger Programme PDF
                      </button>
                      <button onClick={() => setModalAssistant({ ouvert: true, niveauCible: 'cycle', classesCiblesCycle: classeSelectionneeVue ? [classeSelectionneeVue] : [] })} className="bouton bouton-principal">
                        + Ajouter un cycle
                      </button>
                    </div>
                  )}
                </div>

                {!(Array.isArray(programmesClasses?.[classeSelectionneeVue]?.cycles) && programmesClasses[classeSelectionneeVue].cycles.length > 0) ? (
                  <div style={{ textAlign: 'center', padding: '50px 20px', backgroundColor: '#ffffff', borderRadius: '24px', border: '1px dashed #cbd5e1' }}>
                    <div style={{ fontSize: '46px', marginBottom: '10px' }}>📖</div>
                    <h3 style={{ fontSize: '17px', fontWeight: '900', color: '#0f172a', margin: '0 0 6px 0' }}>Le programme de {classeSelectionneeVue} est encore vide</h3>
                    <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 28px 0' }}>Choisissez comment vous voulez démarrer — vous pourrez toujours ajouter d'autres cycles ensuite, quelle que soit l'option choisie.</p>
                    <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => setModalAssistant({ ouvert: true, niveauCible: 'cycle', classesCiblesCycle: classeSelectionneeVue ? [classeSelectionneeVue] : [] })}
                        style={{ width: '220px', textAlign: 'left', padding: '20px', borderRadius: '18px', border: '1px solid #bfdbfe', backgroundColor: '#eff6ff', cursor: 'pointer' }}
                      >
                        <div style={{ fontSize: '26px', marginBottom: '8px' }}>🚀</div>
                        <p style={{ fontSize: '14px', fontWeight: '900', color: '#1e3a8a', margin: '0 0 4px 0' }}>Cycle par cycle</p>
                        <p style={{ fontSize: '12px', color: '#475569', margin: 0 }}>Créez un premier cycle maintenant, les suivants au fil de l'année.</p>
                      </button>
                      <button
                        onClick={() => setModalAssistant({ ouvert: true, niveauCible: 'programme_annuel', titreProgramme: `Prog. ${classeSelectionneeVue}`, cyclesProgramme: [{ id: Date.now(), titre: 'Cycle 1', competence: '', nbLecons: '' }], classesCiblesCycle: [classeSelectionneeVue] })}
                        style={{ width: '220px', textAlign: 'left', padding: '20px', borderRadius: '18px', border: '1px solid #ddd6fe', backgroundColor: '#f5f3ff', cursor: 'pointer' }}
                      >
                        <div style={{ fontSize: '26px', marginBottom: '8px' }}>📊</div>
                        <p style={{ fontSize: '14px', fontWeight: '900', color: '#4c1d95', margin: '0 0 4px 0' }}>Toute l'année d'un coup</p>
                        <p style={{ fontSize: '12px', color: '#475569', margin: 0 }}>Posez le squelette de tous vos cycles maintenant, remplissez-les ensuite.</p>
                      </button>
                    </div>
                  </div>
                ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {programmesClasses?.[classeSelectionneeVue]?.cycles && Array.isArray(programmesClasses[classeSelectionneeVue].cycles) && programmesClasses[classeSelectionneeVue].cycles.map(cycle => {
                    const estCycleOuvert = !!cyclesOuverts[cycle.id];
                    return (
                      <div key={cycle.id} style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '20px', borderLeft: '6px solid #2563eb', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', flex: 1 }} onClick={() => toggleCycle(cycle.id)}>
                            <span style={{ fontSize: '16px', fontWeight: '800', color: '#2563eb' }}>{estCycleOuvert ? '▼' : '▶'}</span>
                            <div>
                              <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: '0 0 2px 0' }}>📁 {cycle.titre}</h3>
                              <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                                <strong>Compétence :</strong> {cycle.competence} | 
                                <strong>Période :</strong> {cycle.dateDebut && cycle.dateFin ? `Du ${cycle.dateDebut} au ${cycle.dateFin}` : 'Non précisée'}
                              </p>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                            <button onClick={() => telechargerCyclePDF(cycle)} className="bouton bouton-succes" style={{ padding: '6px 10px', fontSize: '11px' }}>📥 Cycle PDF</button>
                            <button onClick={() => ouvrirModalEdition('cycle', cycle.id)} className="bouton bouton-secondaire" style={{ padding: '6px 10px', fontSize: '11px' }}>✏️ Modifier</button>
                            <button onClick={() => setModalDuplicationIntelligente({ ouvert: true, itemSource: cycle, typeSource: 'cycle', classesCibles: [], datesParClasse: {} })} className="bouton bouton-secondaire" style={{ padding: '6px 10px', fontSize: '11px', color: '#2563eb' }}>⚡ Dupliquer</button>
                            {cycle.statut !== 'Terminé' && (
                              <button onClick={() => marquerCycleTermine(cycle.id)} className="bouton bouton-succes" style={{ padding: '6px 10px', fontSize: '11px' }}>🏆 Terminer</button>
                            )}
                            <span style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '800', backgroundColor: cycle.statut === 'Terminé' ? '#dcfce7' : '#e0f2fe', color: cycle.statut === 'Terminé' ? '#166534' : '#0369a1' }}>{cycle.statut}</span>
                          </div>
                        </div>

                        {estCycleOuvert && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px', borderTop: '1px solid #f1f5f9', paddingTop: '16px', paddingLeft: '10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <h4 style={{ fontSize: '13px', fontWeight: '800', color: '#334155', margin: 0 }}>📖 Leçons de ce cycle :</h4>
                              <button onClick={() => {
                                const prochainTitre = (cycle.planLecons || [])[(cycle.lecons || []).length] || '';
                                setModalAssistant(prev => ({ ...prev, ouvert: true, niveauCible: 'lecon', cycleIdCible: cycle.id, titreLecon: prochainTitre, valeursChampsLecon: {}, nombreSeancesLecon: '3', planSeances: [], classesCiblesCycle: classeSelectionneeVue ? [classeSelectionneeVue] : [] }));
                              }} className="bouton bouton-secondaire" style={{ padding: '4px 10px', fontSize: '11px', color: '#2563eb' }}>
                                + Créer une Leçon
                              </button>
                            </div>

                            {Array.isArray(cycle.lecons) && cycle.lecons.map(lecon => {
                              const estLeconOuverte = !!leconsOuvertes[lecon.id];
                              return (
                                <div key={lecon.id} style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '14px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', flex: 1 }} onClick={() => toggleLecon(lecon.id)}>
                                      <span style={{ fontSize: '14px', fontWeight: '800', color: '#2563eb' }}>{estLeconOuverte ? '▼' : '▶'}</span>
                                      <h5 style={{ fontSize: '13px', fontWeight: '800', color: '#1e293b', margin: 0 }}>
                                        {lecon.titre} <span style={{ fontSize: '11px', color: '#64748b' }}>(Séances : {lecon.nombreSeancesPrevues})</span>
                                      </h5>
                                    </div>

                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                                      <button onClick={() => telechargerLeconPDF(lecon, cycle)} className="bouton bouton-principal" style={{ padding: '4px 8px', fontSize: '10px' }}>📥 Leçon PDF</button>
                                      <button onClick={() => ouvrirModalEdition('lecon', cycle.id, lecon.id)} className="bouton bouton-secondaire" style={{ padding: '4px 8px', fontSize: '10px' }}>✏️ Modifier</button>
                                      {!lecon.soumisAuCenseur && (
                                        <button onClick={() => soumettreAuCenseur('lecon', cycle.id, lecon.id)} className="bouton bouton-succes" style={{ padding: '4px 8px', fontSize: '10px' }}>🚀 Envoyer la fiche de leçon</button>
                                      )}
                                      {lecon.statut !== 'Terminée' && (
                                        <button onClick={() => marquerLeconTerminee(cycle.id, lecon.id)} className="bouton bouton-succes" style={{ padding: '4px 8px', fontSize: '10px' }}>🏁 Terminer</button>
                                      )}
                                      <span style={{ fontSize: '10px', fontWeight: '800', padding: '2px 6px', borderRadius: '4px', backgroundColor: lecon.statut === 'Terminée' ? '#dcfce7' : '#fef3c7', color: lecon.statut === 'Terminée' ? '#166534' : '#92400e' }}>{lecon.statut}</span>
                                    </div>
                                  </div>

                                  {estLeconOuverte && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px', borderTop: '1px dashed #cbd5e1', paddingTop: '12px', paddingLeft: '10px' }}>
                                      {Array.isArray(lecon.seances) && lecon.seances.map(seance => (
                                        <div key={seance.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '10px' }}>
                                          <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '2px' }}>
                                              <span style={{ fontWeight: '800', color: '#2563eb', fontSize: '11px' }}>Séance #{seance.numero}</span>
                                              <strong style={{ fontSize: '12px', color: '#0f172a' }}>{seance.titre}</strong>
                                              <span style={{ fontSize: '10px', color: '#64748b', backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>📅 {seance.date}</span>
                                              {seance.soumisAuCenseur && <span style={{ fontSize: '9px', backgroundColor: '#dcfce7', color: '#166534', padding: '2px 4px', borderRadius: '4px', fontWeight: '800' }}>✓ Envoyé</span>}
                                            </div>
                                          </div>
                                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                                            <button onClick={() => ouvrirModalEdition('seance', cycle.id, lecon.id, seance.id)} className="bouton bouton-secondaire" style={{ padding: '4px 8px', fontSize: '10px' }}>✏️ Modifier</button>
                                            <button onClick={() => telechargerFicheSeancePDF(seance, lecon, cycle)} className="bouton bouton-principal" style={{ padding: '4px 8px', fontSize: '10px' }}>📥 Séance PDF</button>
                                            <button onClick={() => enregistrerDansBibliotheque(seance.id, seance.titre)} className="bouton bouton-secondaire" style={{ padding: '4px 8px', fontSize: '10px' }}>💾 Enregistrer</button>

                                            {!(Array.isArray(classesSansAffiliation) && classesSansAffiliation.includes(classeSelectionneeVue)) && !seance.soumisAuCenseur && (
                                              <button onClick={() => soumettreAuCenseur('seance', cycle.id, lecon.id, seance.id)} className="bouton bouton-succes" style={{ padding: '4px 8px', fontSize: '10px' }}>
                                                🚀 Envoyé
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      ))}

                                      <div style={{ marginTop: '6px', display: 'flex', gap: '8px' }}>
                                        <button onClick={() => {
                                          const prochainTitre = (lecon.planSeances || [])[(lecon.seances || []).length] || '';
                                          setModalAssistant(prev => ({ ...prev, ouvert: true, niveauCible: 'seance', cycleIdCible: cycle.id, leconIdCible: lecon.id, dateSeance: new Date().toISOString().split('T')[0], titreSeance: prochainTitre, valeursChamps: {}, referenceLeconValeurs: lecon.contenuJson || {}, classesCiblesCycle: classeSelectionneeVue ? [classeSelectionneeVue] : [], datesParClasseCycle: {} }));
                                        }} className="bouton bouton-secondaire" style={{ fontSize: '11px', flex: 1, borderStyle: 'dashed', padding: '8px' }}>
                                          + Ajouter une nouvelle séance
                                        </button>
                                        <button onClick={() => setModalChoixBibliotheque({ ouvert: true, cycleId: cycle.id, leconId: lecon.id })} className="bouton bouton-secondaire" style={{ fontSize: '11px', flex: 1, borderStyle: 'dashed', padding: '8px', color: '#7c3aed' }}>
                                          ♻️ Réutiliser une fiche
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ONGLET : BIBLIOTHÈQUE */}
        {activeTab === 'bibliotheque' && (
          <div style={styles.cardWide}>
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 }}>Bibliothèque & Base de Données Permanente</h2>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>Vos fiches enregistrées, réutilisables à tout moment (bouton "💾 Enregistrer" sur chaque séance). Pour les réutiliser : ouvrez la classe cible, la leçon concernée, puis "♻️ Réutiliser une fiche".</p>
            </div>

            <div style={styles.bibliothequeFilterBox}>
              <div style={{ flex: '1 1 240px' }}>
                <label style={styles.labelFiltre}>Recherche</label>
                <input type="text" placeholder="Titre de la fiche..." value={filtreBiblioTexte} onChange={(e) => setFiltreBiblioTexte(e.target.value)} style={styles.inputStyle} />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px' }}>
              {bibliothequeFiltree.length === 0 ? (
                <p style={{ fontStyle: 'italic', color: '#94a3b8', fontSize: '13px', textAlign: 'center', padding: '30px' }}>Aucune fiche enregistrée pour l'instant.</p>
              ) : (
                bibliothequeFiltree.map(b => (
                  <div key={b.id} style={styles.itemRow}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                        {b.classeOrigine && <span style={{ backgroundColor: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700' }}>{b.classeOrigine}</span>}
                        <strong style={{ fontSize: '14px', color: '#0f172a' }}>{b.nom}</strong>
                      </div>
                      {b.dateOrigine && <p style={{ fontSize: '12px', color: '#475569', margin: 0 }}>Créée le {b.dateOrigine}</p>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ONGLET : RAPPORTS DE SÉANCE */}
        {activeTab === 'rapports' && (
          <div style={styles.cardWide}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 }}>📝 Rapports de Séance Transmis</h2>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>Historique de vos comptes-rendus envoyés au censeur.</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {!Array.isArray(rapportsSeances) || rapportsSeances.length === 0 ? (
                <p style={{ fontStyle: 'italic', color: '#94a3b8', fontSize: '13px', textAlign: 'center', padding: '30px' }}>Aucun rapport transmis.</p>
              ) : (
                rapportsSeances.map(r => (
                  <div key={r.id} style={styles.itemRow}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700' }}>
                          Classes: {Array.isArray(r.classesCibles) ? r.classesCibles.join(', ') : ''}
                        </span>
                        <strong style={{ fontSize: '14px', color: '#0f172a' }}>{r.seanceTitre}</strong>
                      </div>
                      <p style={{ fontSize: '13px', color: '#334155', margin: '4px 0' }}><strong>Compte rendu :</strong> {r.contenuRapport}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ONGLET : ÉCOLES & BOUTON QUITTER L'ÉTABLISSEMENT */}
        {activeTab === 'affiliation' && (
          <div style={styles.cardWide}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0' }}>🏫 Gestion des Établissements & Demandes de Départ</h2>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Initiez une demande de départ (soumise au visa du censeur) ou demandez une affiliation.</p>
              </div>
              <button onClick={() => setModalAffiliation(true)} className="bouton bouton-succes">
                + Demander une affiliation
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
              {!Array.isArray(affiliations) || affiliations.length === 0 ? (
                <p style={{ fontSize: '13px', fontStyle: 'italic', color: '#94a3b8' }}>Aucune école affiliée pour le moment.</p>
              ) : (
                affiliations.map(aff => {
                  const demandeEnCours = Array.isArray(demandesDepart) ? demandesDepart.find(d => d.ecoleId === aff.id && d.statut.includes('En attente')) : null;
                  return (
                    <div key={aff.id} style={styles.itemRow}>
                      <div>
                        <strong style={{ color: '#0f172a', fontSize: '14px' }}>{aff.ecole}</strong> <span style={{ color: '#64748b', fontSize: '12px' }}>({aff.statut})</span><br/>
                        <small style={{ color: '#64748b', fontSize: '12px' }}>Classes : <strong>{Array.isArray(aff.classes) ? aff.classes.join(', ') : ''}</strong></small>
                        {demandeEnCours && (
                          <div style={{ marginTop: '4px' }}>
                            <span style={{ fontSize: '11px', backgroundColor: '#fef3c7', color: '#92400e', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>
                              ⏳ Demande de départ en cours (Visa censeur requis)
                            </span>
                          </div>
                        )}
                      </div>
                      <div>
                        {!demandeEnCours ? (
                          <button onClick={() => setModalDepart({ ouvert: true, ecoleId: aff.id, ecoleNom: aff.ecole, motif: '' })} className="bouton bouton-danger" style={{ padding: '8px 14px', fontSize: '12px', fontWeight: '800' }}>
                            🚪 Quitter l'établissement
                          </button>
                        ) : (
                          <span style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>En attente de visa...</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

const styles = {
  container: { backgroundColor: '#f8fafc', minHeight: '100vh', color: '#1e293b', paddingBottom: '40px', overflowX: 'hidden', boxSizing: 'border-box', width: '100%' },
  darkNavbar: { backgroundColor: '#0f172a', color: '#ffffff', padding: '12px 16px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', borderBottom: '1px solid #1e293b', position: 'sticky', top: '0', zIndex: 100, width: '100%', boxSizing: 'border-box' },
  mainContentBody: { padding: '20px 12px', maxWidth: '1200px', margin: '0 auto', boxSizing: 'border-box', width: '100%', overflowX: 'hidden' },
  cardWide: { backgroundColor: '#ffffff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', boxSizing: 'border-box', width: '100%', overflowX: 'hidden' },
  grilleClasses: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginTop: '16px', width: '100%', boxSizing: 'border-box' },
  carteClasseItem: { backgroundColor: '#ffffff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', boxSizing: 'border-box' },
  bibliothequeFilterBox: { display: 'flex', gap: '12px', backgroundColor: '#f8fafc', padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0', marginBottom: '20px', flexWrap: 'wrap', boxSizing: 'border-box' },
  labelFiltre: { display: 'block', fontSize: '11px', fontWeight: '800', color: '#475569', marginBottom: '6px', textTransform: 'uppercase' },
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
  notifItem: { backgroundColor: '#f8fafc', padding: '8px', borderRadius: '8px', fontSize: '11px', marginBottom: '4px', border: '1px solid #f1f5f9', cursor: 'pointer' },
  navDarkBtn: { backgroundColor: '#1e293b', color: '#f8fafc', border: '1px solid #334155', padding: '6px 10px', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', position: 'relative' },
  fondModale: { position: 'fixed', top: '0', left: '0', right: '0', bottom: '0', background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: '1000', padding: '12px', boxSizing: 'border-box' },
  pastilleAlerte: { backgroundColor: '#ef4444', color: 'white', padding: '1px 4px', borderRadius: '999px', fontSize: '9px', fontWeight: '800', position: 'absolute', top: '-4px', right: '-4px' },
  burgerBtn: { backgroundColor: '#2563eb', color: '#ffffff', border: 'none', padding: '6px 10px', borderRadius: '10px', fontSize: '14px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(37,99,235,0.3)' },
  burgerDropdown: { position: 'absolute', top: '42px', backgroundColor: '#ffffff', borderRadius: '14px', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.2)', border: '1px solid #e2e8f0', width: '220px', maxWidth: '85vw', zIndex: 120, padding: '10px', display: 'flex', flexDirection: 'column', gap: '4px', boxSizing: 'border-box' }
};
