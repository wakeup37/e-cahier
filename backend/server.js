require('dotenv').config(); // 👈 INDISPENSABLE : Charge le fichier .env
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js'); // 👈 Importe Supabase

const app = express();
const PORT = process.env.PORT || 5002;

// --- INITIALISATION SUPABASE ---
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ ERREUR : Clés Supabase manquantes dans le fichier .env");
  process.exit(1);
}

// Création du client Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

// --- MIDDLEWARES ---
app.use(cors());
app.use(express.json());

// 👈 ASTUCE DE PRO : On injecte Supabase dans "req" pour que tes fichiers dans le dossier "routes" puissent l'utiliser facilement !
app.use((req, res, next) => {
  req.supabase = supabase;
  next();
});

// 1. Routes des cahiers de texte
try {
  const cahierDeTexteRoutes = require('./routes/cahierDeTexte');
  app.use('/api/cahiers-texte', cahierDeTexteRoutes);
} catch (error) {
  console.warn("⚠️ Avertissement : Les routes './routes/cahierDeTexte' n'ont pas pu être chargées :", error.message);
}

// 2. Routes des établissements
try {
  const etablissementRoutes = require('./routes/etablissements');
  app.use('/api/etablissements', etablissementRoutes);
} catch (error) {
  console.error("❌ ERREUR EXACTE etablissements :", error.message);
}

// 3. Routes des utilisateurs et rôles
try {
  const utilisateurRoutes = require('./routes/utilisateurs');
  app.use('/api/utilisateurs', utilisateurRoutes);
} catch (error) {
  console.error("❌ ERREUR EXACTE utilisateurs :", error.message);
}

// Route de base
app.get('/', (req, res) => {
  res.send("Salut ! Le serveur premium de E-cahier est bien en ligne et connecté à Supabase ! 🚀");
});

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`✅ Serveur démarré avec succès sur http://localhost:${PORT}`);
});
