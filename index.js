require('dotenv').config()
const express = require('express')
const app = express()
const cors = require('cors')
const port = 5500
const http = require('http')
const auth = require('./routes/auth')
const userRoutes = require('./routes/users/route')
const messagingRoutes = require('./routes/messaging/route')
const Message = require('./models/Message')
const UserStatus = require('./models/UserStatus')
const socketIo = require('socket.io');
const dbConnect = require('./db')

const { router, sendNotification } = require('./routes/fcm/route')
const server = http.createServer(app)
dbConnect()
// require('dotenv').config({path: path.resolve(__dirname ,'../backend/.env')})
const roomHanlder = require('./JoinRoom/roomhandler')
const FCMRecord = require('./models/FCM')
const clerkClient = require('./utils/clerkUtils')
app.use(cors({ origin: '*', credentials: true }))
// app.use(cors({origin:['http://localhost:3000','http://192.168.100.5:3000'],credentials:true}))
app.use(express.json())
app.use('/api/auth/', auth)
app.use('/api/users/', userRoutes)
app.use('/api/messaging/', messagingRoutes)
app.use('/api/fcm/', router)
app.get('/', (req, res) => {
  res.send('hello world')
})
const io = socketIo(server, {
  cors: {
    origin: '*',
  },
});
io.on("connection", async (socket) => {
  console.log('user connected')
  const userID = socket.userID
  socket.join(userID)

  socket.on('user:status', async (statusUpdate) => {
    const {userId, status, lastSeen} = statusUpdate
    try {
        await UserStatus.findOneAndUpdate(
          { userId},
          { online: status==='online'? true: false, lastSeen },
          { upsert: true }
        );
        // Update user status in database

        // Broadcast status change to all connected clients
        io.emit('user:status_change', statusUpdate);
      } catch (error) {
        console.error('Error updating user status:', error);

      }
    });


  // Send pending delivery receipts
  const userStatus = await UserStatus.findOne({ userId: userID });
  if (userStatus?.pendingDeliveryReceipts?.length > 0) {
    userStatus.pendingDeliveryReceipts.forEach(receipt => {
      io.to(receipt.from).emit('message-delivery-status', {
        messageId: receipt.messageId,
        status: { delivered: true, deliveredAt: new Date() }
      });
    });
    await UserStatus.updateOne(
      { userId: userID },
      { $set: { pendingDeliveryReceipts: [] } }
    );
  }

  // console.log(`${userID} joined the room ${userID}`)
  socket.on('private message', async (msg) => {
    const recipientStatus = await UserStatus.findOne({ userId: msg.to });

    const {  to, _id,nonce, ephemeralPublicKey, ciphertexts } = msg
    const message = new Message({ _id, from: userID, to, nonce, ciphertexts, ephemeralPublicKey})
    const saved = await message.save()
   
    if (recipientStatus?.online) {


      await io.to(to).emit('private message', {
        
        ciphertexts,
        from: userID,
        _id,
        nonce,
        ephemeralPublicKey,
        timestamp: saved.timestamp
      })
    } else {
      const userToken = await FCMRecord.findOne({ clerkId: msg.to })
      const user = await clerkClient.users.getUser(msg.from)
      
      
      const result = await sendNotification(userToken.token, msg.to, user.username, JSON.stringify(msg.ciphertexts),ephemeralPublicKey, 'https://next-js-socket-io-chatapp.vercel.app/', user.imageUrl)
      if (result?.success) {
        await Message.updateOne(
          { _id: msg._id },
          {
            $set: {
              'status.delivered': true,
              'status.deliveredAt': new Date()
            }
          }
        );
        io.to(msg.from).emit('message-delivery-status', {
          messageId: msg._id,
          status: { delivered: true, deliveredAt: new Date() }
        });
      }else{

        await UserStatus.updateOne(
          { userId: message.to },
          {
            $push: {
              pendingDeliveryReceipts: {
                messageId: message._id,
                from: message.from,
                timestamp: new Date()
              }
            }
          }
        );
      }
    }

  })
  socket.on('message-delivered', async ({ messageId, to }) => {
    await Message.updateOne(
      { _id: messageId },
      {
        $set: {
          'status.delivered': true,
          'status.deliveredAt': new Date()
        }
      }
    );

    io.to(to).emit('message-delivery-status', {
      messageId,
      status: {
        delivered: true,
        deliveredAt: new Date()
      }
    });
  });
  socket.on('message-read', async ({ userId }) => {
    const messages = await Message.find({ from: userId, 'status.read': false, 'status.delivered': true })
  
    messages.forEach(msg => {
      
      io.to(userId).emit("message-read", { messageId: msg._id, timestamp: msg.timestamp })
      
    })
    await Message.updateMany(
      { from: userId },
      {
        $set: {
          'status.read': true,
          'status.readAt': new Date()
        }
      },
    );
  })
  socket.on('call', ({ from, to, type }) => {
    console.log(from, ' tried to call ', to)
    io.to(to).emit('incoming-call', { from, to, type })
  })
  socket.on('call-ended', ({ to }) => {
    console.log('sending call end msg to ', to)
    io.to(to).emit('call-ended-from', { to })
  })
  socket.on('answer', ({ from, to, type }) => {
    io.to(to).emit('call-answered', { from, type })
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
  socket.on('message-deleted', ({ messageId, to }) => {
    io.to(to).emit('message-deleted', { messageId })
  })
  socket.on('muted', ({ to, muted }) => {
    io.to(to).emit('muted', { muted })
  })
  socket.on('video-status', ({ to, status }) => {
    io.to(to).emit('video-status', { status })
  })
  socket.on('disconnect', async () => {
    // await UserStatus.findOneAndUpdate(
    //   { userId: userID },
    //   {
    //     online: false,
    //     lastSeen: new Date()
    //   }
    // );
    //         io.emit('user:status_change', {
    //       userId: socket.userID,
    //       status: 'offline',
    //       lastSeen:new Date()
    //     });
    
  });
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