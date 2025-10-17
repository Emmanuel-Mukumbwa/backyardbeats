// server/db.js
const { Sequelize } = require('sequelize');
const mysql = require('mysql2/promise');

const DB_NAME = process.env.DB_NAME || 'backyardbeatsDB';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASS = process.env.DB_PASS || 'Mali2419.';
const DB_HOST = process.env.DB_HOST || 'localhost';

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
  host: DB_HOST,
  dialect: 'mysql',
  logging: false, // set to console.log for debug
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  define: {
    timestamps: false,
    underscored: true
  }
});

async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log(`✅ Successfully connected to MySQL (${DB_NAME}).`);
    console.log(`   Pool settings: max=${sequelize.options.pool.max}, min=${sequelize.options.pool.min}, idle=${sequelize.options.pool.idle}`);
  } catch (err) {
    console.error('❌ Database connection failed:', err.message || err);
    throw err;
  }
}

const pool = mysql.createPool({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASS,
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = Object.assign(sequelize, { testConnection, pool });
