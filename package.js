
Package.describe({
    name: "jarnoleconte:build-client",
    summary: "Meteor build client-only.",
    version: "0.5.0",
    git: "https://github.com/jarnoleconte/meteor-build-client",
});


Package.onUse(function (api) {
    api.versionsFrom('1.3');
    api.use('ecmascript');
    api.mainModule('export.js');
});


Npm.depends({
  'meteor-build-client-only': '0.5.0',
});