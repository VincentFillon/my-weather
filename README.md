# Projet Météo

## Configuration

1. Renommez le fichier `.env.default` en `.env`.
2. Ouvrez le fichier `.env` et remplacez `ADMIN_PASSWORD` par votre mot de passe administrateur personnalisé.
3. Sauvegardez le fichier `.env`.

```env
ADMIN_PASSWORD=votremotdepasse
```

4. Lancez le serveur avec la commande `npm run start` (ou `node server.js`).

## Docker

Pour construire l'image Docker avec un mot de passe admin personnalisé, utilisez la commande suivante :

```sh
docker build --build-arg ADMIN_PASSWORD=votremotdepasse -t meteo .
```
