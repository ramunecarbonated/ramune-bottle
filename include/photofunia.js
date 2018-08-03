// * photofunia.js: Used for everything related to POST'ing to the photofunia website.

// const config = require('./config');
const helper = require('./helpers');
const request = require('request-promise-native');

module.exports =
{
  doPost: function (command, arr, msg) {
    // start typing
    msg.channel.startTyping();

    const options = {
      followAllRedirects: true,
      formData: arr,
      method: 'POST',
      timeout: 10000,
      url: `https://m.photofunia.com/categories/all_effects/${command.funiaUrl}?server=2`
    };

    request(options)
      .then((body) => {
        let errors = /error">(.*?)<\//g.exec(body);
        if (typeof errors !== 'undefined' && errors) return helper.reportError(errors[1], msg, errors[1].toLowerCase());
        // regex to get the very first image tag
        const results = /src="([^"]+)"/g.exec(body);
        helper.sendImage(msg, results[1]);
      })
      .catch((err) => {
        helper.reportError(err, msg, 'something went wrong while making your image.');
      });
  }
};
