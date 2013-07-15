/*
 * index
 * handles both get and post request on the / page
 * @param req -> request object
 * @param res -> response object
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
		    , tagLine: "Real Time Collaborative editor in node-js"
		    , fileSpecificStyle: "not-logged-in.css"});
    }
};
