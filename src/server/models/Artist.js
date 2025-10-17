// server/models/Artist.js
const { DataTypes } = require('sequelize');
const sequelize = require('../db'); // sequelize instance (server/db.js)
const User = require('./User');

const Artist = sequelize.define('Artist', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true // assuming your migrations allow this
  },
  display_name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  bio: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  photo_url: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  lat: {
    type: DataTypes.DECIMAL(9,6),
    allowNull: true
  },
  lng: {
    type: DataTypes.DECIMAL(9,6),
    allowNull: true
  },
  district_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  avg_rating: {
    type: DataTypes.DECIMAL(3,2),
    allowNull: true
  },
  has_upcoming_event: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  tableName: 'artists',
  timestamps: false,
  underscored: true
});

// association (optional)
Artist.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

module.exports = Artist;
