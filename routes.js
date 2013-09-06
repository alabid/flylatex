/*
 *  Contains (and imports) all route definitions here for the FlyLaTeX application
 */

var mongoose = require("mongoose")
, Schema = mongoose.Schema
, ObjectId = Schema.ObjectId
, app = require("./app")
, io = require("socket.io").listen(app)
, configs = require("./configs")
, temp = require("temp")
, fs = require("fs-extra")
, util = require("util")
, path = require("path")
, exec = require("child_process").exec
, http = require("http")

// flylatex directory
, flylatexdir = __dirname;

// connect to the flydb app database
mongoose.connect(configs.db.url);

// import the models
require("./models"); 
var User = mongoose.model("User")
, Document = mongoose.model("Document")
, DocPrivilege = mongoose.model("DocPrivilege")
, Message = mongoose.model("Message");

// laod helpers
var helpers = require("./routes_lib/helpers.js");

// import some route definitions
exports.index = require("./routes_lib/index.js").index;
exports.logOutUser = require("./routes_lib/logout.js").logOutUser;
exports.displaySignUpForm = require("./routes_lib/displaysignup.js")
                              .displaySignUpForm;
exports.addNewDocument = require("./routes_lib/addnewdocument.js")
                           .addNewDocument;

// maximum number of documents a user can have
var MAX_DOCS = ( configs.docs.MAX_NUM_PER_USER > 0 ?
                 configs.docs.MAX_NUM_PER_USER : 20 );

// messageTypes
var MESSAGE_TYPES = {
    'requestAccess': 0
    , 'shareAccess': 1
};

// currently opened documents ->  map of docId : [username]
var openDocuments = {};

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
 * preIndex -
 * load currentUser's data before loading page
 * if user's not registered, just go to next
 * @param req -> request object
 * @param res -> response object
 * @param next -> next (middleware) function (in callchain) to execute
 */
exports.preIndex = function(req, res, next) {    

    if ((req.body.username == undefined
         && req.body.password == undefined) ||
        (req.body.username.length == 0 
         && req.body.password.length == 0)) {
        
        // user's chilling, makes no attempt to log in
        next();                
    } else if (req.session.currentUser && req.session.isLoggedIn) {
        
        // user's already logged in, so go on
        next();
    } else if (req.body.username && req.body.username.length > 0
               && req.body.password && req.body.password.length > 0) {
        
        // user's not logged in, but wants to log in
        User.findOne({userName: req.body.username}
                     , function(err, user) {
                         if (err) {
                             req.session.currentUser = null;
                             req.session.isLoggedIn = false;
                             next();
                             return;
                         } 
                         
                         if (!user || typeof user.authenticate != "function") {
                             req.flash("error", "There's no user called " 
                                       + req.body.username + " in our database");
                             res.redirect('back');
                             return;
                         } else if (!user.authenticate(req.body.password)) {
                             req.flash('error', "Password does not match Username entered");
                             res.redirect('back');
                             return;
                         } else {                             
                             var loadedUser = helpers.loadUser(user);
                             for (key in loadedUser) {
                                 req.session[key] = loadedUser[key];
                             }
                             
                             next();
                         }
                     });
    } else {
        
        if (!(req.body.username && req.body.password)) {
            req.flash('error', "Enter both a username and password");
            res.redirect('back');
            return;
        }        
    }
};



/*
 * processSignUpData ->
 *  processes the sign up data posted from the sign
 *  up form and logs the user into fly latex
 *  , redirecting him to his home page.
 * @param req -> request object
 * @param res -> response object
 */
