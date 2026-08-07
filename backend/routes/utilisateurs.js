const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const config = require('../config');

const pool = new Pool({
  connectionString: config.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

router.get('/', async (req, res) => {
  try {
    res.status(200).json({ succes: true, message: "Route utilisateurs opérationnelle !" });
  } catch (err) {
    res.status(500).json({ succes: false, erreur: err.message });
  }
});

module.exports = router;
