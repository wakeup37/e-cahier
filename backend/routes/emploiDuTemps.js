const express = require('express');
const router = express.Router();

// 🛡️ SÉCURITÉ : même garde-fou que les autres routes.
router.use((req, res, next) => {
  if (!req.supabase) {
    console.error("❌ ERREUR CRITIQUE : req.supabase est indéfini.");
    return res.status(500).json({ error: "Erreur interne de connexion à la base de données." });
  }
  next();
});

// Niveaux considérés comme "second cycle" pour la priorité des enseignants
// A4-A7 — cohérent avec le reste de l'application (voir CenseurDashboard.jsx).
const NIVEAUX_SECOND_CYCLE = ['Seconde', 'Première', 'Terminale'];
const DUREE_MAX_SEANCE_MINUTES = 120; // "la plus longue séance de cours, c'est deux heures"

// -----------------------------------------------------------------------
// POST /api/emploi-du-temps/generer
// Corps attendu : { etablissementId, anneeScolaireId, autoriserHeuresSupplementaires }
//
// Ne modifie jamais les tables existantes autrement qu'en INSERT : crée
// une nouvelle version d'emploi_du_temps (BROUILLON) et ses séances
// planifiées. Ne touche jamais à un emploi du temps déjà PUBLIE.
// -----------------------------------------------------------------------
router.post('/generer', async (req, res) => {
  try {
    const { etablissementId, anneeScolaireId, autoriserHeuresSupplementaires } = req.body;

    if (!etablissementId || !anneeScolaireId) {
      return res.status(400).json({ error: "etablissementId et anneeScolaireId sont requis." });
    }

    const supabase = req.supabase;
    const heuresSupAutorisees = !!autoriserHeuresSupplementaires;

    // -----------------------------------------------------------------
    // 1. CHARGEMENT DE TOUTES LES DONNÉES DE RÉFÉRENCE (en parallèle)
    // -----------------------------------------------------------------
    const [
      { data: creneaux, error: erreurCreneaux },
      { data: salles, error: erreurSalles },
      { data: matrice, error: erreurMatrice },
      { data: groupesClasses, error: erreurGroupesClasses },
      { data: groupesClassesMembres, error: erreurGroupesClassesMembres },
      { data: groupesDivision, error: erreurGroupesDivision },
      { data: indisponibilites, error: erreurIndispo },
      { data: volumesContractuels, error: erreurVolumesContractuels },
      { data: quotasGrade, error: erreurQuotasGrade },
      { data: classes, error: erreurClasses },
    ] = await Promise.all([
      supabase.from('creneaux_horaires').select('*').eq('etablissement_id', etablissementId).eq('annee_scolaire_id', anneeScolaireId).eq('type_creneau', 'COURS').order('jour_semaine').order('heure_debut'),
      supabase.from('salles').select('*').eq('etablissement_id', etablissementId).is('deleted_at', null),
      supabase.from('matrice_planification').select('*').eq('etablissement_id', etablissementId).eq('annee_scolaire_id', anneeScolaireId),
      supabase.from('groupes_classes_associees').select('*').eq('etablissement_id', etablissementId).eq('annee_scolaire_id', anneeScolaireId),
      supabase.from('groupes_classes_associees_membres').select('*'),
      supabase.from('groupes_division_classe').select('*').eq('etablissement_id', etablissementId).eq('annee_scolaire_id', anneeScolaireId),
      supabase.from('indisponibilites_enseignant').select('*').eq('etablissement_id', etablissementId).eq('annee_scolaire_id', anneeScolaireId),
      supabase.from('volumes_contractuels_enseignant').select('*').eq('etablissement_id', etablissementId).eq('annee_scolaire_id', anneeScolaireId),
      supabase.from('quotas_grade_defaut').select('*'),
      supabase.from('classes').select('id, nom, niveau').eq('etablissement_id', etablissementId).eq('annee_scolaire_id', anneeScolaireId).is('deleted_at', null),
    ]);

    const premiereErreur = erreurCreneaux || erreurSalles || erreurMatrice || erreurGroupesClasses ||
      erreurGroupesClassesMembres || erreurGroupesDivision || erreurIndispo || erreurVolumesContractuels ||
      erreurQuotasGrade || erreurClasses;
    if (premiereErreur) {
      console.error("Erreur chargement données de référence :", premiereErreur.message);
      return res.status(400).json({ error: "Erreur lors du chargement des données : " + premiereErreur.message });
    }

    if (!creneaux || creneaux.length === 0) {
      return res.status(400).json({ error: "Aucune grille horaire trouvée. Générez d'abord la grille horaire (onglet Grille horaire)." });
    }
    if (!matrice || matrice.length === 0) {
      return res.status(400).json({ error: "La matrice de planification est vide. Ajoutez d'abord des lignes (onglet Croisement)." });
    }

    // Récupère le grade des enseignants concernés par la matrice.
    const idsEnseignantsDistincts = [...new Set(matrice.map(m => m.enseignant_id))];
    const { data: profils, error: erreurProfils } = idsEnseignantsDistincts.length > 0
      ? await supabase.from('utilisateurs_profils').select('user_id, grade').in('user_id', idsEnseignantsDistincts)
      : { data: [] };
    if (erreurProfils) {
      return res.status(400).json({ error: "Erreur chargement des profils enseignants : " + erreurProfils.message });
    }

    // -----------------------------------------------------------------
    // 2. STRUCTURES D'AIDE
    // -----------------------------------------------------------------
    const gradeParEnseignant = {};
    (profils || []).forEach(p => { gradeParEnseignant[p.user_id] = p.grade || null; });

    const quotaParGrade = {};
    (quotasGrade || []).forEach(q => { quotaParGrade[q.grade] = q; });

    const volumeContractuelParEnseignant = {};
    (volumesContractuels || []).forEach(v => { volumeContractuelParEnseignant[v.enseignant_id] = Number(v.volume_total_heures); });

    const niveauParClasse = {};
    (classes || []).forEach(c => { niveauParClasse[c.id] = c.niveau; });

    const membresParGroupeClasses = {};
    (groupesClassesMembres || []).forEach(m => {
      if (!membresParGroupeClasses[m.groupe_id]) membresParGroupeClasses[m.groupe_id] = [];
      membresParGroupeClasses[m.groupe_id].push(m.classe_id);
    });

    // Quota effectif d'un enseignant : volume contractuel s'il est défini,
    // sinon le quota par défaut de son grade, sinon aucune limite connue
    // (on ne bloque pas dans ce cas — pas de donnée pour juger).
    const quotaEffectif = (enseignantId) => {
      if (volumeContractuelParEnseignant[enseignantId] !== undefined) return volumeContractuelParEnseignant[enseignantId];
      const grade = gradeParEnseignant[enseignantId];
      if (grade && quotaParGrade[grade]) return Number(quotaParGrade[grade].volume_max_heures);
      return null;
    };

    // -----------------------------------------------------------------
    // 3. CONSTRUCTION DES "UNITÉS" À PLACER
    // Chaque ligne de la matrice est éclatée en N séances individuelles,
    // chacune ne dépassant jamais DUREE_MAX_SEANCE_MINUTES.
    // -----------------------------------------------------------------
    const unites = [];
    const avertissements = [];

    matrice.forEach(ligne => {
      const nbSeances = ligne.nombre_seances || 1;
      let dureeMinutes = ligne.duree_seance_minutes || Math.round((Number(ligne.volume_hebdo_heures) * 60) / nbSeances);

      if (dureeMinutes > DUREE_MAX_SEANCE_MINUTES) {
        avertissements.push(
          `Ligne ${ligne.id} : durée de séance calculée (${dureeMinutes} min) dépasse le maximum de ${DUREE_MAX_SEANCE_MINUTES} min — plafonnée automatiquement.`
        );
        dureeMinutes = DUREE_MAX_SEANCE_MINUTES;
      }

      for (let i = 0; i < nbSeances; i++) {
        unites.push({
          ligneId: ligne.id,
          classeId: ligne.classe_id,
          matiereId: ligne.matiere_id,
          enseignantId: ligne.enseignant_id,
          salleId: ligne.salle_id || null,
          dureeMinutes,
          groupeClassesId: ligne.groupe_classes_id || null,
          groupeDivisionId: ligne.groupe_division_id || null,
          niveau: ligne.niveau,
        });
      }
    });

    // -----------------------------------------------------------------
    // 4. ORDRE DE PRIORITÉ
    // 1) Classes associées (contrainte la plus rigide)
    // 2) Enseignants A4-A7 sur le second cycle (priorité légale)
    // 3) Le reste
    // -----------------------------------------------------------------
    const priorite = (unite) => {
      if (unite.groupeClassesId) return 0;
      const grade = gradeParEnseignant[unite.enseignantId];
      const estA4A7 = grade && ['A4', 'A5', 'A6', 'A7'].includes(grade);
      const estSecondCycle = NIVEAUX_SECOND_CYCLE.includes(unite.niveau);
      if (estA4A7 && estSecondCycle) return 1;
      return 2;
    };
    unites.sort((a, b) => priorite(a) - priorite(b));

    // -----------------------------------------------------------------
    // 5. PLACEMENT (glouton, avec suivi des conflits plutôt que crash)
    // -----------------------------------------------------------------
    const creneauOccupeParEnseignant = new Set(); // clé: enseignantId|creneauId
    // clé: classeId|creneauId -> groupeDivisionId ou 'SEUL' (permet de savoir
    // si un second cours peut légitimement partager ce créneau — cas division).
    const creneauOccupeParClasse = new Map();
    const creneauOccupeParSalle = new Set(); // clé: salleId|creneauId
    const heuresPlaceesParEnseignant = {}; // enseignantId -> total heures placées

    const seancesAInserer = [];
    const conflits = [];

    for (const unite of unites) {
      const classesAVerifier = unite.groupeClassesId
        ? (membresParGroupeClasses[unite.groupeClassesId] || [unite.classeId])
        : [unite.classeId];

      let creneauChoisi = null;

      for (const creneau of creneaux) {
        // Enseignant déjà occupé à ce créneau ?
        if (creneauOccupeParEnseignant.has(`${unite.enseignantId}|${creneau.id}`)) continue;

        // Enseignant indisponible à ce créneau (déclaré explicitement) ?
        const estIndisponible = (indisponibilites || []).some(
          i => i.enseignant_id === unite.enseignantId && i.creneau_id === creneau.id
        );
        if (estIndisponible) continue;

        // Toutes les classes concernées doivent être libres à ce créneau —
        // sauf cas de division légitime (même groupe_division_id).
        const conflitClasse = classesAVerifier.some(classeId => {
          const occupation = creneauOccupeParClasse.get(`${classeId}|${creneau.id}`);
          if (!occupation) return false;
          if (unite.groupeDivisionId && occupation === unite.groupeDivisionId) return false; // division autorisée
          return true; // occupée pour une autre raison → conflit réel
        });
        if (conflitClasse) continue;

        // Salle déjà occupée à ce créneau (si une salle est précisée) ?
        if (unite.salleId && creneauOccupeParSalle.has(`${unite.salleId}|${creneau.id}`)) continue;

        // Quota horaire : dépassement autorisé uniquement si les heures
        // supplémentaires sont explicitement activées.
        const dejaPlacees = heuresPlaceesParEnseignant[unite.enseignantId] || 0;
        const quota = quotaEffectif(unite.enseignantId);
        const nouveauTotal = dejaPlacees + unite.dureeMinutes / 60;
        if (quota !== null && nouveauTotal > quota && !heuresSupAutorisees) continue;

        // Ce créneau convient.
        creneauChoisi = creneau;
        break;
      }

      if (!creneauChoisi) {
        conflits.push({
          ligneId: unite.ligneId,
          classeId: unite.classeId,
          matiereId: unite.matiereId,
          enseignantId: unite.enseignantId,
          motif: "Aucun créneau disponible ne satisfait toutes les contraintes (enseignant, classe, salle, quota).",
        });
        continue;
      }

      // Réservation effective du créneau.
      creneauOccupeParEnseignant.add(`${unite.enseignantId}|${creneauChoisi.id}`);
      classesAVerifier.forEach(classeId => {
        creneauOccupeParClasse.set(`${classeId}|${creneauChoisi.id}`, unite.groupeDivisionId || 'SEUL');
      });
      if (unite.salleId) creneauOccupeParSalle.add(`${unite.salleId}|${creneauChoisi.id}`);
      heuresPlaceesParEnseignant[unite.enseignantId] = (heuresPlaceesParEnseignant[unite.enseignantId] || 0) + unite.dureeMinutes / 60;

      // Une ligne "groupe classes associées" place la même séance pour
      // chaque classe membre (même enseignant, même matière, même créneau).
      classesAVerifier.forEach(classeId => {
        seancesAInserer.push({
          classe_id: classeId,
          matiere_id: unite.matiereId,
          enseignant_id: unite.enseignantId,
          creneau_id: creneauChoisi.id,
          salle_id: unite.salleId,
        });
      });
    }

    // -----------------------------------------------------------------
    // 6. ÉCRITURE : nouvelle version d'emploi du temps + ses séances
    // -----------------------------------------------------------------
    const { data: dernierEmploi } = await supabase
      .from('emplois_du_temps')
      .select('version')
      .eq('etablissement_id', etablissementId)
      .eq('annee_scolaire_id', anneeScolaireId)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nouvelleVersion = (dernierEmploi?.version || 0) + 1;

    const rapport = {
      nb_unites_demandees: unites.length,
      nb_seances_placees: seancesAInserer.length,
      nb_conflits: conflits.length,
      conflits,
      avertissements,
      heures_supplementaires_autorisees: heuresSupAutorisees,
      genere_le: new Date().toISOString(),
    };

    const { data: nouvelEmploi, error: erreurCreationEmploi } = await supabase
      .from('emplois_du_temps')
      .insert({
        etablissement_id: etablissementId,
        annee_scolaire_id: anneeScolaireId,
        version: nouvelleVersion,
        statut: 'BROUILLON',
        genere_par_user_id: req.body.genereParUserId || null,
        parametres_generation_json: { autoriser_heures_supplementaires: heuresSupAutorisees },
        rapport_generation_json: rapport,
      })
      .select()
      .single();

    if (erreurCreationEmploi) {
      console.error("Erreur création emploi_du_temps :", erreurCreationEmploi.message);
      return res.status(400).json({ error: "Erreur lors de la création de l'emploi du temps : " + erreurCreationEmploi.message });
    }

    if (seancesAInserer.length > 0) {
      const lignesAInserer = seancesAInserer.map(s => ({ ...s, emploi_du_temps_id: nouvelEmploi.id }));
      // Insertion par lots de 500 pour rester raisonnable niveau requête.
      const TAILLE_LOT = 500;
      for (let i = 0; i < lignesAInserer.length; i += TAILLE_LOT) {
        const lot = lignesAInserer.slice(i, i + TAILLE_LOT);
        const { error: erreurInsertionSeances } = await supabase.from('seances_planifiees').insert(lot);
        if (erreurInsertionSeances) {
          console.error("Erreur insertion séances (lot) :", erreurInsertionSeances.message);
          return res.status(400).json({
            error: "L'emploi du temps a été créé mais l'insertion des séances a échoué : " + erreurInsertionSeances.message,
            emploiDuTempsId: nouvelEmploi.id,
          });
        }
      }
    }

    res.status(201).json({
      message: conflits.length === 0
        ? "Emploi du temps généré avec succès, sans conflit."
        : `Emploi du temps généré avec ${conflits.length} conflit(s) non résolu(s).`,
      emploiDuTemps: nouvelEmploi,
      rapport,
    });

  } catch (error) {
    console.error("Erreur serveur (POST /emploi-du-temps/generer) :", error.message);
    res.status(500).json({ error: "Une erreur inattendue est survenue lors de la génération." });
  }
});