exports.processSignUpData = function(req, res) {
    var errors = {}; // key-value pair -> error Type : error Message
    var isError = false;
    var newUser = req.body.newUser;
    
    if (newUser.userName.length == 0) {
        errors["userNameToken"] = "Enter a username";
    }
    
    if (!(newUser.password.length > 4 // password has to be at least 5 chars 
          && /\d+/.test(newUser.password))) { // password has to have at least one digit
        errors["passwordInvalid"] = "Password must be at least 5 chars "
                                    + "and must contain at least one digit";
        isError = true;
    }
    
    if (newUser.password != newUser.confirmPassword) {
        errors["passwordNoMatch"] = "Passwords don't match";
        isError = true;
    }
    
    
    if (!(/^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/.test(newUser.email))) {
        errors["emailInvalid"] = "Enter a valid email address";
        isError = true;
    }
    
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
                          errors["userNameTaken"] = "The username " + 
                                                    newUser.userName + " is already taken";
                          isError = true;
                          
                          helpers.displayErrorsForSignUp(res, errors);
                      } else {
                          // save the user
                          var newFlyUser = new User();
                          for (var key in newUser) {
                              newFlyUser[key] = newUser[key];
                          }
                          newFlyUser.documentsPriv = [];
                          newFlyUser.save(
                              function(err) {
                                  if (err) {
                                      console.log("==============Error in saving user======"); 
                                  } else  {
                                      console.log("================saved user=============");
                                  }
                                  console.log(newFlyUser);
                                  console.log("======================================");
                              });
                          
                          var loadedUser = helpers.loadUser(newFlyUser);
                          for (key in loadedUser) {
                              req.session[key] = loadedUser[key];
                          }
                          
                          // redirect to home page with user logged in
                          res.redirect("home");     
                      }
                  });        
        
    } else {

        helpers.displayErrorsForSignUp(res, errors);
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
 * @param res -> response object
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
                   };
    
    var docName = req.body.docName;
    
    if (!(docName.length && docName.length > 0)) {
        response.errors.push("Error in creating document with no title or name");
        res.json(response);
        return;
    } else if (!(req.session.isLoggedIn && req.session.currentUser)) {
        response.errors.push("You're not not logged in. Please log in!");
        res.json(response);
        return;
    }
    
    // verify that this new document doesn't have the same name as the old ones
    var found = false;
    for (var i = 0; i < req.session.userDocuments.length; i++) {
        if (req.session.userDocuments[i].name == docName) {
            found = true;
            break;
        }
    }
    if (found) {
        response.errors.push("Error in creating document that shares"
                             + " its name with an already existing document you have.");
        res.json(response);
        return;
    } else {
        if (req.session.userDocuments.length >= MAX_DOCS) {
            response.errors.push("You can't have more than " + MAX_DOCS + " documents. "
                                 + "Delete some documents to create space. "
                                 + "Or contact the Administrator.");
            res.json(response);
            return;     
        } else {

            var newDoc = helpers.createNewDocument(req.body.docName
                                                   , req.session.currentUser);
            
            // by default, document privilege for the 
            // current user is 7 (full access)
            var docPriv = new DocPrivilege();
            docPriv.documentId = newDoc._id;
            docPriv.documentName = newDoc.name;
            
            // new user document to send off to front end for display
            var newUserDocument = {};
            
            User.findOne({"userName": req.session.currentUser}
                         , function(err, user) {
                             if (err || !user) {
                                 response.errors.push("error"
                                                      , "Couldn't find you. Weird.");
                                 res.json(response);
                                 return;
                             }
                                                          
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
                             response.infos.push("Just created the new Document: " 
                                                 + req.body.docName + ". Hooray!");
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
 * @param res -> response object
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
    User.findOne({userName: req.session.currentUser}
                 , function(err, user) {
                     if (err || !user) {
                         console.log("Unable to delete doc from " 
                                     + user.userName + "'s list of documents");
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
                     for (i = 0; i < req.session.userDocuments.length; i++) {        
                         if (req.session.userDocuments[i].id == docId) {
                             req.session.userDocuments.splice(i,1);
                             
                             console.log("Removed userDocument with _id "
                                         + docId + " from session object");
                         }
                     }                   

                     var removeDocs = function(err, docs) {
                         if (docs.length == 0) {
                             // no other user has this document
                             Document.findOne({_id:docId})
                                 .remove(function(err) {
                                             if (!err) {
                                                 console.log("Removed document with _id "
                                                             + docId + " completely from the database");
                                             }
                                             else {
                                                 console.log("Error while deleting document with _id " 
                                                             + docId + " completely from the database");
                                             }
                                         });
                         } else {
                             // some other user(s) has access to this document
                             console.log("Document(docId=" + docId +
                                         ") not deleted because some other users "
                                         + "still have access to this document");
                             
                             // then remove the current userName from the the list of users
                             // with share (full) access, if there
                             Document.findOne({_id: docId}
                                              , function(err, doc) {
                                                  if (!err) {
                                                      var found = false
                                                      , i; // loop variable
                                                      
                                                      for (i = 0
                                                           ; i < doc.usersWithShareAccess.length
                                                           ; i++) {
                                                          if (doc.usersWithShareAccess[i]
                                                              == req.session.currentUser) {
                                                              found = true;
                                                              break;
                                                          }
                                                      }
                                                      if (found) {
                                                          doc.usersWithShareAccess.splice(i, 1);
                                                          
                                                          // save the document
                                                          doc.save();
                                                      }
                                                  }
                                              });
                         }
                     };
                     
                     // remove the document from Documents collections
                     // if no other user has it
                     DocPrivilege.find({documentId:docId}, removeDocs);
                     
                     if (response.errors.length == 0 && docName.length > 0) {
                         response.infos.push("Successfully deleted the document " + docName);
                         res.json(response);
                     }
                 });
};

/**
 * shareAccess -> share access to a document
 * @param req -> request object
 * @param res -> response object
 */
exports.shareAccess = function(req, res) {
    var response = {errors:[], infos:[], code: 200};
    
    // get share options
    var options = req.body.options;
    
    var priv = ((options.withReadAccess == "true" ? 4 : 0) +
                (options.withWriteAccess == "true" ? 2 : 0) +
                (options.withExecAccess == "true" ? 1 : 0));
    
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
    if (priv < 4) {
        response.errors.push("You should share at least 'Read' privilege");
    }
    
    User.findOne({userName: options.userToShare}
                 , function(err, user) {
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
                         response.infos.push("You just invited "+options.userToShare+" to have "+
                                             (withReadAccess ? "Read" +
                                              ((!withWriteAccess && !withExecAccess) 
                                               ? " ": ", ") :"")+
                                             (withWriteAccess ? "Write" +
                                              (!withExecAccess ? " ": ", ") : "") +
                                             (withExecAccess ? "Exec " : " ") +
                                             "Access to " + options.docName);

                         // emit message to recipient if online
                         io.sockets.volatile.emit("newMessage", JSON.stringify(newMessage));
                         
                         // send response back to the client
                         res.json(response);
                     }
                 });    
};

/**
 * ajaxAutoComplete ->
 * returns json of auto-complete results based on the purpose
 * 
 * @param req -> request object
 * @param res -> response object
 */
exports.ajaxAutoComplete = function(req, res) {
    var purpose = req.query.purpose
    , word = req.query.word;
    
    switch (purpose) {
    case "usernames":
        // get word user has typed so far
        var typed = req.query.word
        , data = {code:200, results:[]};
        
        // query the users collection for usernames
        User.find({userName: new RegExp(typed)}
                  , function(err, users) {
                      if (!err) {
                          users.forEach(
                              function(item, index) {
                                  if (item.userName != req.session.currentUser) {
                                      data.results.push(item.userName);
                                  }
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
 * @param res -> response object
 */
exports.requestAccess = function(req, res) {
    var response = {errors:[], infos:[], code: 200};
    
    // get request access options
    var options = req.body.options;
    
    var priv = ((options.withReadAccess == "true" ? 4 : 0) +
                (options.withWriteAccess == "true" ? 2 : 0) +
                (options.withExecAccess == "true" ? 1 : 0));
    
    // try to return error messages if any errors found
    if (!(req.session.currentUser && req.session.isLoggedIn)) {
        response.errors.push("You are not logged in. So you can't share access");
    }
    if (priv == 0) {
        response.errors.push("You can't try to request for no privilege");
    }
    if (!(options.docId
          && options.docName)) {
        response.errors.push("Options passed in are incomplete");
    }
    
    if (priv < 4) {
        response.errors.push("You should request for at least read access to a document ");
    }
    
    if (response.errors.length > 0) {
        res.json(response);
        return;
    }
    // first find the users that have share access (7:R,W,X) to the document
    Document.findOne({_id: options.docId}
                     , function(err, doc) {
                         if (err) {
                             console.log("An error occured while trying to request access for " 
                                         + req.session.currentUser);
                         } else {        
                             if (doc.usersWithShareAccess.length > 0) {
                                 var newMessage, i;
                                 
                                 for (i = 0; i < doc.usersWithShareAccess.length; i++) {
                                     newMessage = new Message();
                                     newMessage.messageType = MESSAGE_TYPES.requestAccess;
                                     newMessage.fromUser = req.session.currentUser;
                                     newMessage.toUser = doc.usersWithShareAccess[i];
                                     newMessage.documentId = options.docId;
                                     newMessage.documentName = options.docName;
                                     newMessage.access = priv;
                                     
                                     // save the message in the messages collection
                                     newMessage.save();
                                     
                                     // alert users that are logged in about message
                                     io.sockets.volatile.emit("newMessage", JSON.stringify(newMessage));
                                     
                                 }
                                 response.infos.push("Sent a 'Request More Privileges' message" +
                                                     + " to all the users who have share access"
                                                     + " to the document " + options.docName);
                                 
                                 res.json(response);
                             } else {
                                 response.errors.push("No user currently has Share Access "
                                                      + "to that document");
                                 
                                 // send response back
                                 res.json(response);
                             }
                         }
                     });
};

/**
 * getMessages ->
 * get the messages for the current user
 * @param req -> request object
 * @param res -> response object
 *
 * @jsonreturn returns a list of user's messages
 *  each message object is of the form
 *  {messageType:, fromUser:, toUser:, documentId:, documentName:,access:}
 */
exports.getMessages = function(req, res) {
    var response = {errors:[], infos:[], messages:[]};
    
    // try to find messages for the current user
    Message.find({toUser : req.session.currentUser}
                 , function(err, messages) {
                     if (err) {
                         response.errors.push("Error while retrieving messages. Try again later.");
                         res.json(response);
                     } else if (messages.length == 0) {
                         response.infos.push("You have no messages!");
                         res.json(response);
                     } else {
                         // get the messages
                         messages.forEach(
                             function(item, index) {
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
 * @param res: response object
 */
exports.grantAccess = function(req, res) {
    var response = {errors: [], infos:[]};
    
    /**
     * options passed in: userToGrant, documentId, documentName, access
     */
    if (!(req.session.currentUser && req.session.isLoggedIn)) {
        response.errors.push("You cannot grant access since you are not logged in.");
        res.json(response);
        return;
    }
    
    User.findOne({"userName" : req.body.userToGrant}
                 , function(err, user) {
                     if (err || !user) {
                         response.errors.push("No user " + req.body.userToGrant 
                                              + " exists or an error occured "
                                              + "while looking for this user");
                         res.json(response);
                     } else {
                         // make sure the user's granting at least read access 
                         if (req.body.access < 4) {
                             response.errors.push("You should grant a user at least 'Read' privilge");
                             res.json(response);
                             return;
                         }
                         
                         // first make sure that userToGrant doesn't already have some access
                         // to the document
                         var userHasDoc = false;
                         
                         user.documentsPriv
                             .forEach(function(item, index) {
                                          if (item.documentId == req.body.documentId) {
                                              userHasDoc = true;
                                          }
                                      });
                         
                         var priv = req.body.access
                         , readAccess = false
                         , writeAccess = false
                         , execAccess = false
                         , canShare = false;
                         
                         // give user power to be able to share the document with other users
                         // if he/she has full access
                         if (priv == 7) {
                             canShare = true;
                             
                             // give user R, W, X access
                             helpers.giveUserSharePower(req.body.userToGrant
                                                        , req.body.documentId);
                         }
                         
                         // de-couple privileges here
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
                         
                         // create new user document
                         var newUserDocument = {
                             "id": req.body.documentId
                             , "name": req.body.documentName
                             , "readAccess" : readAccess
                             , "writeAccess" : writeAccess
                             , "execAccess" : execAccess
                             , "canShare" : canShare
                             , "forUser" : req.body.userToGrant
                         };
                         
                         
                         if (userHasDoc) {
                             var upgrading = false;
                             
                             // if userToShare already has the document, upgrade access if possible
                             for (var i = 0; i < user.documentsPriv.length; i++) {
                                 if (user.documentsPriv[i].documentId == newUserDocument.id
                                     && user.documentsPriv[i].access < req.body.access) {
                                     upgrading = true;
                                     
                                     // userToShare should reload his/her list of documents
                                     response.reloadDocs = true;
                                     
                                     user.documentsPriv[i].access = parseInt(req.body.access);
                                     
                                     user.save(function(err) {
                                                   if (!err) 
                                                       console.log("user successfully saved!");
                                                   else
                                                       console.log("error occured while trying "
                                                                   + "to save user");
                                               });
                                     
                                     // send back message
                                     response.infos.push("You just upgraded the privileges of "
                                                         + req.body.userToGrant + " for the document "
                                                         + req.body.documentName);
                                     
                                     // notify userToShare you just upgraded his privileges
                                     // on some document
                                     io.sockets.volatile.emit("changedDocument"
                                                              , JSON.stringify(newUserDocument));
                                     res.json(response);
                                     
                                     break;      
                                 }
                             }
                             if (!upgrading) {
                                 // send back duplicate message
                                 response.infos.push(req.body.userToGrant
                                                     + " already has higher or equal access"
                                                     + " to the document, " + req.body.documentName);
                                 res.json(response);
                             }
                         } else {
                             // userToShare should definitely redisplay his list of documents
                             response.reloadDocs = true;
                             
                             var newDocPriv = new DocPrivilege();
                             newDocPriv.access = parseInt(req.body.access);
                             newDocPriv.documentName = req.body.documentName;
                             newDocPriv.documentId = req.body.documentId;
                             
                             // save
                             newDocPriv.save();
                             
                             // save to user's list of document privileges
                             user.documentsPriv.push(newDocPriv);
                             user.save();                              
                             
                             response.infos.push("You just granted "+req.body.userToGrant+" "+
                                                 (readAccess ? "Read" +
                                                  ((!writeAccess && !execAccess) 
                                                   ? " ": ", ") :"")+
                                                 (writeAccess ? "Write" +
                                                  (!execAccess ? " ": ", ") : "") +
                                                 (execAccess ? "Exec " : " ") +
                                                 "Access to " + req.body.documentName);
                             
                             // notify the user just granted access that his/her request
                             // has been granted immediately via socket.io
                             io.sockets.volatile.emit("changedDocument"
                                                      , JSON.stringify(newUserDocument));

                             // send response
                             res.json(response);
                         }   
                     }
                 });
};

/**
 * acceptAccess ->
 * accept another user's offer to have  
 * access to a document
 * @param req : request object
 * @param res: response object
 */
exports.acceptAccess = function(req, res) {
    var response = {errors:[], infos:[]
                    , newDocument:null
                    , reDisplay:false
                    , userDocuments: req.session.userDocuments};
    
    /**
     * options passed in: acceptFromUser, documentId, documentName, access
     */    
    if (!(req.session.currentUser && req.session.isLoggedIn)) {
        response.errors.push("You cannot accept the invitation since you aren't logged in");
        res.json(response);
        return;
    }
    
    // make sure the privilege to accept is at least read privilege
    if (parseInt(req.body.access) < 4) {
        response.errors.push("You should accept at least 'Read' privilege");
        res.json(response);
    }
    
    User.findOne({"userName":req.session.currentUser}
                 , function(err, user) {
                     // first make sure the user doesn't already have some access to the document
                     // in that case, bump up the user's access
                     var userHasDoc = false;
                     req.session.userDocuments
                         .forEach(function(item, index) {       
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
                         
                         // give user share power
                         // a user can only get share access when he's given access of 7
                         // which corresponds to R, W, X
                         helpers.giveUserSharePower(req.session.currentUser
                                                    , req.body.documentId);
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
                                 
                                 user.documentsPriv[i].access = parseInt(req.body.access);
                                 user.save();
                                 
                                 // send back  message
                                 response.infos.push("You just upgraded your rights to the document "
                                                     + newUserDocument.name);
                                 break;
                             }
                         }
                         if (upgrading) {
                             for (i = 0; i < req.session.userDocuments.length; i++) {
                                 if (req.session.userDocuments[i].id == newUserDocument.id) {
                                     // upgrade all we've got
                                     req.session.userDocuments[i] = newUserDocument;
                                 }
                             }
                             res.json(response);
                             return;
                         }
                         // send back duplicate message
                         response.infos.push("You already have higher or equal access to the document " 
                                             + newUserDocument.name);
                         res.json(response);     
                     } else {        
                         // user should redisplay list of documents
                         response.reDisplay = true;
                         
                         // user doesn't already have access to document
                         var newDocPriv = new DocPrivilege();
                         newDocPriv.access = parseInt(req.body.access);
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
 * exports.reloadSession -
 * reload the user's documents and send back the new documents
 *
 * @param req : request object
 * @param res : result object
 */
exports.reloadSession = function(req, res) {
    var response = {infos: [], errors: [], userDocuments: null};
    
    if (!(req.session.currentUser && req.session.isLoggedIn)) {
        response.errors.push("You are not logged in.");
        res.json(response);
        return;
    } else if (req.session.currentUser == req.body.document.forUser) {
        User.findOne({userName: req.session.currentUser}
                     , function(err, user) {
                         // reload user
                         var loadedUser = helpers.loadUser(user);
                         for (var key in loadedUser) {
                             req.session[key] = loadedUser[key];
                         }
                         
                         // load userDocuments
                         response.userDocuments = req.session.userDocuments;
                         
                         res.json(response);
                     });
    }
};

/**
 * exports.servePDF ->
 * @param req : request Object
 * @param res : result Object
 *
 */
exports.servePDF = function(req, res) {
    var documentId = req.params.documentId
    , pdfPath = configs.pdfs.path+documentId+".pdf";
    
    fs.exists(pdfPath, function(exists){
                  if (!exists) {
                      req.flash("error", "PDF not found");
                      res.redirect("back");
                      return;                   
                  } else {
                      fs.createReadStream(configs.pdfs.path+documentId+".pdf")
                          .pipe(res);                    
                  }
              });
};

/**
 * exports.compileDoc
 * @param req : request object
 * @param res : response object
 */
exports.compileDoc = function(req, res) {
    // initialize the 'response' JS object to send back
    var response = {infos:[], errors: [], logs:"", compiledDocURI:null}
    , documentId = req.body.documentId;
    
    if (!(req.session.currentUser && req.session.isLoggedIn)) {
        response.errors.push("You are not logged in");
        res.json(response);
        return;
    } 
    
    var createAndCompile = function(docText) {
        return function(err, dirPath){
            var inputPath = path.join(dirPath, documentId+".tex");

            var afterCompile = function(err) {
                // store the logs for the user here
                fs.readFile(path.join(dirPath, documentId+".log")
                            , function(err, data){
                                if (err) {
                                    response.errors.push("Error while trying to read logs.");
                                    res.json(response);
                                    return;
                                }
                                
                                response.logs = (data ? data.toString() : "");
                                
                                var errorStr = "An error occured before or during compilation";
                                if (err) {
                                    response.errors.push(errorStr);
                                    res.json(response);
                                    return;
                                }
                                
                                var pdfTitle = documentId+".pdf"
                                , tempfile = path.join(dirPath, pdfTitle);
                                fs.copy(tempfile
                                        , configs.pdfs.path + pdfTitle
                                        , function(err){
                                            if (err) {
                                                response.errors.push(errorStr);
                                                res.json(response);
                                                return;
                                            } else {
                                                console.log("Successfully saved "
                                                            + pdfTitle
                                                            +" in "+configs.pdfs.path);
                                                
                                                response.infos
                                                    .push("Successfully compiled "
                                                          + req.body.documentName);
                                                // make the compiledDocURI
                                                response.compiledDocURI = "/servepdf/"
                                                    + documentId;
                                                // send response back to user
                                                res.json(response);
                                            }
                                        });
                            });
            };      

            fs.writeFile(inputPath, docText
                         , function(err) {
                             if (err) {
                                 response.errors.push("An error occured even before compiling");
                                 res.json(response);
                                 return;
                             }
                             process.chdir(dirPath);

                             exec("pdflatex -interaction=nonstopmode "+ inputPath +" > /dev/null 2>&1"
                                  , afterCompile);
                         });
        };
    };  
    
    // first load the text of the document from the database
    Document.findOne({_id:documentId}
                     , function(err, doc) {
                         if (err || !doc) {
                             response.errors.push("An Error Occured while"
                                                  + " trying to open the document");
                             res.json(response);
                             return;
                         }
                         
                         // get the document text
                         var docText = doc.data;
                         
                         // make temporary directory to create and compile latex pdf
                         temp.mkdir("pdfcreator", createAndCompile(docText));
                     });
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
                         , access: parseInt(req.body.access)
                         , toUser: req.session.currentUser})
            .remove(function(err) {
                        if (!err) {
                            console.log("You just deleted a message");
                            
                            res.json(response);
                        } else {
                            console.log("Error while deleting a message");
                        }
                    });
    }
};

/**
 * openDocument ->
 * opens a document
 *
 * @param req : request object
 * @param res : response object
 * 
 * @getparam documentId : id of document to open
 */
exports.openDocument = function(req, res) {
    // retrieve the document id from url
    var documentId = req.params.documentId;
    
    // first retrieve the name of the document
    Document.findOne({_id:documentId}
                     , function(err, doc) {
                         if (err || !doc) {
                             req.flash("error", "An Error Occured while trying to open the document");
                             res.redirect('back');
                             return;
                         }
                         
                         // assemble the document lines
                         var lastModified
                         , userDoc
                         , docInSession
                         , writeable
                         , sharesWith;
                         
                         // retrieve the document from the current user session
                         docInSession = helpers.searchForDocsInSession(documentId, req.session); 
                         // handle lag in findOne callback execution
                         if (docInSession == null) {
                             return;
                         }
                         
                         sharesWith = (openDocuments[documentId] ?
                                       openDocuments[documentId] : []);
                         
                         if (openDocuments[documentId] 
                             && openDocuments[documentId].indexOf(req.session.currentUser) == -1) {
                             openDocuments[documentId].push(req.session.currentUser);
                         }
                         
                         // then record that this document is now opened by the current user
                         if (!openDocuments[documentId]) {
                             openDocuments[documentId] = [req.session.currentUser];
                         }
                         
                         // construct a user document
                         userDoc = {
                             "id" : documentId
                             , "name" : doc.name
                             , "text" : escape(doc.data) // escape special characters
                             , "lastSaved" : doc.lastModified
                             , "sharesWith" : sharesWith
                             , "readAccess" : docInSession.readAccess
                             , "writeAccess" : docInSession.writeAccess
                             , "execAccess" : docInSession.execAccess
                             , "canShare" : docInSession.canShare
                         };
                         
                         // render the document you just opened
                         res.render("open-document"
                                    , { title: "Viewing the document, "+ doc.name
                                        , shortTitle: "Fly Latex"
                                        , tagLine: "Viewing the document, " + doc.name
                                        , fileSpecificStyle: "open-document.css"
                                        , fileSpecificScript: "open-document.js"
                                        , userDocument: userDoc
                                        , currentUser: req.session.currentUser
                                        , isLoggedIn: req.session.isLoggedIn
                                        , port : configs.port
                                        , userDocuments: req.session.userDocuments
                                      });
                     });
};

/**
 * saveDocument - 
 * saves the document in DB
 *
 * @param req : request object
 * @param res : response object
 */
exports.saveDocument = function(req, res) {
    var response = {code: 400, errors: [], infos: []}
    , documentId = req.body.documentId
    , documentName = req.body.documentName
    , documentText = req.body.documentText;
    
    Document.findOne({_id:documentId}
                     , function(err, doc){
                         var newLine
                         , mb = 1024 * 1024;
                         
                         if (err || !doc) {
                             response.errors.push("Error in finding document to save");
                             res.json(response);
                             return;
                         }
                         
                         // check if documentText length > 15MB (MongoDB doc size limit is 16MB)
                         if (documentText.length > 15 * mb) {
                             response.errors.push("This document is 15MB or above. Too large to store.");
                             res.json(response);
                             return;
                         }
                         
                         doc.data = new Buffer(documentText);
                         doc.lastModified = new Date();
                         
                         // save document text
                         doc.save(function(err) {
                                      if (err) {
                                          console.log("Error while trying to save this document");
                                      }
                                  });
                         
                         var savedDocMessage = {
                             "sharesWith" : openDocuments[documentId]
                             , "lastModified" : doc.lastModified
                         };
                         
                         // send a message to all users that are currently viewing the saved doc
                         io.sockets.volatile.emit("savedDocument", JSON.stringify(savedDocMessage)); 
                         
                         // after save
                         response.code = 200;
                         response.infos.push("Successfully saved the document");
                         res.json(response);
                     });
};
