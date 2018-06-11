const Discord = require('discord.js');
const client = new Discord.Client();
var env = process.env;

var config = require('./config.js');

client.login( env.TOKEN );

client.on('ready', () => {
    client.users.get(config.sasch).send('Travis-CI integration success.')
        .then(console.log(`Logged in as ${client.user.tag}!`))
        .catch(console.error);
});
