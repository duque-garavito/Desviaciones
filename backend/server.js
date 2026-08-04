const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();

// --- CONFIGURACIÓN DE MIDDLEWARES ---
app.use(cors());
app.use(express.json());

// --- IMPORTACIÓN DE RUTAS (solo las necesarias para Inspector) ---
const userRoutes = require('./routes/userRoutes');
const inspectionRoutes = require('./routes/inspectionRoutes');
const recordRoutes = require('./routes/recordRoutes');
const scheduleRoutes = require('./routes/scheduleRoutes');
const versionRoutes = require('./routes/versionRoutes');

// --- REGISTRO DE RUTAS ---
app.use('/api/usuarios', userRoutes);
app.use('/api/inspecciones', inspectionRoutes);
app.use('/api/registros', recordRoutes);
app.use('/api/programacion', scheduleRoutes);
app.use('/api/version', versionRoutes);

// --- INSTALADORES APK ---
app.use(
  '/updates',
  express.static(path.join(__dirname, 'updates'), {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.apk')) {
        res.setHeader('Content-Type', 'application/vnd.android.package-archive');
      }
    },
  })
);

// --- RUTA INICIAL ---
app.get('/', (req, res) => {
  res.send('Backend Desviaciones - Vista Inspector');
});

// --- INICIO DEL SERVIDOR ---
const PORT = process.env.PORT || 3002;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
  =================================================
  SERVIDOR DESVIACIONES INICIADO
  Puerto: ${PORT}
  Arquitectura: MVC (Model-View-Controller)
  Módulos: Usuarios, Inspecciones, Registros,
          Programación (lectura), Versión APK
  =================================================
  `);
});
