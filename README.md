# Ma Météo

Ma météo est une application web permettant aux utilisateurs d'indiquer l'état d'humeur dans lequels ils se trouvent.

L'interface se présente sous la forme d'une grille d'humeurs. L'utilisateur, lors de sa première connexion renseigne son nom (ou un pseudonyme) et sera ajouté dans une zone neutre à gauche. Il pourra ensuite glisser/déposer son utilisateur dans la tuile représentant son humeur.

Les utilisateurs on accès à un espace personnel dans lequel ils peuvent modifier leurs informations personnelles (nom, photo de profil, mot de passe) ou supprimer leur compte.

Un espace administrateur est accessible via le `/admin` (uniquement accessible pour les utilisateurs avec le role `admin`). Cet espace permet de modifier et/ou ajouter des humeurs, de gérer les médias (upload/suppression d'images ou de fichiers audios) et de gérer les utilisateurs (modification des infos, assignation de roles ou suppression).
>Lors de l'ajout d'une humeur, on doit renseigner un lien vers une image. On peut y insérer un lien externe ou alors importer l'image dans la gestion des médias et copier le lien pour l'utiliser lors de la création de l'humeur. Il en va de même pour l'URL (optionnelle) du fichier audio.

_**PS:** Il peut être utile de consulter cette météo avant d'entammer une conversation avec un collègue afin d'éviter tout risque de brûlure au 2nd degré par projection de café au visage_ 😁


## Environnement

NodeJS 22.x : [https://nodejs.org/fr/download](https://nodejs.org/fr/download)


## Configuration

1. Installer les dépendances avec la commande :

    ```sh
    npm install
    ```

2. Renommez ou créer une copie du fichier [.env.default](./.env.default) vers `.env`.
3. Ouvrez le fichier [.env](./.env) et remplacez les valeurs des différentes variables par celles correspondant à votre environnement :

    ```env
    # API
    API_PORT=8888

    # ... etc.
    ```

    >⚠️ Les informations de connexion à la base de données ainsi que la clé de vérification des token sont définit ici. Il est **fortement recommandé** de les modifier avant tout déploiement dans un environnement de production ou accessible depuis l'extérieur.

4. Sauvegardez le fichier [.env](./.env).


## Développement

Le backend (API) a été développé sous **NestJS**.

Veuillez vous référez à la [documentation](https://docs.nestjs.com/) si nécessaire pour mieux comprendre l'architecture d'un projet NestJS et les différents outils disponibles pour faciliter le développement.

Pour démarrer le serveur en mode développement (avec live-reload) en local, exécutez la commande suivante :

```sh
npm run start:dev
```


## Build

Pour compiler les sources du projet, utilisez la commande suivante :

```sh
npm run build
```

>Les sources compilées se trouveront dans le dossier [dist](./dist)


## Déploiement

Pour déployer et démarrer le serveur en local, utilisez les commandes suivantes :

```sh
npm run build
npm run start:prod
```

Le serveur sera démarré sur le port renseigné par la variable d'environnement `API_PORT` (par défaut `3000`). Vous pourrez ensuite effectuer vos requêtes API sur [http://localhost:3000/api/](http://localhost:3000/api/). Une WebSocket sera également ouverte sur [ws://localhost:3000/](ws://localhost:3000/)


## Docker

Pour construire l'image Docker, utilisez la commande suivante :

```sh
npm run docker:build
```

>Vous pouvez modifier les instructions de construction de l'image Docker dans le fichier [Dockerfile](./Dockerfile).

Pour déployer l'image dans un container Docker, utilisez la commande suivante :

```sh
npm run docker:run
```

Cette commande va démarrer un container nommé `meteo` exposé sur le `PORT` défini dans le fichier [.env](./.env).
