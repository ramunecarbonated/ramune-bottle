// * imagemagick.js: Used for everything related to the usage of the imagemagick library.

const crypto = require('crypto');
const fs = require('fs');
const gm = require('gm').subClass({imageMagick: true});
const helper = require('./helpers');

module.exports =
{
  doAppend: function (command, image, msg) {
    msg.channel.startTyping();
    const tempName = crypto.randomBytes(4).toString('hex');

    gm(`${image}[0]`)
      .resize(400)
      .append(command.appendBelow)
      .compress('JPEG')
      .quality(70)
      .write(`./${process.env.TEMP_DIR}/${tempName}.jpg`, function (err) {
        if (err) {
          if (!fs.existsSync(`./${process.env.TEMP_DIR}`)) fs.mkdirSync(`./${process.env.TEMP_DIR}`);
          return helper.reportError(err, msg, 'something went wrong while making your image.');
        }
        helper.sendImage(msg, `./${process.env.TEMP_DIR}/${tempName}.jpg`);
        cleanImage(tempName);
      });
  },

  doMorph: function (command, image, msg) {
    msg.channel.startTyping(); // start typing
    const tempName = crypto.randomBytes(4).toString('hex');

    gm(`${image}[0]`)
      .morph(command.morph, `./${process.env.TEMP_DIR}/${tempName}.jpg`)
      .compress('JPEG')
      .quality(70)
      .write(`./${process.env.TEMP_DIR}/${tempName}.jpg`, function (err) {
        if (err) {
          if (!fs.existsSync(`./${process.env.TEMP_DIR}`)) fs.mkdirSync(`./${process.env.TEMP_DIR}`);
          return helper.reportError(err, msg, 'something went wrong while making your image.');
        }
        helper.sendImage(msg, `./${process.env.TEMP_DIR}/${tempName}-1.jpg`);
        cleanImages(tempName);
      });
  },
};

// clean up the temporary directory from the generated imagemagick images
const cleanImage = function (fileName) {
  setTimeout(function () { 
    fs.unlink(`./${process.env.TEMP_DIR}/${fileName}.jpg`, () => {});
  }, 2000);
};
const cleanImages = function (fileName) {
  setTimeout(function () { 
    fs.unlink(`./${process.env.TEMP_DIR}/${fileName}.jpg`, () => {});
    fs.unlink(`./${process.env.TEMP_DIR}/${fileName}-0.jpg`, () => {});
    fs.unlink(`./${process.env.TEMP_DIR}/${fileName}-1.jpg`, () => {});
    fs.unlink(`./${process.env.TEMP_DIR}/${fileName}-2.jpg`, () => {});
  }, 2000);
};