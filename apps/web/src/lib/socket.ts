import { io, Socket } from 'socket.io-client';

const SOCKET_URL =
  import.meta.env.VITE_API_URL?.replace(/\/api\/v1\/?$/, '') || 'http://localhost:5000';

let socketInstance: Socket | null = null;

/**
 * Returns the active Socket.IO client instance, or initializes it if not yet created.
 */
export function getSocket(): Socket {
  if (!socketInstance) {
    const token = localStorage.getItem('teamos_token');
    socketInstance = io(SOCKET_URL, {
      auth: { token: token ?? '' },
      transports: ['websocket', 'polling'],
      autoConnect: Boolean(token),
    });

    socketInstance.on('connect', () => {
      // connected
    });

    socketInstance.on('connect_error', (err) => {
      console.warn('[socket] Connection error:', err.message);
    });
  }

  return socketInstance;
}

/**
 * Re-authenticates and reconnects the socket when the user logs in or token is refreshed.
 */
export function connectSocket(token: string): Socket {
  if (socketInstance) {
    socketInstance.auth = { token };
    if (!socketInstance.connected) {
      socketInstance.connect();
    }
  } else {
    socketInstance = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });
  }
  return socketInstance;
}

/**
 * Disconnects the socket cleanly on logout.
 */
export function disconnectSocket(): void {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}
