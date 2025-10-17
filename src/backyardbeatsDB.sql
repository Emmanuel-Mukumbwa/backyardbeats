//src/backyardbeatsDB.sql
use backyardbeatsDB;

CREATE TABLE districts (
  id INT AUTO_INCREMENT PRIMARY KEY, 
  name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `role` enum('fan','artist','admin') NOT NULL DEFAULT 'fan',
  `has_profile` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci

CREATE TABLE `artists` (
  `id` int NOT NULL,
  `display_name` varchar(100) NOT NULL,
  `bio` text,
  `photo_url` varchar(255) DEFAULT NULL,
  `lat` decimal(9,6) DEFAULT NULL,
  `lng` decimal(9,6) DEFAULT NULL,
  `district_id` int DEFAULT NULL,
  `avg_rating` decimal(3,2) DEFAULT NULL,
  `has_upcoming_event` tinyint(1) DEFAULT '0',
  `user_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `district_id` (`district_id`),
  KEY `fk_artists_user` (`user_id`),
  CONSTRAINT `artists_ibfk_1` FOREIGN KEY (`district_id`) REFERENCES `districts` (`id`),
  CONSTRAINT `fk_artists_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci

CREATE TABLE tracks (
  id INT PRIMARY KEY,
  artist_id INT,
  title VARCHAR(255) NOT NULL,
  preview_url VARCHAR(255),
  duration INT,
  FOREIGN KEY (artist_id) REFERENCES artists(id)
);

CREATE TABLE events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  event_date DATETIME,
  artist_id INT,
  district_id INT,
  FOREIGN KEY (artist_id) REFERENCES artists(id),
  FOREIGN KEY (district_id) REFERENCES districts(id)
);

CREATE TABLE ratings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  artist_id INT,
  user_id INT,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (artist_id) REFERENCES artists(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Genres and moods as many-to-many (optional, can be normalized further)
CREATE TABLE genres (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE artist_genres (
  artist_id INT,
  genre_id INT,
  PRIMARY KEY (artist_id, genre_id),
  FOREIGN KEY (artist_id) REFERENCES artists(id),
  FOREIGN KEY (genre_id) REFERENCES genres(id)
);

CREATE TABLE moods (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE artist_moods (
  artist_id INT,
  mood_id INT,
  PRIMARY KEY (artist_id, mood_id),
  FOREIGN KEY (artist_id) REFERENCES artists(id),
  FOREIGN KEY (mood_id) REFERENCES moods(id)
);