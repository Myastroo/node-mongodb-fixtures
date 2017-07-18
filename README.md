# node-mongodb-fixtures

![](https://img.shields.io/badge/status-stable-green.svg) ![](https://img.shields.io/badge/license-MIT-blue.svg)

Setup and tear down test fixtures with MongoDB.

![](https://github.com/cdimascio/node-mongodb-fixtures/raw/3fd02679f26a21f18d5115626a5759b5866248a9/assets/mongodb-creative-commons.jpeg
)

## Install
```shell
npm install node-mongodb-fixtures
```

### CLI

For CLI use, it can be useful to install globally:

```shell
npm install node-mongodb-fixtures -g
```


## Usage

### Programmatic
```javascript
const Fixtures = require('node-mongodb-fixtures');
const fixtures = new Fixtures(); 

fixtures.connect('mongodb://localhost:27017/mydb').load() // load
```

[See detailed programmatic usage below](#programmatic-usage)

### CLI

```shell
❯ mongo-fixtures.js load -u mongodb://localhost:27017/mydb'
```

[See detailed cli usage below](#cli-usage)

## Create fixtures

#### How

1. Choose a directory for your fixtures e.g. `./fixtures` 
2. Create a number of JSON files.
	- Each JSON filename defines MongoDB collection.
	- Each file must contain a JSON Array of JSON objects. e.g. 

```json
[
  { "name": "Paul", "age", 36 }, 
  { "name": "Phoebe", "age": 26 }
]
```
- Each JSON object is loaded as a document in the collection.

#### Example

```
fixtures/
|-- people.json
|-- places.json
```


## Programmatic Usage
### Init

use the default fixtures directory,`./fixtures`

```javascript
const Fixtures = require('node-mongodb-fixtures');
const fixtures = new Fixtures(); 
```

or specifiy the fixtures directory

```javascript
const Fixtures = require('node-mongodb-fixtures');
const fixtures = new Fixtures({
 dir: 'examples/fixtures' 
}); 
```


### Connect
Use the standard MongoDB [URI connection scheme](https://docs.mongodb.com/manual/reference/connection-string/)

```javascript
fixtures.connect('mongodb://localhost:27017/mydb')
```

### Load

```javascript
fixtures.load()
```  

### Unload

```javascript
fixtures.load()
```  

### Disconnect

```javascript
fixtures.disconnect()
```  

## Example

The following example does the following:
- connects to mongo
- then unloads all fixtures
- then load all fixtures
- then disconnects


```javascript
const Fixtures = require('node-mongodb-fixtures');
const uri = 'mongodb://localhost/mydb'
const options = null;

const fixtures = new Fixtures({
 dir: 'examples/fixtures' 
});

fixtures
  .connect('mongodb://localhost:27017/mydb')
  .unload()
  .then(() => fixtures.load())
  .catch(e => console.error(e))
  .finally(() => fixtures.disconnect());

```

## CLI Usage

```shell
❯ mongo-fixtures.js --help

  Usage: mongo-fixtures [options] [command]


  Options:

    -V, --version         output the version number
    -u --url <url>        mongo connection string
    -s --ssl              use SSL
    -d --db_name <name>   database name
    -n --ssl_novlidate    use SSL with no verification
    -c --ssl_ca <base64>  path to cert
    -p --path <path>      resource path. Default ./fixtures
    -b --verbose          verbose logs
    -h, --help            output usage information


  Commands:

    load
    unload
    rebuild
```

## License
[MIT](https://opensource.org/licenses/MIT)