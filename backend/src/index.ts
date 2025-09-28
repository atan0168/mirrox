import 'dotenv/config';
import app from './app';
import config from './utils/config';


const PORT = config.server.port;



// Handle uncaught exceptions
process.on('uncaughtException', error => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Graceful shutdown handler
const gracefulShutdown = (signal: string) => {
  console.log(`\nReceived ${signal}. Starting graceful shutdown...`);

  // Stop accepting new connections
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    console.error(
      'Could not close connections in time, forcefully shutting down'
    );
    process.exit(1);
  }, 10000);
};

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Digital Twin Backend API server running on port ${PORT}`);
  console.log(`📍 Environment: ${config.server.nodeEnv}`);
  console.log(`🌐 API Base URL: http://localhost:${PORT}/api`);
  console.log(`📊 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`🌬️ Air Quality: http://localhost:${PORT}/api/air-quality`);
  console.log(`🚗 Traffic: http://localhost:${PORT}/api/traffic`);
  console.log(`🚨 Dengue: http://localhost:${PORT}/api/dengue`);
  console.log(`🗺️ Location: http://localhost:${PORT}/api/location/`);

  if (config.server.nodeEnv === 'development') {
    console.log(
      `🔧 Service Status: http://localhost:${PORT}/api/air-quality/status`
    );
  }
});

// Register graceful shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default server;
