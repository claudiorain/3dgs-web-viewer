import { ref, onMounted, onUnmounted } from 'vue'
import { useNotificationStore } from '@/stores/notificationStore'

export function useNotifications() {
  const ws = ref(null)
  const isConnected = ref(false)
  const reconnectAttempts = ref(0)
  const maxReconnectAttempts = 5
  
  // Store delle notifiche
  const notificationStore = useNotificationStore()
  
  // ✨ NUOVO: Handler specifici per pagina
  const pageSpecificHandlers = ref([])

  const connect = () => {
    if (ws.value && ws.value.readyState === WebSocket.OPEN) {
      return
    }

    try {
      ws.value = new WebSocket('ws://localhost:8000/ws/notifications')
      
      ws.value.onopen = () => {
        isConnected.value = true
        reconnectAttempts.value = 0
        console.log('✅ Connected to notifications WebSocket')
        
        // Heartbeat ogni 30 secondi
        const heartbeat = setInterval(() => {
          if (ws.value && ws.value.readyState === WebSocket.OPEN) {
            ws.value.send('ping')
          } else {
            clearInterval(heartbeat)
          }
        }, 30000)
      }
      
      ws.value.onmessage = (event) => {
        if (event.data === 'pong') return // Ignora pong del heartbeat
        
        try {
          const notification = JSON.parse(event.data)
          console.log('🔔 NOTIFICATION RECEIVED:', notification)
          
          // Log per debugging
          logNotificationDetails(notification)
          
          // 1. Aggiungi al store per triggare App.vue
          notificationStore.addNotification(notification)
          
          // 2. ✨ NUOVO: Notifica handler specifici delle pagine
          pageSpecificHandlers.value.forEach(handler => {
            try {
              handler(notification)
            } catch (error) {
              console.error('Error in page-specific handler:', error)
            }
          })
          
        } catch (error) {
          console.error('Error parsing notification:', error)
        }
      }
      
      ws.value.onclose = () => {
        isConnected.value = false
        console.log('❌ WebSocket disconnected')
        
        // Riconnetti automaticamente
        if (reconnectAttempts.value < maxReconnectAttempts) {
          reconnectAttempts.value++
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.value), 30000)
          console.log(`🔄 Reconnecting in ${delay}ms (attempt ${reconnectAttempts.value})`)
          setTimeout(connect, delay)
        }
      }
      
      ws.value.onerror = (error) => {
        console.error('WebSocket error:', error)
      }
    } catch (error) {
      console.error('Failed to create WebSocket:', error)
    }
  }

  const disconnect = () => {
    if (ws.value) {
      console.log('🔌 Manually disconnecting WebSocket')
      ws.value.close()
      ws.value = null
    }
    isConnected.value = false
    reconnectAttempts.value = 0
  }

  // ✨ NUOVO: Funzioni per gestire handler specifici
  const addPageHandler = (handler) => {
    pageSpecificHandlers.value.push(handler)
    console.log(`📝 Added page handler. Total handlers: ${pageSpecificHandlers.value.length}`)
  }
  
  const removePageHandler = (handler) => {
    const index = pageSpecificHandlers.value.indexOf(handler)
    if (index > -1) {
      pageSpecificHandlers.value.splice(index, 1)
      console.log(`🗑️ Removed page handler. Total handlers: ${pageSpecificHandlers.value.length}`)
    }
  }

  // Log delle notifiche per debugging
  const logNotificationDetails = (notification) => {
    console.group(`📢 ${notification.type.toUpperCase()}`)
    console.log('Model Title:', notification.model_title)
    
    switch(notification.type) {
      case 'model_created':
        console.log('Status:', notification.overall_status)
        if (notification.model_description) {
          console.log('Description:', notification.model_description)
        }
        break
        
      case 'phase_started':
      case 'phase_completed': 
      case 'phase_failed':
        console.log('Phase:', notification.phase)
        break
        
      case 'model_status_changed':
        console.log('New Status:', notification.overall_status)
        break
    }
    
    console.groupEnd()
  }

  // Cleanup al mount/unmount
  onMounted(connect)
  onUnmounted(() => {
    disconnect()
  })

  return {
    isConnected,
    disconnect,
    reconnect: connect,
    // ✨ NUOVO: Esporta funzioni per handler specifici
    addPageHandler,
    removePageHandler
  }
}