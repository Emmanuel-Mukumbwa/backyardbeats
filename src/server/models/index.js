const sequelize = require('../db');

// Import all models
const User = require('./User');
const Artist = require('./Artist');
const Genre = require('./Genre');
const ArtistGenre = require('./ArtistGenre');
const District = require('./District');
const Event = require('./Event');
const Rating = require('./Rating');
const Track = require('./Track');

// Define associations
Artist.belongsTo(District, { foreignKey: 'district_id', as: 'District' });
District.hasMany(Artist, { foreignKey: 'district_id' });

Artist.belongsToMany(Genre, {
  through: ArtistGenre,
  foreignKey: 'artist_id',
  otherKey: 'genre_id',
  as: 'Genres'
});
Genre.belongsToMany(Artist, {
  through: ArtistGenre,
  foreignKey: 'genre_id',
  otherKey: 'artist_id',
  as: 'Artists'
});

// Export models
module.exports = {
  sequelize,
  User,
  Artist,
  Genre,
  ArtistGenre,
  District,
  Event,
  Rating,
  Track
};
