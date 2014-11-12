/**
 * exports.addNewDocument -
 * add a new document to my list of documents in my session
 * @param req : request object
 * @param res : response object
 */
exports.addNewDocument = function(req, res) {
    var response = {infos:[], errors: []};

    if (!(req.session.currentUser && req.session.isLoggedIn)) {
        response.errors.push("You are not logged in.");
        res.json(response);
        return;
    } else if (req.session.currentUser === req.body.document.forUser) {
        // add to user's list of documents
        var document = req.body.document;

        req.session.userDocuments.push(document);

        response.infos.push("'" + document.fromUser + "'"
                            + " just added '" + document.name + "'"
                            + " to your list of documents");

        res.json(response);
    }
};
