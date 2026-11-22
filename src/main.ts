import { createPinia } from 'pinia'
import { createApp } from 'vue'
import { setInitData } from '@/api/client'
import { useTelegram } from '@/composables/useTelegram'
import App from './App.vue'
import './style.css'

// Theme, ready(), expand() before the first paint, so the app opens in the user's colors.
const tg = useTelegram()
tg.init()
setInitData(tg.initData)

createApp(App).use(createPinia()).mount('#app')
