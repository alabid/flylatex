/**
 * Module dependencies.
 * app.js -
 * entry to express app.
 *
 */

var express = require('express') , 
routes = require('./routes') ,
MongoStore = require('connect-mongo')(express);

var app = module.exports = express.createServer();


// Configuration
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

/** end of ROUTES */


// open a port for this server
app.listen((process.env.PORT || 3000), function(){
    console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
});
