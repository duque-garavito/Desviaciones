const InspectionModel = require('../models/inspectionModel');

const getMyForm = async (req, res) => {
  try {
    const { especie } = req.query;
    const data = await InspectionModel.getAssignedFormForToday(req.params.codUsr, especie);
    if (!data) {
      return res.json({ success: false, message: 'No tiene área asignada para hoy.' });
    }
    if (data.hasForm === false) {
      const areaMsg = especie 
        ? `área ${data.area} y especie ${especie}` 
        : `área ${data.area}`;
      return res.json({ success: false, message: `No hay formulario activo para el ${areaMsg}` });
    }
    res.json(data);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const save = async (req, res) => {
  const { cod_rv, nro_ref, cod_usr, respuestas, hora_inicio, hora_fin, conteo_muestra } = req.body;
  try {
    const result = await InspectionModel.saveInspection(cod_rv, nro_ref, cod_usr, respuestas, hora_inicio, hora_fin, conteo_muestra);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const update = async (req, res) => {
  const { id } = req.params;
  const { respuestas, hora_fin } = req.body;
  try {
    const result = await InspectionModel.updateInspection(id, respuestas, hora_fin);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const buscarArticulos = async (req, res) => {
  const { buscar, sub_cat, cod_as } = req.query;
  try {
    const articulos = await InspectionModel.buscarArticulos(buscar || '', sub_cat || '', cod_as || '');
    res.json({ success: true, articulos });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getDeviationCauses = async (req, res) => {
  const { cod_reporte, cod_as, cod_sub_cat, cod_art } = req.query;
  try {
    const causas = await InspectionModel.getDeviationCauses(cod_reporte, cod_as, cod_sub_cat, cod_art);
    res.json({ success: true, causas });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getDeviationsByArticle = async (req, res) => {
  const { cod_as, cod_art, cod_sub_cat } = req.query;
  try {
    const desviaciones = await InspectionModel.getDeviationsByArticle(cod_as, cod_art, cod_sub_cat);
    res.json({ success: true, desviaciones });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createHeader = async (req, res) => {
  const { cod_rv, nro_ref, cod_usr, parte_produccion, camposTexto } = req.body;
  try {
    const result = await InspectionModel.createHeader(cod_rv, nro_ref, cod_usr, parte_produccion, camposTexto);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const syncProgress = async (req, res) => {
  const { cod_rep_c, cod_rv, cod_usr, respuestas, conteo_muestra, nro_ref } = req.body;
  try {
    const result = await InspectionModel.syncProgress(cod_rep_c, cod_rv, cod_usr, respuestas, conteo_muestra, nro_ref);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const cancelDraft = async (req, res) => {
  const { cod_rep_c } = req.body;
  try {
    const result = await InspectionModel.cancelDraft(cod_rep_c);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getActiveDraft = async (req, res) => {
  try {
    const draft = await InspectionModel.getActiveDraftForToday(req.params.codUsr);
    res.json({ success: true, draft });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getPartesProduccion = async (req, res) => {
  try {
    const especie = req.query.especie || 'POT';
    const partes = await InspectionModel.getPartesProduccionRecientes(especie);
    res.json({ success: true, partes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getMyForm,
  save,
  update,
  createHeader,
  syncProgress,
  cancelDraft,
  getActiveDraft,
  buscarArticulos,
  getDeviationCauses,
  getDeviationsByArticle,
  getPartesProduccion
};

