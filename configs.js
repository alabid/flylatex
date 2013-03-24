var config = {
    directory: {
	// absolute path of where to store compiled pdfs
	// defaults to "pdfs" directory in "flylatex" repo
	path: ""
    }
    , db : {
	url : "mongodb://localhost/flydb" // for example: mongodb://localhost/flydb3"
    }
};


// export the configurations
module.exports = config;