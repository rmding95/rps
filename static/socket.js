$(function() {
    var socket = io();
    var connected_users;
    var username = '';
    var clientId = '';

    socket.on('connected_users', function(connected_users, users) {
        clientId = socket.io.engine.id;
        users[clientId] = "Anon#" + connected_users;
        updateUserList(users);
        $("#username").text("Username: " + users[clientId]);
        $("#user_count").text("Users Connected: " + connected_users);
    });

    $("#find_game").click(function() {
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

    $("#rock").click(function() {
        console.log("rock");
        socket.emit('turn', "rock");
    });

    $("#paper").click(function() {
        console.log("rock");
        socket.emit('turn', "paper");
    });

    $("#scissors").click(function() {
        console.log("rock");
        socket.emit('turn', "scissors");
    });   

    socket.on('turn', function(msg) {
        $("#log").append($('<li>').text(msg));
    });

    socket.on('game_wait', function() {
        $("#log").text("Waiting for game");
    });
});

function updateUserList(users) {
    $("#user_list").empty();
    for (var key in users) {
        $("#user_list").append($('<li>').text(users[key]));
    }
}

