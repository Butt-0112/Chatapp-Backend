require('dotenv').config()
const express = require('express')
const app = express()
const cors = require('cors')
const port = 5500
const http = require('http')
const auth = require('./routes/auth')
const userRoutes = require('./routes/users/route')
const messagingRoutes= require('./routes/messaging/route')
const Message = require('./models/Message')
const socketIo = require('socket.io');
const dbConnect = require('./db')
const server = http.createServer(app)
dbConnect()
// require('dotenv').config({path: path.resolve(__dirname ,'../backend/.env')})
const roomHanlder = require('./JoinRoom/roomhandler')
app.use(cors({ origin: '*', credentials: true }))
// app.use(cors({origin:['http://localhost:3000','http://192.168.100.5:3000'],credentials:true}))
app.use(express.json())
app.use('/api/auth/', auth)
app.use('/api/users/', userRoutes)
app.use('/api/messaging/',messagingRoutes )
app.get('/',(req,res)=>{
  res.send('hello world')
})
const io = socketIo(server, {
  cors: {
    origin: '*',
  },
});
io.on("connection", (socket) => {
  console.log('user connected')
  const userID = socket.userID
  socket.join(userID)
  // console.log(`${userID} joined the room ${userID}`)
  socket.on('private message', async ({ content, to }) => {
    const message = new Message({ from: userID, to, content, delivered: false })
    await message.save()
    await io.to(userID).emit('private message',{
      from:userID,
      content
    })
    await io.to(to).emit('private message', {
      content,
      from: userID
    })
    if (io.sockets.adapter.rooms.get(to)) {
      message.updateOne({ delivered: true })
      await message.save()
    }
  })
  socket.on('call', ({ from, to ,type}) => {
    console.log(from, ' tried to call ', to)
    io.to(to).emit('incoming-call', { from, to,type })
  })
  socket.on('call-ended', ({ to }) => {
    console.log('sending call end msg to ', to)
    io.to(to).emit('call-ended-from', { to })
  })
  socket.on('answer', ({ from, to,type }) => {
    io.to(to).emit('call-answered', { from ,type})
  })
  socket.on('vid-call', ({ from, to }) => {
    io.to(to).emit('incoming-vid-call', { from, to })

  })
  socket.on('answer-vid-call', ({ from, to }) => {
    io.to(to).emit('vid-call-answered', { from })
  })
  socket.on('user-disconnected', ({ userId }) => {
    // Broadcast the disconnection event to the other peer
    socket.broadcast.emit('user-disconnected', { userId });
  });
  socket.on('message-deleted',({messageId,to})=>{
    io.to(to).emit('message-deleted',{messageId})
  })
  roomHanlder(socket)
});
io.use((socket, next) => {
  const userID = socket.handshake.auth.userID
  if (!userID) {
    return next(new Error("invalid userID!"))
  }
  socket.userID = userID
  next()
})

server.listen(port, '0.0.0.0', () => { console.log(`Chatapp listening on port: ${port}`) })