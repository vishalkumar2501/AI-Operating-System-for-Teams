import net from 'net';
import path from 'path';
import dotenv from 'dotenv';

// Load .env
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const checkTcpConnection = (host: string, port: number, name: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(3000);

    socket.on('connect', () => {
      console.log(`✅ [${name}] Connection successful -> ${host}:${port}`);
      socket.destroy();
      resolve(true);
    });

    socket.on('timeout', () => {
      console.error(`❌ [${name}] Connection timeout -> ${host}:${port}`);
      socket.destroy();
      resolve(false);
    });

    socket.on('error', (err) => {
      console.error(`❌ [${name}] Connection failed -> ${host}:${port}: ${err.message}`);
      resolve(false);
    });

    socket.connect(port, host);
  });
};

async function runHealthCheck() {
  console.log('\n--- TeamOS Infrastructure Health Check ---');
  const pgPort = Number(process.env.POSTGRES_PORT) || 5433;
  const pgOk = await checkTcpConnection('127.0.0.1', pgPort, 'PostgreSQL (pgvector)');
  const redisOk = await checkTcpConnection('127.0.0.1', 6379, 'Redis (alpine)');

  if (pgOk && redisOk) {
    console.log('\n🎉 All core services are reachable and operational!\n');
    process.exit(0);
  } else {
    console.error('\n⚠️ Some services failed the connection test.\n');
    process.exit(1);
  }
}

runHealthCheck();
