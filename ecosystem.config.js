module.exports = {
  apps: [
    {
      name: 'cosine-pic-bot',
      script: 'pnpm start',
      instances: 1,
      watch: true,
      max_memory_restart: '180M',
    },
  ],
};
