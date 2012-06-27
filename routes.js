/*
 *  Define all routes here for the fly-latex application.
 *  
 */
var mongoose = require("mongoose");

require("./models"); // import the models here

// connect to the flydb app db
mongoose.connect("mongodb://localhost/flydb");

// import the models here
var User = mongoose.model("User")
, Document = mongoose.model("Document")
, DocumentLine = mongoose.model("DocumentLine")
, DocPrivilege = mongoose.model("DocPrivilege");


/*
 * About rendering:
 * the object to pass to the template being rendered has to have:
 * ===== title ======
 * ===== shortTitle ======
 * Optionally can have:
 * * fileSpecificScript
 * * fileSpecificStyle
 * * currentUser
 * * isLoggedIn (should always go together with currentUser)
 * * tagLine
 * * currentDoc
 * * userDocuments 
 * * errors
 * * infos
*/

/*
 * preGetIndex -
 * load currentUser's data before loading page
 * if user's not registered, just go to next
 */
exports.preIndex = function(req, res, next) {
    if ((req.body.username == undefined
	 && req.body.password == undefined) ||
	(req.body.username.length == 0 
	 && req.body.password.length == 0)) {
	// user's chilling, makes no attempt to log in
	next();

	// seperated the two conditions to make things
	// a lil bit clearer

    } else if (req.session.currentUser && req.session.isLoggedIn) {
	// user's already logged in, so go on
	next();
    } else if (req.body.username && req.body.username.length > 0
	       && req.body.password && req.body.password.length > 0) {
	// user's not logged in, but wants to log in
	User.findOne({userName: req.body.username}
		  , function(err, user) {
		      if (err) {
			  console.log("error: ");
			  console.log(err);
			  req.session.currentUser = null;
			  req.session.isLoggedIn = false;
			  next();
			  return;
		      } 
		      // authenticate user against password entered
		      console.log(user);
		      if (!user || typeof user.authenticate != "function") {
			  // is user even in db ? 
			  console.log("I should see this!");
			  req.flash("error", "There's no user called " + req.body.username + " in our database");
			  res.redirect('back');
			  return;
		      } else if (!user.authenticate(req.body.password)) {
			  // user's password incorrect
			  req.flash('error', "Password does not match Username entered");
			  res.redirect('back');
			  return;
		      } else {
			  // user authenticated! Can go in
			  var loadedUser = loadUser(user);
			  for (key in loadedUser) {
			      req.session[key] = loadedUser[key];
			  }
			  
			  next();
		      }
		  });
    } else {
	// user's trying to log in, but didn't enter both username
	// and password
	if (!(req.body.username && req.body.password)) {
	    req.flash('error', "Enter both a username and password");
	    res.redirect('back');
	    return;
	}
	
    }
}

/*
 * index
 * handles both get and post request on the / page
 */
exports.index = function(req, res, err){    
    req.session.currentUser = (req.session.currentUser == undefined ?  "" :
			       req.session.currentUser);

    req.session.isLoggedIn = (req.session.isLoggedIn == undefined ? false :
			      req.session.isLoggedIn);

    req.session.userDocuments = (req.session.userDocuments == undefined ? [] :
				 req.session.userDocuments);

    if (req.session.currentUser && req.session.isLoggedIn) {
	res.render("display-docs",
		   {title: "Fly Latex: Start Editing Documents"
		    , shortTitle: "Fly Latex"
		    , tagLine: "Start Editing Documents with Your Peeps!"
		    , fileSpecificScript: "application.js"
		    , currentUser: req.session.currentUser
		    , isLoggedIn: req.session.isLoggedIn
		    , userDocuments: req.session.userDocuments		    
		   });
    } else {
	// user tried to log in but isn't in db


	// user didn't try to log in 
	res.render("not-logged-in",
		   {title: "Log Into/Sign Into to FLY LATEX!"
		    , shortTitle: "FLY LATEX"
		    , tagLine: "Real Time editor in node-js"
		    , fileSpecificStyle: "not-logged-in.css"});
    }
};

/*
 * logOutUser -
 * log user out
 */
exports.logOutUser = function(req, res, next) {
    if (req.session.currentUser && req.session.isLoggedIn) {
	req.session.regenerate(function(err) {
	    if (err) {
		console.log("sth went wrong");
	    } 
	    next();
	});
    }
};

