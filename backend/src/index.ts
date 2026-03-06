import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import routes from './routes';
import { syncActiveTournaments } from './services/esport.service.js';

const app = express();
const PORT = process.env.PORT ?? 5000;

// Middlewares
app.use(cors());
app.use(express.json());

// Routes API
app.use('/api', routes);

app.listen(PORT, () => {
  console.log(`Serveur backend lancé sur http://localhost:${PORT}`);

  // Sync automatique toutes les heures pour les tournois en cours
  const ONE_HOUR = 60 * 60 * 1000;
  setInterval(() => {
    syncActiveTournaments().catch((err) =>
      console.error('[Esport] Erreur sync automatique:', err)
    );
  }, ONE_HOUR);
});

export default app;
