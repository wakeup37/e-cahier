const express = require('express'); // 🛠️ CORRECTION : "const" doit être en minuscule (avec un C majuscule, Node.js affiche une erreur)
const router = express.Router();

// 🛡️ SÉCURITÉ : Middleware local pour vérifier que Supabase est bien connecté avant d'exécuter les requêtes
router.use((req, res, next) => {
  if (!req.supabase) {
    console.error("❌ ERREUR CRITIQUE : req.supabase est indéfini.");
    return res.status(500).json({ error: "Erreur interne de connexion à la base de données." });
  }
  next();
});

// 1. RÉCUPÉRER TOUS LES ÉTABLISSEMENTS (GET /api/etablissements)
router.get('/', async (req, res) => {
  try {
    const { data, error } = await req.supabase
      .from('etablissements')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Erreur base de données (GET /etablissements):", error.message);
      return res.status(400).json({ error: "Impossible de récupérer les établissements." });
    }
    
    res.status(200).json(data);
  } catch (error) {
    console.error("Erreur serveur (GET /etablissements):", error.message);
    res.status(500).json({ error: "Une erreur inattendue est survenue sur le serveur." });
  }
});

// 2. CRÉER UN NOUVEL ÉTABLISSEMENT (POST /api/etablissements)
router.post('/', async (req, res) => {
  try {
    const { nom, code_etablissement, annee_scolaire_active } = req.body;

    // 🛡️ OPTIMISATION : On vérifie que le nom n'est pas vide ou composé juste d'espaces (trim)
    if (!nom || nom.trim() === "") {
      return res.status(400).json({ error: "Le nom de l'établissement est requis et invalide." });
    }

    // Insertion dans Supabase avec nettoyage des données entrantes
    const { data, error } = await req.supabase
      .from('etablissements')
      .insert([
        { 
          nom: nom.trim(), // Enlève les espaces inutiles au début et à la fin
          code_etablissement: code_etablissement ? code_etablissement.trim() : null, 
          annee_scolaire_active: annee_scolaire_active ? annee_scolaire_active.trim() : '2025-2026' 
        }
      ])
      .select();

    if (error) {
      console.error("Erreur base de données (POST /etablissements):", error.message);
      
      // 🛡️ OPTIMISATION : Gestion des doublons (ex: si le code établissement existe déjà)
      if (error.code === '23505') {
         return res.status(409).json({ error: "Cet établissement ou ce code unique existe déjà." });
      }
      return res.status(400).json({ error: "Erreur lors de l'enregistrement dans la base de données." });
    }

    res.status(201).json({ message: "Établissement créé avec succès", etablissement: data[0] });
  } catch (error) {
    console.error("Erreur serveur (POST /etablissements):", error.message);
    res.status(500).json({ error: "Une erreur inattendue est survenue lors de la création." });
  }
});

module.exports = router;
