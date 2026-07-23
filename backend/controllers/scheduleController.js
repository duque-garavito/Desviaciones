const ScheduleModel = require('../models/scheduleModel');

const getUserSchedule = async (req, res) => {
  const { codUsr } = req.params;
  try {
    const d = new Date();
    const day = d.getDay(), diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const lunesDate = new Date(d.setDate(diff));
    
    // Formatear a YYYY-MM-DD en hora local
    const yyyy = lunesDate.getFullYear();
    const mm = String(lunesDate.getMonth() + 1).padStart(2, '0');
    const dd = String(lunesDate.getDate()).padStart(2, '0');
    const lunes = `${yyyy}-${mm}-${dd}`;

    const schedule = await ScheduleModel.getUserWeeklySchedule(codUsr, lunes);
    res.json(schedule);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getUserSchedule
};
