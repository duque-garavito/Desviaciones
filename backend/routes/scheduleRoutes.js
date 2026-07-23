const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/scheduleController');

// Rutas de programación (solo lectura para inspector)
router.get('/usuario/:codUsr', scheduleController.getUserSchedule);

module.exports = router;
