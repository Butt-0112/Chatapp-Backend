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
const { setUserStatus, getUserStatus } = require('./utils/user-status-cache')
const { writeBuffer } = require('./utils/write-buffer')
const { getFCMToken } = require('./utils/fcm-token-cache')
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
    const { userId, status, lastSeen } = statusUpdate
    try {
      setUserStatus(userId, status)
    } catch (error) {
      
    }
    try {
      // await UserStatus.findOneAndUpdate(
      //   { userId },
      //   { online: status, lastSeen },
      //   { upsert: true }
      // );
      writeBuffer.addStatusOp({
        updateOne:{
          filter: {userId},
          update: {$set: {online: status, lastSeen}},
          upsert:true  
        }
      })
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
    // const recipientStatus = await UserStatus.findOne({ userId: msg.to });

    const { to, _id, nonce, ephemeralPublicKey, ephemeralSelfPublicKey, ciphertexts } = msg
    // const message = new Message({ _id, from: userID, to, nonce, ciphertexts, ephemeralSelfPublicKey, ephemeralPublicKey })
    // const saved = await message.save()
    writeBuffer.addInsert({ _id, from: userID, to, nonce, ciphertexts, ephemeralSelfPublicKey, ephemeralPublicKey })
    const recipientStatus = getUserStatus(msg.to)

    if (recipientStatus?.online === 'online') {


      await io.to(to).emit('private message', {

        ciphertexts,
        from: userID,
        _id,
        nonce,
        ephemeralPublicKey,
        ephemeralSelfPublicKey,
        timestamp: saved.timestamp
      })
    } else if (recipientStatus?.online === 'away') {
      // const userToken = await FCMRecord.findOne({ clerkId: msg.to })
      // const user = await clerkClient.users.getUser(msg.from)
      
       const [fcmToken, user] = await Promise.all([
      getFCMToken(msg.to),
      clerkClient.users.getUser(msg.from)
    ])


      const result = await sendNotification(fcmToken, msg.to, user.username, JSON.stringify(msg.ciphertexts), ephemeralPublicKey, msg.from, user.imageUrl)
      if (result?.success) {
        // await Message.updateOne(
        //   { _id: msg._id },
        //   {
        //     $set: {
        //       'status.delivered': true,
        //       'status.deliveredAt': new Date()
        //     }
        //   }
        // );
         writeBuffer.addMsgOp({
        updateOne: {
          filter: { _id:msg._id },
          update: { $set: { 'status.delivered': true, 'status.deliveredAt': deliveredAt } }
        }
      })
        io.to(msg.from).emit('message-delivery-status', {
          messageId: msg._id,
          status: { delivered: true, deliveredAt: new Date() }
        });
        await io.to(to).emit('private message', {

          ciphertexts,
          from: userID,
          _id,
          nonce,
          ephemeralPublicKey,
          ephemeralSelfPublicKey,
          timestamp: saved.timestamp
        })
      } else {

        // await UserStatus.updateOne(
        //   { userId: message.to },
        //   {
        //     $push: {
        //       pendingDeliveryReceipts: {
        //         messageId: message._id,
        //         from: message.from,
        //         timestamp: new Date()
        //       }
        //     }
        //   }
        // );
          writeBuffer.addStatusOp({
        updateOne: {
          filter: { userId: msg.to },
          update: { $push: { pendingDeliveryReceipts: { messageId:msg._id, from: msg.from, timestamp: new Date() } } }
        }
      })
    
      }
    }

  })
  socket.on('message-delivered', async ({ messageId, to }) => {
    // await Message.updateOne(
    //   { _id: messageId },
    //   {
    //     $set: {
    //       'status.delivered': true,
    //       'status.deliveredAt': new Date()
    //     }
    //   }
    // );
 writeBuffer.addMsgOp({
    updateOne: {
      filter: { _id: messageId },
      update: { $set: { 'status.delivered': true, 'status.deliveredAt': new Date() } }
    }
  })
    io.to(to).emit('message-delivery-status', {
      messageId,
      status: {
        delivered: true,
        deliveredAt: new Date()
      }
    });
  });
  socket.on('message-read', async ({ from,messageIds }) => {
    // const messages = await Message.find({ from: userId, 'status.read': false, 'status.delivered': true })
 if (!messageIds?.length) return
  const readAt = new Date()
    io.to(from).emit("message-read", {messageIds,timestamp:readAt})
   writeBuffer.addMsgOp({
    updateMany: {
      filter: { _id: { $in: messageIds }, 'status.read': false, 'status.delivered': true, from },
      update:  { $set: { 'status.read': true, 'status.readAt': readAt } }
    }
  }) 
    // await Message.updateMany(
    //   { from: userId },
    //   {
    //     $set: {
    //       'status.read': true,
    //       'status.readAt': new Date()
    //     }
    //   },
    // );
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
    setUserStatus(userID, 'offline')

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