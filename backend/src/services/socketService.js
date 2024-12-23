import { Server as SocketServer } from 'socket.io';

let io;

export const initializeSocket = (server) => {
  io = new SocketServer(server, {
    cors: {
      origin: [
        'https://gleeful-starburst-18884e.netlify.app',
        'http://localhost:3000',
        'http://localhost:3001'
      ],
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log('Client connected');

    // Join user's room for private messages
    socket.on('join_chat', (userId) => {
      socket.join(`user_${userId}`);
      console.log(`User ${userId} joined their chat room`);
    });

    // Handle chat messages
    socket.on('send_message', async (data) => {
      const { recipientId } = data;
      // Emit to recipient's room
      io.to(`user_${recipientId}`).emit('receive_message', data);
    });

    // Handle typing status
    socket.on('typing', (data) => {
      const { recipientId, isTyping } = data;
      io.to(`user_${recipientId}`).emit('user_typing', {
        senderId: data.senderId,
        isTyping
      });
    });

    // Handle encryption status
    socket.on('encryption_status', (data) => {
      const { recipientId, status } = data;
      io.to(`user_${recipientId}`).emit('encryption_update', {
        senderId: data.senderId,
        status
      });
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected');
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};
