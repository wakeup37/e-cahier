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
//   - bibliotheque, rapportsSeances, demandesDepart, demandePromotionCenseur,
//     propositionsCenseur, notifications, modeSansAffiliation (paiement),
//     classesSansAffiliation, executerDuplicationIntelligente,
//     sauvegarderEdition (modification d'un élément existant),
//     executerConsultationEtReutilisation, la branche 'programme_annuel'
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

  const [demandesDepart, setDemandesDepart] = useState(() => {
    try { return JSON.parse(localStorage.getItem('app_enseignant_demandes_depart')) || []; }
    catch { return []; }
  });
  useEffect(() => { localStorage.setItem('app_enseignant_demandes_depart', JSON.stringify(demandesDepart)); }, [demandesDepart]);

  const [modalDepart, setModalDepart] = useState({ ouvert: false, ecoleId: null, ecoleNom: '', motif: '' });

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
    if (modeSansAffiliation) return classesSansAffiliation;
    let classes = [];
    affiliations.forEach(aff => {
      if (aff.statut === 'Validée' && Array.isArray(aff.classes)) {
        aff.classes.forEach(cl => { if (!classes.includes(cl)) classes.push(cl); });
      }
    });
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

  const [notifications, setNotifications] = useState(() => {
    try { return JSON.parse(localStorage.getItem('app_enseignant_notifications')) || []; }
    catch { return []; }
  });
  useEffect(() => { localStorage.setItem('app_enseignant_notifications', JSON.stringify(notifications)); }, [notifications]);
  const [notifOuvert, setNotifOuvert] = useState(false);
  const notifRef = useRef(null);

  // --- PROFIL (Supabase) ---
  const [infosEnseignant, setInfosEnseignant] = useState({
    civilite: 'M.', nom: '', prenoms: '', ville: '', matiere: '', photoProfil: '',
    etablissementSaisi: '', classesSelectionneesEnCours: [], emailSecurite: ''
  });

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

  const [bibliotheque, setBibliotheque] = useState(() => {
    try { return JSON.parse(localStorage.getItem('app_enseignant_bibliotheque_permanente')) || []; }
    catch { return []; }
  });
  useEffect(() => { localStorage.setItem('app_enseignant_bibliotheque_permanente', JSON.stringify(bibliotheque)); }, [bibliotheque]);

  const [filtreBiblioAnnee, setFiltreBiblioAnnee] = useState('2025-2026');
  const [filtreBiblioClasse, setFiltreBiblioClasse] = useState('TOUTES');
  const [filtreBiblioTexte, setFiltreBiblioTexte] = useState('');

  const [modalConsulterReutiliser, setModalConsulterReutiliser] = useState({
    ouvert: false, item: null, donneesModifiees: {}, classesSelectionnees: [], datesParClasse: {}
  });

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

  const [cyclesOuverts, setCyclesOuverts] = useState({});
  const [leconsOuvertes, setLeconsOuvertes] = useState({});
  const toggleCycle = (cycleId) => setCyclesOuverts(prev => ({ ...prev, [cycleId]: !prev[cycleId] }));
  const toggleLecon = (leconId) => setLeconsOuvertes(prev => ({ ...prev, [leconId]: !prev[leconId] }));

  const [modalAssistant, setModalAssistant] = useState({
    ouvert: false, niveauCible: 'cycle', cycleIdCible: null, leconIdCible: null,
    titreProgramme: '', cyclesProgramme: [{ id: Date.now(), titre: 'Cycle 1', duree: '3 semaines', nbLecons: 2 }],
    titreCycle: '', competenceCycle: '',
    dateDebutCycle: new Date().toISOString().split('T')[0], dateFinCycle: new Date().toISOString().split('T')[0],
    titreLecon: '', nombreSeancesLecon: '3', titreSeance: '',
    dateSeance: new Date().toISOString().split('T')[0], lieuSeance: '',
    valeursChamps: {}, fichiersMultimedias: [], ecolesCiblesCycle: [], classesCiblesCycle: [], datesParClasseCycle: {}
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

    const { data: profil } = await supabase
      .from('utilisateurs_profils').select('*').eq('user_id', user.id).single();

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
      ecole: a.etablissements?.nom || '',
      statut: mapStatut(a.statut),
      classes: (attributions || [])
        .filter(at => at.etablissement_id === a.etablissement_id)
        .map(at => at.classes?.nom)
        .filter(Boolean),
    }));
    setAffiliations(affiliationsFormatees);

    if (profil) {
      const premiereEcole = affiliationsFormatees.find(a => a.statut === 'Validée')?.ecole || '';
      setInfosEnseignant(prev => ({
        ...prev, nom: profil.nom, prenoms: profil.prenom,
        emailSecurite: user.email, etablissementSaisi: premiereEcole,
      }));
      setFormProfil(prev => ({ ...prev, nom: profil.nom, prenoms: profil.prenom, etablissementSaisi: premiereEcole }));
    }

    // Séances de l'enseignant (tous statuts), regroupées par classe pour coller au JSX
    const { data: seances } = await supabase
      .from('seances')
      .select(`
        id, date_prevue, statut, contenu_json,
        classes ( nom ),
        lecons (
          id, titre, statut,
          cycles ( id, titre, statut, competence:titre, dateDebut:created_at,
            programmes_annuels ( id, proprietaire_user_id )
          )
        )
      `)
      .order('created_at', { ascending: true });

    const groupe = {};
    (seances || []).forEach((sc) => {
      const cycle = sc.lecons?.cycles;
      const programme = cycle?.programmes_annuels;
      if (!programme || programme.proprietaire_user_id !== user.id) return; // sécurité côté client, RLS protège déjà côté serveur
      const classeNom = sc.classes?.nom || classeSelectionneeVue || 'Sans classe';
      if (!groupe[classeNom]) groupe[classeNom] = { anneeScolaire: '', cycles: [] };
      let cy = groupe[classeNom].cycles.find(c => c.id === cycle.id);
      if (!cy) {
        cy = { id: cycle.id, titre: cycle.titre, competence: '', dateDebut: '', dateFin: '', statut: cycle.statut === 'TERMINE' ? 'Terminé' : 'En cours', lecons: [] };
        groupe[classeNom].cycles.push(cy);
      }
      let lc = cy.lecons.find(l => l.id === sc.lecons.id);
      if (!lc) {
        lc = { id: sc.lecons.id, titre: sc.lecons.titre, nombreSeancesPrevues: 0, statut: sc.lecons.statut === 'TERMINEE' ? 'Terminée' : 'En cours', seances: [] };
        cy.lecons.push(lc);
      }
      lc.seances.push({
        id: sc.id,
        numero: lc.seances.length + 1,
        titre: sc.contenu_json?.titre || 'Séance',
        date: sc.date_prevue,
        lieu: sc.contenu_json?.lieu || '',
        valeursChamps: sc.contenu_json || {},
        statut: 'En cours',
        soumisAuCenseur: sc.statut !== 'BROUILLON',
        fichiersMultimedias: [],
      });
    });
    setProgrammesClasses(groupe);

    setChargementInitial(false);
  };

  useEffect(() => { chargerTout(); }, []);

  // =========================================================================
  // HELPERS DE RÉSOLUTION DE CONTEXTE (établissement / année / classe réelle)
  // =========================================================================
  const resoudreContexteClasse = async (classeNom) => {
    if (modeSansAffiliation) return { etablissementId: null, anneeScolaireId: null, classeId: null };
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
    if (programmesAnnuelsCache.current[cle]) return programmesAnnuelsCache.current[cle];

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
      return existant.id;
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

    if (error) { showToast("⚠️ Erreur création programme : " + error.message); return null; }
    programmesAnnuelsCache.current[cle] = nouveau.id;
    return nouveau.id;
  };

  // =========================================================================
  // LOGIQUE MÉTIER — Supabase pour les parties clés, reste en local sinon
  // =========================================================================
  const handleEnregistrerProfil = async (e) => {
    e.preventDefault();
    if (!userId) return;
    const { error } = await supabase
      .from('utilisateurs_profils').update({ nom: formProfil.nom, prenom: formProfil.prenoms }).eq('user_id', userId);
    if (error) { showToast("⚠️ Erreur : " + error.message); return; }
    setInfosEnseignant({ ...formProfil });
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

  const soumettreDemandeDepart = (e) => {
    e.preventDefault();
    if (!modalDepart.ecoleId) return;
    const nouvelleDemande = {
      id: Date.now(), ecoleId: modalDepart.ecoleId, ecoleNom: modalDepart.ecoleNom, motif: modalDepart.motif,
      dateDemande: new Date().toLocaleDateString(), statut: 'En attente du visa du censeur'
    };
    setDemandesDepart(prev => [nouvelleDemande, ...prev]);
    setModalDepart({ ouvert: false, ecoleId: null, ecoleNom: '', motif: '' });
    showToast("📤 Demande de départ transmise au censeur pour visa officiel !");
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
    const { niveauCible, cycleIdCible, leconIdCible, titreCycle, competenceCycle, titreLecon, nombreSeancesLecon,
      titreSeance, dateSeance, lieuSeance, valeursChamps, classesCiblesCycle, cyclesProgramme, titreProgramme } = modalAssistant;

    // --- Branche NON câblée sur Supabase (reste locale, voir note en tête de fichier) ---
    if (niveauCible === 'programme_annuel') {
      if (!Array.isArray(classesCiblesCycle) || classesCiblesCycle.length === 0) {
        showToast("⚠️ Veuillez sélectionner au moins une classe cible pour ce programme.");
        return;
      }
      classesCiblesCycle.forEach(classeCible => {
        let nouveauxCyclesGeneres = cyclesProgramme.map(cp => {
          let leconsGenerees = [];
          for (let i = 1; i <= cp.nbLecons; i++) {
            leconsGenerees.push({ id: Date.now() + Math.random(), titre: `Leçon ${i} du ${cp.titre}`, nombreSeancesPrevues: 3, statut: 'En attente', soumisAuCenseur: false, seances: [] });
          }
          return { id: Date.now() + Math.random(), titre: cp.titre, competence: `Compétence pour ${cp.titre}`, dateDebut: new Date().toISOString().split('T')[0], dateFin: new Date().toISOString().split('T')[0], dureeEstimee: cp.duree, statut: 'En attente', soumisAuCenseur: false, lecons: leconsGenerees };
        });
        setProgrammesClasses(prev => ({ ...(prev || {}), [classeCible]: { anneeScolaire: '2025-2026', titre: titreProgramme, cycles: nouveauxCyclesGeneres } }));
      });
      showToast("✨ Programme annuel complet généré (local uniquement pour l'instant) !");
      setModalAssistant({ ...modalAssistant, ouvert: false });
      return;
    }

    // --- Branche CYCLE : vraie création Supabase ---
    if (niveauCible === 'cycle') {
      if (!Array.isArray(classesCiblesCycle) || classesCiblesCycle.length === 0) {
        showToast("⚠️ Veuillez sélectionner au moins une classe cible pour ce cycle.");
        return;
      }
      const { etablissementId, anneeScolaireId } = await resoudreContexteClasse(classesCiblesCycle[0]);
      const programmeAnnuelId = await getOuCreerProgrammeAnnuel(etablissementId, anneeScolaireId);
      if (!programmeAnnuelId) return;

      const { data: nouveauCycle, error } = await supabase
        .from('cycles').insert({ programme_annuel_id: programmeAnnuelId, titre: titreCycle || 'Nouveau Cycle', statut: 'EN_COURS' }).select().single();
      if (error) { showToast("⚠️ Erreur : " + error.message); return; }

      classesCiblesCycle.forEach(classeCible => {
        if (!programmesClasses[classeCible]) initialiserProgrammeClasse(classeCible);
        const progCible = programmesClasses[classeCible] || { anneeScolaire: '', cycles: [] };
        const cycleLocal = { id: nouveauCycle.id, titre: nouveauCycle.titre, competence: competenceCycle || '', dateDebut: '', dateFin: '', statut: 'En cours', soumisAuCenseur: false, lecons: [] };
        setProgrammesClasses(prev => ({ ...(prev || {}), [classeCible]: { ...progCible, cycles: [...(progCible.cycles || []), cycleLocal] } }));
      });
      showToast("✨ Cycle créé avec succès !");
    }

    // --- Branche LEÇON : vraie création Supabase ---
    else if (niveauCible === 'lecon') {
      if (!classeSelectionneeVue) return;
      const { data: nouvelleLecon, error } = await supabase
        .from('lecons').insert({ cycle_id: cycleIdCible, titre: titreLecon || 'Nouvelle Leçon', statut: 'EN_COURS' }).select().single();
      if (error) { showToast("⚠️ Erreur : " + error.message); return; }

      const progClasse = programmesClasses[classeSelectionneeVue];
      const cyclesMaj = (progClasse?.cycles || []).map(c => c.id !== cycleIdCible ? c : {
        ...c, lecons: [...(c.lecons || []), { id: nouvelleLecon.id, titre: nouvelleLecon.titre, nombreSeancesPrevues: parseInt(nombreSeancesLecon) || 3, statut: 'En cours', soumisAuCenseur: false, seances: [] }]
      });
      setProgrammesClasses({ ...(programmesClasses || {}), [classeSelectionneeVue]: { ...progClasse, cycles: cyclesMaj } });
      showToast("Leçon créée !");
    }

    // --- Branche SÉANCE : vraie création Supabase ---
    else if (niveauCible === 'seance') {
      if (!classeSelectionneeVue) return;
      const { classeId } = await resoudreContexteClasse(classeSelectionneeVue);

      const { data: nouvelleSeance, error } = await supabase
        .from('seances')
        .insert({
          lecon_id: leconIdCible,
          classe_id: classeId,
          date_prevue: dateSeance || null,
          contenu_json: { titre: titreSeance || 'Séance pédagogique', lieu: lieuSeance || '', ...(valeursChamps || {}) },
          statut: 'BROUILLON',
        })
        .select().single();

      if (error) { showToast("⚠️ Erreur : " + error.message); return; }

      const progClasse = programmesClasses[classeSelectionneeVue];
      const cyclesMaj = (progClasse?.cycles || []).map(c => c.id !== cycleIdCible ? c : {
        ...c,
        lecons: (c.lecons || []).map(l => l.id !== leconIdCible ? l : {
          ...l,
          seances: [...(l.seances || []), {
            id: nouvelleSeance.id, numero: (l.seances || []).length + 1, titre: titreSeance || 'Séance pédagogique',
            date: dateSeance, lieu: lieuSeance, valeursChamps: valeursChamps || {}, fichiersMultimedias: [], statut: 'En cours', soumisAuCenseur: false,
          }]
        })
      });
      setProgrammesClasses({ ...(programmesClasses || {}), [classeSelectionneeVue]: { ...progClasse, cycles: cyclesMaj } });
      showToast("Séance créée !");
    }

    setModalAssistant({
      ouvert: false, niveauCible: 'programme', cycleIdCible: null, leconIdCible: null,
      titreCycle: '', competenceCycle: '', dateDebutCycle: '', dateFinCycle: '',
      titreLecon: '', nombreSeancesLecon: '3', titreSeance: '',
      dateSeance: new Date().toISOString().split('T')[0], lieuSeance: '',
      valeursChamps: {}, fichiersMultimedias: [], ecolesCiblesCycle: [], classesCiblesCycle: [], datesParClasseCycle: {},
      titreProgramme: '', cyclesProgramme: [{ id: Date.now(), titre: 'Cycle 1', duree: '3 semaines', nbLecons: 2 }]
    });
  };

  // Reste en local pour cette passe (voir note en tête de fichier)
  const executerConsultationEtReutilisation = (e) => {
    e.preventDefault();
    const { item, donneesModifiees, classesSelectionnees, datesParClasse } = modalConsulterReutiliser;
    if (!Array.isArray(classesSelectionnees) || classesSelectionnees.length === 0) {
      showToast("⚠️ Veuillez sélectionner au moins une classe cible.");
      return;
    }
    classesSelectionnees.forEach(classeCible => {
      const dateAttribuee = (datesParClasse && datesParClasse[classeCible]) || new Date().toISOString().split('T')[0];
      const progCible = programmesClasses[classeCible] || { anneeScolaire: '2025-2026', cycles: [] };
      const nouvelleSeanceReutilisee = {
        id: Date.now() + Math.random(), numero: 1,
        titre: (donneesModifiees && donneesModifiees.nom) || (item && item.nom) || 'Séance réutilisée',
        date: dateAttribuee, lieu: 'Gymnase',
        valeursChamps: (donneesModifiees && donneesModifiees.valeursChamps) || (item && item.valeursChamps) || {},
        fichiersMultimedias: (item && item.fichiersMultimedias) || [], statut: 'En cours', soumisAuCenseur: false
      };
      setProgrammesClasses(prev => {
        let cyclesCible = Array.isArray(progCible.cycles) ? [...progCible.cycles] : [];
        if (cyclesCible.length === 0) {
          cyclesCible.push({ id: Date.now(), titre: 'Cycle Général', competence: 'Compétence', dateDebut: '2026-01-01', dateFin: '2026-06-30', statut: 'En cours',
            lecons: [{ id: Date.now() + 1, titre: 'Leçon Générale', nombreSeancesPrevues: 3, statut: 'En cours', seances: [nouvelleSeanceReutilisee] }] });
        } else {
          let premierCycle = { ...cyclesCible[0] };
          let leconsCibles = Array.isArray(premierCycle.lecons) ? [...premierCycle.lecons] : [];
          if (leconsCibles.length === 0) {
            leconsCibles.push({ id: Date.now() + 1, titre: 'Leçon Générale', nombreSeancesPrevues: 3, statut: 'En cours', seances: [nouvelleSeanceReutilisee] });
          } else {
            let premiereLecon = { ...leconsCibles[0] };
            premiereLecon.seances = [...(premiereLecon.seances || []), nouvelleSeanceReutilisee];
            leconsCibles[0] = premiereLecon;
          }
          premierCycle.lecons = leconsCibles;
          cyclesCible[0] = premierCycle;
        }
        return { ...(prev || {}), [classeCible]: { ...progCible, cycles: cyclesCible } };
      });
    });
    showToast("♻️ Fiche réutilisée avec succès !");
    setModalConsulterReutiliser({ ouvert: false, item: null, donneesModifiees: {}, classesSelectionnees: [], datesParClasse: {} });
  };

  // --- Envoi au censeur : vraie mise à jour Supabase pour une séance, local sinon ---
  const soumettreAuCenseur = async (type, cycleId, leconId = null, seanceId = null) => {
    const prog = programmesClasses[classeSelectionneeVue];
    if (!prog || !Array.isArray(prog.cycles)) return;

    if (type === 'seance' && seanceId) {
      const { error } = await supabase
        .from('seances').update({ statut: 'ENVOYEE', envoyee_at: new Date().toISOString() }).eq('id', seanceId);
      if (error) { showToast("⚠️ Erreur : " + error.message); return; }
    }

    const cyclesMaj = prog.cycles.map(c => {
      if (c.id === cycleId) {
        if (type === 'programme' || type === 'cycle') return { ...c, soumisAuCenseur: true };
        return {
          ...c,
          lecons: Array.isArray(c.lecons) ? c.lecons.map(l => {
            if (l.id === leconId) {
              if (type === 'lecon') return { ...l, soumisAuCenseur: true };
              return { ...l, seances: Array.isArray(l.seances) ? l.seances.map(s => s.id === seanceId ? { ...s, soumisAuCenseur: true } : s) : [] };
            }
            return l;
          }) : []
        };
      }
      return c;
    });
    setProgrammesClasses({ ...(programmesClasses || {}), [classeSelectionneeVue]: { ...prog, cycles: cyclesMaj } });
    showToast("🚀 Élément envoyé au censeur !");
  };

  // Reste en local pour cette passe
  const marquerLeconTerminee = (cycleId, leconId) => {
    const prog = programmesClasses[classeSelectionneeVue];
    if (!prog || !Array.isArray(prog.cycles)) return;
    const cyclesMaj = prog.cycles.map(c => c.id === cycleId ? { ...c, lecons: Array.isArray(c.lecons) ? c.lecons.map(l => l.id === leconId ? { ...l, statut: 'Terminée' } : l) : [] } : c);
    setProgrammesClasses({ ...(programmesClasses || {}), [classeSelectionneeVue]: { ...prog, cycles: cyclesMaj } });
    showToast("🏁 Leçon terminée (local uniquement pour l'instant) !");
  };

  const marquerCycleTermine = (cycleId) => {
    const prog = programmesClasses[classeSelectionneeVue];
    if (!prog || !Array.isArray(prog.cycles)) return;
    const cyclesMaj = prog.cycles.map(c => c.id === cycleId ? { ...c, statut: 'Terminé' } : c);
    setProgrammesClasses({ ...(programmesClasses || {}), [classeSelectionneeVue]: { ...prog, cycles: cyclesMaj } });
    showToast("🏆 Cycle terminé (local uniquement pour l'instant) !");
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
      .from('etablissements').select('id, nom').ilike('nom', nouvelleEcoleSaisie.trim()).maybeSingle();

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
    telechargerPDFEntite(`Fiche de Séance - ${seance?.titre || 'Séance'}`, `Cycle: ${cycle?.titre || ''} | Leçon: ${lecon?.titre || ''}`, champsHtml);
  };

  const telechargerLeconPDF = (lecon, cycle) => {
    let htmlContent = `<h3 style="color: #0f172a; font-size: 16px; border-bottom: 2px solid #2563eb; padding-bottom: 6px;">📖 Leçon : ${lecon.titre}</h3>`;
    htmlContent += `<p style="font-size: 13px; color: #475569;"><strong>Cycle parent :</strong> ${cycle.titre} | <strong>Séances prévues :</strong> ${lecon.nombreSeancesPrevues}</p>`;
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
    return bibliotheque.filter(b => {
      const matchAnnee = !filtreBiblioAnnee || b.anneeScolaire === filtreBiblioAnnee;
      const matchClasse = filtreBiblioClasse === 'TOUTES' || b.classe === filtreBiblioClasse;
      const matchTexte = !filtreBiblioTexte ||
        (b.nom && b.nom.toLowerCase().includes(filtreBiblioTexte.toLowerCase())) ||
        (b.cycleAssocie && b.cycleAssocie.toLowerCase().includes(filtreBiblioTexte.toLowerCase())) ||
        (b.leconAssociee && b.leconAssociee.toLowerCase().includes(filtreBiblioTexte.toLowerCase()));
      return matchAnnee && matchClasse && matchTexte;
    });
  }, [bibliotheque, filtreBiblioAnnee, filtreBiblioClasse, filtreBiblioTexte]);

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
                  {modeSansAffiliation ? '🔄 Quitter le mode sans affiliation' : '💳 Activer Mode Sans Affiliation'}
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
                {Array.isArray(notifications) && notifications.filter(n => !n.lu).length > 0 && <span style={styles.pastilleAlerte}>{notifications.filter(n => !n.lu).length}</span>}
              </button>
              {notifOuvert && (
                <div style={{ ...styles.notificationDropdown, right: 0, left: 'auto' }}>
                  <div style={styles.dropdownHeader}>Notifications & Validations</div>
                  {Array.isArray(notifications) && notifications.map(n => (
                    <div key={n.id} style={styles.notifItem}>
                      <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#334155', lineHeight: '1.4' }}>{n.texte}</p>
                      <span style={{ fontSize: '10px', color: '#94a3b8' }}>{n.date}</span>
                    </div>
                  ))}
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
                  setChampsPersonnalises(prev => Array.isArray(prev) ? prev.filter(c => c.id !== champASupprimer) : []);
                  setChampASupprimer(null);
                  showToast("🗑️ Champ personnalisé supprimé.");
                }} className="bouton bouton-danger">Oui, supprimer</button>
              </div>
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