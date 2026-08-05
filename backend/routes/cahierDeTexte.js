const express = require('express');
const router = express.Router();
const pool = require('../db'); // Votre connexion à la base de données

// 1. Route pour créer un nouveau Cycle / Compétence
router.post('/cycles', async (req, res) => {
    try {
        const { enseignant_id, classe_id, matiere_id, titre_cycle, nombre_lecons_prevu } = req.body;

        const nouveauCycle = await pool.query(
            `INSERT INTO cycles (enseignant_id, classe_id, matiere_id, titre_cycle, nombre_lecons_prevu) 
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [enseignant_id, classe_id, matiere_id, titre_cycle, nombre_lecons_prevu]
        );

        res.status(201).json({
            message: "Cycle créé avec succès. Vous pouvez maintenant y ajouter vos séances.",
            cycle: nouveauCycle.rows[0]
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Erreur serveur lors de la création du cycle.");
    }
});

// 2. Route pour créer une nouvelle Séance rattachée à un Cycle
router.post('/seances', async (req, res) => {
    try {
        const { cycle_id, enseignant_id, classe_id, matiere_id, numero_lecon, date_seance, titre, contenu, devoirs } = req.body;

        const nouvelleSeance = await pool.query(
            `INSERT INTO seances (cycle_id, enseignant_id, classe_id, matiere_id, numero_lecon, date_seance, titre, contenu, devoirs, statut) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'brouillon') RETURNING *`,
            [cycle_id, enseignant_id, classe_id, matiere_id, numero_lecon, date_seance, titre, contenu, devoirs]
        );

        res.status(201).json({
            message: "Séance enregistrée avec succès dans le cycle.",
            seance: nouvelleSeance.rows[0]
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Erreur serveur lors de l'enregistrement de la séance.");
    }
});

module.exports = router;
