import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from '@/App.vue';

import '@style/index.css';

const app = createApp(App);
app.use(createPinia());
app.mount('#app');

createApp(App).mount('#app');
