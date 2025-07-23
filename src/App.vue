<template>
  <v-app>
    <!-- Notifiche globali sempre visibili -->
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

    <!-- Drawer per le notifiche -->
    <v-navigation-drawer
      v-model="notificationDrawer"
      location="right"
      temporary
      width="400"
      class="notification-drawer">
      
      <v-toolbar density="compact" color="primary">
        <v-toolbar-title class="text-white">
          <v-icon class="mr-2">mdi-bell</v-icon>
          Notifications
        </v-toolbar-title>
        <v-spacer></v-spacer>
        <v-btn
          icon="mdi-close"
          variant="text"
          color="white"
          size="small"
          @click="notificationDrawer = false">
        </v-btn>
      </v-toolbar>

      <div class="pa-2">
        <!-- Header con azioni -->
        <div v-if="notifications.length > 0" class="d-flex justify-space-between align-center mb-3">
          <v-chip size="small" color="primary" variant="outlined">
            {{ unreadCount }} unread
          </v-chip>
          <v-btn
            v-if="unreadCount > 0"
            size="small"
            variant="text"
            color="primary"
            @click="markAllAsRead">
            Mark all as read
          </v-btn>
        </div>

        <!-- Lista notifiche -->
        <div v-if="notifications.length > 0" class="notifications-list">
          <v-card
            v-for="notification in notifications"
            :key="notification.id"
            class="mb-2 notification-card"
            :class="{ 'unread': !notification.read }"
            elevation="1"
            @click="markAsRead(notification.id)">
            
            <v-card-text class="py-3">
              <div class="d-flex align-start">
                <v-avatar
                  size="32"
                  :color="getNotificationColor(notification.type)"
                  class="mr-3">
                  <v-icon color="white" size="18">
                    {{ getNotificationIcon(notification.type) }}
                  </v-icon>
                </v-avatar>
                
                <div class="flex-grow-1">
                  <div class="text-body-2 font-weight-medium mb-1">
                    {{ getNotificationTitle(notification) }}
                  </div>
                  <div class="text-body-2 text-medium-emphasis mb-2">
                    {{ getNotificationDescription(notification) }}
                  </div>
                  <div class="text-caption text-medium-emphasis">
                    {{ formatTimestamp(notification.timestamp) }}
                  </div>
                </div>

                <v-chip
                  v-if="!notification.read"
                  size="x-small"
                  color="primary"
                  class="ml-2">
                  New
                </v-chip>
              </div>
            </v-card-text>
          </v-card>
        </div>

        <!-- Stato vuoto -->
        <div v-else class="text-center py-8">
          <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-bell-outline</v-icon>
          <div class="text-h6 text-medium-emphasis mb-2">No notifications</div>
          <div class="text-body-2 text-medium-emphasis">
            You're all caught up! New notifications will appear here.
          </div>
        </div>
      </div>
    </v-navigation-drawer>

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

    <!-- FAB notifiche -->
    <v-fab
      v-if="unreadCount > 0"
      size="small"
      color="primary"
      class="notification-fab"
      @click="toggleNotificationDrawer">
      <v-badge
        :content="unreadCount > 99 ? '99+' : unreadCount"
        color="error"
        offset-x="8"
        offset-y="8">
        <v-icon>mdi-bell-ring</v-icon>
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
const { latestNotification, notifications, unreadCount } = storeToRefs(notificationStore)

// Stato locale
const showNotification = ref(false)
const notificationMessage = ref('')
const notificationColor = ref('info')
const notificationIcon = ref('mdi-information')
const notificationDrawer = ref(false)

// Reagisci alle nuove notifiche
watch(latestNotification, (notification) => {
  if (notification) {
    showNotification.value = true
    notificationMessage.value = getToastMessage(notification)
    notificationColor.value = getNotificationColor(notification.type)
    notificationIcon.value = getNotificationIcon(notification.type)
  }
})

// Gestione drawer
const toggleNotificationDrawer = () => {
  notificationDrawer.value = !notificationDrawer.value
}

// Funzioni per il drawer
const markAsRead = (notificationId) => {
  notificationStore.markAsRead(notificationId)
}

const markAllAsRead = () => {
  notificationStore.markAllAsRead()
}

// Funzioni helper per i messaggi toast
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

// Funzioni helper per il drawer
const getNotificationTitle = (notification) => {
  switch(notification.type) {
    case 'model_created':
      return 'New Model Created'
    case 'phase_started':
      return `${formatPhase(notification.phase)} Started`
    case 'phase_completed':
      return `${formatPhase(notification.phase)} Completed`
    case 'phase_failed':
      return `${formatPhase(notification.phase)} Failed`
    case 'model_status_changed':
      return 'Model Status Updated'
    default:
      return 'Model Notification'
  }
}

const getNotificationDescription = (notification) => {
  switch(notification.type) {
    case 'model_created':
      return `Model "${notification.model_title}" has been created and is ready for processing.`
    case 'phase_started':
      return `Processing "${notification.model_title}" - ${formatPhase(notification.phase)} phase has begun.`
    case 'phase_completed':
      return `"${notification.model_title}" - ${formatPhase(notification.phase)} completed successfully.`
    case 'phase_failed':
      return `"${notification.model_title}" - ${formatPhase(notification.phase)} encountered an error.`
    case 'model_status_changed':
      if (notification.overall_status === 'COMPLETED') {
        return `"${notification.model_title}" has been processed successfully and is ready to use.`
      } else if (notification.overall_status === 'FAILED') {
        return `"${notification.model_title}" processing failed. Please check the details.`
      }
      return `"${notification.model_title}" status changed to ${notification.overall_status}.`
    default:
      return 'Model has been updated.'
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

const formatTimestamp = (timestamp) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now - date
  
  if (diff < 60000) return 'Just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`
  
  return date.toLocaleDateString()
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

.notification-drawer {
  z-index: 2001;
}

.notifications-list {
  max-height: calc(100vh - 120px);
  overflow-y: auto;
}

.notification-card {
  cursor: pointer;
  transition: all 0.2s ease;
  border-left: 3px solid transparent;
}

.notification-card:hover {
  elevation: 3;
  transform: translateX(-2px);
}

.notification-card.unread {
  border-left-color: rgb(var(--v-theme-primary));
  background-color: rgba(var(--v-theme-primary), 0.02);
}

.v-application {
  background: #fafafa;
}

html,
body {
  margin: 0;
  padding: 0;
  height: 100%;
}
</style>