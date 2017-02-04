var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var users = {};
var rooms = {};
var queue = [];
var player_choices = {};
var game_data = {};
app.use(express.static('static'));

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/index.html');
});

class TurnInfo {
    constructor(name, move, score) {
        this.name = name;
        this.move = move;
        this.score = score;
    }
}

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

    socket.on('process_round', function(choice, data) {
        if (!(data.room in player_choices)) {
            player_choices[data.room] = [];
        }
        //later change log to show results after round is over
        socket.emit('log_turn', choice, game_data[data.room].current_round, data);
        if (player_choices[data.room].length < 2) {
            player_choices[data.room].push({'player': data.name, 'choice': choice});
        }
        if (player_choices[data.room].length >= 2) {
            var player1 = player_choices[data.room].pop();
            var player1_name = player1.player;
            var player2 = player_choices[data.room].pop();
            var player2_name = player2.player;
            var room_game_data = game_data[data.room];
            room_game_data[player1_name].last_move = player1.choice;
            room_game_data[player1_name].moves.push(player1.choice);
            room_game_data[player2_name].last_move = player2.choice;
            room_game_data[player1_name].moves.push(player1.choice);
            //1 for player 1 win, 0 for tie, -1 for player2 win
            var player1_turn_info = new TurnInfo(player1_name, player1.choice, room_game_data[player1_name].score);
            var player2_turn_info = new TurnInfo(player2_name, player2.choice, room_game_data[player2_name].score);
            if (player1.choice == "rock" && player2.choice == "scissors" || player1.choice == "paper" && 
                player2.choice == "rock" || player1.choice == "scissors" && player2.choice == "paper") {
                room_game_data[player1_name].score = room_game_data[player1_name].score + 1;
                player1_turn_info.score = player1_turn_info.score + 1;
                io.to(data.room).emit('update_game_state', player1_turn_info, player2_turn_info, room_game_data.current_round, false, data);
            }  else if (player2.choice == "rock" && player1.choice == "scissors" || player2.choice == "paper" && 
                player1.choice == "rock" || player2.choice == "scissors" && player1.choice == "paper") {
                room_game_data[player2_name].score = room_game_data[player2_name].score + 1;
                player2_turn_info.score = player2_turn_info.score + 1;
                io.to(data.room).emit('update_game_state', player2_turn_info, player1_turn_info, room_game_data.current_round, false, data);
            } else {
                io.to(data.room).emit('update_game_state', player1_turn_info, player2_turn_info, room_game_data.current_round, true, data);
            }
        } 
    });

    socket.on('round_timer_start', function(data) {
        game_data[data.room].current_round = game_data[data.room].current_round + 1;
        var countdown = 10;
        var interval = setInterval(function() {
            if (countdown == 0) {
                clearInterval(interval);
                //end round event
            }
        }, 1000);
        socket.emit('activate_game_buttons', data, game_data[data.room].current_round);
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

        //initialize game data objects once connection between two users is established
        //game_data holds all the data that one instance of the game needs
        //use randomly generated gameid as key
        //make classes later
        game_data[room] = {'current_round': 0, [users[socket.id]]: {'id': socket.id, 'score': 0, 'moves': [], 'last_move': ''},
                         [users[peer.id]]: {'id': peer.id, 'score': 0, 'moves': [], 'last_move': ''}, 'winner': ''};
        
        var countdown = 5;
        var interval = setInterval(function() {
            if (countdown == 0) {
                clearInterval(interval);
                peer.emit('game_start', {'name': users[peer.id], 'room': room, 
                        'opponent': users[socket.id]}, game_data[room]);
                socket.emit('game_start', {'name': users[socket.id], 'room': room, 
                        'opponent': users[peer.id]}, game_data[room]);
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

http.listen(3000, function() {
    console.log('listening on *:3000');
});
