/*
 *  Define all routes here for the fly-latex application.
 *  
 */
var mongoose = require("mongoose")
, Schema = mongoose.Schema;

var app = require("./app")
, io = require("socket.io").listen(app);

require("./models"); // import the models here

// connect to the flydb app db
mongoose.connect("mongodb://localhost/flydb");

// import the models here
var User = mongoose.model("User")
, Document = mongoose.model("Document")
, DocumentLine = mongoose.model("DocumentLine")
, DocPrivilege = mongoose.model("DocPrivilege")
, Message = mongoose.model("Message");


// ================ GLOBAL variables here =============

// maximum number of documents a user can have
var MAX_DOCS = 10;

// messageTypes
var MESSAGE_TYPES = {
    'requestAccess': 0
    , 'shareAccess': 1
};

// ==================================================


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
 * * userDocuments - this is an abstraction of the real Document model.
     So it contains different attributes.
     contains: id, name, readAccess, writeAccess, execAccess, canShare
 * * errors
 * * infos
*/


/*
 * preGetIndex -
 * load currentUser's data before loading page
 * if user's not registered, just go to next
 * @param req -> request object
 * @param res -> result object
 * @param next -> next (middleware) function (in callchain) to execute
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
		      console.log("==========user successfully logged in========");
		      console.log(user);
		      console.log("=============================================");
		  
		      if (!user || typeof user.authenticate != "function") {
			  // is user even in db ? 
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
 * @param req -> request object
 * @param res -> result object
 * @param err -> error object
 *
 */
