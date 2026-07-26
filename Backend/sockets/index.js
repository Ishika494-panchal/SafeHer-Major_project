const { Server } = require('socket.io');

let io = null;

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Client emits 'join' immediately after connecting, sending { user_id, role }.
    // We use this to put the socket into the right room so targeted emits work:
    //   - volunteers → room "volunteers" (receives new-alert, alert-resolved broadcasts)
    //   - women      → room "user:<user_id>" (receives private alert-accepted notification)
    // We do NOT authenticate here via JWT — that's handled at the HTTP layer.
    // The room name is the access boundary; a volunteer who joins "volunteers" only
    // receives volunteer-scoped events, not private user-room events.
    socket.on('join', ({ user_id, role }) => {
      if (role === 'volunteer') {
        socket.join('volunteers');
        console.log(`Socket ${socket.id} joined room: volunteers`);
      } else if (user_id) {
        socket.join(`user:${user_id}`);
        console.log(`Socket ${socket.id} joined room: user:${user_id}`);
      }
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
}

// Singleton getter — sosController calls this to get the io instance
// without needing it passed as a parameter through every function.
function getIO() {
  if (!io) throw new Error('Socket.IO not initialized — call initSocket(server) first');
  return io;
}

module.exports = { initSocket, getIO };
