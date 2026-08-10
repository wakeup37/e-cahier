const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    res.status(200).json({ succes: true, message: "Route utilisateurs opérationnelle !" });
  } catch (err) {
    res.status(500).json({ succes: false, erreur: err.message });
  }
});

router.post('/login', async (req, res) => {
  const { email, motDePasse } = req.body;

  if (!email || !motDePasse) {
    return res.status(400).json({ succes: false, erreur: "Email et mot de passe requis." });
  }

  try {
    const { data, error } = await req.supabase
      .from('utilisateurs')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !data) {
      return res.status(401).json({ succes: false, erreur: "Utilisateur non trouvé." });
    }

    if (data.mot_de_passe !== motDePasse) {
      return res.status(401).json({ succes: false, erreur: "Mot de passe incorrect." });
    }

    res.status(200).json({
      succes: true,
      message: "Connexion réussie",
      utilisateur: {
        id: data.id,
        nom: data.nom,
        email: data.email,
        role: data.role
      }
    });

  } catch (err) {
    res.status(500).json({ succes: false, erreur: err.message });
  }
});

module.exports = router;
