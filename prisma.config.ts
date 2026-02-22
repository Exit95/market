import { defineConfig } from 'prisma/config';

export default defineConfig({
    earlyAccess: true,
    schema: 'prisma/schema.prisma',
    migrations: {
        seed: {
            command: 'tsx prisma/seed.ts',
        },
    },
});
