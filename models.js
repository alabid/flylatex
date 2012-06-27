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
, ObjectId = Schema.ObjectId;

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
    , email: {type: String
	      , index: {unique: true}
	     }
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
    , document: ObjectId
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
});

var DocumentLine = new Schema({
    lineNum: Number
    , data: Buffer 
    , lastModified: {type: Date
		     , default: new Date()
		    }
});

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
    if (!(this.password && this.password.length > 0
	 && this.firstName && this.lastName
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
mongoose.model("User", User);
mongoose.model("Document", Document);
mongoose.model("DocumentLine", DocumentLine);
mongoose.model("DocPrivilege", DocPrivilege);

