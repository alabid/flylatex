/**
 * Module dependencies.
 * app.js -
 * entry to express app.
 *
 */

var express = require('express')
, app = module.exports = express.createServer()
, sharejs = require('share').server
, routes = require('./routes') 
, MongoStore = require('connect-mongo')(express)
, configs = require('./configs');



// Global server Configuration
app.configure(function(){
    app.set('views', __dirname + '/views');
    app.set('view engine', 'ejs');
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(express.cookieParser());
    app.use(express.session({
        secret: "788e6139b25d14de5eecc7fc14bd65529218e8cc",
        store: new MongoStore({
            db: "user-auth"
        })
    }));
    app.use(app.router);
    app.use(express.static(__dirname + '/public'));
}).dynamicHelpers({
    info: function(req, res) {
        return req.flash('info');
    },
    error: function(req, res) {
        return req.flash('error');
    }
});

app.configure('development', function(){
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
    app.use(express.errorHandler());
});


// ========= ShareJS configuration ============
// attach the sharejs REST and socket.io interfaces to the server
var sharejsOptions = {db: {type: 'none'}};

sharejs.attach(app, sharejsOptions);


/**
 * Routes
 */
app.post('/', routes.preIndex, routes.index); 
app.get('/', routes.preIndex, routes.index);
app.del('/', routes.logOutUser, routes.index);

// for signing up on site
app.get('/signup', routes.displaySignUpForm);
app.post('/signup', routes.processSignUpData);

// for creating a new document
app.put('/createdoc', routes.createDoc);

// for deleting a document
app.del('/deletedoc', routes.deleteDoc);

// for sharing access to a document
app.post('/shareaccess', routes.shareAccess);

// for requesting access to a document
app.post('/requestaccess', routes.requestAccess);

// for requesting auto-complete data
app.get('/autocomplete', routes.ajaxAutoComplete); 

// for getting messages for a user
app.get('/showmessages', routes.getMessages);

// for granting access to a document
app.post('/grantaccess', routes.grantAccess);

// for accepting invitation to have access to a document
app.post('/acceptaccess', routes.acceptAccess);

// add a new document to my session
app.post('/adddoctosession', routes.addNewDocument);

// reload the documents in the session of the current user
app.post('/reloadsession', routes.reloadSession);

// delete a message
app.post('/deletemessage', routes.deleteMessage);

// load a document
app.get('/document/:documentId', routes.preIndex, routes.openDocument);

// save the text for a document
app.post('/savedoc', routes.saveDocument);

// compile the latex document
app.post('/compiledoc', routes.compileDoc);

// for serving pdf's for documents with specific id's
app.get('/servepdf/:documentId', routes.servePDF);


/** end of ROUTES */

// open a port for this server
app.listen((configs.port || process.env.PORT || 3000), function(){
    console.log("Express server listening on port %d in %s mode"
                , app.address().port, app.settings.env);
});
