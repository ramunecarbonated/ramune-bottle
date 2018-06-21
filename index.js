// requires and all that jazz
const Discord = require('discord.js')
    , client = new Discord.Client()
    , config = require('./include/config')
    , commands = require('./include/commands.json') // TODO: if this gets big, put in async
    , crypto = require("crypto")
    , Enmap = require("enmap")
    , fs = require('fs')
    , gm = require('gm').subClass({imageMagick: true})
    , helpers = require('./include/helpers')
    , lastAttachmentUrl = []
    , path = require('path')
    , Provider = require("enmap-sqlite")
    , request = require('request-promise-native');


client.login( env.TOKEN );
client.points = new Enmap({provider: new Provider({name: "points"})});

// ready to go!
client.on('ready', () => {
    if (!fs.existsSync(config.temp)) fs.mkdirSync(config.temp);
    client.user.setActivity(`${client.guilds.size} servers. Use ${config.prefix}help.`, { type: 'WATCHING' });
});

// the bot joins a guild.
client.on("guildCreate", guild => {
    console.log(`New guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`);
    client.user.setActivity(`${client.guilds.size} servers. Use ${config.prefix}help.`, { type: 'WATCHING' });
});

// the bot is kicked from a guild :(
client.on("guildDelete", guild => {
    console.log(`I have been removed from: ${guild.name} (id: ${guild.id})`);
    client.user.setActivity(`${client.guilds.size} servers. Use ${config.prefix}help.`, { type: 'WATCHING' });
});

client.on('message', msg => {
    if (!msg.guild) return; // only respond to messages from a guild
    if (typeof msg.attachments.first() !== 'undefined' && msg.attachments.first()) lastAttachmentUrl[msg.channel.id] = msg.attachments.first().url; // log last attachment posted
    if (msg.author.bot) return; // don't respond to other bots or yourself
    if (msg.content.indexOf(config.prefix) !== 0) return; // only read when its prefix

    var cmd = msg.content.slice(config.prefix.length).split(' ')[0].toLowerCase();

    // help: HELP ME
    if (cmd === 'help') {
        var cmds = Object.keys(commands).sort((a, b) => a.localeCompare(b));
        var output = "";
        for (i in cmds) {
            output += `${cmds[i]}: ${commands[cmds[i]]['usage']}\n`
        }

        // if send thru text channel, ping them to check pms
        msg.reply(`check your private messages!`).then(msg => { setTimeout(() => { msg.delete(); }, 5000); });
        msg.author.send("Here are my commands:\n```css\n" + output + "```\nGot a suggestion, found or a bug or interested in the source? Visit the GitHub repo: https://github.com/ramunecarbonated/ramune-bottle/");
    }

    // ping: post initial message and edit it later with delay in ms
    if (cmd === 'ping') {
        var start = Date.now();
        msg.reply(`pong!`).then(msg => { msg.edit(`pong! (delay: ${Date.now() - start}ms)`); });
    }

    // logging
    // if (msg.channel.type == "dm") console.log(`PM with ${msg.channel.recipient.username}#${msg.channel.recipient.discriminator}<${msg.channel.recipient.id}> | ${msg.author.username}#${msg.author.discriminator}<${msg.author.id}>: ${msg.content}`);
    // else if (msg.channel.type == "text") console.log(`${msg.channel.guild.name}<#${msg.channel.name}> | ${msg.author.username}#${msg.author.discriminator}<${msg.author.id}>: ${msg.content}`);

    // owner only
    if (isOwner(msg)) {
        // set avatar
        if (cmd === 'setavatar') {
            const url = (typeof msg.attachments.first() !== 'undefined' && msg.attachments.first()) ? msg.attachments.first().url : msg.content.replace(`${config.prefix}${cmd}`, "").trim();
            client.user.setAvatar(url).then(user => msg.reply('thanks for the new avatar! :blush:')).catch(silent => {});
        }

        if (cmd === 'setusername') {
            client.user.setUsername( msg.cleanContent.replace(`${config.prefix}${cmd}`, "") ).then(user => console.log(`My new username is ${user.username}`)).catch(console.error);
        }

        // say it with me
        if (cmd === 'say') {
            msg.delete().catch(silent => {}); // silent error if bot does not have `Manage Messages`
            msg.channel.send( msg.cleanContent.replace(`${config.prefix}${cmd}`, "").trim() ).catch(silent => {});
        }
    }

    // loop through json-loaded commands
    if (typeof commands[cmd] !== 'undefined' && commands[cmd]) {
        var c = commands[cmd];
        try {
            if (usedCommand.has(msg.author.id)) throw "please wait a few seconds, I am trying to be a good imouto for others too!";
            msg.channel.startTyping();
            // get parameters
            var image = (typeof msg.attachments.first() !== 'undefined' && msg.attachments.first()) ? msg.attachments.first().url : lastAttachmentUrl[msg.channel.id]; // url of image attachment
            if (typeof c.imageOnly === 'undefined' || !c.imageOnly) {
                var params = parseParams(msg, cmd, !!c.filter, (c.maxArgs || 32), (c.minArgs || 1));
                var param = parseLine(msg, cmd, !!c.filter, ((c.maxLength || 64) * params.length), (c.minLength || 2));
            }
            // set formData
            var arr = {};
            for (i in c.data) {
                arr[i] = eval("(" + c.data[i] + " || '')");
            } // forgive me, for i have sinned very, very heavily
            // if postUrl exists
            if (typeof c.postUrl !== 'undefined' && c.postUrl) {
                request.post({
                    followAllRedirects: true,
                    url: c.postUrl,
                    timeout: 15000,
                    formData: arr
                }, function optionalCallback(err, response, body) {
                    var errors = /error">(.*?)<\//g.exec(body); // regex to get errors from the website we post to
                    if (typeof errors !== 'undefined' && errors) {
                        report(`I did not get an image for you, but I was told to show this to you: \`${errors[1]}\``, msg);
                    } else {
                        var results = /src="([^"]+)"/g.exec(body); // regex to get the very first image tag
                        msg.channel.send({ files: [results[1]] }); // send message
                    }
                }).then(msg.channel.stopTyping(true)).catch(console.error);
            }
            // if morphFile (imagemagick) exists
            else if (typeof c.morphFile !== 'undefined' && c.morphFile) {
                var tempName = crypto.randomBytes(12).toString('hex');

                fs.open(`./temp/${tempName}.png`, 'w', function (err, file) {
                    if (err) throw err;
                }); // need to do this or else imagemagick will cause an error

                gm(image).morph(`./res/${c.morphFile}.png`, `./temp/${tempName}.png`, function (err) {
                    if (err) {
                        console.error(err);
                        report("I lost you in the middle there, sorry! Can you please tell me what you wanted again?", msg);
                    } else {
                        msg.channel.send({ files: [`./temp/${tempName}-1.png`] }).then(msg.channel.stopTyping(true)).catch(console.error); // send message
                    }
                });
            }
        } catch(err) {
            report(err, msg);
        } finally {
            startCooldown(msg.author.id); // add to cooldown set
        }
    }
});

function report(err, msg = null, friendlyMessage = null) {
    console.error('Error:', err);
    if (msg != null) {
        msg.reply(friendlyMessage || err);
        msg.channel.stopTyping(true);
    }
}