// -----------------------------------------------------------------------
// GET /api/emploi-du-temps/:id/rapport — relit le rapport d'une génération
// -----------------------------------------------------------------------
router.get('/:id/rapport', async (req, res) => {
  try {
    const { data, error } = await req.supabase
      .from('emplois_du_temps')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) {
      return res.status(404).json({ error: "Emploi du temps introuvable." });
    }
    res.status(200).json(data);
  } catch (error) {
    console.error("Erreur serveur (GET /emploi-du-temps/:id/rapport) :", error.message);
    res.status(500).json({ error: "Une erreur inattendue est survenue." });
  }
});

module.exports = router;
const express = require('express');
const router = express.Router();

// 🛡️ SÉCURITÉ : même garde-fou que les autres routes.
router.use((req, res, next) => {
  if (!req.supabase) {
    console.error("❌ ERREUR CRITIQUE : req.supabase est indéfini.");
    return res.status(500).json({ error: "Erreur interne de connexion à la base de données." });
  }
  next();
});

// Niveaux considérés comme "second cycle" pour la priorité des enseignants
// A4-A7 — cohérent avec le reste de l'application (voir CenseurDashboard.jsx).
const NIVEAUX_SECOND_CYCLE = ['Seconde', 'Première', 'Terminale'];
const DUREE_MAX_SEANCE_MINUTES = 120; // "la plus longue séance de cours, c'est deux heures"

