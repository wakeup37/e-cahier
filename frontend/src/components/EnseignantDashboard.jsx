import React, { useState, useMemo, useRef, useEffect } from 'react';
import { supabase } from './AppRouter';

export default function EnseignantDashboard() {

  // =========================================================================
  // SESSION
  // =========================================================================
  const [chargementInitial, setChargementInitial] = useState(true);
  const [userId, setUserId] = useState(null);
  const programmesAnnuelsCache = useRef({});
  const classesIdCache = useRef({});

  // --- ÉTATS DE VERROUILLAGE DES ACTIONS (Anti-double clic professionnel) ---
  const [actionEnCours, setActionEnCours] = useState(false);

  // --- GESTION DES AFFILIATIONS MULTI-ÉTABLISSEMENTS & DEMANDES DE DÉPART ---
  const [affiliations, setAffiliations] = useState([]);
  const [classesDetailParEtablissement, setClassesDetailParEtablissement] = useState({});
  const [demandesDepart, setDemandesDepart] = useState([]);

  const [modalDepart, setModalDepart] = useState({ ouvert: false, ecoleId: null, ecoleNom: '', motif: '' });
  const [modalProposerClasse, setModalProposerClasse] = useState({ ouvert: false, affiliation: null, classesDisponibles: [], matieresDisponibles: [], classesIdsChoisies: [], nouvelleClasseNom: '', matiereIdsChoisies: [] });
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

  const formaterCleClasse = (nomBrut, ecole) => (ecole ? `${nomBrut} (${ecole})` : nomBrut);
  const decomposerCleClasse = (cle) => {
    const correspondance = typeof cle === 'string' ? cle.match(/^(.*) \(([^)]+)\)$/) : null;
    return correspondance ? { nomBrut: correspondance[1], ecole: correspondance[2] } : { nomBrut: cle, ecole: null };
  };

  const classesActivesValidees = useMemo(() => {
    let classes = [];
    affiliations.forEach(aff => {
      if (aff.statut === 'Validée' && Array.isArray(aff.classes)) {
        aff.classes.forEach(cl => {
          const cle = formaterCleClasse(cl, aff.ecole);
          if (!classes.includes(cle)) classes.push(cle);
        });
      }
    });
    if (modeSansAffiliation) {
      (classesSansAffiliation || []).forEach(cl => { if (!classes.includes(cl)) classes.push(cl); });
    }
    return classes;
  }, [modeSansAffiliation, classesSansAffiliation, affiliations]);

  const [modeVueClasses, setModeVueClasses] = useState('ecole');
  const [ecolesOuvertesVue, setEcolesOuvertesVue] = useState({});
  const toggleEcoleVue = (ecole) => setEcolesOuvertesVue(prev => ({ ...prev, [ecole]: !prev[ecole] }));
  const [matieresOuvertesVue, setMatieresOuvertesVue] = useState({});
  const toggleMatiereVue = (cle) => setMatieresOuvertesVue(prev => ({ ...prev, [cle]: !prev[cle] }));

  const structureVueParEcole = useMemo(() => {
    return affiliations
      .filter(a => a.statut === 'Validée')
      .map(aff => ({
        ecole: aff.ecole,
        etablissementId: aff.etablissementId,
        classes: (aff.classes || []).map(nomClasse => ({
          cle: formaterCleClasse(nomClasse, aff.ecole),
          nom: nomClasse,
          matieres: classesDetailParEtablissement[aff.etablissementId]?.[nomClasse] || [],
        })),
      }));
  }, [affiliations, classesDetailParEtablissement]);

  const structureVueParMatiere = useMemo(() => {
    const groupes = {};
    structureVueParEcole.forEach(({ ecole, classes }) => {
      classes.forEach(({ cle, matieres }) => {
        const listeMatieres = matieres.length > 0 ? matieres : ['Matière non précisée'];
        listeMatieres.forEach(nomMatiere => {
          const cleGroupe = `${nomMatiere} — ${ecole}`;
          if (!groupes[cleGroupe]) groupes[cleGroupe] = { matiere: nomMatiere, ecole, classes: [] };
          if (!groupes[cleGroupe].classes.includes(cle)) groupes[cleGroupe].classes.push(cle);
        });
      });
    });
    return Object.values(groupes).sort((a, b) => a.matiere.localeCompare(b.matiere) || a.ecole.localeCompare(b.ecole));
  }, [structureVueParEcole]);

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

  const ONGLETS_ENSEIGNANT = ['cycles', 'bibliotheque', 'affiliation', 'rapports'];

  const marquerNotificationLue = async (notif) => {
    if (notif.lienCible) setActiveTab(ONGLETS_ENSEIGNANT.includes(notif.lienCible) ? notif.lienCible : 'cycles');
    setNotifOuvert(false);
    await supabase.from('notifications').update({ lue_at: new Date().toISOString() }).eq('id', notif.id);
    setNotifications(prev => prev.filter(x => x.id !== notif.id));
  };

  const [infosEnseignant, setInfosEnseignant] = useState({
    civilite: 'M.', nom: '', prenoms: '', ville: '', matiere: '', matieresParEtablissement: {}, photoProfil: '',
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

  const [bibliotheque, setBibliotheque] = useState([]);
  const [filtreBiblioTexte, setFiltreBiblioTexte] = useState('');
  const [classesOuvertesBiblio, setClassesOuvertesBiblio] = useState({});
  const toggleClasseBiblio = (classeNom) => setClassesOuvertesBiblio(prev => ({ ...prev, [classeNom]: !prev[classeNom] }));

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
        .select('id, contenu_json, date_prevue, classes(nom, etablissements(nom)), annees_scolaires(intitule)')
        .in('id', idsSeances);
      (seancesData || []).forEach(s => { seancesParId[s.id] = s; });
    }

    setBibliotheque((lignes || []).map(l => {
      const seance = seancesParId[l.reference_id];
      return {
        id: l.id,
        referenceId: l.reference_id,
        nom: l.titre || seance?.contenu_json?.titre || 'Fiche',
        classeOrigine: seance?.classes?.nom ? formaterCleClasse(seance.classes.nom, seance?.classes?.etablissements?.nom) : '',
        anneeScolaire: seance?.annees_scolaires?.intitule || '',
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
  const [modalReutiliserBiblio, setModalReutiliserBiblio] = useState({ ouvert: false, item: null, classeChoisie: '', cycleChoisi: '', leconChoisi: '' });

  const utiliserFicheDeLaBibliotheque = (item, options = {}) => {
    const { titre, lieu, ...autresChamps } = item.contenuJson || {};
    const cycleId = options.cycleId !== undefined ? options.cycleId : modalChoixBibliotheque.cycleId;
    const leconId = options.leconId !== undefined ? options.leconId : modalChoixBibliotheque.leconId;
    const classeNom = options.classeNom || classeSelectionneeVue;
    setModalChoixBibliotheque({ ouvert: false, cycleId: null, leconId: null });
    setModalReutiliserBiblio({ ouvert: false, item: null, classeChoisie: '', cycleChoisi: '', leconChoisi: '' });
    setModalAssistant(prev => ({
      ...prev,
      ouvert: true, niveauCible: 'seance',
      cycleIdCible: cycleId, leconIdCible: leconId,
      titreSeance: titre || item.nom, lieuSeance: lieu || '', valeursChamps: autresChamps,
      classesCiblesCycle: classeNom ? [classeNom] : [],
      datesParClasseCycle: {}, dateSeance: new Date().toISOString().split('T')[0],
    }));
  };

  const ouvrirReutiliserBiblio = (item) => {
    setModalReutiliserBiblio({ ouvert: true, item, classeChoisie: '', cycleChoisi: '', leconChoisi: '' });
  };

  const telechargerFichePDFDepuisBiblio = (item) => {
    let champsHtml = '<table>';
    const contenu = item.contenuJson || {};
    if (Array.isArray(champsPersonnalises)) {
      champsPersonnalises.forEach(champ => {
        const valeur = contenu[champ.id] || 'N/A';
        champsHtml += `<tr><th>${champ.label}</th><td>${String(valeur).replace(/\n/g, '<br>')}</td></tr>`;
      });
    }
    champsHtml += '</table>';
    telechargerPDFEntite(`Fiche (Bibliothèque) - ${item.nom}`, `Classe d'origine : ${item.classeOrigine || 'N/A'}${item.dateOrigine ? ` | Créée le ${item.dateOrigine}` : ''}`, champsHtml);
  };

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

  const [modalDuplicationIntelligente, setModalDuplicationIntelligente] = useState({
    ouvert: false, itemSource: null, typeSource: '', classesCibles: [], datesParClasse: {}
  });

  const showToast = (msg) => { setMessage(msg); setTimeout(() => setMessage(''), 4000); };

  const chargerTout = async () => {
    const { data: { user }, error: erreurUser } = await supabase.auth.getUser();
    if (erreurUser || !user) {
      showToast("⚠️ Session expirée, veuillez vous reconnecter.");
      setChargementInitial(false);
      return;
    }
    setUserId(user.id);
    chargerBibliotheque(user.id);

    const [
      { data: profil },
      { data: catalogueMatieres },
      { data: affiliationsData },
      { data: attributions },
      { data: mesMatieres },
      { data: demandesDepartData },
      { data: notifs },
    ] = await Promise.all([
      supabase.from('utilisateurs_profils').select('*').eq('user_id', user.id).single(),
      supabase.from('matieres').select('id, nom, niveaux_applicables, series_applicables').order('nom', { ascending: true }),
      supabase.from('affiliations_etablissement').select('id, statut, etablissement_id, etablissements(nom)').eq('user_id', user.id).eq('role', 'ENSEIGNANT'),
      supabase.from('attributions_classes').select('etablissement_id, matiere_id, matieres(nom), classes(nom, annee_scolaire_id)').eq('enseignant_id', user.id),
      supabase.from('matieres_enseignant').select('matiere_id, etablissement_id, matieres(nom)').eq('user_id', user.id),
      supabase.from('demandes_depart').select('id, affiliation_id, motif, statut, created_at').eq('user_id', user.id).eq('statut', 'EN_ATTENTE'),
      supabase.from('notifications').select('*').eq('user_id', user.id).is('lue_at', null).order('created_at', { ascending: false }),
    ]);
    setMatieresCatalogue(catalogueMatieres || []);

    const etablissementIdsPourAnnee = (affiliationsData || []).map(a => a.etablissement_id);
    let anneeActiveParEtab = {};
    if (etablissementIdsPourAnnee.length > 0) {
      const { data: anneesActivesData } = await supabase
        .from('annees_scolaires')
        .select('id, etablissement_id')
        .in('etablissement_id', etablissementIdsPourAnnee)
        .eq('est_active', true);
      (anneesActivesData || []).forEach(a => { anneeActiveParEtab[a.etablissement_id] = a.id; });
    }

    const mapStatut = (s) => (s === 'ACTIVE' ? 'Validée' : (s === 'EN_ATTENTE' || s === 'INVITATION') ? 'En attente' : s);

    const affiliationsFormatees = (affiliationsData || []).map(a => ({
      id: a.id,
      etablissementId: a.etablissement_id,
      ecole: a.etablissements?.nom || '',
      statut: mapStatut(a.statut),
      classes: (attributions || [])
        .filter(at => at.etablissement_id === a.etablissement_id)
        .filter(at => at.classes?.annee_scolaire_id && at.classes.annee_scolaire_id === anneeActiveParEtab[a.etablissement_id])
        .map(at => at.classes?.nom)
        .filter(Boolean),
    }));
    setAffiliations(affiliationsFormatees);

    const detailClasses = {};
    (attributions || []).forEach(at => {
      const classeNom = at.classes?.nom;
      if (!classeNom || !at.classes?.annee_scolaire_id || at.classes.annee_scolaire_id !== anneeActiveParEtab[at.etablissement_id]) return;
      if (!detailClasses[at.etablissement_id]) detailClasses[at.etablissement_id] = {};
      if (!detailClasses[at.etablissement_id][classeNom]) detailClasses[at.etablissement_id][classeNom] = [];
      const nomMatiere = at.matieres?.nom;
      if (nomMatiere && !detailClasses[at.etablissement_id][classeNom].includes(nomMatiere)) {
        detailClasses[at.etablissement_id][classeNom].push(nomMatiere);
      }
    });
    setClassesDetailParEtablissement(detailClasses);

    const matieresParEtablissement = {};
    (mesMatieres || []).forEach(m => {
      const cle = m.etablissement_id || 'SANS_ETABLISSEMENT';
      if (!matieresParEtablissement[cle]) matieresParEtablissement[cle] = [];
      matieresParEtablissement[cle].push(m.matiere_id);
    });
    const matiereDisplayParEcole = affiliationsFormatees
      .filter(a => a.statut === 'Validée')
      .map(a => {
        const noms = (mesMatieres || []).filter(m => m.etablissement_id === a.etablissementId).map(m => m.matieres?.nom).filter(Boolean);
        return noms.length > 0 ? `${a.ecole} : ${noms.join(', ')}` : null;
      })
      .filter(Boolean)
      .join(' · ');

    setDemandesDepart((demandesDepartData || []).map(d => ({
      id: d.id, ecoleId: d.affiliation_id, motif: d.motif,
      dateDemande: new Date(d.created_at).toLocaleDateString(), statut: 'En attente de validation',
    })));

    setNotifications((notifs || []).map(n => ({
      id: n.id,
      texte: n.payload_json?.message || '',
      date: new Date(n.created_at).toLocaleDateString(),
      lu: false,
      lienCible: n.payload_json?.lien_cible,
    })));

    if (profil) {
      const ecolesValidees = affiliationsFormatees.filter(a => a.statut === 'Validée').map(a => a.ecole).filter(Boolean);
      const toutesEcoles = ecolesValidees.join(', ');
      setInfosEnseignant(prev => ({
        ...prev, nom: profil.nom, prenoms: profil.prenom,
        emailSecurite: user.email, etablissementSaisi: toutesEcoles, telephone: profil.telephone || '',
        matiere: matiereDisplayParEcole, matieresParEtablissement,
      }));
      setFormProfil(prev => ({ ...prev, nom: profil.nom, prenoms: profil.prenom, etablissementSaisi: toutesEcoles, telephone: profil.telephone || '', matieresParEtablissement }));
    }

    const anneesActivesIds = Object.values(anneeActiveParEtab);
    const etablissementIdVersEcole = {};
    affiliationsFormatees.forEach(a => { etablissementIdVersEcole[a.etablissementId] = a.ecole; });
    const anneeIdVersEtablissementId = {};
    Object.entries(anneeActiveParEtab).forEach(([etabId, anneeId]) => { anneeIdVersEtablissementId[anneeId] = etabId; });

    const { data: programmesPossedes } = await supabase
      .from('programmes_annuels').select('id, annee_scolaire_id')
      .eq('proprietaire_user_id', user.id)
      .or([`annee_scolaire_id.is.null`, anneesActivesIds.length > 0 ? `annee_scolaire_id.in.(${anneesActivesIds.join(',')})` : null].filter(Boolean).join(','));
    const idsProgrammes = (programmesPossedes || []).map(p => p.id);

    const programmeIdVersEcole = {};
    (programmesPossedes || []).forEach(p => {
      const etabId = p.annee_scolaire_id ? anneeIdVersEtablissementId[p.annee_scolaire_id] : null;
      programmeIdVersEcole[p.id] = etabId ? etablissementIdVersEcole[etabId] : null;
    });

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
            .select('id, date_prevue, statut, contenu_json, lecon_id, motif_report, date_report_demandee')
            .in('lecon_id', idsLecons)
            .order('created_at', { ascending: true })
        : { data: [] };

      (cyclesData || []).forEach(cycle => {
        const classeNom = formaterCleClasse(cycle.classe_nom || 'Sans classe', programmeIdVersEcole[cycle.programme_annuel_id]);
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
            motifReport: sc.motif_report || '',
            dateReportDemandee: sc.date_report_demandee || '',
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

  const resoudreContexteClasse = async (classeCle) => {
    const estClassePersonnelle = Array.isArray(classesSansAffiliation) && classesSansAffiliation.includes(classeCle);
    if (estClassePersonnelle) return { etablissementId: null, anneeScolaireId: null, classeId: null, classeNomBrut: classeCle };

    const { nomBrut, ecole } = decomposerCleClasse(classeCle);
    const affiliation = affiliations.find(a => a.statut === 'Validée' && a.classes.includes(nomBrut) && (!ecole || a.ecole === ecole));
    if (!affiliation) return { etablissementId: null, anneeScolaireId: null, classeId: null, classeNomBrut: nomBrut };

    const { data: aff } = await supabase
      .from('affiliations_etablissement').select('etablissement_id').eq('id', affiliation.id).single();
    const etablissementId = aff?.etablissement_id;

    const { data: annee } = await supabase
      .from('annees_scolaires').select('id').eq('etablissement_id', etablissementId).eq('est_active', true).maybeSingle();

    const cleCache = `${etablissementId}|${annee?.id}|${nomBrut}`;
    let classeId = classesIdCache.current[cleCache];
    if (!classeId) {
      const { data: classeRow } = await supabase
        .from('classes').select('id').eq('etablissement_id', etablissementId).eq('nom', nomBrut).eq('annee_scolaire_id', annee?.id || '00000000-0000-0000-0000-000000000000').maybeSingle();
      classeId = classeRow?.id || null;
      classesIdCache.current[cleCache] = classeId;
    }

    return { etablissementId, anneeScolaireId: annee?.id || null, classeId, classeNomBrut: nomBrut };
  };

  const getOuCreerProgrammeAnnuel = async (etablissementId, anneeScolaireId) => {
    if (etablissementId && !anneeScolaireId) return { id: null, erreur: "aucune année scolaire active pour cet établissement" };

    const cle = `${etablissementId || 'SANS_AFFILIATION'}|${anneeScolaireId}`;
    if (programmesAnnuelsCache.current[cle]) return { id: programmesAnnuelsCache.current[cle], erreur: null };

    const affiliationCorrespondante = affiliations.find(a => a.statut === 'Validée');
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
      .eq('annee_scolaire_id', anneeScolaireId)
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

  // --- ACTIONS ENSEIGNANT BLINDÉES CONTRE LES DOUBLONS (Anti-double clic) ---

  const handleEnregistrerProfil = async (e) => {
    e.preventDefault();
    if (!userId || actionEnCours) return;
    setActionEnCours(true);

    try {
      const { error } = await supabase
        .from('utilisateurs_profils').update({ nom: formProfil.nom, prenom: formProfil.prenoms, telephone: formProfil.telephone || null }).eq('user_id', userId);
      if (error) { showToast("⚠️ Erreur : " + error.message); return; }

      for (const [etablissementId, matiereIds] of Object.entries(formProfil.matieresParEtablissement || {})) {
        const { error: erreurSuppression } = await supabase
          .from('matieres_enseignant').delete().eq('user_id', userId).eq('etablissement_id', etablissementId);
        if (erreurSuppression) { showToast("⚠️ Erreur matières : " + erreurSuppression.message); return; }
        if (matiereIds.length > 0) {
          const { error: erreurInsertion } = await supabase
            .from('matieres_enseignant')
            .insert(matiereIds.map(matiere_id => ({ user_id: userId, matiere_id, etablissement_id: etablissementId })));
          if (erreurInsertion) { showToast("⚠️ Erreur matières : " + erreurInsertion.message); return; }
        }
      }

      const matiereDisplayParEcole = affiliations
        .filter(a => a.statut === 'Validée')
        .map(a => {
          const ids = (formProfil.matieresParEtablissement || {})[a.etablissementId] || [];
          const noms = matieresCatalogue.filter(m => ids.includes(m.id)).map(m => m.nom);
          return noms.length > 0 ? `${a.ecole} : ${noms.join(', ')}` : null;
        })
        .filter(Boolean)
        .join(' · ');

      setInfosEnseignant({ ...formProfil, matiere: matiereDisplayParEcole });
      setModalProfilOuvert(false);
      showToast("✅ Profil mis à jour avec succès !");
    } finally {
      setActionEnCours(false);
    }
  };

  const handleChangerPhotoProfil = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setFormProfil(prev => ({ ...prev, photoProfil: reader.result }));
    reader.readAsDataURL(file);
  };

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
    if (!modalDepart.ecoleId || !userId || actionEnCours) return;
    setActionEnCours(true);

    try {
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

      if (error) { showToast("⚠️ Erreur : " + error.message); return; }

      await notifierParRole(
        aff.etablissement_id, 'CHEF', 'DEMANDE_DEPART_RECUE',
        `🚪 Un enseignant a demandé à quitter l'établissement`,
        'censeurs'
      );

      const nouvelleDemande = {
        id: modalDepart.ecoleId, ecoleId: modalDepart.ecoleId, ecoleNom: modalDepart.ecoleNom, motif: modalDepart.motif,
        dateDemande: new Date().toLocaleDateString(), statut: 'En attente du visa du censeur ou du chef'
      };
      setDemandesDepart(prev => [nouvelleDemande, ...prev]);
      setModalDepart({ ouvert: false, ecoleId: null, ecoleNom: '', motif: '' });
      showToast("📤 Demande de départ transmise pour validation !");
    } finally {
      setActionEnCours(false);
    }
  };

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
      classesIdsChoisies: [], nouvelleClasseNom: '', matiereIdsChoisies: [],
    });
  };

  const soumettreDemandeAttributionClasse = async (e) => {
    e.preventDefault();
    if (actionEnCours) return;
    setActionEnCours(true);

    try {
      const { affiliation, classesIdsChoisies, nouvelleClasseNom, matiereIdsChoisies } = modalProposerClasse;

      if ((classesIdsChoisies.length === 0 && !nouvelleClasseNom.trim()) || matiereIdsChoisies.length === 0 || !userId) {
        showToast("⚠️ Merci de choisir au moins une classe (ou en proposer une nouvelle) et au moins une matière.");
        return;
      }

      const lignes = [];
      classesIdsChoisies.forEach(classeId => {
        matiereIdsChoisies.forEach(matiereId => {
          lignes.push({
            enseignant_id: userId, classe_id: classeId, classe_nom_propose: null,
            etablissement_id: affiliation.etablissementId, annee_scolaire_id: affiliation.anneeScolaireId, matiere_id: matiereId,
          });
        });
      });
      if (nouvelleClasseNom.trim()) {
        matiereIdsChoisies.forEach(matiereId => {
          lignes.push({
            enseignant_id: userId, classe_id: null, classe_nom_propose: nouvelleClasseNom.trim(),
            etablissement_id: affiliation.etablissementId, annee_scolaire_id: affiliation.anneeScolaireId, matiere_id: matiereId,
          });
        });
      }

      const { error } = await supabase.from('demandes_attributions_classes').insert(lignes);

      if (error) {
        if (error.code === '23505') showToast("⚠️ Une ou plusieurs propositions identiques existent déjà.");
        else showToast("⚠️ Erreur : " + error.message);
        return;
      }

      const nomsClasses = [
        ...classesIdsChoisies.map(id => modalProposerClasse.classesDisponibles.find(c => c.id === id)?.nom).filter(Boolean),
        ...(nouvelleClasseNom.trim() ? [nouvelleClasseNom.trim()] : []),
      ];
      await notifierParRole(
        affiliation.etablissementId, 'CENSEUR', 'PROPOSITION_CLASSE_RECUE',
        `🏫 Un enseignant propose ${lignes.length} attribution(s) de classe/matière (${nomsClasses.join(', ')})`,
        'classes'
      );

      setModalProposerClasse({ ouvert: false, affiliation: null, classesDisponibles: [], matieresDisponibles: [], classesIdsChoisies: [], nouvelleClasseNom: '', matiereIdsChoisies: [] });
      showToast(`📤 ${lignes.length} proposition(s) envoyée(s) au censeur/chef pour validation !`);
    } finally {
      setActionEnCours(false);
    }
  };

  const supprimerClasseLibre = (classeNom) => {
    setClassesSansAffiliation(prev => Array.isArray(prev) ? prev.filter(c => c !== classeNom) : []);
    showToast(`🗑️ Classe "${classeNom}" supprimée avec succès !`);
  };

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

  const gererValidationAssistant = async (e) => {
    e.preventDefault();
    if (actionEnCours) return;
    setActionEnCours(true);

    try {
      const { niveauCible, cycleIdCible, leconIdCible, titreCycle, competenceCycle, dateDebutCycle, dateFinCycle, nombreLeconsPrevu, titreLecon, nombreSeancesLecon,
        titreSeance, dateSeance, lieuSeance, valeursChamps, classesCiblesCycle, datesParClasseCycle, cyclesProgramme, titreProgramme } = modalAssistant;

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
          const { etablissementId, anneeScolaireId, classeNomBrut } = await resoudreContexteClasse(classeCible);
          const { id: programmeAnnuelId, erreur: erreurProgramme } = await getOuCreerProgrammeAnnuel(etablissementId, anneeScolaireId);
          if (!programmeAnnuelId) { echecs.push(`${classeCible} (${erreurProgramme || 'établissement introuvable'})`); continue; }

          for (const cp of listeCycles) {
            const numeroCycle = (programmesClasses[classeCible]?.cycles?.length || 0) + 1;
            const { data: nouveauCycle, error } = await supabase
              .from('cycles').insert({
                programme_annuel_id: programmeAnnuelId, titre: `Cycle ${numeroCycle}`, statut: 'EN_COURS',
                competence: cp.competence || null,
                date_debut: cp.dateDebut || null,
                date_fin: cp.dateFin || null,
                nombre_lecons_prevu: cp.nbLecons ? parseInt(cp.nbLecons, 10) : null,
                classe_nom: classeNomBrut,
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
          await notifierCenseurNouvelleFiche(classeCible, `📊 Programme annuel complet généré pour ${classeCible} (${listeCycles.length} cycle(s))`);
        }

        if (compteurCrees === 0) {
          showToast(`❌ Aucun cycle créé. Échec : ${echecs.join(' | ')}`);
        } else {
          showToast(`✨ Programme annuel créé : ${compteurCrees} cycle(s) au total !`);
        }
        setModalAssistant({ ...modalAssistant, ouvert: false });
        return;
      }

      if (niveauCible === 'cycle') {
        const ciblesCycle = Array.isArray(classesCiblesCycle) && classesCiblesCycle.length > 0
          ? classesCiblesCycle : (classeSelectionneeVue ? [classeSelectionneeVue] : []);
        if (ciblesCycle.length === 0) {
          showToast("⚠️ Veuillez sélectionner au moins une classe cible pour ce cycle.");
          return;
        }

        let compteurCrees = 0;
        const echecs = [];

        for (const classeCible of ciblesCycle) {
          const { etablissementId, anneeScolaireId, classeNomBrut } = await resoudreContexteClasse(classeCible);
          const { id: programmeAnnuelId, erreur: erreurProgramme } = await getOuCreerProgrammeAnnuel(etablissementId, anneeScolaireId);
          if (!programmeAnnuelId) { echecs.push(`${classeCible} (${erreurProgramme || 'établissement introuvable'})`); continue; }

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
              classe_nom: classeNomBrut,
            }).select().single();
          if (error) { echecs.push(`${classeCible} (${error.message})`); continue; }

          compteurCrees++;
          if (!programmesClasses[classeCible]) initialiserProgrammeClasse(classeCible);
          setProgrammesClasses(prev => {
            const progCible = prev[classeCible] || { anneeScolaire: '', cycles: [] };
            const cycleLocal = { id: nouveauCycle.id, titre: nouveauCycle.titre, competence: nouveauCycle.competence || '', dateDebut: nouveauCycle.date_debut || '', dateFin: nouveauCycle.date_fin || '', nombreLeconsPrevu: nouveauCycle.nombre_lecons_prevu || null, planLecons: nouveauCycle.plan_lecons || [], statut: 'En cours', soumisAuCenseur: false, lecons: [] };
            return { ...prev, [classeCible]: { ...progCible, cycles: [...(progCible.cycles || []), cycleLocal] } };
          });
          await notifierCenseurNouvelleFiche(classeCible, `📊 Programme annuel : nouveau cycle "${nouveauCycle.titre}" créé pour ${classeCible}`);
        }
        showToast(`✨ Cycle créé pour ${compteurCrees} classe(s) !`);
      }

      else if (niveauCible === 'lecon') {
        const ciblesLecon = Array.isArray(classesCiblesCycle) && classesCiblesCycle.length > 0
          ? classesCiblesCycle : (classeSelectionneeVue ? [classeSelectionneeVue] : []);
        if (ciblesLecon.length === 0 || !classeSelectionneeVue) return;

        const cycleReference = (programmesClasses[classeSelectionneeVue]?.cycles || []).find(c => c.id === cycleIdCible);
        if (!cycleReference) { showToast("⚠️ Cycle introuvable."); return; }

        let compteurCreees = 0;
        for (const classeCible of ciblesLecon) {
          const cycleCorrespondant = (programmesClasses[classeCible]?.cycles || []).find(c => c.titre === cycleReference.titre);
          if (!cycleCorrespondant) continue;

          const { data: nouvelleLecon, error } = await supabase
            .from('lecons').insert({
              cycle_id: cycleCorrespondant.id, titre: titreLecon || 'Nouvelle Leçon', statut: 'EN_COURS',
              contenu_json: modalAssistant.valeursChampsLecon || {},
              plan_seances: Array.isArray(modalAssistant.planSeances) ? modalAssistant.planSeances : [],
            }).select().single();
          if (error) continue;

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
          if (!leconCorrespondante) continue;

          const { classeId, anneeScolaireId } = await resoudreContexteClasse(classeCible);
          const dateCiblee = (datesParClasseCycle && datesParClasseCycle[classeCible]) || dateSeance || null;

          const { data: nouvelleSeance, error } = await supabase
            .from('seances')
            .insert({
              lecon_id: leconCorrespondante.id,
              classe_id: classeId,
              annee_scolaire_id: anneeScolaireId,
              date_prevue: dateCiblee,
              contenu_json: { titre: titreSeance || 'Séance pédagogique', lieu: lieuSeance || '', ...(valeursChamps || {}) },
              statut: 'BROUILLON',
            })
            .select().single();
          if (error) continue;

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
        showToast(`✨ Séance créée pour ${compteurCreees} classe(s) !`);
      }

      setModalAssistant({
        ouvert: false, niveauCible: 'programme', cycleIdCible: null, leconIdCible: null,
        titreCycle: '', competenceCycle: '', dateDebutCycle: '', dateFinCycle: '', nombreLeconsPrevu: '',
        titreLecon: '', nombreSeancesLecon: '3', valeursChampsLecon: {}, titreSeance: '',
        dateSeance: new Date().toISOString().split('T')[0], lieuSeance: '',
        valeursChamps: {}, fichiersMultimedias: [], ecolesCiblesCycle: [], classesCiblesCycle: [], datesParClasseCycle: {}, periodesParClasseCycle: {}, referenceLeconValeurs: {}, planLecons: [], planSeances: [],
        titreProgramme: '', cyclesProgramme: [{ id: Date.now(), titre: 'Cycle 1', duree: '3 semaines', nbLecons: 2 }]
      });
    } finally {
      setActionEnCours(false);
    }
  };

  const envoyerNotification = async (destinataireUserId, type, message, lienCible, etablissementId) => {
    if (!destinataireUserId) return { error: null };
    const { error } = await supabase.from('notifications').insert({
      user_id: destinataireUserId,
      type,
      payload_json: { message, lien_cible: lienCible, etablissement_id: etablissementId },
      canaux: ['in_app'],
    });
    return { error };
  };

  const notifierCenseurNouvelleFiche = async (classeNom, message) => {
    const { etablissementId } = await resoudreContexteClasse(classeNom);
    if (!etablissementId) return;
    const { data: censeur } = await supabase
      .from('affiliations_etablissement')
      .select('user_id')
      .eq('etablissement_id', etablissementId)
      .eq('role', 'CENSEUR')
      .eq('statut', 'ACTIVE')
      .maybeSingle();
    if (censeur?.user_id) {
      await envoyerNotification(censeur.user_id, 'NOUVELLE_FICHE', message, 'visa', etablissementId);
    }
  };

  const notifierParRole = async (etablissementId, role, type, message, lienCible) => {
    if (!etablissementId) return;
    const { data: responsable } = await supabase
      .from('affiliations_etablissement')
      .select('user_id')
      .eq('etablissement_id', etablissementId)
      .eq('statut', 'ACTIVE')
      .eq('role', role)
      .maybeSingle();
    if (responsable?.user_id) {
      await envoyerNotification(responsable.user_id, type, message, lienCible, etablissementId);
    }
  };

  const soumettreAuCenseur = async (type, cycleId, leconId = null, seanceId = null) => {
    if (actionEnCours) return;
    setActionEnCours(true);

    try {
      const prog = programmesClasses[classeSelectionneeVue];
      if (!prog || !Array.isArray(prog.cycles)) return;

      if (type === 'seance' && seanceId) {
        let dateSeance = null;
        let leconCible = null;
        (prog.cycles || []).forEach(c => (c.lecons || []).forEach(l => {
          if (l.id === leconId) leconCible = l;
          (l.seances || []).forEach(s => { if (s.id === seanceId) dateSeance = s.date; });
        }));

        const estPremiereSeanceDeLaLecon = !!leconCible && !leconCible.soumisAuCenseur;
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

        let erreurLecon = null;
        if (estPremiereSeanceDeLaLecon && arriveMaintenant) {
          const { error: erreurMajLecon } = await supabase
            .from('lecons')
            .update({ statut_visa: 'ENVOYEE', envoyee_at: new Date().toISOString() })
            .eq('id', leconId);
          erreurLecon = erreurMajLecon;
        }

        const cyclesMaj = prog.cycles.map(c => c.id !== cycleId ? c : {
          ...c,
          soumisAuCenseur: true,
          lecons: (c.lecons || []).map(l => l.id !== leconId ? l : {
            ...l,
            soumisAuCenseur: (estPremiereSeanceDeLaLecon && arriveMaintenant && !erreurLecon) ? true : l.soumisAuCenseur,
            seances: (l.seances || []).map(s => s.id === seanceId ? { ...s, soumisAuCenseur: true, statutReel: statutCible } : s)
          })
        });
        setProgrammesClasses({ ...(programmesClasses || {}), [classeSelectionneeVue]: { ...prog, cycles: cyclesMaj } });

        if (!arriveMaintenant) {
          showToast(`📅 Fiche programmée pour le ${dateSeance}.`);
        } else {
          await notifierCenseurNouvelleFiche(classeSelectionneeVue, `📥 Nouvelle séance reçue (${classeSelectionneeVue})`);
          showToast("🚀 Séance envoyée avec succès !");
        }
        return;
      }

      if (type === 'lecon' && leconId) {
        const { data: seancesDeLaLecon } = await supabase
          .from('seances').select('id, statut').eq('lecon_id', leconId);
        const auMoinsUneSeanceEnvoyee = (seancesDeLaLecon || []).some(s => ['ENVOYEE', 'RECUE', 'VISEE', 'PROGRAMMEE'].includes(s.statut));

        if (!auMoinsUneSeanceEnvoyee) {
          showToast("⚠️ Envoyez d'abord au moins une séance de cette leçon.");
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
        await notifierCenseurNouvelleFiche(classeSelectionneeVue, `📥 Nouvelle fiche de leçon reçue (${classeSelectionneeVue})`);
        showToast("🚀 Fiche de leçon envoyée au censeur !");
        return;
      }
    } finally {
      setActionEnCours(false);
    }
  };

  const [modalReportSeance, setModalReportSeance] = useState({ ouvert: false, cycleId: null, leconId: null, seance: null, motif: '', nouvelleDate: '' });

  const reporterSeance = async (e) => {
    e.preventDefault();
    if (actionEnCours) return;
    setActionEnCours(true);

    try {
      const { cycleId, leconId, seance, motif, nouvelleDate } = modalReportSeance;
      if (!motif.trim()) { showToast("⚠️ Merci d'indiquer le motif du report."); return; }

      const { error } = await supabase
        .from('seances')
        .update({ statut: 'REPORTEE', motif_report: motif.trim(), date_report_demandee: nouvelleDate || null })
        .eq('id', seance.id);
      if (error) { showToast("⚠️ Erreur : " + error.message); return; }

      await supabase.from('historique_statuts_seance').insert({
        seance_id: seance.id, type_evenement: 'REPORTEE', motif: motif.trim(), cree_par_user_id: userId,
      });

      if (seance.soumisAuCenseur) {
        await notifierCenseurNouvelleFiche(classeSelectionneeVue, `↩️ Séance reportée : "${seance.titre}" (${classeSelectionneeVue})`);
      }

      const prog = programmesClasses[classeSelectionneeVue];
      if (prog && Array.isArray(prog.cycles)) {
        const cyclesMaj = prog.cycles.map(c => c.id !== cycleId ? c : {
          ...c, lecons: (c.lecons || []).map(l => l.id !== leconId ? l : {
            ...l, seances: (l.seances || []).map(s => s.id === seance.id ? { ...s, statutReel: 'REPORTEE', motifReport: motif.trim(), dateReportDemandee: nouvelleDate } : s)
          })
        });
        setProgrammesClasses({ ...(programmesClasses || {}), [classeSelectionneeVue]: { ...prog, cycles: cyclesMaj } });
      }

      setModalReportSeance({ ouvert: false, cycleId: null, leconId: null, seance: null, motif: '', nouvelleDate: '' });
      showToast("↩️ Séance marquée comme reportée.");
    } finally {
      setActionEnCours(false);
    }
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
    showToast("✅ Modification enregistrée !");
  };

  const [matiereIdsAffiliation, setMatiereIdsAffiliation] = useState([]);

  const soumettreDemandeAffiliation = async (e) => {
    e.preventDefault();
    if (!nouvelleEcoleSaisie.trim() || !userId || actionEnCours) return;
    setActionEnCours(true);

    try {
      const { data: etablissementCible, error: erreurRecherche } = await supabase
        .from('etablissements').select('id, nom').eq('code', nouvelleEcoleSaisie.trim()).maybeSingle();

      if (erreurRecherche || !etablissementCible) {
        showToast("⚠️ Établissement introuvable.");
        return;
      }

      const { data: demandeExistante } = await supabase
        .from('demandes_affiliation')
        .select('id')
        .eq('user_id', userId)
        .eq('etablissement_id', etablissementCible.id)
        .eq('role_demande', 'ENSEIGNANT')
        .eq('statut', 'EN_ATTENTE')
        .maybeSingle();

      if (demandeExistante) {
        showToast("⚠️ Vous avez déjà une demande en attente pour cet établissement.");
        setModalAffiliation(false);
        return;
      }

      const { error } = await supabase
        .from('demandes_affiliation').insert({ user_id: userId, etablissement_id: etablissementCible.id, role_demande: 'ENSEIGNANT' });

      if (error) {
        if (error.code === '23505') showToast("⚠️ Une demande existe déjà.");
        else showToast("⚠️ Erreur : " + error.message);
        return;
      }

      if (matiereIdsAffiliation.length > 0) {
        await supabase
          .from('matieres_enseignant')
          .insert(matiereIdsAffiliation.map(matiere_id => ({ user_id: userId, matiere_id, etablissement_id: etablissementCible.id })));
      }

      await notifierParRole(etablissementCible.id, 'CENSEUR', 'DEMANDE_AFFILIATION_RECUE', `👥 Nouvelle demande d'affiliation`, 'professeurs');
      await notifierParRole(etablissementCible.id, 'CHEF', 'DEMANDE_AFFILIATION_RECUE', `👥 Nouvelle demande d'affiliation`, 'censeurs');

      setModalAffiliation(false);
      setNouvelleEcoleSaisie('');
      setMatiereIdsAffiliation([]);
      showToast("🚀 Demande d'affiliation transmise !");
    } finally {
      setActionEnCours(false);
    }
  };

  const telechargerPDFEntite = (titreEntite, sousTitre, contenuTableau) => {
    const contenuHTML =
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
      '</body></html>';

    const iframeImpression = document.createElement('iframe');
    iframeImpression.style.position = 'fixed';
    iframeImpression.style.right = '0';
    iframeImpression.style.bottom = '0';
    iframeImpression.style.width = '0';
    iframeImpression.style.height = '0';
    iframeImpression.style.border = '0';
    document.body.appendChild(iframeImpression);

    const docIframe = iframeImpression.contentWindow.document;
    docIframe.open();
    docIframe.write(contenuHTML);
    docIframe.close();

    setTimeout(() => {
      iframeImpression.contentWindow.focus();
      iframeImpression.contentWindow.print();
      setTimeout(() => { if (iframeImpression.parentNode) document.body.removeChild(iframeImpression); }, 1000);
    }, 300);

    showToast(`📥 Document "${titreEntite}" prêt pour impression !`);
  };

  const telechargerFicheSeancePDF = (seance, lecon, cycle) => {
    let champsHtml = '<table>';
    const contenu = seance?.valeursChamps || {};
    if (Array.isArray(champsPersonnalises)) {
      champsPersonnalises.forEach(champ => {
        const valeur = contenu[champ.id] || 'N/A';
        champsHtml += `<tr><th>${champ.label}</th><td>${String(valeur).replace(/\n/g, '<br>')}</td></tr>`;
      });
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
    telechargerPDFEntite(`Leçon - ${lecon.titre}`, `Regroupement complet de la leçon`, htmlContent);
  };

  const telechargerCyclePDF = (cycle) => {
    let htmlContent = `<h3 style="color: #0f172a; font-size: 16px; border-bottom: 2px solid #16a34a; padding-bottom: 6px;">📁 Cycle : ${cycle.titre}</h3>`;
    htmlContent += `<p style="font-size: 13px; color: #475569;"><strong>Compétence :</strong> ${cycle.competence} | <strong>Période :</strong> Du ${cycle.dateDebut} au ${cycle.dateFin}</p>`;
    telechargerPDFEntite(`Cycle - ${cycle.titre}`, `Regroupement complet du cycle`, htmlContent);
  };

  const telechargerProgrammeAnnuelPDF = (progClasse, classeNom) => {
    let htmlContent = '<h3 style="color: #0f172a; font-size: 15px; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px;">Programme Annuel Complet</h3>';
    if (progClasse && Array.isArray(progClasse.cycles)) {
      progClasse.cycles.forEach(cy => {
        htmlContent += `<div style="margin-top: 15px; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; background: #f8fafc;">`;
        htmlContent += `<h4 style="margin: 0 0 6px 0; color: #2563eb; font-size: 14px;">📁 ${cy.titre} (Du ${cy.dateDebut} au ${cy.dateFin})</h4>`;
        htmlContent += `<p style="margin: 0 0 8px 0; font-size: 12px;"><strong>Compétence :</strong> ${cy.competence}</p>`;
        htmlContent += `</div>`;
      });
    }
    telechargerPDFEntite(`Programme Annuel - ${classeNom}`, `Année scolaire`, htmlContent);
  };

  const [filtreBiblioClasse, setFiltreBiblioClasse] = useState('TOUTES');
  const [filtreBiblioAnnee, setFiltreBiblioAnnee] = useState('TOUTES');
  const classesBiblioDisponibles = useMemo(() => [...new Set((bibliotheque || []).map(b => b.classeOrigine).filter(Boolean))].sort(), [bibliotheque]);
  const anneesBiblioDisponibles = useMemo(() => [...new Set((bibliotheque || []).map(b => b.anneeScolaire).filter(Boolean))].sort().reverse(), [bibliotheque]);

  const bibliothequeFiltree = useMemo(() => {
    if (!Array.isArray(bibliotheque)) return [];
    const texte = filtreBiblioTexte.trim().toLowerCase();
    return bibliotheque.filter(b => {
      const matchTexte = !texte || (b.nom || '').toLowerCase().includes(texte);
      const matchClasse = filtreBiblioClasse === 'TOUTES' || b.classeOrigine === filtreBiblioClasse;
      const matchAnnee = filtreBiblioAnnee === 'TOUTES' || b.anneeScolaire === filtreBiblioAnnee;
      return matchTexte && matchClasse && matchAnnee;
    });
  }, [bibliotheque, filtreBiblioTexte, filtreBiblioClasse, filtreBiblioAnnee]);

  const bibliothequeParClasse = useMemo(() => {
    const groupes = {};
    bibliothequeFiltree.forEach(b => {
      const classe = b.classeOrigine || 'Sans classe';
      if (!groupes[classe]) groupes[classe] = [];
      groupes[classe].push(b);
    });
    return Object.entries(groupes).sort(([a], [b]) => a.localeCompare(b));
  }, [bibliothequeFiltree]);

  const NIVEAUX_PREMIER_CYCLE_ENS = ['6ème', '5ème', '4ème', '3ème'];
  const NIVEAUX_SECOND_CYCLE_ENS = ['Seconde', 'Première', 'Terminale'];
  const matieresCatalogueParCycle = useMemo(() => {
    const universelles = [];
    const premierCycle = [];
    const secondCycle = [];
    matieresCatalogue.forEach(m => {
      const niveaux = m.niveaux_applicables || [];
      if (niveaux.length === 0) { universelles.push(m); return; }
      const aPremier = niveaux.some(n => NIVEAUX_PREMIER_CYCLE_ENS.includes(n));
      const aSecond = niveaux.some(n => NIVEAUX_SECOND_CYCLE_ENS.includes(n));
      if (aPremier) premierCycle.push(m);
      if (aSecond) secondCycle.push(m);
      if (!aPremier && !aSecond) universelles.push(m);
    });
    return [
      { titre: 'Premier cycle (6ème → 3ème)', matieres: premierCycle },
      { titre: 'Second cycle (Seconde → Terminale)', matieres: secondCycle },
      { titre: 'Autres / toutes classes', matieres: universelles },
    ].filter(groupe => groupe.matieres.length > 0);
  }, [matieresCatalogue]);

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
                <span style={{ fontSize: '12px', fontWeight: '900', color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', maxWidth: '100%' }}>
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255, 255, 255, 0.08)', padding: '6px 12px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.12)' }}>
            <span style={{ fontSize: '13px', fontWeight: '900', color: '#ffffff', letterSpacing: '0.5px' }}>E-cahier !</span>
            <span style={{ fontSize: '12px' }}>📖</span>
          </div>

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

      <style>{`
        .bouton { padding: 8px 16px; border-radius: 12px; font-weight: 800; font-size: 13px; cursor: pointer; border: none; transition: all 0.2s ease; display: inline-flex; align-items: center; justifyContent: center; gap: 6px; box-shadow: 0 2px 6px rgba(0,0,0,0.04); }
        .bouton:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
        .bouton-principal { background-color: #2563eb; color: #ffffff; }
        .bouton-secondaire { background-color: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; }
        .bouton-succes { background-color: #16a34a; color: #ffffff; }
        .bouton-danger { background-color: #ef4444; color: #ffffff; }
        .bouton-option { width: 100%; text-align: left; padding: 9px 12px; background: transparent; border: none; color: #334155; font-size: 12px; font-weight: 700; cursor: pointer; border-radius: 8px; margin-bottom: 2px; transition: background 0.15s ease; }
        .bouton-option:hover { background-color: #f1f5f9; }
      `}</style>

      <main style={styles.mainContentBody}>
        {message && <div style={styles.toastSuccess}>{message}</div>}

        {modalConfirmation.ouvert && (
          <div style={styles.fondModale}>
            <div style={{ ...styles.cardWide, width: '380px', textAlign: 'center', maxHeight: '85vh', overflowY: 'auto' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#0f172a', fontSize: '18px', fontWeight: '800' }}>{modalConfirmation.titre}</h3>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px', lineHeight: '1.5' }}>
                {modalConfirmation.message}
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                <button onClick={() => setModalConfirmation({ ouvert: false, titre: '', message: '', actionCallback: null })} className="bouton bouton-secondaire" disabled={actionEnCours}>Annuler</button>
                <button onClick={() => {
                  if (modalConfirmation.actionCallback) modalConfirmation.actionCallback();
                  setModalConfirmation({ ouvert: false, titre: '', message: '', actionCallback: null });
                }} className="bouton bouton-danger" disabled={actionEnCours}>Confirmer</button>
              </div>
            </div>
          </div>
        )}

        {modalDeconnexion && (
          <div style={styles.fondModale}>
            <div style={{ ...styles.cardWide, width: '400px', textAlign: 'center', maxHeight: '85vh', overflowY: 'auto' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#0f172a', fontSize: '18px', fontWeight: '800' }}>🚪 Confirmation de Déconnexion</h3>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px', lineHeight: '1.5' }}>
                Êtes-vous sûr de vouloir vous déconnecter de votre session E-cahier ?
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                <button onClick={() => setModalDeconnexion(false)} className="bouton bouton-secondaire" disabled={actionEnCours}>Annuler</button>
                <button onClick={async () => {
                  if (actionEnCours) return;
                  setActionEnCours(true);
                  try {
                    setModalDeconnexion(false);
                    await supabase.auth.signOut();
                    window.location.reload();
                  } finally {
                    setActionEnCours(false);
                  }
                }} className="bouton bouton-danger" disabled={actionEnCours}>Oui, me déconnecter</button>
              </div>
            </div>
          </div>
        )}

        {modalDepart.ouvert && (
          <div style={styles.fondModale}>
            <div style={{ ...styles.cardWide, width: '460px', maxHeight: '85vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px', fontWeight: '800' }}>🚪 Demande de Départ / Mutation</h3>
                <button onClick={() => setModalDepart({ ouvert: false, ecoleId: null, ecoleNom: '', motif: '' })} className="bouton bouton-secondaire" style={{ padding: '6px 10px' }} disabled={actionEnCours}>✕</button>
              </div>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px', lineHeight: '1.4' }}>
                Vous demandez à quitter l'établissement <strong>{modalDepart.ecoleNom}</strong>. Cette demande sera transmise au censeur pour <strong>visa officiel</strong>.
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
                    disabled={actionEnCours}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button type="button" onClick={() => setModalDepart({ ouvert: false, ecoleId: null, ecoleNom: '', motif: '' })} className="bouton bouton-secondaire" disabled={actionEnCours}>Annuler</button>
                  <button type="submit" className="bouton bouton-danger" disabled={actionEnCours}>
                    {actionEnCours ? 'Transmission...' : 'Soumettre pour visa du censeur'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {modalChoixEcoleProposerClasse && (
          <div style={styles.fondModale}>
            <div style={{ ...styles.cardWide, width: '400px', maxHeight: '85vh', overflowY: 'auto' }}>
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
            <div style={{ ...styles.cardWide, width: '480px', maxHeight: '85vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px', fontWeight: '800' }}>🏫 Proposer une ou plusieurs classes</h3>
                <button onClick={() => setModalProposerClasse({ ouvert: false, affiliation: null, classesDisponibles: [], matieresDisponibles: [], classesIdsChoisies: [], nouvelleClasseNom: '', matiereIdsChoisies: [] })} className="bouton bouton-secondaire" style={{ padding: '6px 10px' }} disabled={actionEnCours}>✕</button>
              </div>
              <form onSubmit={soumettreDemandeAttributionClasse} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={styles.label}>Classe(s) existante(s)</label>
                  {modalProposerClasse.classesDisponibles.length === 0 ? (
                    <p style={{ fontSize: '12px', color: '#991b1b', fontStyle: 'italic' }}>Aucune classe créée pour l'année en cours.</p>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '140px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px' }}>
                      {modalProposerClasse.classesDisponibles.map(c => {
                        const estCochee = modalProposerClasse.classesIdsChoisies.includes(c.id);
                        return (
                          <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid #e2e8f0', padding: '6px 10px', borderRadius: '8px', backgroundColor: estCochee ? '#eff6ff' : '#f8fafc', cursor: 'pointer', fontSize: '12px', fontWeight: '700' }}>
                            <input
                              type="checkbox" checked={estCochee} disabled={actionEnCours}
                              onChange={() => {
                                const updated = estCochee ? modalProposerClasse.classesIdsChoisies.filter(id => id !== c.id) : [...modalProposerClasse.classesIdsChoisies, c.id];
                                setModalProposerClasse(prev => ({ ...prev, classesIdsChoisies: updated }));
                              }}
                            />
                            {c.nom}
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div>
                  <label style={styles.label}>Ou proposer une nouvelle classe (optionnel)</label>
                  <input
                    type="text" placeholder="Ex : 6ème E" value={modalProposerClasse.nouvelleClasseNom} disabled={actionEnCours}
                    onChange={(e) => setModalProposerClasse(prev => ({ ...prev, nouvelleClasseNom: e.target.value }))}
                    style={styles.inputStyle}
                  />
                </div>
                <div>
                  <label style={styles.label}>Matière(s)</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {modalProposerClasse.matieresDisponibles.map(m => {
                      const estCochee = modalProposerClasse.matiereIdsChoisies.includes(m.id);
                      return (
                        <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid #e2e8f0', padding: '6px 10px', borderRadius: '8px', backgroundColor: estCochee ? '#f0fdf4' : '#f8fafc', cursor: 'pointer', fontSize: '12px', fontWeight: '700', color: estCochee ? '#166534' : '#334155' }}>
                          <input
                            type="checkbox" checked={estCochee} disabled={actionEnCours}
                            onChange={() => {
                              const updated = estCochee ? modalProposerClasse.matiereIdsChoisies.filter(id => id !== m.id) : [...modalProposerClasse.matiereIdsChoisies, m.id];
                              setModalProposerClasse(prev => ({ ...prev, matiereIdsChoisies: updated }));
                            }}
                          />
                          📚 {m.nom}
                        </label>
                      );
                    })}
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button type="button" onClick={() => setModalProposerClasse({ ouvert: false, affiliation: null, classesDisponibles: [], matieresDisponibles: [], classesIdsChoisies: [], nouvelleClasseNom: '', matiereIdsChoisies: [] })} className="bouton bouton-secondaire" disabled={actionEnCours}>Annuler</button>
                  <button type="submit" className="bouton bouton-principal" disabled={actionEnCours}>
                    {actionEnCours ? 'Envoi...' : 'Envoyer la proposition'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODALE AFFILIATION BLINDÉE */}
        {modalAffiliation && (
          <div style={styles.fondModale}>
            <div style={{ ...styles.cardWide, width: '460px', maxHeight: '85vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#0f172a', fontSize: '18px', fontWeight: '800' }}>🏫 Demande d'Affiliation à une École</h3>
              <form onSubmit={soumettreDemandeAffiliation} style={{ display: 'flex', flexDirection: 'column', gap: '14px', minHeight: 0 }}>
                <div>
                  <label style={styles.label}>Code de l'établissement</label>
                  <input type="text" placeholder="Ex: LYCMOD-A1B2" value={nouvelleEcoleSaisie} onChange={(e) => setNouvelleEcoleSaisie(e.target.value)} style={styles.inputStyle} required disabled={actionEnCours} />
                </div>
                <div>
                  <label style={styles.label}>Matière(s) enseignée(s) dans cet établissement</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '260px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px' }}>
                    {matieresCatalogue.map(m => {
                      const estCochee = matiereIdsAffiliation.includes(m.id);
                      return (
                        <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid #e2e8f0', padding: '6px 10px', borderRadius: '8px', backgroundColor: estCochee ? '#eff6ff' : '#f8fafc', cursor: 'pointer', fontSize: '12px', fontWeight: '700' }}>
                          <input
                            type="checkbox" checked={estCochee} disabled={actionEnCours}
                            onChange={() => {
                              const updated = estCochee ? matiereIdsAffiliation.filter(id => id !== m.id) : [...matiereIdsAffiliation, m.id];
                              setMatiereIdsAffiliation(updated);
                            }}
                          />
                          {m.nom}
                        </label>
                      );
                    })}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                  <button type="button" onClick={() => setModalAffiliation(false)} className="bouton bouton-secondaire" disabled={actionEnCours}>Annuler</button>
                  <button type="submit" className="bouton bouton-principal" disabled={actionEnCours}>
                    {actionEnCours ? 'Transmission...' : "Soumettre la demande"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Reste des onglets et modales de EnseignantDashboard avec les boutons protégés par actionEnCours */}
        
      </main>
    </div>
  );
}

const styles = {
  container: { backgroundColor: '#f8fafc', minHeight: '100vh', color: '#1e293b', paddingBottom: '40px', overflowX: 'hidden', boxSizing: 'border-box', width: '100%' },
  darkNavbar: { backgroundColor: '#0f172a', color: '#ffffff', padding: '12px 16px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', borderBottom: '1px solid #1e293b', position: 'sticky', top: '0', zIndex: 100, width: '100%', boxSizing: 'border-box' },
  mainContentBody: { padding: '20px 12px', maxWidth: '1200px', margin: '0 auto', boxSizing: 'border-box', width: '100%', overflowX: 'hidden' },
  cardWide: { backgroundColor: '#ffffff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', boxSizing: 'border-box', width: '100%', overflowX: 'hidden' },
  itemRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: '12px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', gap: '12px', boxSizing: 'border-box', width: '100%', flexWrap: 'wrap' },
  label: { display: 'block', fontSize: '11px', fontWeight: '800', color: '#475569', marginBottom: '6px', textTransform: 'uppercase' },
  inputStyle: { width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff', color: '#1e293b', outline: 'none', boxSizing: 'border-box' },
  toastSuccess: { backgroundColor: '#0f172a', color: '#f8fafc', padding: '12px 16px', borderRadius: '10px', marginBottom: '16px', fontSize: '13px', fontWeight: '700', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', boxSizing: 'border-box' },
  navbarTeacherClickableBlock: { display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#1e293b', padding: '4px 8px', borderRadius: '10px', border: '1px solid #334155', cursor: 'pointer', textAlign: 'left', boxSizing: 'border-box', minWidth: 0, maxWidth: '48vw', flexShrink: 1 },
  avatarNavbarContainer: { width: '30px', height: '30px', borderRadius: '50%', overflow: 'hidden', backgroundColor: '#334155', display: 'flex', justifyContent: 'center', alignItems: 'center', border: '1px solid #475569', flexShrink: 0 },
  avatarNavbarImg: { width: '100%', height: '100%', objectFit: 'cover' },
  avatarNavbarPlaceholder: { fontSize: '14px', color: '#94a3b8' },
  navbarTeacherInfo: { display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' },
  notificationDropdown: { position: 'absolute', top: '42px', backgroundColor: '#ffffff', borderRadius: '14px', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.2)', border: '1px solid #e2e8f0', width: '280px', maxWidth: '90vw', zIndex: 110, padding: '10px', boxSizing: 'border-box' },
  dropdownHeader: { padding: '6px 8px', fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0', marginBottom: '6px' },
  notifItem: { backgroundColor: '#f8fafc', padding: '8px', borderRadius: '8px', fontSize: '11px', marginBottom: '4px', border: '1px solid #f1f5f9', cursor: 'pointer' },
  navDarkBtn: { backgroundColor: '#1e293b', color: '#f8fafc', border: '1px solid #334155', padding: '6px 10px', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', position: 'relative' },
  fondModale: { position: 'fixed', top: '0', left: '0', right: '0', bottom: '0', background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: '1000', padding: '12px', boxSizing: 'border-box' },
  pastilleAlerte: { backgroundColor: '#ef4444', color: 'white', padding: '1px 4px', borderRadius: '999px', fontSize: '9px', fontWeight: '800', position: 'absolute', top: '-4px', right: '-4px' },
  burgerBtn: { backgroundColor: '#2563eb', color: '#ffffff', border: 'none', padding: '6px 10px', borderRadius: '10px', fontSize: '14px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(37,99,235,0.3)' },
  burgerDropdown: { position: 'absolute', top: '42px', backgroundColor: '#ffffff', borderRadius: '14px', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.2)', border: '1px solid #e2e8f0', width: '220px', maxWidth: '85vw', zIndex: 120, padding: '10px', display: 'flex', flexDirection: 'column', gap: '4px', boxSizing: 'border-box' }
};
