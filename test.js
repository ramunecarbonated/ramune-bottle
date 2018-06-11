const Discord = require('discord.js');
const client = new Discord.Client();
var env = process.env;

var config = require('./config.js');

client.login( env.TOKEN );

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`)
    return 'Discord Login success!\n';
});
