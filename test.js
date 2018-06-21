const Discord = require('discord.js');
const client = new Discord.Client();
var env = process.env;
// TODO

client.login( env.TOKEN )
    .then(client => console.log(`Logged in as ${client.user.tag}`))
    .catch(console.error);

process.exit(0);
