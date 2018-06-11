const Discord = require('discord.js');
const client = new Discord.Client();

var env = process.env;

client.login( env.TOKEN );

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});
