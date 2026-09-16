import { createServer } from 'vite';

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception in Vite:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection in Vite:', reason);
});

async function start() {
  const server = await createServer({
    configFile: './vite.config.ts',
    root: process.cwd(),
    server: {
      host: '0.0.0.0',
      port: 8081,
    }
  });

  await server.listen();
  server.printUrls();

  // Keep event loop alive
  setInterval(() => {}, 60000);
}

start().catch(err => {
  console.error('Vite failed to start:', err);
  process.exit(1);
});
