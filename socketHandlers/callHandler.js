const { getUserStatus } = require("../utils/user-status-cache");
 
function registerCallHandlers(io, socket, userID) {
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
      userID,
      callerName,
    });
  });

  socket.on('call:accept', ({ targetUserId, meetingId }) => {
    const status  = getUserStatus(targetUserId);
    if (status === 'online') {
      io.to(targetUserId).emit('call:accepted', { meetingId, byUserId: userID });
    }
  });

  socket.on('call:decline', ({ targetUserId, meetingId }) => {
    const status  = getUserStatus(targetUserId);
    if (status==='online') {
      io.to(targetUserId).emit('call:declined', { meetingId, byUserId: userID });
    }
  });

  socket.on('call:cancel', ({ targetUserId, meetingId }) => { 
    const status  = getUserStatus(targetUserId);
    if (status === 'online') {
      io.to(targetUserId).emit('call:cancelled', { meetingId, byUserId: userID });
    }
  });

  socket.on('call:end', ({ targetUserId, meetingId }) => {
    const status  = getUserStatus(targetUserId);
    if (status ==='online') {
      io.to(targetUserId).emit('call:ended', { meetingId, byUserId: userID });
    }
  });
}

module.exports = { registerCallHandlers };