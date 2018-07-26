// requires and all that jazz
const Discord = require('discord.js')
    , client = new Discord.Client()
    , config = require('./include/config')
    , commands = require('./include/commands.json') // TODO: if this gets big, put in async
    , crypto = require("crypto")
    , fs = require('fs')
    , gm = require('gm').subClass({imageMagick: true})
    , helpers = require('./include/helpers')
    , lastAttachmentUrl = []
    , path = require('path')
    , Provider = require("enmap-sqlite")
    , request = require('request-promise-native');

client.login( process.env.TOKEN );

// ready to go!
client.on('ready', () => {
    if (!fs.existsSync(`./${config.temp}`)) fs.mkdirSync(`./${config.temp}`);
    client.user.setActivity(`${client.guilds.size} servers. Use ${config.prefix}help.`, { type: 'WATCHING' });
});

// the bot joins a guild.
client.on("guildCreate", guild => {
    client.users.get(config.sasch).send(`New guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`);
    console.log(`New guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`);
    client.user.setActivity(`${client.guilds.size} servers. Use ${config.prefix}help.`, { type: 'WATCHING' });
});

// the bot is kicked from a guild :(
client.on("guildDelete", guild => {
    client.users.get(config.sasch).send(`I have been removed from: ${guild.name} (id: ${guild.id})`);
    console.log(`I have been removed from: ${guild.name} (id: ${guild.id})`);
    client.user.setActivity(`${client.guilds.size} servers. Use ${config.prefix}help.`, { type: 'WATCHING' });
});

