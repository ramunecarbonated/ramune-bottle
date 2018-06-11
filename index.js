const Discord = require('discord.js');
const client = new Discord.Client();
var env = process.env;

var config = require('./config.js');
// var tools = require('./commands/public');
var request = require('request');

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
    // ping pong
    if (msg.content === 'ping') msg.reply('Pong!');

    // logging
    if (msg.channel.type == "dm") console.log(`PM with ${msg.channel.recipient.username}#${msg.channel.recipient.discriminator}<${msg.channel.recipient.id}> | ${msg.author.username}#${msg.author.discriminator}<${msg.author.id}>: ${msg.content}`);
    else if (msg.channel.type == "text") console.log(`${msg.channel.guild.name}<#${msg.channel.name}> | ${msg.author.username}#${msg.author.discriminator}<${msg.author.id}>: ${msg.content}`);

    // owner only
    if (!isOwner(msg)) {
        if (msg.content === 'LUCAS, TIKKIE') {
            msg.reply('zei iemand TIKKIE!?');
            msg.channel.send("<@!54568356115656704>, TIKKIE!");
            setInterval(() => {
                msg.channel.send("<@!54568356115656704>, TIKKIE!");
            }, 120000);
        }

        // set avatar
        if (msg.content.indexOf('-setavatar') === 0) {
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
    }


    if (msg.content.indexOf('-retro') === 0) {
        try {
            // parse
            var params = parseParams(msg, 3);
            // start typing
            msg.channel.startTyping();
            // send request to get the picture
            request.post({
                followAllRedirects: true,
                url: 'https://m.photofunia.com/categories/all_effects/retro-wave?server=2',
                timeout: 15000,
                formData: {
                    bcg: getRandomInt(1, 5),
                    txt: getRandomInt(1, 4),
                    text1: params[1] || "",
                    text2: params[2] || "",
                    text3: params[3] || ""
                }
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
        } catch(err) {
            console.error('Error:', err);
            msg.reply(err);
        }
    }

    if (msg.content.indexOf('-cake') === 0) {
        try {
            // parse
            var params = parseParams(msg, 2);
            // start typing
            msg.channel.startTyping();
            // send request to get the picture
            request.post({
                followAllRedirects: true,
                url: 'https://m.photofunia.com/categories/all_effects/birthday-cake?server=2',
                timeout: 15000,
                formData: {
                    text1: params[1] || "",
                    text2: params[2] || "",
                }
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
        } catch (err) {
            console.error('Error:', err);
            msg.reply(err);
        }
    }

    if (msg.content.indexOf('-neonsign') === 0) {
        try {
            // parse
            var param = parseLine(msg, cmd);
            // start typing
            msg.channel.startTyping();
            // send request to get the picture
            request.post({
                followAllRedirects: true,
                url: 'https://m.photofunia.com/categories/all_effects/neon-sign?server=2',
                timeout: 15000,
                formData: {
                    text: param,
                    colour: "r",
                }
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
        } catch (err) {
            console.error('Error:', err);
            msg.reply(err);
        }
    }
});

client.login( env.TOKEN );

function getRandomInt(minimum, maximum) {
    return Math.round( Math.random() * (maximum - minimum) + minimum);
}

function parseParams(msg, max, min = 1) {
    var params = msg.content.split('|');
    var count = params.length-1;
    if (count < min || count > max) throw `Invalid arguments, please give me at least ${min} and a maximum of ${max}.`;

    return params.trim();
}

function parseLine(msg, remove, max = 30, min = 1) {
    var param = msg.content.replace(remove, "");
    var length = param.length;
    if (length < min || length > max) throw `Invalid argument, please give me at least ${min} letter(s) and a maximum of ${max} letters.`;

    return param.trim();
}
