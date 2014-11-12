/**
 * helpers.js ->
 *  Contains helper functions
 *  that don't take in (req, res)
 */

var mongoose = require("mongoose");
// import 'needed' models here
var Document = mongoose.model("Document");

/**
 * Helper function to clone an object (deep copy)
 * cloneObject
 * @param obj : object to clone
 */
var cloneObject = function(obj) {
  var clone = {};
  for (var i in obj) {
    if (typeof(obj[i])=="object") {
      clone[i] = cloneObject(obj[i]);
    } else {
      clone[i] = obj[i];
    }
  }
  return clone;
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
    userDocument.id = item._id;
    userDocument.name = item.name;
    // set defaults here
    userDocument.readAccess = false;
    userDocument.writeAccess = false;
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

    // if user has R, W access, he can share the document
    // else he cannot
    if (item.access == 6) {
      userDocument.canShare = true;
    }

    obj.userDocuments.push(userDocument);
    userDocument = {};
  });

  return obj;
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
              , port : require("../configs").port
             });
};

/**
 * searchForDocsInSession
 * search for document in session.userDocuments
 *
 * @param documentId - id of document to search for
 * @param session - session object for current user
 * @return document
 */
var searchForDocsInSession = function(documentId, session) {
  if (session.userDocuments != undefined) {
    for (var i = 0; i < session.userDocuments.length; i++) {
      if (String(session.userDocuments[i].id) == String(documentId)) {
        return session.userDocuments[i];
      }
    }
  }
  return null;
};

/**
 * createNewDocument
 * create a new document for the current user
 *
 * @param docName -> document name
 * @param currentUser -> created by
 */
var createNewDocument = function(docName, currentUser) {
  // create the document (with some properties)
  var newDoc = new Document();
  var newDocObj = {name: docName
                   , data: ""
                   , lastModified: new Date()
                   , usersWithShareAccess: [currentUser]
                   , documentType: 0 // latex document
                  };

  for (var key in newDocObj) {
    newDoc[key] = newDocObj[key];
  }
  // save the document
  newDoc.save();

  return newDoc;
};

/**
 * giveUserSharePower
 *
 * if user has full access to doc, give user power to be able to
 * share the document with other users
 *
 * @param fromUser -> user to give full access to
 * @param documentId -> document id of document concerned
 */
var giveUserSharePower = function(fromUser, documentId) {
  Document.findOne({_id: documentId}, function(err, doc) {
    if (!err) {
      if (doc.usersWithShareAccess.indexOf(fromUser) == -1) {
        doc.usersWithShareAccess.push(fromUser);

        // save doc
        doc.save();
      }
    } else {
      console.log("An error occured while trying to note "
                  + "in document model that "
                  + req.body.fromUser + " has full access to the doc");
    }
  });
};


exports.cloneObject = cloneObject;
exports.loadUser = loadUser;
exports.displayErrorsForSignUp = displayErrorsForSignUp;
exports.searchForDocsInSession = searchForDocsInSession;
exports.createNewDocument = createNewDocument;
exports.giveUserSharePower = giveUserSharePower;
