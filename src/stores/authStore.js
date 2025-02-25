import { defineStore } from "pinia";
import { authService } from '../services/authServices.js';
import { ref } from 'vue';

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('token') || undefined);
  const user = ref(null);

  async function login(username, password) {
    try {
      const data = await authService.login(username, password);
      token.value = data.access_token;
      localStorage.setItem('token', data.access_token);

      user.value = await authService.getUserProfile(data.access_token);
    } catch (error) {
      console.error('Errore di login:', error);
      throw error;
    }
  }

  function logout() {
    localStorage.removeItem('token');
    token.value = undefined;
    user.value = undefined;
  }

  return { token, user, login, logout };
});