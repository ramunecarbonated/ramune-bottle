const Discord = require('discord.js');
const client = new Discord.Client();
var env = process.env;

var config = require('./config.js');

client.login( env.TOKEN )
    .then(console.log(client => `Logged in as ${client.user.tag}`))
    .catch(console.error);

console.log(`Done`);
