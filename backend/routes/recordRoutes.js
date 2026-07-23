const express = require('express');
const router = express.Router();
const recordController = require('../controllers/recordController');

// Rutas para visualización de registros
router.get('/', recordController.getRecords);
router.get('/areas', recordController.getAreas);
router.get('/:id', recordController.getRecordDetail);

module.exports = router;
