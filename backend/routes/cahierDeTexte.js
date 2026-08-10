const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/cycles', async (req, res) => {
    try {
        const { classe_id } = req.query;
        let query = 'SELECT * FROM cycles';
        let params = [];

        if (classe_id) {
            query += ' WHERE classe_id = $1';
            params.push(classe_id);
        }

        query += ' ORDER BY id DESC';
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Erreur serveur lors de la récupération des cycles.");
    }
});

router.post('/cycles', async (req, res) => {
    try {
        const { enseignant_id, classe_id, titre_cycle, competence, duree, niveau, activite } = req.body;

        const nouveauCycle = await pool.query(
            `INSERT INTO cycles (enseignant_id, classe_id, titre_cycle, competence, duree, niveau, activite, statut) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'En cours') RETURNING *`,
            [enseignant_id, classe_id, titre_cycle, competence, duree, niveau, activite]
        );

        res.status(201).json({
            message: "Cycle créé avec succès.",
            cycle: nouveauCycle.rows[0]
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Erreur serveur lors de la création du cycle.");
    }
});

router.put('/cycles/:id/terminer', async (req, res) => {
    try {
        const { id } = req.params;
        const cycleMaj = await pool.query(
            `UPDATE cycles SET statut = 'Terminé' WHERE id = $1 RETURNING *`,
            [id]
        );
        res.json({ message: "Cycle clôturé avec succès.", cycle: cycleMaj.rows[0] });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Erreur serveur lors de la clôture du cycle.");
    }
});

router.delete('/cycles/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM cycles WHERE id = $1', [id]);
        res.json({ message: "Cycle supprimé avec succès." });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Erreur serveur lors de la suppression du cycle.");
    }
});

router.post('/lecons', async (req, res) => {
    try {
        const { cycle_id, titre, duree, nombre_seances } = req.body;

        const nouvelleLecon = await pool.query(
            `INSERT INTO lecons (cycle_id, titre, duree, nombre_seances, statut) 
             VALUES ($1, $2, $3, $4, 'En cours') RETURNING *`,
            [cycle_id, titre, duree, nombre_seances || 4]
        );

        res.status(201).json({
            message: "Leçon créée avec succès.",
            lecon: nouvelleLecon.rows[0]
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Erreur serveur lors de la création de la leçon.");
    }
});

router.delete('/lecons/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM lecons WHERE id = $1', [id]);
        res.json({ message: "Leçon supprimée avec succès." });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Erreur serveur lors de la suppression de la leçon.");
    }
});

router.post('/seances', async (req, res) => {
    try {
        const { lecon_id, numero, titre, date, lieu, habilites, contenus, exercices, evaluations } = req.body;

        const nouvelleSeance = await pool.query(
            `INSERT INTO seances (lecon_id, numero, titre, date, lieu, habilites, contenus, exercices, evaluations, statut) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'En cours') RETURNING *`,
            [lecon_id, numero, titre, date, lieu, habilites, contenus, exercices, evaluations]
        );

        res.status(201).json({
            message: "Séance enregistrée avec succès.",
            seance: nouvelleSeance.rows[0]
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Erreur serveur lors de l'enregistrement de la séance.");
    }
});

router.put('/seances/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { titre, date, lieu, habilites, contenus, exercices, evaluations, statut } = req.body;

        const seanceMaj = await pool.query(
            `UPDATE seances 
             SET titre = COALESCE($1, titre), 
                 date = COALESCE($2, date), 
                 lieu = COALESCE($3, lieu), 
                 habilites = COALESCE($4, habilites), 
                 contenus = COALESCE($5, contenus), 
                 exercices = COALESCE($6, exercices), 
                 evaluations = COALESCE($7, evaluations), 
                 statut = COALESCE($8, statut) 
             WHERE id = $9 RETURNING *`,
            [titre, date, lieu, habilites, contenus, exercices, evaluations, statut, id]
        );

        res.json({
            message: "Séance mise à jour avec succès.",
            seance: seanceMaj.rows[0]
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Erreur serveur lors de la modification de la séance.");
    }
});

router.delete('/seances/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM seances WHERE id = $1', [id]);
        res.json({ message: "Séance supprimée avec succès." });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Erreur serveur lors de la suppression de la séance.");
    }
});

module.exports = router;
