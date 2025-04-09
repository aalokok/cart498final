import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'

// Import global CSS
import '@/assets/styles/main.css'

// Create the Vue application
const app = createApp(App)

// Use router and store
app.use(router)
app.use(store)

// Mount the app
app.mount('#app')
