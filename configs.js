var config = {
    port: 3001
    , pdfs: {
        // absolute path of where to store compiled pdfs
        // defaults to "pdfs" directory in "flylatex" repo
        path: ""
    }
    , db : {
        url : "mongodb://localhost/flydb" // for example: mongodb://localhost/flydb3"
    }, docs: {
        // maximum number of documents per user
        MAX_NUM_PER_USER : 20
    }
};


// export the configurations
module.exports = config;
