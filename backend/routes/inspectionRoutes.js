const express = require('express');
const router = express.Router();
const inspectionController = require('../controllers/inspectionController');

// Rutas para ejecución de inspecciones
router.get('/formulario-hoy/:codUsr', inspectionController.getMyForm);
router.get('/borrador-activo/:codUsr', inspectionController.getActiveDraft);
router.post('/guardar', inspectionController.save);
router.post('/crear-cabecera', inspectionController.createHeader);
router.post('/sincronizar-progreso', inspectionController.syncProgress);
router.post('/cancelar-borrador', inspectionController.cancelDraft);
router.put('/editar/:id', inspectionController.update);
router.get('/articulos', inspectionController.buscarArticulos);
router.get('/causas-desviacion', inspectionController.getDeviationCauses);
router.get('/desviaciones-articulo', inspectionController.getDeviationsByArticle);
router.get('/partes-produccion', inspectionController.getPartesProduccion);

module.exports = router;
