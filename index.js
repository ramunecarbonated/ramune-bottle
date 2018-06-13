const Discord = require('discord.js');
const client = new Discord.Client();
var env = process.env;

var config = require('./config.js');
var commands = require('./commands.json'); // TODO: if this gets big, put in async
var request = require('request');

client.login( env.TOKEN );

client.on('ready', () => {
    // we logged in!
    console.log(`Logged in as ${client.user.tag}!`);
    // set activity
    client.user.setActivity('the chat', { type: 'WATCHING' })
        .then(console.log(`Set activity.`))
        .catch(console.error);

    client.users.get(config.sasch).send('Logged in.')
        .then(console.log(`Sending 'logged in' message to ${config.sasch}.`))
        .catch(console.error);
});

client.on('message', msg => {
    // loop through json-loaded commands first
    var cmd = msg.content.split(' ')[0].toLowerCase();
    if (typeof commands[cmd] !== 'undefined' && commands[cmd]) {
        var command = commands[cmd];
        try {
            if (typeof command.maxArgs !== 'undefined' && command.maxArgs <= 8) { // maximum of 8 args per command
                var params = parseParams(msg, cmd, command.maxArgs);
            } else { // if not set or more than 8 (string limit), parse as a whole
                var params = parseLine(msg, cmd, command.maxArgs);
            }

            var arr = {};
            for (i in command.data) {
                arr[i] = eval('(' + command.data[i] + ')');
            }

            // console.log(arr);

            if (typeof command.postUrl !== 'undefined' && command.postUrl) {
                msg.channel.startTyping();

                request.post({
                    followAllRedirects: true,
                    url: command.postUrl,
                    timeout: 15000,
                    formData: arr
                }, function optionalCallback(err, response, body) {
                    // TODO: this is deprec
                    if (err) return console.error('upload failed:', err);
                    // regex to get the very first image tag.
                    var re = /src="([^"]+)"/g;
                    var results = re.exec(body);
                    // send picture
                    msg.channel.send({
                        files: [results[1]]
                    }).then(msg.channel.stopTyping()).catch(console.error);
                });
            }

        } catch(err) {
            console.error('Error:', err);
            msg.reply(err);
        }
     
        return;
    }

    // ping pong
    if (cmd === '-ping') msg.reply('Pong!');

    // logging
    if (msg.channel.type == "dm") console.log(`PM with ${msg.channel.recipient.username}#${msg.channel.recipient.discriminator}<${msg.channel.recipient.id}> | ${msg.author.username}#${msg.author.discriminator}<${msg.author.id}>: ${msg.content}`);
    else if (msg.channel.type == "text") console.log(`${msg.channel.guild.name}<#${msg.channel.name}> | ${msg.author.username}#${msg.author.discriminator}<${msg.author.id}>: ${msg.content}`);

    // owner only
    if (isOwner(msg)) {
        if (msg.content === 'LUCAS, TIKKIE') {
            msg.reply('zei iemand TIKKIE!?');
            setInterval(() => {
                request.post({
                    url: "https://discordapp.com/api/webhooks/455707982584348673/06aQKQcxn1P-2ZASqFxjxKHd2Ca8itmcWVxIKu7T5aelMgqOaNhSdO5Y-H0cAn3Ug-Je",
                    timeout: 5000,
                    formData: { "content": "<@!54568356115656704>, TIKKIE!" }
                });
            }, 15000);
        }

        // set avatar
        if (cmd === '-setavatar') {
            try {
                var url = (typeof msg.attachments.first() !== 'undefined' && msg.attachments.first()) ? msg.attachments.first().url : parseLine(msg, '-setavatar', 256);
                client.user.setAvatar(url)
                    .then(user => msg.reply('New avatar set!'))
                    .catch(console.error);
            } catch (err) {
                console.error('Error:', err);
                msg.reply(err);
            }
        }
        // destroy and reconnect
        if (cmd === '-destroy') {
            msg.reply('destroying connection.');
            client.destroy();
            setTimeout(() => { client.login( env.TOKEN ); }, 5000); // reconnect
        }
    }
});

function isOwner(msg) {
    return msg.author.id == config.sasch;
}

function getRandomInt(minimum, maximum) {
    return Math.round( Math.random() * (maximum - minimum) + minimum);
}

function parseParams(msg, remove, max, min = 1) {
    var param = msg.content.replace(remove, "").trim();
    if (param.length < 2) throw `Invalid arguments, please give me at least ${min} and a maximum of ${max}.`;
    var params = param.split('|');
    var count = params.length;
    if (count < min || count > max) throw `Invalid arguments, please give me at least ${min} and a maximum of ${max}.`;

    return params.map(s => s.trim());
}

function parseLine(msg, remove, max = 30, min = 4) {
    var param = msg.content.replace(remove, "").trim();
    var length = param.length;
    if (length < min || length > max) throw `Invalid argument, please give me at least ${min} letter(s) and a maximum of ${max} letters.`;

    return param;
}
