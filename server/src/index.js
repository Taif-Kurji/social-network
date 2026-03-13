import { app } from './app.js';
import { connectToDatabase, disconnectFromDatabase } from './config/database.js';
import { env } from './config/env.js';

async function start() {
  try {
    await connectToDatabase();
    const server = app.listen(env.port, () => {
      console.log(`Server listening on port ${env.port}`);
    });

    const shutdown = async (signal) => {
      console.log(`Received ${signal}. Shutting down...`);
      server.close(async (err) => {
        if (err) {
          console.error('Error while closing HTTP server:', err);
        }
        await disconnectFromDatabase();
        process.exit(0);
      });
    };

    process.on('SIGINT', () => void shutdown('SIGINT'));
    process.on('SIGTERM', () => void shutdown('SIGTERM'));
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
