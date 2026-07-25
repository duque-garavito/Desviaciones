const express = require('express');
const router = express.Router();
const inspectionController = require('../controllers/inspectionController');

// Rutas para ejecución de inspecciones
router.get('/formulario-hoy/:codUsr', inspectionController.getMyForm);
router.post('/guardar', inspectionController.save);
router.put('/editar/:id', inspectionController.update);
router.get('/articulos', inspectionController.buscarArticulos);
router.get('/causas-desviacion', inspectionController.getDeviationCauses);
router.get('/desviaciones-articulo', inspectionController.getDeviationsByArticle);

module.exports = router;
