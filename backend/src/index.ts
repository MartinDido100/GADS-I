import express from 'express';
import cors from 'cors';
import { env } from './lib/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authRoutes } from './routes/authRoutes.js';
import { empleadoRoutes } from './routes/empleadoRoutes.js';
import { horarioRoutes, turnoRoutes } from './routes/horarioRoutes.js';
import { fichadaRoutes } from './routes/fichadaRoutes.js';
import { novedadRoutes, recalcularNovedadesRouter } from './routes/novedadRoutes.js';
import { cierreRoutes } from './routes/cierreRoutes.js';

const app = express();

app.use(cors({ origin: env.corsOrigin, credentials: true }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/auth', authRoutes);
app.use('/empleados', empleadoRoutes);
app.use('/empleados/:legajo/turnos', turnoRoutes);
app.use('/horarios', horarioRoutes);
app.use('/fichadas', fichadaRoutes);
app.use('/novedades', novedadRoutes);
app.use('/empleados/:legajo/recalcular-novedades', recalcularNovedadesRouter);
app.use('/cierres', cierreRoutes);

app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`DigitalCheck API listening on http://localhost:${env.port}`);
});
