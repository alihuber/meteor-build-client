// MODULES
const fs = require('fs');
const path = require('path');
const _ = require('underscore');
const spinner = require('simple-spinner');
const exec = require('child_process').exec;

// execute shell scripts
const execute = function (config, command, name, complete) {
  const completeFunc = typeof complete === 'function' ? complete : function () {};

  if (config.feedback) spinner.start();

  exec(
    command,
    {
      cwd: config.input,
    },
    function (err, res) {
      if (config.feedback) spinner.stop();

      // process error
      if (err) {
        if (config.feedback) console.log(err.message);
        completeFunc(err);
      } else {
        completeFunc();
      }
    }
  );
};

var deleteFolderRecursive = function (path) {
  let files = [];
  if (fs.existsSync(path)) {
    files = fs.readdirSync(path);
    files.forEach(function (file, index) {
      const curPath = path + '/' + file;
      if (fs.lstatSync(curPath).isDirectory()) {
        // recurse
        deleteFolderRecursive(curPath);
      } else {
        // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(path);
  }
};

module.exports = {
  build(config, callback) {
    // remove the bundle folder
    deleteFolderRecursive(config.output);

    let command = 'meteor build ' + config.output + ' --directory';

    if (config.url) command += ' --server ' + config.url;

    // if(config.settings)
    //     command += ' --mobile-settings '+ config.settings;

    // console.log('Running: '+ command);

    execute(config, command, 'build the app, are you in your meteor apps folder?', callback);
  },
  move(config, callback) {
    try {
      _.each(['/bundle/programs/web.browser', '/bundle/programs/web.browser/app'], function (givenPath) {
        const clientPath = path.join(config.output, givenPath);
        if (!fs.existsSync(clientPath)) return;
        let rootFolder = fs.readdirSync(clientPath);
        rootFolder = _.without(rootFolder, 'app');

        rootFolder.forEach(function (file) {
          const curSource = path.join(clientPath, file);

          fs.renameSync(path.join(clientPath, file), path.join(config.output, file));
        });
      });
    } catch (e) {}

    callback();
  },
  addIndexFile(config, callback) {
    const starJson = require(path.resolve(config.output) + '/bundle/star.json');
    let settingsJson;
    if (!config.settings) {
      settingsJson = {};
    } else if (_.isString(config.settings)) {
      settingsJson = require(path.resolve(config.settings));
    } else {
      settingsJson = _.clone(config.settings);
    }

    let content = fs.readFileSync(config.template || path.resolve(__dirname, 'index.html'), { encoding: 'utf-8' });
    let head;
    try {
      head = fs.readFileSync(path.join(config.output, 'head.html'), { encoding: 'utf-8' });
    } catch (e) {
      head = '';
      if (config.feedback) console.log('No <head> found in Meteor app...');
    }
    // ADD HEAD
    content = content.replace(/{{ *> *head *}}/, head);

    // get the css and js files
    const files = { css: [] };
    _.each(fs.readdirSync(config.output), function (file) {
      if (/^[a-z0-9]{40}\.css$/.test(file)) files.css.push(file);
      if (/^[a-z0-9]{40}\.js$/.test(file)) files.js = file;
    });

    // MAKE PATHS ABSOLUTE
    if (_.isString(config.path)) {
      // fix paths in the CSS file
      _.each(files.css, function (file, i) {
        let cssFile = fs.readFileSync(path.join(config.output, file), { encoding: 'utf-8' });
        cssFile = cssFile.replace(/url\(\'\//g, "url('" + config.path).replace(/url\(\//g, 'url(' + config.path);
        fs.unlinkSync(path.join(config.output, file));
        fs.writeFileSync(path.join(config.output, file), cssFile, { encoding: 'utf-8' });

        files.css[i] = config.path + file;
      });
      files.js = config.path + files.js;
    }

    // ADD CSS
    let css = '';
    _.each(files.css, function (file) {
      css += '<link rel="stylesheet" type="text/css" class="__meteor-css__" href="' + file + '?meteor_css_resource=true">';
    });
    content = content.replace(/{{ *> *css *}}/, css);

    // ADD the SCRIPT files
    let scripts = '__meteor_runtime_config__' + '\n' + '        <script type="text/javascript" src="' + files.js + '"></script>' + '\n';

    // add the meteor runtime config
    settings = {
      meteorRelease: starJson.meteorRelease,
      ROOT_URL_PATH_PREFIX: '',
      meteorEnv: { NODE_ENV: 'production' },
      DDP_DEFAULT_CONNECTION_URL: config.url || '', // will reload infinite if Meteor.disconnect is not called
      // 'appId': process.env.APP_ID || null,
      // 'autoupdateVersion': null, // "ecf7fcc2e3d4696ea099fdd287dfa56068a692ec"
      // 'autoupdateVersionRefreshable': null, // "c5600e68d4f2f5b920340f777e3bfc4297127d6e"
      // 'autoupdateVersionCordova': null
    };
    // on url = "default", we dont set the ROOT_URL, so Meteor chooses the app serving url for its DDP connection
    if (config.url !== 'default') settings.ROOT_URL = config.url || '';

    if (settingsJson.public) settings.PUBLIC_SETTINGS = settingsJson.public;

    scripts = scripts.replace(
      '__meteor_runtime_config__',
      '<script type="text/javascript">__meteor_runtime_config__ = Object.assign({autoupdate:{versions:{}}}, JSON.parse(decodeURIComponent("'
        + encodeURIComponent(JSON.stringify(settings))
        + '")));</script>'
    );

    // add Meteor.disconnect() when no server is given
    if (!config.url) scripts += '        <script type="text/javascript">Meteor.disconnect();</script>';

    content = content.replace(/{{ *> *scripts *}}/, scripts);

    // write the index.html
    fs.writeFile(path.join(config.output, 'index.html'), content, callback);
  },
  cleanUp(config, callback) {
    // remove files
    deleteFolderRecursive(path.join(config.output, 'bundle'));
    fs.unlinkSync(path.join(config.output, 'program.json'));
    try {
      fs.unlinkSync(path.join(config.output, 'head.html'));
    } catch (e) {
      if (config.feedback) console.log("Didn't unlink head.html; doesn't exist.");
    }
    callback();
  },
};