// -----------------------------------------------------------------------
// POST /api/emploi-du-temps/generer
// Corps attendu : { etablissementId, anneeScolaireId, autoriserHeuresSupplementaires }
//
// Ne modifie jamais les tables existantes autrement qu'en INSERT : crée
// une nouvelle version d'emploi_du_temps (BROUILLON) et ses séances
// planifiées. Ne touche jamais à un emploi du temps déjà PUBLIE.
// -----------------------------------------------------------------------
router.post('/generer', async (req, res) => {
  try {
    const { etablissementId, anneeScolaireId, autoriserHeuresSupplementaires } = req.body;

    if (!etablissementId || !anneeScolaireId) {
      return res.status(400).json({ error: "etablissementId et anneeScolaireId sont requis." });
    }

    const supabase = req.supabase;
    const heuresSupAutorisees = !!autoriserHeuresSupplementaires;

    // -----------------------------------------------------------------
    // 1. CHARGEMENT DE TOUTES LES DONNÉES DE RÉFÉRENCE (en parallèle)
    // -----------------------------------------------------------------
    const [
      { data: creneaux, error: erreurCreneaux },
      { data: salles, error: erreurSalles },
      { data: matrice, error: erreurMatrice },
      { data: groupesClasses, error: erreurGroupesClasses },
      { data: groupesClassesMembres, error: erreurGroupesClassesMembres },
      { data: groupesDivision, error: erreurGroupesDivision },
      { data: indisponibilites, error: erreurIndispo },
      { data: volumesContractuels, error: erreurVolumesContractuels },
      { data: quotasGrade, error: erreurQuotasGrade },
      { data: classes, error: erreurClasses },
    ] = await Promise.all([
      supabase.from('creneaux_horaires').select('*').eq('etablissement_id', etablissementId).eq('annee_scolaire_id', anneeScolaireId).eq('type_creneau', 'COURS').order('jour_semaine').order('heure_debut'),
      supabase.from('salles').select('*').eq('etablissement_id', etablissementId).is('deleted_at', null),
      supabase.from('matrice_planification').select('*').eq('etablissement_id', etablissementId).eq('annee_scolaire_id', anneeScolaireId),
      supabase.from('groupes_classes_associees').select('*').eq('etablissement_id', etablissementId).eq('annee_scolaire_id', anneeScolaireId),
      supabase.from('groupes_classes_associees_membres').select('*'),
      supabase.from('groupes_division_classe').select('*').eq('etablissement_id', etablissementId).eq('annee_scolaire_id', anneeScolaireId),
      supabase.from('indisponibilites_enseignant').select('*').eq('etablissement_id', etablissementId).eq('annee_scolaire_id', anneeScolaireId),
      supabase.from('volumes_contractuels_enseignant').select('*').eq('etablissement_id', etablissementId).eq('annee_scolaire_id', anneeScolaireId),
      supabase.from('quotas_grade_defaut').select('*'),
      supabase.from('classes').select('id, nom, niveau').eq('etablissement_id', etablissementId).eq('annee_scolaire_id', anneeScolaireId).is('deleted_at', null),
    ]);

    const premiereErreur = erreurCreneaux || erreurSalles || erreurMatrice || erreurGroupesClasses ||
      erreurGroupesClassesMembres || erreurGroupesDivision || erreurIndispo || erreurVolumesContractuels ||
      erreurQuotasGrade || erreurClasses;
    if (premiereErreur) {
      console.error("Erreur chargement données de référence :", premiereErreur.message);
      return res.status(400).json({ error: "Erreur lors du chargement des données : " + premiereErreur.message });
    }

    if (!creneaux || creneaux.length === 0) {
      return res.status(400).json({ error: "Aucune grille horaire trouvée. Générez d'abord la grille horaire (onglet Grille horaire)." });
    }
    if (!matrice || matrice.length === 0) {
      return res.status(400).json({ error: "La matrice de planification est vide. Ajoutez d'abord des lignes (onglet Croisement)." });
    }

    // Récupère le grade des enseignants concernés par la matrice.
    const idsEnseignantsDistincts = [...new Set(matrice.map(m => m.enseignant_id))];
    const { data: profils, error: erreurProfils } = idsEnseignantsDistincts.length > 0
      ? await supabase.from('utilisateurs_profils').select('user_id, grade').in('user_id', idsEnseignantsDistincts)
      : { data: [] };
    if (erreurProfils) {
      return res.status(400).json({ error: "Erreur chargement des profils enseignants : " + erreurProfils.message });
    }

    // -----------------------------------------------------------------
    // 2. STRUCTURES D'AIDE
    // -----------------------------------------------------------------
    const gradeParEnseignant = {};
    (profils || []).forEach(p => { gradeParEnseignant[p.user_id] = p.grade || null; });

    const quotaParGrade = {};
    (quotasGrade || []).forEach(q => { quotaParGrade[q.grade] = q; });

    const volumeContractuelParEnseignant = {};
    (volumesContractuels || []).forEach(v => { volumeContractuelParEnseignant[v.enseignant_id] = Number(v.volume_total_heures); });

    const niveauParClasse = {};
    (classes || []).forEach(c => { niveauParClasse[c.id] = c.niveau; });

    const membresParGroupeClasses = {};
    (groupesClassesMembres || []).forEach(m => {
      if (!membresParGroupeClasses[m.groupe_id]) membresParGroupeClasses[m.groupe_id] = [];
      membresParGroupeClasses[m.groupe_id].push(m.classe_id);
    });

    // Quota effectif d'un enseignant : volume contractuel s'il est défini,
    // sinon le quota par défaut de son grade, sinon aucune limite connue
    // (on ne bloque pas dans ce cas — pas de donnée pour juger).
    const quotaEffectif = (enseignantId) => {
      if (volumeContractuelParEnseignant[enseignantId] !== undefined) return volumeContractuelParEnseignant[enseignantId];
      const grade = gradeParEnseignant[enseignantId];
      if (grade && quotaParGrade[grade]) return Number(quotaParGrade[grade].volume_max_heures);
      return null;
    };

    // -----------------------------------------------------------------
    // 3. CONSTRUCTION DES "UNITÉS" À PLACER
    // Chaque ligne de la matrice est éclatée en N séances individuelles,
    // chacune ne dépassant jamais DUREE_MAX_SEANCE_MINUTES.
    // -----------------------------------------------------------------
    const unites = [];
    const avertissements = [];

    matrice.forEach(ligne => {
      const nbSeances = ligne.nombre_seances || 1;
      let dureeMinutes = ligne.duree_seance_minutes || Math.round((Number(ligne.volume_hebdo_heures) * 60) / nbSeances);

      if (dureeMinutes > DUREE_MAX_SEANCE_MINUTES) {
        avertissements.push(
          `Ligne ${ligne.id} : durée de séance calculée (${dureeMinutes} min) dépasse le maximum de ${DUREE_MAX_SEANCE_MINUTES} min — plafonnée automatiquement.`
        );
        dureeMinutes = DUREE_MAX_SEANCE_MINUTES;
      }

      for (let i = 0; i < nbSeances; i++) {
        unites.push({
          ligneId: ligne.id,
          classeId: ligne.classe_id,
          matiereId: ligne.matiere_id,
          enseignantId: ligne.enseignant_id,
          salleId: ligne.salle_id || null,
          dureeMinutes,
          groupeClassesId: ligne.groupe_classes_id || null,
          groupeDivisionId: ligne.groupe_division_id || null,
          niveau: ligne.niveau,
        });
      }
    });

    // -----------------------------------------------------------------
    // 4. ORDRE DE PRIORITÉ
    // 1) Classes associées (contrainte la plus rigide)
    // 2) Enseignants A4-A7 sur le second cycle (priorité légale)
    // 3) Le reste
    // -----------------------------------------------------------------
    const priorite = (unite) => {
      if (unite.groupeClassesId) return 0;
      const grade = gradeParEnseignant[unite.enseignantId];
      const estA4A7 = grade && ['A4', 'A5', 'A6', 'A7'].includes(grade);
      const estSecondCycle = NIVEAUX_SECOND_CYCLE.includes(unite.niveau);
      if (estA4A7 && estSecondCycle) return 1;
      return 2;
    };
    unites.sort((a, b) => priorite(a) - priorite(b));

    // -----------------------------------------------------------------
    // 5. PLACEMENT (glouton, avec suivi des conflits plutôt que crash)
    // -----------------------------------------------------------------
    const creneauOccupeParEnseignant = new Set(); // clé: enseignantId|creneauId
    // clé: classeId|creneauId -> groupeDivisionId ou 'SEUL' (permet de savoir
    // si un second cours peut légitimement partager ce créneau — cas division).
    const creneauOccupeParClasse = new Map();
    const creneauOccupeParSalle = new Set(); // clé: salleId|creneauId
    const heuresPlaceesParEnseignant = {}; // enseignantId -> total heures placées

    const seancesAInserer = [];
    const conflits = [];

    for (const unite of unites) {
      const classesAVerifier = unite.groupeClassesId
        ? (membresParGroupeClasses[unite.groupeClassesId] || [unite.classeId])
        : [unite.classeId];

      let creneauChoisi = null;

      for (const creneau of creneaux) {
        // Enseignant déjà occupé à ce créneau ?
        if (creneauOccupeParEnseignant.has(`${unite.enseignantId}|${creneau.id}`)) continue;

        // Enseignant indisponible à ce créneau (déclaré explicitement) ?
        const estIndisponible = (indisponibilites || []).some(
          i => i.enseignant_id === unite.enseignantId && i.creneau_id === creneau.id
        );
        if (estIndisponible) continue;

        // Toutes les classes concernées doivent être libres à ce créneau —
        // sauf cas de division légitime (même groupe_division_id).
        const conflitClasse = classesAVerifier.some(classeId => {
          const occupation = creneauOccupeParClasse.get(`${classeId}|${creneau.id}`);
          if (!occupation) return false;
          if (unite.groupeDivisionId && occupation === unite.groupeDivisionId) return false; // division autorisée
          return true; // occupée pour une autre raison → conflit réel
        });
        if (conflitClasse) continue;

        // Salle déjà occupée à ce créneau (si une salle est précisée) ?
        if (unite.salleId && creneauOccupeParSalle.has(`${unite.salleId}|${creneau.id}`)) continue;

        // Quota horaire : dépassement autorisé uniquement si les heures
        // supplémentaires sont explicitement activées.
        const dejaPlacees = heuresPlaceesParEnseignant[unite.enseignantId] || 0;
        const quota = quotaEffectif(unite.enseignantId);
        const nouveauTotal = dejaPlacees + unite.dureeMinutes / 60;
        if (quota !== null && nouveauTotal > quota && !heuresSupAutorisees) continue;

        // Ce créneau convient.
        creneauChoisi = creneau;
        break;
      }

      if (!creneauChoisi) {
        conflits.push({
          ligneId: unite.ligneId,
          classeId: unite.classeId,
          matiereId: unite.matiereId,
          enseignantId: unite.enseignantId,
          motif: "Aucun créneau disponible ne satisfait toutes les contraintes (enseignant, classe, salle, quota).",
        });
        continue;
      }

      // Réservation effective du créneau.
      creneauOccupeParEnseignant.add(`${unite.enseignantId}|${creneauChoisi.id}`);
      classesAVerifier.forEach(classeId => {
        creneauOccupeParClasse.set(`${classeId}|${creneauChoisi.id}`, unite.groupeDivisionId || 'SEUL');
      });
      if (unite.salleId) creneauOccupeParSalle.add(`${unite.salleId}|${creneauChoisi.id}`);
      heuresPlaceesParEnseignant[unite.enseignantId] = (heuresPlaceesParEnseignant[unite.enseignantId] || 0) + unite.dureeMinutes / 60;

      // Une ligne "groupe classes associées" place la même séance pour
      // chaque classe membre (même enseignant, même matière, même créneau).
      classesAVerifier.forEach(classeId => {
        seancesAInserer.push({
          classe_id: classeId,
          matiere_id: unite.matiereId,
          enseignant_id: unite.enseignantId,
          creneau_id: creneauChoisi.id,
          salle_id: unite.salleId,
        });
      });
    }

    // -----------------------------------------------------------------
    // 6. ÉCRITURE : nouvelle version d'emploi du temps + ses séances
    // -----------------------------------------------------------------
    const { data: dernierEmploi } = await supabase
      .from('emplois_du_temps')
      .select('version')
      .eq('etablissement_id', etablissementId)
      .eq('annee_scolaire_id', anneeScolaireId)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nouvelleVersion = (dernierEmploi?.version || 0) + 1;

    const rapport = {
      nb_unites_demandees: unites.length,
      nb_seances_placees: seancesAInserer.length,
      nb_conflits: conflits.length,
      conflits,
      avertissements,
      heures_supplementaires_autorisees: heuresSupAutorisees,
      genere_le: new Date().toISOString(),
    };

    const { data: nouvelEmploi, error: erreurCreationEmploi } = await supabase
      .from('emplois_du_temps')
      .insert({
        etablissement_id: etablissementId,
        annee_scolaire_id: anneeScolaireId,
        version: nouvelleVersion,
        statut: 'BROUILLON',
        genere_par_user_id: req.body.genereParUserId || null,
        parametres_generation_json: { autoriser_heures_supplementaires: heuresSupAutorisees },
        rapport_generation_json: rapport,
      })
      .select()
      .single();

    if (erreurCreationEmploi) {
      console.error("Erreur création emploi_du_temps :", erreurCreationEmploi.message);
      return res.status(400).json({ error: "Erreur lors de la création de l'emploi du temps : " + erreurCreationEmploi.message });
    }

    if (seancesAInserer.length > 0) {
      const lignesAInserer = seancesAInserer.map(s => ({ ...s, emploi_du_temps_id: nouvelEmploi.id }));
      // Insertion par lots de 500 pour rester raisonnable niveau requête.
      const TAILLE_LOT = 500;
      for (let i = 0; i < lignesAInserer.length; i += TAILLE_LOT) {
        const lot = lignesAInserer.slice(i, i + TAILLE_LOT);
        const { error: erreurInsertionSeances } = await supabase.from('seances_planifiees').insert(lot);
        if (erreurInsertionSeances) {
          console.error("Erreur insertion séances (lot) :", erreurInsertionSeances.message);
          return res.status(400).json({
            error: "L'emploi du temps a été créé mais l'insertion des séances a échoué : " + erreurInsertionSeances.message,
            emploiDuTempsId: nouvelEmploi.id,
          });
        }
      }
    }

    res.status(201).json({
      message: conflits.length === 0
        ? "Emploi du temps généré avec succès, sans conflit."
        : `Emploi du temps généré avec ${conflits.length} conflit(s) non résolu(s).`,
      emploiDuTemps: nouvelEmploi,
      rapport,
    });

  } catch (error) {
    console.error("Erreur serveur (POST /emploi-du-temps/generer) :", error.message);
    res.status(500).json({ error: "Une erreur inattendue est survenue lors de la génération." });
  }
});

// -----------------------------------------------------------------------
// GET /api/emploi-du-temps/:id/rapport — relit le rapport d'une génération
// -----------------------------------------------------------------------
router.get('/:id/rapport', async (req, res) => {
  try {
    const { data, error } = await req.supabase
      .from('emplois_du_temps')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) {
      return res.status(404).json({ error: "Emploi du temps introuvable." });
    }
    res.status(200).json(data);
  } catch (error) {
    console.error("Erreur serveur (GET /emploi-du-temps/:id/rapport) :", error.message);
    res.status(500).json({ error: "Une erreur inattendue est survenue." });
  }
});

module.exports = router;
