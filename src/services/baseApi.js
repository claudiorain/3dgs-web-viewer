// src/services/axios.js

import axios from 'axios';

const API_BASE_URL = "http://localhost:8000"; // Cambia con l'URL corretto

// Crea un'istanza di axios
const serverApi = axios.create({
  baseURL: API_BASE_URL,  // Sostituisci con l'URL della tua API
  headers: {
    'Content-Type': 'application/json'
  }
});

const publicServerApi = axios.create({
  baseURL: API_BASE_URL,  // Sostituisci con l'URL della tua API
  headers: {
    'Content-Type': 'application/json'
  }
});

const s3Api = axios.create({
    headers: {
      'Content-Type': 'application/json'
    }
  });
  

// Aggiungi l'autenticazione Basic in modo globale
const username = 'admin';
const password = 'supersecret';
const basicAuth = 'Basic ' + btoa(username + ':' + password);

serverApi.defaults.headers['Authorization'] = basicAuth;

export { serverApi,publicServerApi, s3Api };
