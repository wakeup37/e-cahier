const { Pool } = require('pg');

// Configuration de la connexion à la base de données
const pool = new Pool({
    user: 'postgres',      // Remplacez par votre nom d'utilisateur de base de données (ex: postgres)
    host: 'localhost',              // L'adresse de votre serveur de base de données
    database: 'postgres',          // Le nom de votre base de données
    password: '    ', // Votre mot de passe de base de données
    port: 5432,                     // Le port par défaut de PostgreSQL
});

// Test de la connexion pour vérifier que tout fonctionne
pool.connect((err, client, release) => {
    if (err) {
        return console.error('Erreur de connexion à la base de données :', err.stack);
    }
    console.log('Connexion à la base de données PostgreSQL réussie !');
    release();
});

module.exports = pool;
