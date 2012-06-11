/*
 *  Define all routes here for the fly-latex application.
 *  
 */

// for index page
exports.index = function(req, res, next){
  res.render('index', 
	     { title: 'Sign In'}
	    );
  next();
};


// for test purposes only. This is basically useless
// we could remove this at will at any time
exports.secondindex = function(req, res, next) {
  res.render('secondindextest', {title: "second index is here"});
  next();
};
