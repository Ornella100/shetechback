import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { createDefaultAdmin } from './lib/startup.js';
import { initSocket } from './lib/socket.js';

import authRoutes from './routes/auth.routes.js';
import parcoursRoutes from './routes/parcours.routes.js';
import formationRoutes from './routes/formation.routes.js';
import modulesRoutes from './routes/modules.routes.js';
import coursRoutes from './routes/cours.routes.js';
import progressionRoutes from './routes/progression.routes.js';
import projetRoutes from './routes/projet.routes.js';
import sessionRoutes from './routes/session.routes.js';
import communityRoutes from './routes/community.routes.js';
import marketplaceRoutes from './routes/marketplace.routes.js';
import certificatRoutes from './routes/certificat.routes.js';
import abonnementRoutes from './routes/abonnement.routes.js';
import messageRoutes from './routes/message.routes.js';
import actualiteRoutes from './routes/actualite.routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '../uploads');

['livrables', 'certificats'].forEach(sub => {
  const dir = path.join(uploadsDir, sub);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const app = express();

app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
// Le webhook FedaPay a besoin du corps BRUT (signature calculée sur les octets exacts) :
// express.json ne doit pas le parser, la route applique express.raw elle-même.
app.use((req, res, next) => {
  if (req.originalUrl === '/webhooks/fedapay') return next();
  return express.json()(req, res, next);
});
app.use('/uploads', express.static(uploadsDir));

app.get('/', (req, res) => res.json({ message: 'API SheTech fonctionne ✓', version: '2.0.0' }));

app.use(authRoutes);
app.use('/parcours', parcoursRoutes);
app.use('/formations', formationRoutes);
app.use(modulesRoutes);
app.use(coursRoutes);
app.use(progressionRoutes);
app.use(projetRoutes);
app.use(sessionRoutes);
app.use(communityRoutes);
app.use(marketplaceRoutes);
app.use(certificatRoutes);
app.use(abonnementRoutes);
app.use(messageRoutes);
app.use(actualiteRoutes);

const httpServer = createServer(app);
initSocket(httpServer);

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, async () => {
  await createDefaultAdmin();
  console.log(`Serveur SheTech démarré sur http://localhost:${PORT}`);
});
