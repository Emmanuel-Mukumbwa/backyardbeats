// src/server/models/Artist.js
const { DataTypes } = require('sequelize');
const sequelize = require('../db'); // your sequelize instance

const Artist = sequelize.define('Artist', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
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
  avg_rating: {
    type: DataTypes.DECIMAL(3,2),
    allowNull: true
  },
  has_upcoming_event: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  is_approved: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  is_rejected: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  approved_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  rejected_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  approved_by: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  rejected_by: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  rejection_reason: {
    type: DataTypes.STRING(512),
    allowNull: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  follower_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  }
}, {
  tableName: 'artists',
  timestamps: false,
  underscored: true
});

// NOTE: do NOT create associations here to avoid circular requires.
// Associations are declared centrally in models/index.js

module.exports = Artist;