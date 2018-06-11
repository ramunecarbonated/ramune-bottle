const Discord = require('discord.js');
const client = new Discord.Client();

var env = process.env;
var sasch = "77552496561631232";

client.login( env.TOKEN );

client.on('ready', () => {
    client.users.get(sasch).send('Travis-CI integration success.').catch(console.error);
});
