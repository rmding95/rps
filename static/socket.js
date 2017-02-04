$(function() {
    var socket = io();
    var connected_users;
    var username = '';
    var clientId = '';
    var score = 0;

    $("#game_area").hide();
    $("#loading").hide();

    socket.on('connected_users', function(connected_users, users) {
        clientId = socket.io.engine.id;
        updateUserList(users);
        $("#username").text("Username: " + users[clientId]);
        $("#user_count").text("Users Connected: " + connected_users);
    });

    $("#find_game").click(function() {
        $("#loading").show();
        username_field = $("#username_input").val();
        console.log(username_field);
        if (username_field.length != 0) {
            username = username_field
        }
        socket.emit('join', username);
    });

    socket.on('update_all', function(msg) {
        console.log(msg);
        updateUserList(msg);
        $("#username").text("Username: " + msg[clientId]);
    });

    socket.on('game_wait', function() {
        $("#log").text("Waiting for game");
    });

    socket.on('game_countdown', function(timer) {
        $("#loading").hide();
        $("#game_area").show();
        $("#timer").text("Game starting in: " + timer);
    });

    socket.on('game_start', function(data, game_data) {
        console.log(game_data);
        //$("#round_number").text(game_data.current_round);
        $("#player_name").text(data.name);
        $("#player_score").text(0);
        $("#opponent_name").text(data.opponent);
        $("#opponent_score").text(0);
        //start game loop
        socket.emit('round_timer_start', data);
    });

    //probably want to hide or deactivate buttons when we're done
    socket.on('activate_game_buttons', function(data, current_round) {
        $("#round_number").text(current_round);
        $("#rock").click(function() {
            socket.emit('process_round', "rock", data);
        });

        $("#paper").click(function() {
            socket.emit('process_round', "paper", data);
        });

        $("#scissors").click(function() {
            socket.emit('process_round', "scissors", data);
        });   
    });

    socket.on('log_turn', function(choice, round, data) {
        $("#log").append($('<p>').text("Round " + round + ": " + data.name + " chooses " + choice));
    });

    socket.on('update_game_state', function(winner, loser, round, tie, data) {
        $("#rock").prop('onclick', null).unbind('click');
        $("#paper").prop('onclick', null).unbind('click');
        $("#scissors").prop('onclick', null).unbind('click');
        if (!tie) {
            $("#log").append($('<p>').text(winner.name + " wins round " + round));
        } else {
            $("#log").append($('<p>').text("Round " + round + " was a tie"));
        }
        if (username == winner.name) {
            $("#player_score").text(winner.score);
        } else {
            $("#opponent_score").text(winner.score);
        }
        socket.emit('round_timer_start', data);
    });
});

function updateUserList(users) {
    $("#user_list").empty();
    for (var key in users) {
        $("#user_list").append($('<li>').text(users[key]));
    }
}

