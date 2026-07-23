const RecordModel = require('../models/recordModel');

const getRecords = async (req, res) => {
  try {
    const { area, inspector, fechaInicio, fechaFin, page, limit } = req.query;
    const result = await RecordModel.getAll({
      area,
      inspector,
      fechaInicio,
      fechaFin,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20
    });
    res.json(result);
  } catch (error) {
    console.error('Error al obtener registros:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getRecordDetail = async (req, res) => {
  try {
    const record = await RecordModel.getById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Registro no encontrado' });
    }
    res.json(record);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAreas = async (req, res) => {
  try {
    const areas = await RecordModel.getAreas();
    res.json(areas);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getRecords,
  getRecordDetail,
  getAreas
};