/*
 * displaySignUpForm ->
 *  displays sign up form for user to sign up for
 *  fly latex
 */
exports.displaySignUpForm = function(req, res) {
    res.render("sign-up",
	       {title: "Sign Up for Fly Latex"
		, shortTitle: "Sign Up"
		, tagLine: "Start Editing Documents with Your Peeps!"
		, fileSpecificStyle: "sign-up.css"
		, fileSpecificScript: "application.js"
	       });
    
};

/*
 * processSignUpData ->
 *  processes the sign up data posted from the sign
 *  up form and logs the user into fly latex
 *  , redirecting him to his home page.
 */
exports.processSignUpData = function(req, res) {
    var errors = {}; // key-value pair -> error Type : error Message
    var isError = false;
    var newUser = req.body.newUser;

    // validate userName: make sure no one else has that username
    if (newUser.userName.length == 0) {
	errors["userNameToken"] = "Enter a username";
    }

    // make sure valid password
    if (!(newUser.password.length > 4 // password has to be at least 5 chars 
	  && /\d+/.test(newUser.password))) { // password has to have at least one digit
	errors["passwordInvalid"] = "Password must be at least 5 chars and must contain at least one digit";
	isError = true;
    }

    // make sure email is valid
    if (!(/^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/.test(newUser.email))) {
	errors["emailInvalid"] = "Enter a valid email address";
	isError = true;
    }

    // make sure names are valid
    if (!(newUser.firstName.length > 0
	  && newUser.lastName.length > 0)) {
	errors["namesInvalid"] = "Enter a first Name and a Last Name";
	isError = true;
    }

    // optional params
    if (newUser.githubId.length == 0) {
	delete newUser["githubId"];
    }
    if (newUser.twitterId.length == 0) {
	delete newUser["twitterId"];
    }
    
    if (!isError) {
	// there's no error. Save the new user
	// only if someone else doesn't have his username
	User.find({userName: newUser.userName}
	      , function(err, users) {
		  if (users.length > 0) {
		      errors["userNameTaken"] = "The username " + newUser.userName + " is already taken";
		      isError = true;

		      displayErrorsForSignUp(res, errors);
		  } else {
		      // save the user
		      var newFlyUser = new User();
		      for (key in newUser) {
			  newFlyUser[key] = newUser[key];
		      }
		      newFlyUser.documentsPriv = [];
		      newFlyUser.save(function(err) {
			  console.log("================saved user=============");
			  console.log(newFlyUser);
			  console.log("======================================");
		      });
		      
		      // load user here
		      var loadedUser = loadUser(newFlyUser);
		      for (key in loadedUser) {
			  req.session[key] = loadedUser[key];
		      }
		      
		      // redirect to home page with user
		      // logged in and ready to rumble!
		      res.redirect("home");     
		  }
	      });
    
	
    } else {
	// there's an error. Return error message(s) to user
	displayErrorsForSignUp(res, errors);
    }
};


// ============== Helper functions here ==========

/*
 * Helper function
 * displayErrorsForSignUp
*/
var displayErrorsForSignUp = function(res, errors) {
    res.render("sign-up",
	       {title: "Sign Up for Fly Latex"
		, shortTitle: "Sign Up"
		, tagLine: "Start Editing Documents with Your Peeps!"
		, fileSpecificStyle: "sign-up.css"
		, fileSpecificScript: "application.js"
		, errors: errors
	       });
};

/*
 * Helper function to loadUser onto app
 * Returns an object containing user credentials
 * like username and what not.
 */
var loadUser = function(user) {
    var obj = {};
    
    obj.currentUser = user.userName;
    obj.isLoggedIn = true;
    obj.userDocumentsPriv = user.documentsPriv;
    
    if (user.documentsPriv.length > 0) {
	// load user's documents here
	for (var i = 0; i < user.documentsPriv.length; i++) {
	    Document.find({"_id":user.documentsPriv.document}
			  , function(err, doc) {
			      if (err) {
				  console.log("error: ");
				  console.log(error);
			      } 
			      obj.userDocuments.push(doc);
			  });
	}
	
	
    } else {
	// user has no documents
	obj.userDocuments = [];
    }

    return obj;
}

