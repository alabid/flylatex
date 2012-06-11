/*
 *  Define all routes here for the fly-latex application.
 *  
 *  Remember to always comment out your code at all times.
 */

exports.index = function(req, res, next){
  res.render('index', { title: 'Express' });
  next();
};

exports.secondindex = function(req, res, next) {
  res.render('secondindextest', {title: "second index is here"});
  next();
};
