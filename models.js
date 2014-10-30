/*
 * Define models here:
 * * User
 * * DocPrivilege
 * * Document
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
    access: { type: Number
             , default: 6 }
    /*
     * 6 - read and write
     * 4 - read only
     * 2 - write only
     * 0 - none
     */
    , _id: ObjectId
    , name: String
});


var Document = new Schema ({
    name: String
    , data: Buffer
    , lastModified: Date
    , createdAt: { type: Date
                  , default: new Date() }
    /* 
     * latex source file -> 0
     * other types to come...
     */
    , documentType: Number 
    , usersWithShareAccess: [String] // store userNames of users with full access to doc
});

var User = new Schema ({
    // _id == User name
    _id: { type: String }
    , hashedPassword: { type: String
                       , index: {unique: true }
                      }
    , salt: String
    , firstName: String
    , lastName: String
    , email: { type: String }
    , githubId: { type: String
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
    , timeSent: { type: Date
                 , default: new Date()
                }
});


/*
 * specify directory for includes
 */
var includespath = configs.includes.path;
if (includespath == undefined || includespath.length == 0) {
    includespath = __dirname + "/texpackages/";
} else {
    includespath = (includespath[-1] == "/" ? includespath : includespath + "/");
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

User.virtual("userName").get(function() {
    return this["_id"];
});

User.virtual("userName").set(function(userName) {
    this["_id"] = userName;
});

/** end of definition of middleware here */


// export the models:
// i) User
// ii) Document
// iii) DocPrivilege
// iv) Message
module.exports = function() {
    mongoose.model("User", User);
    mongoose.model("Document", Document);
    mongoose.model("DocPrivilege", DocPrivilege);
    mongoose.model("Message", Message);
};
