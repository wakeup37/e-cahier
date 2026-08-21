import Dexie from 'dexie';

export const db = new Dexie('ECahierOfflineDB');

db.version(1).stores({
  // Tables miroirs pour stocker les données essentielles en local
  classes: 'id, etablissement_id',
  seances: 'id, lecon_id, classe_id, statut',
  
  // File d'attente cruciale : stocke les actions faites hors-ligne
  sync_outbox: '++id, table, action, payload, created_at'
});