# SheTech Backend

## Configuration de l'API YouTube

Pour utiliser la fonctionnalité de recherche de vidéos YouTube :

1. **Créer un projet Google Cloud Console** :
   - Allez sur https://console.cloud.google.com/
   - Créez un nouveau projet ou sélectionnez un projet existant

2. **Activer l'API YouTube Data v3** :
   - Dans l'API Library, recherchez "YouTube Data API v3"
   - Cliquez sur "Enable"

3. **Créer des credentials** :
   - Allez dans "Credentials" > "Create Credentials" > "API Key"
   - Copiez la clé API générée

4. **Configurer dans le fichier .env** :
   ```
   YOUTUBE_API_KEY=votre_cle_api_youtube_ici
   ```

5. **Restrictions de l'API gratuite** :
   - 10 000 unités par jour
   - Chaque recherche coûte 100 unités
   - Limite de 100 résultats par recherche

## Utilisation de l'API

L'endpoint `/videos` permet de rechercher des vidéos :

```
GET /videos?query=développement web&maxResults=5
```

Retourne une liste de vidéos avec :
- `url` : URL YouTube complète
- `embedUrl` : URL pour intégration iframe
- `titre`, `description`, `thumbnail`, etc.