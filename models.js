/*
 * Define models here:
 * * User
 * * DocPrivilege
 * * Document
 * * DocumentLine
 * *
 */

var crypto = require("crypto")
, mongoose = require("mongoose")
, Schema = mongoose.Schema
, ObjectId = Schema.ObjectId

// load configurations here
, configs = require("./configs")
, fs = require("fs-extra");

var DocPrivilege = new Schema ({
    access: {type: Number
	     , default: 7
	    }
    /*
     * 7 - full
     * 6 - read and write
     * 5 - read and execute
     * 4 - read only
     * 3 - write and execute
     * 2 - write only
     * 1 - execute only
     * 0 - none
     *
     * 4 -> read
     * 2 -> write
     * 1 -> execute
     */
    , documentId: ObjectId
    , documentName: String
});


var User = new Schema ({
    userName: {type: String
	       , index: {unique: true}
	      }
    , hashedPassword: {type: String
		       , index: {unique: true}
		      }
    , salt: String
    , firstName: String
    , lastName: String
    , email: {type: String}
    , githubId: {type: String
		 , default: ""
		}
    , twitterId: {type: String
		  , default: ""
		 }
    , memberSince: {type: Date
		    , default: new Date()
		   }
    , documentsPriv: [DocPrivilege] // list of DocPrivilege Objects
});

var Message = new Schema ({
    messageType: Number
    /*
     * requestAccess: 0
     * shareAccess: 1
     * more to come...
     */
    , fromUser: String
    , toUser: String
    , documentId: ObjectId
    , documentName: String
    , access: Number // as in DocPrivilege model
    , timeSent: {type: Date
		 , default: new Date()
		}
});

var DocumentLine = new Schema({
    lineNum: Number
    , data: Buffer 
    , lastModified: {type: Date
		     , default: new Date()
		    }
});


var Document = new Schema ({
    name: String
    , lines: [DocumentLine]
    // logical lines. A line could range from
    // 0 chars to
    // 1024 chars
    , lastModified: Date
    , createdAt: {type: Date
		  , default: new Date()
		 }
    , documentType: Number 
    , usersWithShareAccess: [String] // store userNames of users with full access to doc
});

var PDFDoc = new Schema({
    title: String
    , forDocument: ObjectId
    , isPublic : {type: Boolean
		  , default: false}
    // ==================================================================
    // isPublic should be set to true only when you want to share
    // to the public. You must have 'share' access to grab the 'embed' url

    // plus, the only time that you will need to check or use the variable
    // isPublic is when you are loading a PDF
    // ==================================================================
});

/*
 * specify directory for includes
 */
var includespath = configs.includes.path;
if (includespath == undefined || includespath.length == 0) {
    includespath = __dirname + "/texpackages/";
} else {
    includespath = (includespath[-1] == "/" ? incluespath : includespath + "/");
}

/*
 * Create the new directory to store compiled pdfs
 */
var pdfspath = configs.pdfs.path;
if (pdfspath == undefined || pdfspath.length == 0) {
    pdfspath = __dirname + "/pdfs/";
} else {
    pdfspath = (pdfspath[-1] == "/" ? pdfspath : pdfspath + "/");
}

fs.mkdirp(pdfspath, function(err) {
    if (err) {
	console.log("An error occured while creating directory: "
		   , pdfspath);
    } 
});
fs.mkdirp(includespath, function(err) {
    if (err) {
	console.log("An error occured while creating directory: "
		    , includespath);
    } 
});
configs.pdfs.path = pdfspath;
configs.includes.path = includespath;


/*
 * virtual methods here
 */
User.virtual("id").get(function() {
    return this._id.toHexString();
});

User.virtual("password").set(function(password) {
    this._password = password;
    this.salt = this.makeSalt();
    this.hashedPassword = this.encryptPassword(password);
}).get(function() {
    return this._password;
});

User.method("authenticate", function(plainText) {
    return this.encryptPassword(plainText) == this.hashedPassword;
});

User.method("makeSalt", function() {
    return Math.round((new Date().valueOf() * Math.random())) + '';
});

User.method("encryptPassword", function(password) {
    return crypto.createHmac("sha1", this.salt)
	.update(password).digest("hex");
});

/** end of virutal methods def */


/**
 * define middleware for models here
 */
User.pre("save", function(next) {
    if (!(this.firstName && this.lastName
	 && this.email && this.userName)) {
	next(new Error("Invalid Params"));
    } else {
	next();
    }
});

/** end of definition of middleware here */


// export the models:
// i) User
// ii) Document
// iii) DocumentLine
// iv) DocPrivilege
// v) Message
mongoose.model("User", User);
mongoose.model("Document", Document);
mongoose.model("DocumentLine", DocumentLine);
mongoose.model("DocPrivilege", DocPrivilege);
mongoose.model("Message", Message);
mongoose.model("PDFDoc", PDFDoc);
