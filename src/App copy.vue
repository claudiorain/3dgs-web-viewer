<template>
  <v-app>    <!-- Notifiche globali sempre visibili -->
    <v-snackbar
      v-model="showNotification"
      :color="notificationColor"
      :timeout="4000"
      top
      right
      elevation="6">
      <div class="d-flex align-center">
        <v-icon class="mr-2">{{ notificationIcon }}</v-icon>
        {{ notificationMessage }}
      </div>
      <template v-slot:actions>
        <v-btn
          variant="text"
          size="small"
          @click="showNotification = false">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </template>
    </v-snackbar>

    <!-- Indicatore connessione (solo quando disconnesso) -->
    <v-chip
      v-if="!isConnected"
      color="warning"
      size="small"
      class="connection-indicator"
      elevation="3">
      <v-icon start size="12">mdi-wifi-off</v-icon>
      Offline
    </v-chip>

    <!-- Badge notifiche non lette (opzionale) -->
    <v-fab
      v-if="unreadCount > 0"
      icon="mdi-bell"
      size="small"
      color="primary"
      class="notification-fab"
      @click="markAllAsRead">
      <v-badge
        :content="unreadCount"
        color="error"
        offset-x="8"
        offset-y="8">
        <v-icon>mdi-bell</v-icon>
      </v-badge>
    </v-fab>

    <!-- Router view per le pagine -->
    <RouterView />
  </v-app>
</template>

<script setup>
import { ref, watch } from 'vue'
import { RouterView } from 'vue-router'
import { useNotifications } from '@/utils/useNotifications'
import { useNotificationStore } from '@/stores/notificationStore'
import { storeToRefs } from 'pinia'

// Composables e store
const { isConnected } = useNotifications()
const notificationStore = useNotificationStore()
const { latestNotification, unreadCount } = storeToRefs(notificationStore)

// Stato locale per le notifiche toast
const showNotification = ref(false)
const notificationMessage = ref('')
const notificationColor = ref('info')
const notificationIcon = ref('mdi-information')

// Reagisci alle nuove notifiche
watch(latestNotification, (notification) => {
  if (notification) {
    showNotification.value = true
    notificationMessage.value = getToastMessage(notification)
    notificationColor.value = getNotificationColor(notification.type)
    notificationIcon.value = getNotificationIcon(notification.type)
  }
})

// Funzioni helper per i messaggi
const getToastMessage = (notification) => {
  switch(notification.type) {
    case 'model_created':
      return `Model "${notification.model_title}" created successfully`
    case 'phase_started':
      return `${formatPhase(notification.phase)} started for "${notification.model_title}"`
    case 'phase_completed':
      return `${formatPhase(notification.phase)} completed for "${notification.model_title}"`
    case 'phase_failed':
      return `${formatPhase(notification.phase)} failed for "${notification.model_title}"`
    case 'model_status_changed':
      if (notification.overall_status === 'COMPLETED') {
        return `"${notification.model_title}" completed successfully! 🎉`
      } else if (notification.overall_status === 'FAILED') {
        return `"${notification.model_title}" processing failed`
      }
      return `"${notification.model_title}" status: ${notification.overall_status}`
    default:
      return 'Model updated'
  }
}

const getNotificationColor = (type) => {
  switch(type) {
    case 'model_created': return 'success'
    case 'phase_started': return 'info'
    case 'phase_completed': return 'success'
    case 'phase_failed': return 'error'
    case 'model_status_changed': return 'primary'
    default: return 'info'
  }
}

const getNotificationIcon = (type) => {
  switch(type) {
    case 'model_created': return 'mdi-plus-circle'
    case 'phase_started': return 'mdi-play-circle'
    case 'phase_completed': return 'mdi-check-circle'
    case 'phase_failed': return 'mdi-alert-circle'
    case 'model_status_changed': return 'mdi-information-circle'
    default: return 'mdi-information'
  }
}

const formatPhase = (phase) => {
  const phaseNames = {
    'frame_extraction': 'Frame Extraction',
    'colmap': '3D Reconstruction',
    'training': 'Model Training',
    'upload': 'Upload & Finalization',
    'metrics_evaluation': 'Quality Assessment'
  }
  return phaseNames[phase] || phase
}

const markAllAsRead = () => {
  notificationStore.markAllAsRead()
}
</script>

<style scoped>
.connection-indicator {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 2000;
}

.notification-fab {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 1000;
}

/* Assicurati che l'app occupi tutto lo spazio */
.v-application {
  background: #fafafa;
}

/* Rimuovi gli stili CSS precedenti che non servono più */
html,
body {
  margin: 0;
  padding: 0;
  height: 100%;
}
</style>