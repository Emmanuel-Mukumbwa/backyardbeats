import axios from 'axios';

const instance = axios.create({
  baseURL: 'http://localhost:5000/api', // later: your Node/Express backend
});

export default instance;
