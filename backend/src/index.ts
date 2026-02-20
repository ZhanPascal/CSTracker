import express from 'express';
import cors from 'cors';
import routes from './routes';

const app = express();
const PORT = process.env.PORT ?? 5000;

// Middlewares
app.use(cors());
app.use(express.json());

// Routes API
app.use('/api', routes);

app.listen(PORT, () => {
  console.log(`Serveur backend lancé sur http://localhost:${PORT}`);
});

export default app;