exports.index = function(req, res, err){    
    req.session.currentUser = (req.session.currentUser == undefined ?  "" :
			       req.session.currentUser);

    req.session.isLoggedIn = (req.session.isLoggedIn == undefined ? false :
			      req.session.isLoggedIn);

    req.session.userDocuments = (req.session.userDocuments == undefined ? [] :
				 req.session.userDocuments);

    if (req.session.currentUser && req.session.isLoggedIn) {
	// display the documents for user
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
 * @param req -> request object
 * @param res -> result object
 * @param next -> next (middleware) function (in callchain) to execute
 */
exports.logOutUser = function(req, res, next) {
    if (req.session.currentUser && req.session.isLoggedIn) {
	req.session.regenerate(function(err) {
	    if (err) {
		console.log("==========Error while logging out=============");
	    } 
	    next();
	});
    }
};

/*
 * displaySignUpForm ->
 *  displays sign up form for user to sign up for
 *  fly latex
 * @param req -> request object
 * @param res -> result object
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
 * @param req -> request object
 * @param res -> result object
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
			  if (err) {
			      console.log("==============Error in saving user======"); 
			  } else  {
			      console.log("================saved user=============");
			  }
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

/*
 * createDoc ->
 * creates a new document for the current user.
 * error if user not logged in.
 * @note
 * this function is called asynchronous and should
 * sennd back a json response
 * and not redirect or reload page.
 *
 * @param req -> request object
 * @param res -> result object
 */
exports.createDoc = function(req, res) {
    // prepare response object
    var response = {infos:[]
		    , errors: []
		    , code:200
		    , newDocument: {id:null
				    , name:null
				    , readAccess: true
				    , writeAccess: true
				    , execAccess: true
				    , canShare: true}
		   }
    
    var docName = req.body.docName;

    if (!(docName.length && docName.length > 0)) {
	// check that document's name is not empty
	response.errors.push("Error in creating document with no title or name");
	res.json(response);
	return;
    } else if (!(req.session.isLoggedIn && req.session.currentUser)) {
	// user is not logged in
	response.errors.push("You're not not logged in. Please log in!");
	res.json(response);
	return;
    }

    // check the list of documents
    // verify that this new document doesn't
    // have the same name as the old ones
    var found = false;
    for (var i = 0; i < req.session.userDocuments.length; i++) {
	if (req.session.userDocuments[i].name == docName) {
	    found = true;
	    break;
	}
    }
    if (found) {
	response.errors.push("Error in creating document that shares its name with an already existing document you have.");
	res.json(response);
	return;
    } else {
	// then check that the user doesn't have up to MAX_DOCS documents yet
	if (req.session.userDocumentsPriv.length+1 >= MAX_DOCS) {
	    response.errors.push("You can't have more than " + MAX_DOCS + " documents. Delete some documents to create space.");
	    res.json(response);
	    return;		
	} else {
	    // so we can create a new document 
	    // the new document will have only one line for starters
	    var newDoc = createNewDocument(req.body.docName);

	    // by default, document privilege for the
	    // current user is 7 (full access)
	    var docPriv = new DocPrivilege();
	    docPriv.documentId = newDoc._id;
	    docPriv.documentName = newDoc.name;
	    
	    // new user document to send off to front end for display
	    var newUserDocument = {};
	    
	    User.findOne({"userName": req.session.currentUser}, function(err, user) {
		if (err || !user) {
		    response.errors.push("error", "Couldn't find you. Weird.");
		    res.json(response);
		    return;
		}
		
		console.log("Document Priv Object created===============");
		console.log(docPriv);
		console.log("===========================================");
		
		// add to user's documentsPriv
		user.documentsPriv.push(docPriv);
		
		// save the document
		user.save();
		
		// add to the user's session data
		newUserDocument.id = docPriv.documentId;
		newUserDocument.name = docPriv.documentName;
		
		// user creating document should have full access to document
		// R,W,X (and so can share the document with anyone)
		newUserDocument.readAccess = true;
		newUserDocument.writeAccess = true;
		newUserDocument.execAccess = true;
		newUserDocument.canShare = true;
		
		req.session.userDocuments.push(newUserDocument);
		response.newDocument = newUserDocument;
		
		// inform user of new document creation
		response.infos.push("Just created the new Document: " + req.body.docName + " Hooray!");
		res.json(response);
	    });
	}
    }    
};
		      
/**
 * deleteDoc -
 * delete the document from the user's list of documents
 * both in the session data and on the database (his/her docPrivileges)
 * then delete the document from the Documents collection.
 * 
 * @note
 * this method is called asynchronously and should not redirect the user
 * or reload the page under any circumstances.
 * @param req -> request object
 * @param res -> result object
 */
exports.deleteDoc = function(req, res) {
    // response to send back to user after successful deletion (or error)
    var response = {errors:[], infos:[], code:200};

    // get document id,name for document to delete
    var docId = req.body.docId
    , docName;

    if (!(req.session.currentUser && req.session.isLoggedIn)) {
	response.errors.push("Weird. Seems like you're not logged in.");
	res.json(response);
	return;
    }
    // remove the document from Users collections
    User.findOne({userName: req.session.currentUser}, function(err, user) {
	if (err || !user) {
	    console.log("unable to delete doc from " + user.userName + "'s list of documents");
	    response.errors.push("Had problems processing your deletion. Try again.");
	    res.json(response);
	    return;
	}
	for (var i = 0; i < user.documentsPriv.length; i++) {
	    if (user.documentsPriv[i].documentId == docId) {
		docName = user.documentsPriv[i].documentName;
		user.documentsPriv.splice(i, 1);

		console.log("Removed documentsPriv with documentId: " + docId);
	    }
	}
	
	// save a document
	user.save();

	// change session object to reflect new change in user's documents
	for (var i = 0; i < req.session.userDocuments.length; i++) {	    
	    if (req.session.userDocuments[i].id == docId) {
		req.session.userDocuments.splice(i,1);
		
		console.log("Removed userDocument with id: " + docId + " from session object");
	    }
	}
		
	// remove the document from Documents collections
	// if no other user has it
	DocPrivilege.find({documentId:docId}, function(err, docs) {
	    if (docs.length == 0) {
		// no other user has this document
		Document.findOne({_id:docId}).remove(function(err) {
		    if (!err) 
			console.log("Removed document with _id " + docId + " completely from the database");
		    else
			console.log("Error while deleting document with id " + docId + " completely from the database");
		});
	    } else {
		// some other user(s) has access to this document
		console.log("Document(docId="+docId+") not deleted because some other users still have access to this document");
	    }
	});
	if (response.errors.length == 0 && docName.length > 0) {
	    response.infos.push("Successfully deleted the document " + docName);
	    res.json(response);
	}
    });
};

/**
 * shareAccess -> share access to a document
 * @param req -> request object
 * @param res -> result object
 */
exports.shareAccess = function(req, res) {
    var response = {errors:[], infos:[], code: 200};

    // get share options
    var options = req.body.options;

    var priv = ((options.withReadAccess == "true" ? 4 : 0) +
		(options.withWriteAccess == "true" ? 2 : 0) +
		(options.withExecAccess == "true" ? 1 : 0));

    // try to return error messages if any errors found
    if (!(req.session.currentUser && req.session.isLoggedIn)) {
	response.errors.push("You are not logged in. So you can't share access");
    }
    if (priv == 0) {
	response.errors.push("You can't try to share no privilege Dude/Dudette");
    }
    if (!(options.docId
	  && options.docName
	  && options.userToShare)) {
	response.errors.push("Options passed in are incomplete");
    }

    User.findOne({userName: options.userToShare}, function(err, user) {
	if (err) {
	    console.log("An error occured");
	}
	if (!user) {
	    response.errors.push("The user you want to send a message to doesn't exist");
	}
	if (response.errors.length > 0) {
	    // if any errors
	    res.json(response);
	} else {
	    // if no errors found yet
	    // make the message to send
	    var newMessage = new Message();
	    newMessage.messageType = MESSAGE_TYPES.shareAccess;
	    newMessage.fromUser = req.session.currentUser;
	    newMessage.toUser = options.userToShare;	
	    newMessage.documentId = options.docId;
	    newMessage.documentName = options.docName;
	    newMessage.access = priv;
	    
	    // save the message to the messages collection
	    newMessage.save();
	    
	    var withReadAccess = (options.withReadAccess == 'true')
	    , withWriteAccess = (options.withWriteAccess == 'true')
	    , withExecAccess = (options.withExecAccess == 'true');

	    // send success message
	    response.infos.push("You just granted "+options.userToShare+" "+
				(withReadAccess ? "Read" +
				 ((!withWriteAccess && !withExecAccess) 
				  ? " ": ", ") :"")+
				(withWriteAccess ? "Write" +
				 (!withExecAccess ? " ": ", ") : "") +
				(withExecAccess ? "Exec " : " ") +
				"Access to " + options.docName);
	    
	    res.json(response);
	}
    });    
};
/**
 * ajaxAutoComplete ->
 * returns json of auto-complete results based on the purpose
 * 
 * @param req -> request object
 * @param res -> result object
 */
exports.ajaxAutoComplete = function(req, res) {
    /*
     * ====data to get ======
     * word -> word to search for
     * purpose -> usernames, and so on.
     */
    // get the purpose of the auto-complete mission
    var purpose = req.query.purpose;
    // get the word to autocomplete for
    var word = req.query.word;
    
    switch (purpose) {
    case "usernames":
	// get word user has typed so far
	var typed = req.query.word
	, data = {code:200, results:[]};
	
	// query the users collection for usernames
	User.find({userName: new RegExp(typed)}, function(err, users) {
	    if (!err) {
		users.forEach(function(item, index) {
		    data.results.push(item.userName);
		});
	    }
	    res.json(data);
	});
	break;
    default:
	console.log("It's either you're trying to mess with me or I messed up.");
    };
};

/**
 * requestAccess -> request access to a document
 * @param req -> request object
 * @param res -> result object
 */
exports.requestAccess = function(req, res) {
    
};

/**
 * getMessages ->
 * get the messages for the current user
 * @param req -> request object
 * @param res -> result object
 *
 * @jsonreturn returns a list of user's messages
 *  each message object is of the form
 *  {messageType:, fromUser:, toUser:, documentId:, documentName:,access:}
 */
exports.getMessages = function(req, res) {
    var response = {errors:[], infos:[], messages:[]};
    
    // try to find messages for the current user
    Message.find({toUser:req.session.currentUser}, function(err, messages) {
	if (err) {
	    response.errors.push("Error while retrieving messages. Try again later.");
	    res.json(response);
	} else if (messages.length == 0) {
	    response.infos.push("You have no messages!");
	    res.json(response);
	} else {
	    // get the messages
	    messages.forEach(function(item, index) {
		var priv = item.access;
		// set privileges fromUser is requesting
		item.readAccess = false;
		item.writeAccess = false;
		item.execAccess = false;
		
		if (priv >= 4) {
		    item.readAccess = true;
		    priv -= 4;
		} 
		if (priv >= 2) {
		    item.writeAccess = true;
		    priv -= 2;
		}
		if (priv == 1) {
		    item.execAccess = true;
		}
		response.messages.push(item);
	    });

	    // send back messages
	    res.json(response);
	}
    });
};

/**
 * grantAccess ->
 * grant another user access to some document
 * @param req : request object
 * @param res: result object
 */
exports.grantAccess = function(req, res) {
    var response = {errors: [], infos:[]};
    
    /**
     * options passed in: fromUser, documentId, access
     */
    if (!(req.session.currentUser && req.session.isLoggedIn)) {
	response.errors.push("You cannot grant access since you are not logged in.");
	res.json(response);
	return;
    }
    
    User.findOne({"userName":req.body.fromUser}, function(err, user) {
	if (err || !user) {
	    response.errors.push("No user " + req.body.fromUser + " exists an error occured while looking for this user");
	    res.json(response);
	} else {
	    // user found; create new document privilege object and save it
	    var newDocPriv = new DocPrivilege();
	    newDocPriv.access = req.body.access;
	    newDocPriv.documentName = req.body.documentName;
	    newDocPriv.documentId = req.body.documentId;

	    // save
	    newDocPriv.save();
	    
	    // save to user's list of document privileges
	    user.documentsPriv.push(newDocPriv);
	    user.save(); // save user
	    console.log("access -> " + req.body.access);
	    var priv = req.body.access 
	    , readAccess = false
	    , writeAccess = false
	    , execAccess = false
	    , canShare = false;
	    if (priv == 7) {
		canShare = true;
	    }
	    // de-couple privileges
	    if (priv >= 4) {
		readAccess = true;
		priv -= 4;
	    }
	    if (priv >= 2) {
		writeAccess = true;
		priv -= 2;
	    }
	    if (priv == 1) {
		execAccess = true;
	    }
	    
	    response.infos.push("You just granted "+req.body.fromUser+" "+
				(readAccess ? "Read" +
				 ((!writeAccess && !execAccess) 
				  ? " ": ", ") :"")+
				(writeAccess ? "Write" +
				 (!execAccess ? " ": ", ") : "") +
				(execAccess ? "Exec " : " ") +
				"Access to " + req.body.documentName);
	    
	    // notify the user just granted access that his/her request
	    // has been granted immediately via socket.io
	    var newUserDocument = {
		"id": newDocPriv.documentId
		, "name": newDocPriv.documentName
		, "readAccess" : readAccess
		, "writeAccess" : writeAccess
		, "execAccess" : execAccess
		, "canShare" : canShare
		, "forUser" : req.body.fromUser
		, "fromUser" : req.session.currentUser
	    };
	    io.sockets.on("connection", function(socket) {
		socket.emit("addedDocument", newUserDocument);
	    });

	    // send response
	    res.json(response);
	}
	
    });
};

/**
 * acceptAccess ->
 * accept another user's offer to have  
 * access to a document
 * @param req : request object
 * @param res: result object
 */
exports.acceptAccess = function(req, res) {
    var response = {errors:[], infos:[]
		    , newDocument:null
		    , reDisplay:false
		    , userDocuments: req.session.userDocuments};

    /**
     * options passed in: fromUser, documentId, access
     */    
    if (!(req.session.currentUser && req.session.isLoggedIn)) {
	response.errors.push("You cannot accept the invitation since you aren't logged in");
	res.json(response);
	return;
    }
    
    User.findOne({"userName":req.session.currentUser}, function(err, user) {
	// first make sure the user doesn't already have some access to the document
	// in that case, bump up the user's access
	var userHasDoc = false;
	req.session.userDocuments.forEach(function(item, index) {	    
	    if (item.id == req.body.documentId) {
		userHasDoc = true;
	    }
	});

	var priv = req.body.access 
	, readAccess = false
	, writeAccess = false
	, execAccess = false
	, canShare = false;
	if (priv == 7) {
	    canShare = true;
	}
	// de-couple privileges
	if (priv >= 4) {
	    readAccess = true;
	    priv -= 4;
	}
	if (priv >= 2) {
	    writeAccess = true;
	    priv -= 2;
	}
	if (priv == 1) {
	    execAccess = true;
	}
	
	// new user document
	var newUserDocument = {
	    "id": req.body.documentId
	    , "name": req.body.documentName
	    , "readAccess" : readAccess
	    , "writeAccess" : writeAccess
	    , "execAccess" : execAccess
	    , "canShare" : canShare
	};

	if (userHasDoc) {
	    // if user already has the document, upgrade access if possible
	    var upgrading = false;

	    for (var i = 0; i < user.documentsPriv.length; i++) {
		if (user.documentsPriv[i].documentId == newUserDocument.id
		    && user.documentsPriv[i].access < req.body.access) {
		    upgrading = true;

		    // user should redisplay list of documents
		    response.reDisplay = true;

		    user.documentsPriv[i].access = req.body.access;
		    user.save();
		    
		    // send back duplicate message
		    response.infos.push("You just upgraded your rights to the document " + newUserDocument.name);
		}
	    }
	    if (upgrading) {
		for (var i = 0; i < req.session.userDocuments.length; i++) {
		    if (req.session.userDocuments[i].id == newUserDocument.id) {
			// upgrade all we've got
			req.session.userDocuments[i] = newUserDocument;
		    }
		}
		res.json(response);
		return;
	    }
	    // send back duplicate message
	    response.infos.push("You already have higher or equal access to the document " + newUserDocument.name);
	    res.json(response);	    
	} else {	    
	    // user should redisplay list of documents
	    response.reDisplay = true;

	    // user doesn't already have access to document
	    var newDocPriv = new DocPrivilege();
	    newDocPriv.access = req.body.access;
	    newDocPriv.documentName = req.body.documentName;
	    newDocPriv.documentId = req.body.documentId;
	    
	    // save
	    newDocPriv.save();
	    
	    // save to user's list of document privileges
	    user.documentsPriv.push(newDocPriv);
	    user.save(); // save user
	    
	    // add to my session if I don't have the document yet
	    req.session.userDocuments.push(newUserDocument);
	    
	    // also send back so user can display in his/her DOM
	    response.newDocument = newUserDocument;
	    
	    // send acceptance message to user
	    response.infos.push("You just accepted "+
				(readAccess ? "Read" +
				 ((!writeAccess && !execAccess) 
				  ? " ": ", ") :"")+
				(writeAccess ? "Write" +
				 (!execAccess ? " ": ", ") : "") +
				(execAccess ? "Exec " : " ") +
				"Access to " + req.body.documentName +
				" from " + req.body.acceptFromUser);
	    res.json(response);
	}
    });
};

/**
 * exports.addNewDocument -
 * add a new document to my list of documents in my session
 * @param req : request object
 * @param res : result object
 */
exports.addNewDocument = function(req, res) {
    var response = {infos:[], errors: []};
    
    if (!(req.session.currentUser && req.session.isLoggedIn)) {
	response.errors.push("You are not logged in.");
	res.json(response);
	return;
    } else if (req.session.currentUser === req.body.document.forUser) {
	// add to user's list of documents
	var document = req.body.document;
	
	req.session.userDocuments.push(document);
	
	response.infos.push(document.fromUser + " just added " + document.name + " to your list of documents");
	
	res.json(response);
    }

};

/**
 * exports.deleteMessage ->
 * delete a message from messages collections
 * @jsonparam -> fromUser
 * @jsonparam -> documentId
 * @jsonparam -> access
 */
exports.deleteMessage = function(req, res) {
    var response = {infos:[], errors:[]};

    if (!(req.session.currentUser && req.session.isLoggedIn)) {
	response.errors.push("Ya not logged in");
	res.json(response);
    } else {
	Message.findOne({fromUser: req.body.fromUser
			 , documentId: req.body.documentId
			 , access: req.body.access
			 , toUser: req.session.currentUser}).remove(function(err) {
	    if (!err) {
		console.log("You just deleted a message");
		
		res.json(response);
	    } else {
		console.log("Error while deleting a message");
	    }
	});
    }
};

// ============== Helper functions here ==========

/**
 * createNewDocument
 * create a new document for the current user
 *
 * @param docName -> document name
 * @return DocPrivilege -> representing new document
 */
var createNewDocument = function(docName) {
    // create the first document line
    // of the document
    var newDocLine = new DocumentLine();
    var newDocLineObj = {lineNum: 0
			 , data: new Buffer(1)
			};
    for (var key in newDocLineObj) {
	newDocLine[key] = newDocLineObj[key];
    }
    // save the document line
    newDocLine.save();
    
    // create the document (with some properties)
    var newDoc = new Document();
    var newDocObj = {name: docName
		     , lines: [newDocLine]
		     , lastModified: new Date()
		    };

    for (var key in newDocObj) {
	newDoc[key] = newDocObj[key];
    }
    // save the document
    newDoc.save();
    
    return newDoc;
};

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
    obj.userDocuments = [];
    obj.userDocumentsPriv = user.documentsPriv;
    
    // user document to send off to front end for display
    var userDocument = {}
    , priv;

    user.documentsPriv.forEach(function(item, i) {
	userDocument.id = item.documentId;
	userDocument.name = item.documentName;
	// set defaults here
	userDocument.readAccess = false;
	userDocument.writeAccess = false;
	userDocument.execAccess = false;
	userDocument.canShare = false;
	
	// set privileges here
	priv = item.access;
	
	if (priv >= 4) {
	    userDocument.readAccess = true;
	    priv -= 4;
	}
	if (priv >= 2) {
	    userDocument.writeAccess = true;
	    priv -= 2;
	}
	if (priv == 1) {
	    userDocument.execAccess = true;
	}

	// if user has R, W, X access, he can share the document
	// else he cannot
	if (item.access == 7) {
	    userDocument.canShare = true;
	}
	
	obj.userDocuments.push(userDocument);
	userDocument = {};
    });

    return obj;
}

