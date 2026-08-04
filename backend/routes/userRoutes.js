const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Definir rutas de usuario
router.post('/login', userController.login);
router.get('/inspectores', userController.getInspectors);
router.post('/turno', userController.ObtenerTurnoEndpoint);

module.exports = router;
