var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var users = {};
var rooms = {};
var queue = [];
app.use(express.static('static'));

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket) {
    console.log('a user connected');

    socket.on('join', function(name) {
        users[socket.id] = name;
        io.emit('update_all', users);
        matchmake(socket);
    });

    var clients_in_the_room = io.sockets.adapter.rooms; 
    console.log(Object.keys(clients_in_the_room).length);
    io.emit('connected_users', Object.keys(clients_in_the_room).length, users);
    for (var clientId in clients_in_the_room ) {
        console.log('client: %s', clientId); //Seeing is believing 
        var client_socket = io.sockets.connected[clientId];//Do whatever you want with this
    }

    socket.on('disconnect', function() {
        console.log('user disconnected');
        delete users[socket.id];
        io.emit('connected_users', Object.keys(clients_in_the_room).length);
        io.emit('update_all', users);
    });

    socket.on('turn', function(msg) {
        console.log(msg);
        io.emit('turn', msg);
    });
});

function matchmake(socket) {
    if (queue.length > 0) {
        var peer = queue.pop();
        var room = socket.id + "#" + peer.id;
        peer.join(room);
        socket.join(room);
        rooms[peer.id] = room;
        rooms[socket.id] = room;
        peer.emit('game_start', {'name': users[socket.id], 'room': room});
        socket.emit('game_start', {'name': users[peer.id], 'room': room});
    } else {
        queue.push(socket);
        socket.emit('game_wait');
    }
}

http.listen(3000, function() {
    console.log('listening on *:3000');
});
