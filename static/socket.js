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

    socket.on('game_start', function(data) {
        $("#player_name").text(data.name);
        $("#player_score").text(0);
        $("#opponent_name").text(data.opponent);
        $("#opponent_score").text(0);
        var round = 1;
        //start game loop
        socket.emit('round_timer_start', round, data);

    });

    //probably want to hide or deactivate buttons when we're done
    socket.on('activate_game_buttons', function(round, data) {
        $("#rock").click(function() {
            socket.emit('process_round', "rock", round, data);
        });

        $("#paper").click(function() {
            socket.emit('process_round', "paper", round, data);
        });

        $("#scissors").click(function() {
            socket.emit('process_round', "scissors", round, data);
        });   
    });

    socket.on('log_turn', function(choice, round, data) {
        $("#log").append($('<p>').text("Round " + round + ": " + data.name + " chooses " + choice));
    });

    socket.on('process', function(winner, round, data) {
        if (winner.player != "tie") {
            $("#log").append($('<p>').text(winner.player + " wins round " + round));
            if (winner.name == data.name) {
                score++;
                $("#player_score").text(score);
            }
        } else {
            $("#log").append($('<p>').text("Round " + round + " was a tie"));
        }
    });
});

function updateUserList(users) {
    $("#user_list").empty();
    for (var key in users) {
        $("#user_list").append($('<li>').text(users[key]));
    }
}

