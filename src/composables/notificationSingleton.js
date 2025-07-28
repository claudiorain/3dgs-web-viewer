import { useNotifications } from '@/composables/useNotifications'

let notificationInstance = null

export function useNotificationSingleton() {
  if (!notificationInstance) {
    notificationInstance = useNotifications()
  }
  return notificationInstance
}