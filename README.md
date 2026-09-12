# ElectroScan — Analyse electrique industrielle et batiment

Application web pour analyser des photos d'installations electriques (armoires, cablage, rails DIN) via IA vision, et gerer le reperage des fils (amont/aval).

## Fonctionnalites

- Prise de photo (mobile) ou import (desktop / drag & drop)
- Analyse automatique via l'API Claude (vision) : materiaux, cables, dimensions de rails
- Detection des reperes de bornier (ex. X1-3) avec numeros de fils amont/aval
- Tableau de reperage editable (ajout, modification, suppression de lignes)
- Historique des analyses avec photos

## Installation locale

```bash
npm install
cp .env.example .env
# Ajouter ta cle API Anthropic dans .env
npm start
```

L'app tourne sur `http://localhost:3000`.

## Deploiement sur Render

1. Pousse ce projet sur un repo GitHub
2. Sur Render : New > Web Service > connecte le repo
3. Build command : `npm install`
4. Start command : `npm start`
5. Ajoute la variable d'environnement `ANTHROPIC_API_KEY` dans les settings Render
6. (Optionnel) Ajoute un disque persistant Render sur `/opt/render/project/src/uploads` et `/opt/render/project/src/db` pour garder les photos et la base de donnees entre les redeploiements — sinon elles seront reinitialisees a chaque deploiement (le plan gratuit n'a pas de disque persistant).

## Cle API Anthropic

Cree une cle sur [console.anthropic.com](https://console.anthropic.com), section API Keys, et colle-la dans la variable d'environnement `ANTHROPIC_API_KEY`.

## Structure

```
server.js       -> serveur Express + routes API
analyse.js       -> appel API Claude vision + parsing du resultat
db.js            -> base de donnees SQLite (analyses + reperages)
public/          -> frontend (HTML/CSS/JS), responsive mobile + desktop
uploads/         -> photos uploadees
db/              -> fichier SQLite
```
