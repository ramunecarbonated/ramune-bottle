// * db.js: Database magic.

const mysql = require('mysql');

module.exports =
{
  connection: mysql.createPool({
    connectionLimit: 10, // will probably never need so much
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
  }),

  defaultSettings: {
    'All Commands': false,
    'React on Error': false,
    'Reply on Error': true
  },

  guildSettings: [],

  fetchSettingForGuild: function (guildId) {
    this.guildSettings[guildId] = this.defaultSettings; // solves possible sql errors and allows usage of commands without waiting
    (this.connection).query('SELECT json FROM `settings` WHERE `guild` = ?', [guildId], (error, results) => {
      if (!error) {
        if (typeof results === 'undefined' || typeof v(results) === 'undefined') {
          this.insertGuild(guildId);
          console.log(`No configuration settings found for ${guildId}, making them on the go.`);
        } else {
          const s = v(results);
          this.guildSettings[guildId] = (!s.json || s.json.length == 0) ? this.defaultSettings : JSON.parse(s.json);
          console.log([`Fetched configuration settings for ${guildId}.`, this.guildSettings[guildId]]);
        }
      } else {
        console.error(error);
      }
    });
  },

  getSetting: function (guildId, index) {
    return (typeof this.guildSettings[guildId][index] !== 'undefined') ? this.guildSettings[guildId][index] : this.defaultSettings[index];
  },

  getAllSettings: function (guildId) {
    return (typeof this.guildSettings[guildId] !== 'undefined') ? this.guildSettings[guildId] : this.defaultSettings;
  },

  insertGuild: function (guildId) {
    this.guildSettings[guildId] = this.defaultSettings; // so we dont have to do fetch setting on the typing start event
    (this.connection).query('INSERT INTO `settings` (`guild`, `json`) VALUES (?, ?)', [guildId, JSON.stringify(this.defaultSettings)], error => {
      (error) ? console.error(error) : console.log(`Insert success for ${guildId}.`);
    });
  },

  removeGuild: function (guildId) {
    (this.connection).query('DELETE FROM `settings` WHERE `guild` = ?', [guildId], error => {
      (error) ? console.error(error) : console.log(`Removal success for ${guildId}.`);
    });
  },

  saveSettingForGuild: function (guildId) {
    (this.connection).query('UPDATE `settings` SET json = ? WHERE `guild` = ?', [JSON.stringify(this.guildSettings[guildId]), guildId], (error, results) => {
      if (!error) {
        console.log(`Save for ${guildId} successful.`);
        console.log(this.guildSettings[guildId]);
        return true;
      } else {
        console.error(error);
        return false;
      }
    });
  },

  toggleSetting: function (guildId, index) {
    const current = this.guildSettings[guildId][index];
    const newValue = !current; // assuming bool, since all of the configurations will be bool based
    this.guildSettings[guildId][index] = newValue;
    this.saveSettingForGuild(guildId);
  },

};

// yeah, not sure myself either
const v = function (value, index = 0) {
  return JSON.parse(JSON.stringify(value))[index];
};