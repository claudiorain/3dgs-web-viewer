<template>
  <v-container>
    <v-card class="mx-auto pa-6" max-width="400">
      <v-card-title class="text-h5">Login</v-card-title>
      <v-text-field v-model="username" label="Username"></v-text-field>
      <v-text-field v-model="password" label="Password" type="password"></v-text-field>
      <v-btn color="primary" block @click="doLogin">Login</v-btn>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref } from "vue";
import { useAuthStore } from "@/stores/authStore";
import { useRouter } from 'vue-router'

const router = useRouter()
const authStore = useAuthStore();
const username = ref("");
const password = ref("");

const { login } = authStore;

const doLogin = async () => {
  try {
    await login(username.value, password.value);
    
    // Reindirizza alla Home dopo il login
    router.push({ name: 'home' }); // Assicurati che la route abbia il nome corretto

  } catch (error) {
    console.error('Login failed:', error);
    // Gestisci l'errore (ad esempio, mostra un messaggio di errore)
  }
};
</script>
