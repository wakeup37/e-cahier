const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

app.get('/api/v1/status', (req, res) => {
    res.status(200).json({
        project: "Nzonya",
        status: "Online",
        message: "API de pilotage pédagogique opérationnelle."
    });
});

app.listen(PORT, () => {
    console.log(`Serveur Nzonya en écoute sur le port ${PORT}`);
});

