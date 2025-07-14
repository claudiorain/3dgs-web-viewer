import { defineStore } from 'pinia'

export const useNotificationStore = defineStore('notifications', {
  state: () => ({
    notifications: [],
    latestNotification: null,
    unreadCount: 0
  }),
  
  getters: {
    recentNotifications: (state) => {
      return state.notifications.slice(0, 10) // Ultime 10
    }
  },
  
  actions: {
    addNotification(notification) {
      // Aggiungi timestamp locale se non presente
      const newNotification = {
        ...notification,
        id: Date.now(),
        read: false,
        localTimestamp: new Date().toISOString()
      }
      
      this.notifications.unshift(newNotification)
      this.latestNotification = notification // Trigger per App.vue
      this.unreadCount++
      
      // Log per debugging
      console.log(`📢 Added notification: ${notification.type} for "${notification.model_title}"`)
      
      // Limita a 50 notifiche per non saturare la memoria
      if (this.notifications.length > 50) {
        this.notifications = this.notifications.slice(0, 50)
      }
    },
    
    markAsRead(notificationId) {
      const notification = this.notifications.find(n => n.id === notificationId)
      if (notification && !notification.read) {
        notification.read = true
        this.unreadCount = Math.max(0, this.unreadCount - 1)
      }
    },
    
    markAllAsRead() {
      this.notifications.forEach(n => n.read = true)
      this.unreadCount = 0
    },
    
    clearAll() {
      this.notifications = []
      this.unreadCount = 0
      this.latestNotification = null
    }
  }
})