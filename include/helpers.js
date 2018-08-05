// * helpers.js: Misc. helper commands.

let client = null; // we transfer the client to helper
const commands = require('./commands.json');
const db = require('./dbconfig');
const Discord = require('discord.js'); // Discord library
const lastAttachmentUrl = []; // saves the last attachment's url per text channel id
const usedCommand = new Set(); // manages cooldown

module.exports =
{
  usedCommand: usedCommand,

  // is the user in the cooldown set?
  cooldownGet: function(clientId) {
    return usedCommand.has(clientId);
  },

  // adds the user to the set so that they can't use commands
  cooldownSet: function (clientId, cooldownInSeconds = process.env.COOLDOWN) {
    usedCommand.add(clientId);
    setTimeout(() => { usedCommand.delete(clientId); }, cooldownInSeconds * 1000);
  },

  // quick way to make an embed with the correct color set
  embed: function() {
    return new Discord.RichEmbed().setColor([64, 86, 178]);
  }, 

  // generate random integer
  getRandomInt: function (minimum, maximum) {
    return Math.round(Math.random() * (maximum - minimum) + minimum);
  },

  // make helper embed and send it
  makeHelpEmbed: function (msg) {
    // sort commands alphabetically
    const cmds = Object.keys(commands).sort((a, b) => a.localeCompare(b));
    let output = [];

    // for every command..
    for (let i in cmds) {
      // determine index number, an embed field has a limit of 256 for title and 1024 for contents
      const theIndex = Math.floor((Number(i) + 1) / 30 + 1); // max 30 cmds, prevent division by 0 error
      if (typeof output[theIndex] === 'undefined') output[theIndex] = '';
      output[theIndex] += `'${cmds[i]}' ${commands[cmds[i]]['usage']}\n`;
    }

    // construct the embed
    const embed = this.embed()
      .setAuthor('A bot made by sasch#0001')
      .addField('Parameters',
        'Use `|` to seperate parameters, parameters in `<>` means they are optional.')
      .addField('Using and remembering images',
        `The bot remembers the last image/attachment that was posted in a text channel, you can use \`${process.env.PREFIX}lastimage\` to retrieve the image from a text channel the bot has remembered.`)
      .addField('"Image Upload/Face Required" explained',
        'This means that the commands needs a previously posted image (by sending no image) or an attachment when calling the command, if it cannot find a previous image and no attachment is posted either then the action will fail, stating it needs an image.')
      .addField('Configuration',
        `This bot can be configured, type \`${process.env.PREFIX}config\` to see all configurable settings and \`${process.env.PREFIX}config [full name]\` to toggle on or off.`)
      .addField('Support / Suggestion / Testing Server',
        'If you got any questions, suggestions or want to test around a little bit with the bot then feel free to join it\'s Discord server located @ https://discord.gg/trhhTxD')
      .addField('Invite Link',
        'Use this link to invite the bot to your server @ https://discordapp.com/oauth2/authorize?client_id=328968948894662666&scope=bot&permissions=117824');
    // add all the commands into the embed
    for (let j in output) embed.addField(`Commands (part ${Number(j)})`, '```prolog\n' + output[j] + '```', true);

    // send the embed through PM or in the channel if PMs are off
    msg.author.send({ embed }).catch(() => msg.reply({ embed }).catch(() => { }));
  },

  // does id equal OWNER_ID?
  isOwner: function(userId) {
    return userId == process.env.OWNER_ID;
  },

  // get the last image posted from a channel
  lastImageGet: function (channelId) {
    return (typeof lastAttachmentUrl[channelId] !== 'undefined') ? lastAttachmentUrl[channelId] : null;
  },

  // fetch and set the last image posted from a channel
  lastImageSet: function (msg) {
    // get the first image url from a message
    let url = /https?:\/\/.*\.(?:png|jpg|gif|jpeg)/g.exec(msg.content);
    if (url && url[0]) {
      lastAttachmentUrl[msg.channel.id] = url[0];
    }
    // get direct attachment
    else if (typeof msg.attachments.first() !== 'undefined' && msg.attachments.first()) {
      lastAttachmentUrl[msg.channel.id] = msg.attachments.first().url;
    }
  },

  // parse a whole text with optional \w\s regex filter
  parseLine: function (messageString, commandData) {
    let param = messageString.trim();
    let min = (commandData.minLength || 2);
    let max = ((commandData.maxLength || 20) * (commandData.maxArgs || 1));
    if (param.length < min || param.length > max) throw `this command requires at least ${min} letter(s) and only allows for a maximum of ${max} letters input from the user.`;
    return (commandData.filter) ? param.replace(/[^\w\s]/gi, '') : param;
  },

  // parse parameters
  parseParams: function (messageString, commandData) {
    let param = messageString.trim();
    let min = (commandData.minArgs || 1);
    let max = (commandData.maxArgs || 32);
    if (param.length == 0) throw 'this command requires text input from the user.';
    let params = param.split('|');
    if (params.length < min || params.length > max) throw `this command requires a minimum of ${min} argument(s) and a maximum of ${max} arguments from the user.`;
    return (params.length <= 1) ? [ null ] : params.map(s => { return (commandData.filter) ? s.replace(/[^\w\s]/gi, '').trim() : s.trim(); });
  },

  // shortcode to log errors, handling errors and show a 'friendly' error message
  reportError: function(err, msg = null, friendlyMessage = null) {
    console.error('reportError triggered:', err);
    if (msg != null) {
      // reply on error (true by default)
      if (db.getSetting(msg.guild.id, 'Reply on Error') == true) {
        msg.reply(friendlyMessage || err).catch(() => { });
      }
      // react on error (true by default)
      if (db.getSetting(msg.guild.id, 'React on Error') == true) {
        const react = client.emojis.get('474862388999487489');
        msg.react(react.id || '❌').catch(() => { });
      }
      
      msg.channel.stopTyping(true);
    }
  },

  // haha yes
  sasch: function (activeClient) {
    return activeClient.users.get(process.env.OWNER_ID);
  },

  // short function to send an image file as a message inside an embed, since this is going to be used a lot.
  sendImage: function (msg, path) {
    console.log(`sendImage triggered for ${msg.author.username}#${msg.author.discriminator} in ${msg.guild.name} (${msg.guild.id})`);

    const embed = this.embed()
      .setAuthor(`Requested by ${msg.author.username}#${msg.author.discriminator}`, msg.author.avatarURL)
      .attachFile(path);

    msg.channel.send({ embed })
      .then(() => { msg.channel.stopTyping(true); })
      .catch(error => { this.reportError(error, msg, 'something went wrong while trying to send your image through Discord.'); });
  },

  // carry over
  setClientInHelper: function (botClient) {
    client = botClient;
  }
};