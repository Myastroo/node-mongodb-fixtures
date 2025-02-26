/**
 * Copyright Carmine DiMascio
 * License: MIT
 */
const assert = require('assert');
const Promise = require('bluebird');
const Db = require('./db');
const fs = require('fs');
const path = require('path');

const readdir = Promise.promisify(fs.readdir);
const readFile = Promise.promisify(fs.readFile);

module.exports = Fixtures;

function log(mute, ...msg) {
  if (!mute) console.log(...msg);
}

function Fixtures(options) {
  options = options || {};
  this._mute = options.mute || false;
  this._dir = options.dir || 'fixtures';
  this._match = options.filter ? new RegExp(options.filter) : null;
  log(this._mute, '[info ] Using fixtures directory: ' + this._dir);
  if (this._match === null) log(this._mute, '[info ] No filtering in use');
  this._scripts = [];
  this._mongoClient;

  this._filterFiles = file => {
    if (this._match === null) return true;
    const matched = this._match.test(file);
    // prettier-ignore
    log(this._mute, '[info ] Filter "' + this._match.source + '" ' + (matched ? 'matches' : 'excludes') + ' fixture: ' + file );
    return matched;
  };
}

Fixtures.prototype.connect = function(uri, options, dbName) {
  assert(uri, 'uri required');

  this._mongoClient = new Db(uri, options);
  return this._mongoClient.connect(dbName).then(db => {
    this._db = db;
    log(this._mute, '[info ] Using database', db.databaseName);
    return this;
  });
};

Fixtures.prototype.load = function() {
  assert(this._db, 'must call connect');

  const bulkInsertDocuments = bulkImportDocuments(this._db, this._mute);
  return readdir(this._dir)
    .then(files => {
      const promises = files.filter(this._filterFiles).map(file => {
        const parse = path.parse(file);
        const ext = parse.ext.toLowerCase();
        const collectionName = parse.name;

        if (!isSupportedExt(ext)) {
          return null;
        } else if (isScript(collectionName, ext)) {
          const filePath = path.join(this._dir, file);
          return this._scripts.push(filePath);
        } else {
          return readCollectionFromJsJson(path.join(this._dir, file))
            .tap(() => log(this._mute, '[start] load', collectionName))
            .then(bulkInsertDocuments(collectionName, file));
        }
      });
      return Promise.all(promises).tap(() =>
        log(this._mute, '[done ] *load all')
      );
    })
    .then(() => runScripts(this._db, this._scripts, this._mute))
    .then(() => this);
};

Fixtures.prototype.unload = function() {
  assert(this._db, 'must call connect');

  return readdir(this._dir).then(files => {
    const promises = files.filter(this._filterFiles).map(file => {
      const parse = path.parse(file);
      const collectionName = parse.name;
      const ext = parse.ext;

      if (!isSupportedExt(ext) || isScript(collectionName, ext)) {
        return null;
      }

      const dropCollection = this._db
        .collection(collectionName)
        .deleteMany()
        .tap(() => log(this._mute, '[done ] unload', collectionName))
        .catch(e => {
          if (e.code !== 26) throw e;
        })
        .tapCatch(e =>
          log(this._mute, '[error] unload', collectionName, e.message)
        );
      return dropCollection;
    });
    return Promise.all(promises)
      .tap(() => log(this._mute, '[done ] *unload all'))
      .then(() => this);
  });
};

Fixtures.prototype.disconnect = function() {
  if (this._mongoClient) {
    return this._mongoClient.close();
  }
  return Promise.resolve();
};

function runScripts(db, scripts, mute) {
  const promises = scripts.map(script => {
    const parse = path.parse(script);
    const name = parse.name;
    const base = parse.base;
    const collectionName = name.substring(0, name.length - 1);
    return Promise.resolve(db.collection(collectionName)).then(collection => {
      log(mute, '[start] script', base);
      if (!path.isAbsolute(script)) {
        script = path.join(process.cwd(), script);
      }
      const r = require(script)(collection);
      if (!r || !r.then) {
        return Promise.reject('[error] script', base, 'must return a promise');
      }
      return r.tap(() => log(mute, '[done ] script', base));
    });
  });
  return Promise.all(promises).tap(() => log(mute, '[done ] *script all'));
}

function readCollectionFromJsJson(file) {
  const parse = path.parse(file);
  const collectionName = parse.name;
  const fileExt = parse.ext.toLowerCase();
  // TODO use streams
  if (['.js', '.ts'].indexOf(fileExt) > -1 && fileExt.length === 3) {
    if (!path.isAbsolute(file)) {
      file = path.join(process.cwd(), file);
    }
    const docs = require(file);
    return Promise.resolve(docs);
  } else if (fileExt === '.json') {
    return readFile(file).then(contents => {
      try {
        return JSON.parse(contents);
      } catch (e) {
        throw new Error(
          '[error] ' + collectionName + ' in ' + file + ': ' + e.message
        );
      }
    });
  }
}

function isSupportedExt(ext) {
  return ['.json', '.ts', '.js'].indexOf(ext) > -1;
}

function isScript(name, ext) {
  return name.endsWith('_') && ['.ts', '.js'].indexOf(ext) > -1;
}

function bulkImportDocuments(db, mute) {
  return (collectionName, file) => docs => {
    if (!Array.isArray(docs)) {
      // prettier-ignore
      throw new Error( '[error] no docs returned from file: "' + file +
          '". verify that a docs array was exported. note: if using .js files, use "module.exports", instead of "exports".'
      );
    }
    return Promise.resolve(db.collection(collectionName)).then(collection => {
      const batch = collection.initializeUnorderedBulkOp();
      docs.forEach(doc => batch.insert(doc));
      if (batch.length === 0) {
        return {
          ok: true,
          message: '[done ] ' + collectionName + ' load not required',
        };
      }
      return batch
        .execute()
        .tap(() => log(mute, '[done ] load', collectionName))
        .tapCatch(e => console.error('[error]', collectionName, e.message));
    });
  };
}
