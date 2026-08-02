const { getUserStatus } = require("../utils/user-status-cache");
 
function registerCallHandlers(io, socket) {
  socket.on('call:invite', ({ targetUserId, meetingId, encryptedKey, nonce, callerPublicKey, callerName }) => {
    const status  = getUserStatus(targetUserId);
 
    if (status === 'offline') {
      socket.emit('call:unavailable', { targetUserId });
      return;
    }
    io.to(targetUserId).emit('call:incoming', {
      meetingId,
      encryptedKey,
      nonce,
      callerPublicKey,
      callerId,
      callerName,
    });
  });

  socket.on('call:accept', ({ targetUserId, meetingId }) => {
    const status  = getUserStatus(targetUserId);
    if (status === 'online') {
      io.to(targetUserId).emit('call:accepted', { meetingId, byUserId: callerId });
    }
  });

  socket.on('call:decline', ({ targetUserId, meetingId }) => {
    const status  = getUserStatus(targetUserId);
    if (status==='online') {
      io.to(targetUserId).emit('call:declined', { meetingId, byUserId: callerId });
    }
  });

  socket.on('call:cancel', ({ targetUserId, meetingId }) => { 
    const status  = getUserStatus(targetUserId);
    if (status === 'online') {
      io.to(targetSocketId).emit('call:cancelled', { meetingId, byUserId: callerId });
    }
  });

  socket.on('call:end', ({ targetUserId, meetingId }) => {
    const status  = getUserStatus(targetUserId);
    if (status ==='online') {
      io.to(targetSocketId).emit('call:ended', { meetingId, byUserId: callerId });
    }
  });
}

module.exports = { registerCallHandlers };