// * index.js: The heart and soul.

// requires and all that jazz
const config = require('./include/config');
const commands = require('./include/commands.json');
const db = require('./include/dbconfig');
const fs = require('fs');
const helper = require('./include/helpers');
const magick = require('./include/imagemagick');
const funia = require('./include/photofunia');

// discord library
const Discord = require('discord.js'); 
const client = new Discord.Client();

// ready to go!
client.on('ready', () => {
  // make sure temporary folder exists, heroku 'n all
  if (!fs.existsSync(`./${process.env.TEMP_DIR}`)) fs.mkdirSync(`./${process.env.TEMP_DIR}`);

  console.log('connected to discord, hee hoo');
  helper.setClientInHelper(client); // transfer client to helper module
  client.user.setActivity(`${client.guilds.size} servers | ${process.env.PREFIX}helpme`, { type: 'WATCHING' });
});

// the bot joins a guild
client.on('guildCreate', guild => {
  let output = `New guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`;
  helper.sasch(client).send(output);
  console.log(output);
  client.user.setActivity(`${client.guilds.size} servers | ${process.env.PREFIX}helpme`, { type: 'WATCHING' });
  db.insertGuild(guild.id); // add guild to database
});

// the bot is kicked from a guild
client.on('guildDelete', guild => {
  let output = `I have been removed from: ${guild.name} (id: ${guild.id})`;
  helper.sasch(client).send(output);
  console.log(output);
  client.user.setActivity(`${client.guilds.size} servers | ${process.env.PREFIX}helpme`, { type: 'WATCHING' });
  db.removeGuild(guild.id); // remove guild from database
});

// someone starts typing
client.on('typingStart', (channel, user) => {
  if (channel.type == 'text' && typeof db.guildSettings[channel.guild.id] === 'undefined') {
    db.fetchSettingForGuild(channel.guild.id);
    console.log(`${user.username}#${user.discriminator} (${user.id}) triggered setting fetch for ${channel.guild.name} (${channel.guild.id})`);
  }
});

// someone posts a message
client.on('message', msg => {
  // only respond to messages from a guild if not PM'd by bot owner
  if (!helper.isOwner(msg) && !msg.guild) return;

  // log last attachment posted from anything, this also includes stuff from bots
  helper.lastImageSet(msg);

  // don't respond to other bots or don't respond to users who don't use the prefix
  if (msg.author.bot || msg.content.indexOf(process.env.PREFIX) !== 0) return;

  // slice and split up stuff
  const cmd = msg.content.slice(process.env.PREFIX.length).split(' ')[0].toLowerCase();
  const msgString = msg.content.replace(`${process.env.PREFIX}${cmd}`, '').trim();
  
  // help: HELP MEeeeee
  if (cmd === 'helpme') {
    helper.makeHelpEmbed(msg);
  }

  // get last image posted in this channel
  if (cmd === 'lastimage') {
    const image = helper.lastImageGet(msg.channel.id);
    const embed = helper.embed().setImage(image);
    msg.channel.send((image) ? { embed } : 'no image was found or remembered from this channel.').catch(() => { });
  }

  // ping: post initial message and edit it later with delay in ms
  if (cmd === 'ping') {
    const start = Date.now();
    msg.channel.send('pong! _(calculating..)_').then(msg => {
      msg.edit(`pong! (api delay: ${Date.now() - start}ms)`);
    });
  }

  if (cmd === 'config') {
    const embed = helper.embed();
    if (msgString.length < 1) {
      Object.keys(db.getAllSettings(msg.guild.id)).forEach(function (k) {
        embed.addField(k, db.getSetting(msg.guild.id, k));
      });
    } else {
      const setting = db.getSetting(msg.guild.id, msgString);
      if (typeof setting !== 'undefined') {
        embed.addField(msgString, `~~${setting}~~ **${!setting}**`);
        db.toggleSetting(msg.guild.id, msgString); console.log('hi');
      } else {
        embed.addField('Unknown config setting!', `Try \`${process.env.PREFIX}config\` without arguments for a list of configurable settings for this bot.`);
      }
    }

    // add notice that config can be modified if you have the permissions to do so
    if (msg.member.hasPermission('MANAGE_GUILD') || helper.isOwner(msg.author.id)) {
      embed.setFooter(`Toggle a configuration setting by typing \`${process.env.PREFIX}config\` with the full name of the setting, requires \`Manage Server\` or \`Bot Owner\`.`);
    }

    msg.channel.send({ embed }).catch(() => { });
  }

  // owner only
  if (helper.isOwner(msg.author.id)) {
    // say it with me
    if (cmd === 'eval') {
      try {
        let output = eval(msgString);
        output = (typeof output !== 'string') ? require('util').inspect(output) : output;
        // could be promise, could be something useful, but whatever :o
        msg.channel.send(output.substring(0, 1990), { code: 'xl' }).catch(() => { });
      } catch (err) {
        // get only one line of the error, it's enough most of the time
        msg.channel.send(err.toString().split('\n')[0]).catch(() => {});
      }
    }
  }

  // loop through json-loaded commands
  if (typeof commands[cmd] !== 'undefined' && commands[cmd]) {
    const command = commands[cmd];
    try {
      // is command opt-in?
      if (typeof command.optIn !== 'undefined' && db.getSetting(msg.guild.id, 'All Commands') != true) throw `this command requires you to set \`All Commands\` to \`true\` due to the offensive nature of it's usage, users with \`Manage Server\` or \`Bot Owner\` can toggle this setting with \`${process.env.PREFIX}config All Commands\`.`;
      // cooldown protection
      if (helper.cooldownGet(msg.author.id)) throw 'please wait a few seconds between command usage.';

      // parameters
      const image = helper.lastImageGet(msg.channel.id);
      const params = (typeof command.noText === 'undefined' || !command.noText) ? helper.parseParams(msgString, command) : {};
      const param = (typeof command.noText === 'undefined' || !command.noText) ? helper.parseLine(msgString, command) : {};

      // set formData
      let arr = {};
      for (let i in command.data) {
        arr[i] = eval('(' + command.data[i] + ' || \'\')'); // forgive me, for i have sinned very, very heavily
      } console.log([cmd, `${msg.author.username}#${msg.author.discriminator} (${msg.author.id})`, `${msg.guild.name} (${msg.guild.id})`, arr]);

      // image check goes here, if a command uses an image
      if (typeof arr['image'] !== 'undefined' && !arr['image']) {
        throw 'could not find an image to use, you need to directly upload an image in this channel.';
      }
      // if url exists and includes photofunia
      if (typeof command.funiaUrl !== 'undefined') {
        funia.doPost(command, arr, msg);
      }
      // if morph (imagemagick)
      if (typeof command.morph !== 'undefined') {
        magick.doMorph(command, image, msg);
      }
      // if append below (imagemagick)
      if (typeof command.appendBelow !== 'undefined') {
        magick.doAppend(command, image, msg);
      }

    } catch(err) {
      helper.reportError(err, msg);
    } finally {
      helper.usedCommand = helper.cooldownSet(msg.author.id); // add to cooldown set
    }
  }
});

(db.connection).on('error', err => { console.error(err.code); });
client.on('error', console.error);
client.on('warn', console.warn);

client.login( process.env.TOKEN );
