import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';

export default defineConfig({
    output: 'server',
    adapter: node({ mode: 'standalone' }),
    integrations: [tailwind(), react()],
    site: 'https://ehren-deal.de',
    security: {
        checkOrigin: false,
    },
    server: {
        host: '0.0.0.0',
        port: 3000,
    },
});
