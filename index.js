const usedCommand = new Set();
const Discord = require('discord.js');
const client = new Discord.Client();
var env = process.env;

var config = require('./config.js');
var commands = require('./commands.json'); // TODO: if this gets big, put in async
var request = require('request-promise-native');

client.login( env.TOKEN );

// ready to go!
client.on('ready', () => {
    var string = `Bot has started, with ${client.users.size} users, in ${client.channels.size} channels of ${client.guilds.size} guilds.`;
    console.log(string);
    client.user.setActivity(`${client.guilds.size} servers. Use ${config.prefix}help.`, { type: 'WATCHING' });
    if ( env.DEBUG ) client.users.get(config.sasch).send(string);
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
// the bot joins a guild.
client.on("guildCreate", guild => {
    console.log(`New guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`);
    client.user.setActivity(`${client.guilds.size} servers. Use ${config.prefix}help.`, { type: 'WATCHING' });
});

            // console.log(arr);
// the bot is kicked from a guild :(
client.on("guildDelete", guild => {
    console.log(`I have been removed from: ${guild.name} (id: ${guild.id})`);
    client.user.setActivity(`${client.guilds.size} servers. Use ${config.prefix}help.`, { type: 'WATCHING' });
});

            if (typeof command.postUrl !== 'undefined' && command.postUrl) {
                msg.channel.startTyping();
    if (msg.author.bot) return; // don't respond to other bots or yourself
    if (msg.content.indexOf(config.prefix) !== 0) return; // only read when its prefix

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
    // help: HELP ME
    if (cmd === 'help') {
        var cmds = Object.keys(commands).sort((a, b) => a.localeCompare(b));
        var output = "";
        for (i in cmds) {
            output += `${cmds[i]}: ${commands[cmds[i]]['usage']}\n`
        }

        // if send thru text channel, ping them to check pms
        if (msg.channel.type == "text") msg.reply(`check your private messages Oniisan/Oneesan!`).then(msg => { setTimeout(() => { msg.delete(); }, 5000); });
        msg.author.send("Hey Oniisan/Oneesan, here are my commands:\n```css\n" + output + "```\nPlease look forward to additional commands from my creator!");
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
            msg.reply('okay, be right back.');
            client.destroy();
            setTimeout(() => {
                client.login( env.TOKEN );
                msg.reply('back!')
            }, 5000); // reconnect
        }
            for (i in command.data) { arr[i] = eval(unescape('(' + command.data[i] + ')')); } // forgive me, for i have sinned very, very heavily
        }
    }
});

function report(err, msg = null) {
    console.error('Error:', err);
    if (msg != null) {
        msg.reply(err);
        msg.channel.stopTyping(true);
    }
}

function startCooldown(id) {
    // adds the user to the set so that they can't use commands
    usedCommand.add(id);
    setTimeout(() => { usedCommand.delete(id); }, config.cooldown); // remove after a few
}

function isOwner(msg) {
    return msg.author.id == config.sasch;
}

function getRandomInt(minimum, maximum) {
    return Math.round( Math.random() * (maximum - minimum) + minimum);
}

function parseParams(msg, remove, max, min = 1) {
    var param = msg.content.replace(`${config.prefix}${remove}`, "").trim();
    if (param.length < 2) throw `please give me at least ${min} and a maximum of ${max}.`;
    var params = param.split('|');
    var count = params.length;
    if (count < min || count > max) throw `please give me at least ${min} argument(s) and a maximum of ${max} arguments.`;

    return (count <= 1) ? [ null ] : params.map(s => s.trim());
}

function parseLine(msg, remove, max = 30, min = 4) {
    var param = msg.content.replace(`${config.prefix}${remove}`, "").trim();
    var length = param.length;
    if (length < min || length > max) throw `please give me at least ${min} letter(s) and a maximum of ${max} letters.`;

    return param;
}
