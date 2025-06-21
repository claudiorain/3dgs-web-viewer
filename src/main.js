import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Tres from '@tresjs/core'
import axios from 'axios'
import VueAxios from 'vue-axios'

// Vuetify
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

import App from './App.vue'
import router from './router'
import '@mdi/font/css/materialdesignicons.css'

const vuetify = createVuetify({
    components,
    directives,
  })

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(Tres)
app.use(vuetify)
app.use(VueAxios, axios)

app.mount('#app')


