import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import BabylonJsModelView from '@/views/BabylonJsModelView.vue'
import ThreeJsModelView from '@/views/ThreeJsModelView.vue'
import { useAuthStore } from '@/stores/authStore';




const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
      meta: { requiresAuth: true }
    },
    { path: '/model/babylonjs/:id', component: BabylonJsModelView },
    { path: '/model/threejs/:id', component: ThreeJsModelView },
    { path: '/login', component: () => import('@/views/LoginView.vue') },
  ],
})

router.beforeEach((to, _, next) => {
  const authStore = useAuthStore(); // Crea l'istanza dello store
  // Accedi direttamente al valore del token
  if (to.meta.requiresAuth && !authStore.token ) {
    next('/login'); // 🔥 Ora reindirizziamo correttamente alla pagina di login
  } else {
    next();
  }
});

export default router
