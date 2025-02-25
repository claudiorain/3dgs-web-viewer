import {publicServerApi} from './baseApi';


export const authService = {
  async login(username, password) {

    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);

    const response = await publicServerApi.post(`/token`, formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      }
    });

    return response.data;
  },

  async logout() {
    // Se il backend supporta una chiamata di logout, puoi farla qui
  },

  async getUserProfile(token) {
    const response = await publicServerApi.get(`/protected`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },
};
