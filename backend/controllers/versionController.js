const fs = require('fs');
const path = require('path');

const VERSION_FILE = path.join(__dirname, '..', 'storage', 'desviaciones_version.json');

const getVersion = (req, res) => {
  try {
    if (!fs.existsSync(VERSION_FILE)) {
    
      return res.status(404).json({
        success: false,
        message: 'Aun no hay ninguna version publicada',
      });
    }

    const data = JSON.parse(fs.readFileSync(VERSION_FILE, 'utf8'));

    return res.json({ success: true, data });
  } catch (error) {
    console.error('ERROR AL LLEER VERSION PUBLICADA:', error);
    return res.status(500).json({
      success: false,
      message: 'NO SE PUDO LEER LA VERSION PUBLICADA',
    });
  }
};

module.exports = { getVersion };
