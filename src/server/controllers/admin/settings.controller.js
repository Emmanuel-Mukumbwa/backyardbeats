const pool = require('../../db').pool;

exports.getSettings = async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT maintenance_mode FROM site_settings WHERE id = 1');
    const maintenanceMode = rows[0]?.maintenance_mode === 1;
    res.json({
      settings: {
        siteName: process.env.SITE_NAME || 'BackyardBeats',
        maintenanceMode,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.updateSettings = async (req, res, next) => {
  try {
    const { maintenanceMode } = req.body;
    const maintenance = maintenanceMode ? 1 : 0;
    await pool.query('UPDATE site_settings SET maintenance_mode = ? WHERE id = 1', [maintenance]);
    res.json({
      success: true,
      settings: {
        siteName: process.env.SITE_NAME || 'BackyardBeats',
        maintenanceMode: !!maintenance,
      },
    });
  } catch (err) {
    next(err);
  }
};