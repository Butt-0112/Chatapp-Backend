// socket/callHandlers.js
function registerCallHandlers(io, socket, userID) {
  socket.on('call:offer', ({ to, sdp, callType }) => {
    io.to(to).emit('call:incoming', { from: userID, sdp, callType });
  });

  socket.on('call:answer', ({ to, sdp }) => {
    io.to(to).emit('call:answered', { from: userID, sdp });
  });

  socket.on('call:ice-candidate', ({ to, candidate }) => {
    io.to(to).emit('call:ice-candidate', { from: userID, candidate });
  });

  socket.on('call:reject', ({ to }) => {
    io.to(to).emit('call:rejected', { from: userID });
  });

  socket.on('call:end', ({ to }) => {
    io.to(to).emit('call:ended', { from: userID });
  });
}

module.exports = { registerCallHandlers };