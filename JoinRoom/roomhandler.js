const uuid = require('uuid')
let rooms = {}
const roomHanlder = (socket)=>{
    const joinRoom = ({roomId,userId})=>{
        if(rooms[roomId]){
            console.log(userId,' joined room',roomId)

            rooms[roomId].push(userId)
            socket.join(roomId)
            socket.emit('get-users',{
                roomId,
                participants: rooms[roomId]
            })
            socket.to(roomId).emit('user-join',{userId})
        }
        socket.on('disconnect',()=>{
            if(rooms[roomId]){

                rooms[roomId] = rooms[roomId].filter(id=>id!==userId)
                socket.to(roomId).emit('member-disconnected',{userId})
            }

        })

    }
    const createRoom = ({userId})=>{
        const roomId = uuid.v4()
        rooms[roomId] = []

        console.log('room created by',userId)
        console.log(rooms, 'in create room')
        socket.emit('room-created', {roomId})
    }

    socket.on('join-room',joinRoom)
    socket.on('create-room',createRoom)
}
module.exports = roomHanlder