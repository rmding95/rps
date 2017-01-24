var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var users = {};
var rooms = {};
var queue = [];
var player_choices = {};
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
    users[socket.id] = "Anon";
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

    socket.on('process_round', function(choice, round, data) {
        if (!(data.room in player_choices)) {
            player_choices[data.room] = [];
        }
        //later change log to show results after round is over
        io.to(data.room).emit('log_turn', choice, round, data);
        if (player_choices[data.room].length < 2) {
            player_choices[data.room].push({'player': data.name, 'choice': choice});
        }
        if (player_choices[data.room].length >= 2) {
            var player1 = player_choices[data.room].pop();
            var player2 = player_choices[data.room].pop();
            //1 for player 1 win, 0 for tie, -1 for player2 win
            if (player1.choice == "rock" && player2.choice == "scissors" || player1.choice == "paper" && 
                player2.choice == "rock" || player1.choice == "scissors" && player2.choice == "paper") {
                io.to(data.room).emit('process', player1, round, data);
            }  else if (player2.choice == "rock" && player1.choice == "scissors" || player2.choice == "paper" && 
                player1.choice == "rock" || player2.choice == "scissors" && player1.choice == "paper") {
                io.to(data.room).emit('process', player2, round, data);
            } else {
                io.to(data.room).emit('process', {'player': "tie", 'choice': choice}, round, data);
            }
        } 
    });

    socket.on('round_timer_start', function(round, data) {
        var countdown = 10;
        var interval = setInterval(function() {
            if (countdown == 0) {
                clearInterval(interval);
                //event to end round
            }
        }, 1000);
        socket.emit('activate_game_buttons', round, data);
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

        var countdown = 5;
        var interval = setInterval(function() {
            if (countdown == 0) {
                clearInterval(interval);
                peer.emit('game_start', {'name': users[peer.id], 'room': room, 'opponent': users[socket.id]});
                socket.emit('game_start', {'name': users[socket.id], 'room': room, 'opponent': users[peer.id]});
            }            
            peer.emit('game_countdown', countdown);
            socket.emit('game_countdown', countdown);
            countdown--;
        }, 1000);

    } else {
        queue.push(socket);
        socket.emit('game_wait');
    }
}

http.listen(80, function() {
    console.log('listening on *:3000');
});
