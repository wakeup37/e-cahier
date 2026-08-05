const express = require('express');
const app = express();

// Middleware pour permettre à Express de lire le format JSON
app.use(express.json());

// Importation de votre routeur de cahier de texte
const cahierDeTexteRouter = require('./routes/cahierDeTexte');

// Utilisation des routes avec le préfixe /api
app.use('/api', cahierDeTexteRouter);

// Lancement du serveur
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Le serveur Nzonya tourne sur le port ${PORT}`);
});
