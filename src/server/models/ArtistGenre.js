const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const ArtistGenre = sequelize.define('ArtistGenre', {
  artist_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, primaryKey: true },
  genre_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, primaryKey: true },
}, {
  tableName: 'artist_genres',
  timestamps: false
});

module.exports = ArtistGenre;
