import { createApp } from 'vue';
import { createPinia } from 'pinia';
import '@fontsource/outfit/400.css';
import '@fontsource/outfit/500.css';
import '@fontsource/outfit/600.css';
import '@fontsource/outfit/700.css';
import App from './App.vue';
import './styles/style.css';

const app = createApp(App);
app.use(createPinia());
app.mount('#app');