client.on('message', msg => {
    // only respond to messages from a guild if not PM'd by bot owner
    if (!helpers.isOwner(msg) && !msg.guild) return;

    // log last attachment posted, yes, this also includes stuff from bots, that's intended
    if (typeof msg.attachments.first() !== 'undefined' && msg.attachments.first()) lastAttachmentUrl[msg.channel.id] = msg.attachments.first().url;

    // don't respond to other bots or don't respond to users who don't use the prefix
    if (msg.author.bot || msg.content.indexOf(config.prefix) !== 0) return;

    // slice and split up stuff
    const cmd = msg.content.slice(config.prefix.length).split(' ')[0].toLowerCase();

    // help: HELP ME
    if (cmd === 'help') {
        const cmds = Object.keys(commands).sort((a, b) => a.localeCompare(b));
        let output = "";
        for (i in cmds) {
            output += `${cmds[i]}: ${commands[cmds[i]]['usage']}\n`
        }

        // if send thru text channel, ping them to check pms
        msg.reply(`check your private messages!`).catch(silent => {});
        msg.author.send("Here are my commands, use `|` to seperate parameters:\n```css\n" + output + "```\n`image` means a direct image upload or a previously posted image `(-lastimage)`, no URLs.\nParameters in `<>` means they are optional.\n\nInvite link: https://discordapp.com/oauth2/authorize?client_id=328968948894662666&scope=bot&permissions=117824");
    }

    // ping: post initial message and edit it later with delay in ms
    if (cmd === 'ping') {
        const start = Date.now();
        msg.reply(`pong!`).then(msg => { msg.edit(`pong! (delay: ${Date.now() - start}ms)`); });
    }

    if (cmd === 'lastimage') {
        if (typeof lastAttachmentUrl[msg.channel.id] !== 'undefined') {
            msg.reply(`last image posted on this channel: ${lastAttachmentUrl[msg.channel.id]}`).catch(silent => {});
        } else {
            msg.reply('no image was found from this channel.').catch(silent => {});
        }
    }

    // logging
    // if (msg.channel.type == "dm") console.log(`PM with ${msg.channel.recipient.username}#${msg.channel.recipient.discriminator}<${msg.channel.recipient.id}> | ${msg.author.username}#${msg.author.discriminator}<${msg.author.id}>: ${msg.content}`);
    // else if (msg.channel.type == "text") console.log(`${msg.channel.guild.name}<#${msg.channel.name}> | ${msg.author.username}#${msg.author.discriminator}<${msg.author.id}>: ${msg.content}`);

    // owner only
    if (helpers.isOwner(msg)) {
        const msgStr = msg.content.replace(`${config.prefix}${cmd}`, "");
        // set avatar
        if (cmd === 'setavatar') {
            const url = (typeof msg.attachments.first() !== 'undefined' && msg.attachments.first()) ? msg.attachments.first().url : msgStr;
            client.user.setAvatar(url).then(user => msg.reply('thanks for the new avatar! :blush:')).catch(silent => {});
        }

        // set username
        if (cmd === 'setusername') {
            client.user.setUsername(msgStr).then(user => console.log(`My new username is ${user.username}`)).catch(silent => {});
        }

        // say it with me
        if (cmd === 'say') {
            msg.delete().catch(silent => {}); // silent error if bot does not have `Manage Messages`
            msg.channel.send(msgStr).then().catch(silent => {});
        }
    }

    // loop through json-loaded commands
    if (typeof commands[cmd] !== 'undefined' && commands[cmd]) {
        const c = commands[cmd];
        try {
            if (helpers.hasCooldown(msg.author.id)) throw "please wait a few seconds, I am trying to be a good bot for others too!";
            msg.channel.startTyping();
            // get parameters
            let image = (typeof msg.attachments.first() !== 'undefined' && msg.attachments.first()) ? msg.attachments.first().url : lastAttachmentUrl[msg.channel.id] // url of image attachment
                , param, params, arr = {};
            if (typeof c.imageOnly === 'undefined' || !c.imageOnly) {
                params = helpers.parseParams(msg, c, cmd);
                param = helpers.parseLine(msg, c, cmd);
            }
            // set formData
            for (i in c.data) {
                arr[i] = eval("(" + c.data[i] + " || '')"); // forgive me, for i have sinned very, very heavily
            }
            // if postUrl exists
            if (typeof c.postUrl !== 'undefined' && c.postUrl) {
                if ("image" in arr && arr['image'].length < 1) throw "couldn't find an image to use, you need to directly upload an image. (after doing so I can use that and any previous images posted in the chat)";
                // TODO: move this to seperate module
                request.post({
                    followAllRedirects: true,
                    url: c.postUrl,
                    timeout: 15000,
                    formData: arr
                }, function optionalCallback(err, response, body) {
                    var errors = /error">(.*?)<\//g.exec(body); // regex to get errors from the website we post to
                    if (typeof errors !== 'undefined' && errors) {
                        return report(errors, msg, `something went wrong while making your image, \`${errors[1]}\``);
                    } else {
                        var results = /src="([^"]+)"/g.exec(body); // regex to get the very first image tag
                        msg.channel.send({ files: [results[1]] })
                            .catch(e => { report(e, msg, `Something went wrong while sending your image.`)}); // send message
                    }
                }).then(msg.channel.stopTyping(true)).catch(e => { report(e, msg, `Something went wrong while making your image.`)});
            }
            // if morphFile (imagemagick) exists
            else if (typeof c.morphFile !== 'undefined' && c.morphFile) {
                // no image found
                if (typeof image === 'undefined' || !image) throw "couldn't find an image to use, you need to directly upload an image. (i can use that and any previous images without requiring an upload after)";
                // TODO: move this to seperate module
                const tempName = crypto.randomBytes(4).toString('hex');
                fs.open(`./${config.temp}/${tempName}.jpg`, 'w', function (err, file) {
                    if (err) return report(err, msg, `something went wrong while making your image.`);
                    fs.closeSync(file);

                    gm(`${image}[0]`)
                        .morph(c.morphFile, `./${config.temp}/${tempName}.jpg`)
                        .compress("JPEG")
                        .write(`./${config.temp}/${tempName}.jpg`, function (err) {
                            // if (err) return report(err, msg, `Something went wrong while making your image.`);
                            msg.channel.send({ files: [`./${config.temp}/${tempName}-1.jpg`] })
                                .then(s => {
                                    helpers.cleanImages(tempName);
                                    msg.channel.stopTyping(true);
                                })
                                .catch(e => {
                                    report(e, msg, `something went wrong while sending your image. it is very likely that I lost the file stream, I am hosted on a cheap node after all.`);
                                    if (!fs.existsSync(`./${config.temp}`)) fs.mkdirSync(`./${config.temp}`);
                                });
                        });
                }); // need to do this or else imagemagick will cause an error
            }
        } catch(err) {
            report(err, msg);
        } finally {
            helpers.usedCommand = helpers.startCooldown(msg.author.id); // add to cooldown set
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
