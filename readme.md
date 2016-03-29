# Project Setup
## SystemJS and TypeScript
The main goal is to allow SystemJS to import all javascript files and bootstrap our app without changing the config file when adding or removing files from our project. This also means minimizing the need to reference project files inside `index.html`.

Our `index.html` will have a reference to the following files:

```javascript

//shims and polyfills
node_modules/es6-shim/es6-shim.min.js
node_modules/systemjs/dist/system-polyfills.js
node_modules/angular2/es6/dev/src/testing/shims_for_IE.js
node_modules/angular2/bundles/angular2-polyfills.js

//SystemJS script and config file
node_modules/systemjs/dist/system.src.js
./system.config.js
```

In order to do that in an Angular2/TypeScript project we first tell `tsc` to compile using the `system` module mechanism instead of `commonjs`. This will convert any `import {Something} from 'some_module'` to a `System.register` call which will be picked up and handled by SystemJS.

The next thing we need to do is define our app package inside SystemJS config file.

```
packages: {
    app: {
        format: 'register',
        main: 'bootstrap.js'
    }
},
```

We tell SystemJS to use the `register` format to comply with our `tsconfig.json` module mechanism. We also point it to the file in charge of bootstrapping our angular app.

### Vendor Dependencies
SystemJS requires specific instructions regarding the location of our vendor dependencies such as Angular, Rx, lodash, etc. When SystemJS encounters an `import` statement it'll try to get it from the root path unless told otherwise. `import {X} from 'x'` will generate the following http call: `http://<path_and_port>/x.js`. We actually need SystemJS to call `http://<path_and_port>/node_modules/x/x.js`. To do this we add a `map` definition to `system.config.js`:

```
 map: {
    'angular2': 'node_modules/angular2',
    'lodash': 'node_modules/lodash/lodash.js',
    'rxjs': 'node_modules/rxjs'
},
```

This may seem redundant but we have to do this for every vendor dependency we add.

### Complex Vendor Dependencies
Some third-party dependencies may have more complex loading requirements, which requires additional SystemJS configuration. This may include any of the following issues:
1. The dependency is not an NPM module, so a require `import` won't work
2. The dependency comprises a number of files, some of which may not be imported by our code
3. There may be a mismatch between the TypeScript definition file(s) and the actual file name(s)

#### Wijmo Example
For example, Wijmo has a few files that need to be loaded, some that are never imported by the application. There is a main Angular2-ready file - `wijmo.angular2.min.js` and its core library files. The Angular2 file has been pre-compiled using `System.register` and can be easily referenced into our project. However, Wijmo's core library files aren't and we need tell SystemJS to load them as globals.

In our code we will reference Wijmo's components using

```javascript
// Import something specific:
import { something } from 'wijmo.angular2.all';

// Dummy import to force SystemJS to load Wijmo:
import * as __dummy from 'wijmo/wijmo.angular2.all';
```

In order to configure SystemJS correctly, we need to set a number of properties:

```javascript
paths: {
    'wijmo/*': 'node_modules/wijmo/scripts/vendor/*.min.js'
},
map: {
    ...
    'wijmo/wijmo.angular2.all': 'wijmo/wijmo.angular2',
    ...
},
meta: {
    ...
    'wijmo/wijmo.angular2.all': {
        deps: [
            'wijmo/wijmo',
            'wijmo/wijmo.input',
            'wijmo/wijmo.grid',
            'wijmo/wijmo.chart',
            'wijmo/wijmo.gauge'
        ]
    },
    ...
}
```

First, we tell SystemJS that any path that starts with `wijmo/` should be redirected to the path `node_modules/wijmo/scripts/vendor/` folder, which is actually similar to the `maps` property, except that can also provide a wildcard placeholder for the actual file name.

Next, we map the `wijmo/wijmo.angular2.all` import to the `wijmo/wijmo.angular2` path, which because of the `path` property from earlier, is actually mapped to the path `node_modules/wijmo/scripts/vendor/wijmo.angular2.min.js`. The reason in this case that we map `wijmo/wijmo.angular2.all`, is because in the case of Wijmo, the name of the root TypeScript definition file for the Wijmo library is `wijmo.angular2.all.d.td`.

The last thing we do is tell SystemJS that `wijmo.angular2.all` depends on other files, by adding the `deps` property under `meta`. This way, when SystemJS loads the `wijmo/wijmo.angular.all` import, it will automatically load all these files as well. Once again, each of these paths are resolved using the `path` configuration from earlier.

### Typings
We have to tell `tsc` where to find all the definitions of 3rd party vendors and our beloved Wijmo scripts. We do this using a `typings.json` file. It's important to note that we add every single Wijmo typings reference for now since their code doesn't reference the `d.ts` files properly.

