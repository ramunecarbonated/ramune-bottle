const config = require('./config')
    , fs = require('fs')
    , usedCommand = new Set();

module.exports =
{
    usedCommand: usedCommand,

    // clean up the temporary directory
    cleanTemp: function () {
        fs.readdir(config.temp, (err, files) => {
            if (err) report(err);
            for (const file of files) {
                fs.unlink(path.join(config.temp, file), err => {
                    if (err) throw err;
                });
            }
        });
    },

    // clean up the temporary directory
    cleanImages: function (fileName) {
        fs.unlink(`./${config.temp}/${fileName}.jpg`, silent => {});
        fs.unlink(`./${config.temp}/${fileName}-0.jpg`, silent => {});
        fs.unlink(`./${config.temp}/${fileName}-1.jpg`, silent => {});
        fs.unlink(`./${config.temp}/${fileName}-2.jpg`, silent => {});
    },

    hasCooldown: function(id) {
        return usedCommand.has(id);
    },

    // is author id in the message equal to the owner's id as in config.js
    isOwner: function(msg) {
        return msg.author.id == config.sasch;
    },

    // generate random integer
    getRandomInt: function (minimum, maximum) {
        return Math.round( Math.random() * (maximum - minimum) + minimum);
    },

    parseLine: function (msg, commandData, commandName) {
        let param = msg.content.replace(`${config.prefix}${commandName}`, "").trim()
            , min = (commandData.minLength || 2)
            , max = ((commandData.maxLength || 30) * (commandData.maxArgs || 2))
            , filteredParam = (commandData.filter) ? param.replace(/[^\w\s]/gi, '') : param
            , length = filteredParam.length;
        if (length < min || length > max) throw `please give me at least ${min} letter(s) and a maximum of ${max} letters.`;
        return filteredParam;
    },

    parseParams: function (msg, commandData, commandName) {
        let param = msg.content.replace(`${config.prefix}${commandName}`, "").trim()
            , min = (commandData.minArgs || 1)
            , max = (commandData.maxArgs || 32);
        if (param.length < 2) throw `please give me at least ${min} letter(s) and a maximum of ${max} letters.`;
        let params = param.split('|')
            , count = params.length;
        if (count < min || count > max) throw `please give me at least ${min} argument(s) and a maximum of ${max} arguments.`;
        return (count <= 1) ? [ null ] : params.map(s => { (commandData.filter) ? s.replace(/[^\w\s]/gi, '').trim() : s.trim() });
    },

    // adds the user to the set so that they can't use commands
    startCooldown: function(id) {
        usedCommand.add(id);
        setTimeout(() => { usedCommand.delete(id); }, config.cooldown * 1000);
    }

};

// Private variables and functions which will not be accessible outside this file
var privateFunction = function ()
{
};
