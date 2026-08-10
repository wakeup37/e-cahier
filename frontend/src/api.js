-- 1. Table des Années Scolaires (Ex: "2025-2026", "2026-2027")
create table if not exists annees_scolaires (
  id uuid default gen_random_uuid() primary key,
  etablissement_id uuid references etablissements(id) on delete cascade,
  intitule text not null, -- Ex: "2025-2026"
  est_active boolean default true, -- Permet de savoir l'année en cours
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Table des Matières
create table if not exists matieres (
  id uuid default gen_random_uuid() primary key,
  nom text not null unique, -- Ex: "Mathématiques", "Français", "EPS"
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Table des Classes (Rattachée à l'établissement ET à l'année scolaire)
create table if not exists classes (
  id uuid default gen_random_uuid() primary key,
  etablissement_id uuid references etablissements(id) on delete cascade,
  annee_scolaire_id uuid references annees_scolaires(id) on delete cascade,
  nom text not null, -- Ex: "6ème A", "2nde A"
  niveau text,       -- Ex: "6ème", "2nde"
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Table des Affiliations (Attribution des classes et matières aux enseignants)
create table if not exists affiliations (
  id uuid default gen_random_uuid() primary key,
  enseignant_id uuid references utilisateurs_profils(user_id) on delete cascade,
  classe_id uuid references classes(id) on delete cascade,
  etablissement_id uuid references etablissements(id) on delete cascade,
  annee_scolaire_id uuid references annees_scolaires(id) on delete cascade,
  matiere_id uuid references matieres(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Mise à jour de la table des Séances / Fiches (Pour l'attacher à l'année scolaire)
-- (Si la table existe déjà, on ajoute la colonne annee_scolaire_id si elle n'y est pas)
alter table if exists seances 
  add column if not exists annee_scolaire_id uuid references annees_scolaires(id) on delete cascade,
  add column if not exists classe_id uuid references classes(id) on delete cascade;

-- 6. Sécurisation (RLS)
alter table annees_scolaires enable row level security;
alter table matieres enable row level security;
alter table classes enable row level security;
alter table affiliations enable row level security;

-- 7. Politiques d'accès pour les utilisateurs authentifiés
create policy "Activer lecture/écriture annees_scolaires" on annees_scolaires for all using (auth.role() = 'authenticated');
create policy "Activer lecture/écriture matieres" on matieres for all using (auth.role() = 'authenticated');
create policy "Activer lecture/écriture classes" on classes for all using (auth.role() = 'authenticated');
create policy "Activer lecture/écriture affiliations" on affiliations for all using (auth.role() = 'authenticated');