### Build and Run
Now that everything is set up we can run `tsc` and launch our app. Everything should work.

## Testing with Karma
When setting up Karma for testing, one would usually add all the sources needed to the `files` definitions in the `karma.conf.js` file. However, we would like SystemJS to handle this for us so we can avoid modifying the configuration file every time files are added or removed. We tell karma to load the necessary shims and polyfills and the SystemJS script:

```javascript
files: [     
    'node_modules/es6-module-loader/dist/es6-module-loader.js',
    'node_modules/systemjs/dist/system.src.js',
    'node_modules/angular2/bundles/angular2-polyfills.js',
    ...
]
```

The next step is to tell Karma to serve all required app files and vendor dependencies. We do that using the `pattern` syntax inside the `files` definition:

```javascript
    { pattern: 'node_modules/systemjs/dist/system-polyfills.js', included: false, watched: false }, // PhantomJS2 (and possibly others) might require it
    { pattern: 'node_modules/angular2/**/_.js', included: false, watched: false },
    { pattern: 'node_modules/rxjs/**/_.js', included: false, watched: false },
    { pattern: 'node_modules/wijmo/**/*.js', included: false, watched: false },
    { pattern: 'app/**/*.js', included: false, watched: true },
    { pattern: 'app/**/*_spec.js', included: false, watched: true },
```

Notice the `included: false` flag. This flag tells Karma to serve these files from the http server but not to include them with `<script>` tags.

The last two files we tell Karma to load are the `system.config.js` and a file called `test-main.js`.

### test-main.js
This file overrides the `karma.loaded` function in order to modify the way karma starts. It loads all of Angular2 test dependencies and after that's done, it bootstraps our testing environment.

There are three things we need to know here:
1. Each spec file will have a `_spec` postfix.
2. Each spec file will have a single entry point through a `main` function.
3. This function will be called by the `test-main.js` file.

### npm
We need to add the appropriate instructions to our `package.json` file. First, we tell it to run `tsc` and then we run `karma start --single-run`. The `single-run` flag tells it to override the `singleRun: false` in the configuration file and exit after a single run with the proper exit code.

## Protractor and E2E
We add an `e2e` folder to our project. This folder will contain all e2e tests. Protractor works using a WebDriver browser driver and WebDriver works against a selenium server. See `package.json` for all the dependencies it requires.

Before we can run tests we need to make sure we have a running app to test against. Since our app is made of static files only this is fairly simple. We use node and express to spin up a local http server and serve our files. Our `protractor.config.js` will start with the following lines:

```javascript
var express = require('express');
var app = express();
var port = '3000';
var server;
```

Then, we use two callback definitions - `beforeLaunch` and `afterLaunch`. `beforeLaunch` is called after the configurations have been read but before any environment setup. `afterLaunch` is called after all tests are done and the WebDriver instance has been shut down.

```javascript
    beforeLaunch: function() {     
        app.use(express.static('./'));     
        server = app.listen(port);
    },
    afterLaunch: function() {     
        server.close();
    }
```

The rest of the `protractor.config.js` definitions are pretty straight forward:

```javascript
    framework: 'jasmine2',             // for angular2
    directConnect: true,               // to connect directly to the web driver
    baseUrl: 'http://localhost:'+port, // url of our app as defined in the beforeLaunch callback
    specs: ['./e2e/*_spec.js'],        // our spec files
    multiCapabilities: [{         
        browserName: 'chrome'          // we're launching chrome
    }],
    useAllAngular2AppRoots: true,      // need to wait for angular to finish loading
```

### E2E TypeScript configuration
We write our e2e tests in TypeScript. The problem here is our environment has changed. We are now running in the server since protractor is a node app and all of our specs are loaded as modules in node using `require` and not with SystemJS. We need to tell `tsc` to compile our `e2e` folder using `commonjs` instead of `system`. We do that by excluding `e2e` from our main `tsconfig.json` and by adding another `tsconfig.json` inside the `e2e` folder. This `tsconfig.json` file specifies `"module": "commonjs"` in its `compilerOptions`. We will tell `npm` to run `tsc` on this folder before executing the tests. In order for it to work we need a reference to the typings from the folder above. So we add a `_typings.d.ts` file to the e2e folder. This file contains a single line, `/// <reference path="../typings/browser.d.ts" />`, referencing our typings definitions.

### npm
We add the appropriate instructions to our `package.json` file. It'll first run `tsc -p e2e`. Then `webdriver-manager update` to update it under the `npm` context. And finally call `protractor protractor.config.js`.
