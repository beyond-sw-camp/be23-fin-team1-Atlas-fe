import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router'
import './styles/main.css'
import './styles/chat.css'
import './styles/chat-room.css'
import VueApexCharts from 'vue3-apexcharts'

createApp(App).use(createPinia()).use(router).use(VueApexCharts).mount('#app')
