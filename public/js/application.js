function UserManager() {
    /*
     * logs user out
     */
    this.logout = function()  {
	$.ajax({
	    type: "DELETE"
	    , url: "/"
	    , success: function(response) {
		document.location.href = "/";
	    }
	});
    };
}

/*
 * DocsManager ->
 * class that manages the documents for a particular
 * user.
 */
function DocsManager() {
    /*
     * Global Variables
     */
    var domTargets = {
	documentList: $("ul.list-of-documents")
	, docText: $("div#doc-area textarea")
	, createDocBlock: $("div.documents-section div.create-doc-block")
	, singleDocEntry: Handlebars.compile($("#doc-li-template").html())
	, currentDocLabel: $("a.current-doc")
    };
    
    /*
     * reqReadAccess
     * @param _id -> id of document to request read access to
     */
    this.reqReadAccess = function(_id) {
	// send read access request to other user
	
	// TODO: each user should have interface to approve or 
	// disapprove access to a document
    };

    /*
     * reqWriteAccess
     * @param _id -> id of document to request write access to
     */
    this.reqWriteAccess = function(_id) {
	// send write access request to other user
	
	// TODO: each user should have interface to approve or 
	
    };
    
    /*
      * reqExecAccess
      * @param _id -> id of document to request execute access to
     */
    this.reqExecAccess = function(_id) {
	// send execute access request to other user
	
	// TODO: each user should have interface to approve or 
	// disapprove access to a document
    };

    /*
     * this.createDoc
     *
     * @param docName -> name of document to create
     *
     * Create a new Document for the user.
     * You should only create a new document if the user
     * is in session or else you should throw an error or sth.
     *
     * docName -> name of the document to create
     */
    this.createDoc = function(docName) {
	// send ajax request to create a new document for the
	// current user
	
	// on success, add the document to the DOM
	// like this:
	// first get userDocument
	// userDocument must have the following properties
	// _id, name, and other stuff about the userDocument
	// insert like this:
	// domTargets.documentList.append(domTargets.singleDocEntry(userDocument))
	// display success message to the user
	// or display error message if any error message
	
	// if not display some error in div.documents-section-errors



	// close the createDocView
	docs_manager.closeCreateDocView();
    };

    /*
     * this.openDocument
     *
     * @param docId -> id of document to open
     * 
     * Open the document in the text area
     * so load the document from the database
     * then put the document lines in the textarea
     * 
     */
    this.openDoc = function(docId) {
	// load Document object

	// load Document lines
	// and place in text area
	
	// update current doc label
	// load userDocument
	// domTargets.currentDocLabel.html(userDocument.name);
	// domTargets.currentDocLabel.attr("data-doc-id", userDocument._id);
	// domTargets.currentDocLabel.attr("onclick"
	//                                ,"docs_manager.openDoc("+userDocument._id+")");
    };

    /*
     * this.deleteDoc
     * delete the document
     */
    this.deleteDoc = function(docId) {
	// before deleting the document from the
	// list of the current user's list
	// of documents alert the user that he/she
	// is about to delete a document
	

	// if the user consents to the delete,
	// then delete
	// else don't delete the document

	// in the case where he/she still
	// wants to delete
	// delete it from the DOM
	// domTargets.documentList
	//   .find("li[data-doc-id='"+ docId +"']")
	//  .remove();

	// and also delete it from the back end

	// then hideDeleteButtons
	docs_manager.hideDeleteButtons();
    };

    /*
     * this.shareDoc
     * @param -> id of document you want to shar
     */
    this.shareDoc = function(_id) {
	// check if you have share access to this document

	// if you do, try to give another user
	// (with dropdown options)
	// access xxx -> 421 -> read|write|execute

	// if not, just alert the user to that
    };
    
    /*
     * showDeleteButtons -
     * show the delete buttons so that the user can 
     * delete the documents he doesn't want again
     */
    this.showDeleteButtons = function() {
	domTargets.documentList.find("button.close").show();
    };

    /*
     * hideDeleteButtons -
     * hide all x's in the documentList
     */
    this.hideDeleteButtons = function() {
	domTargets.documentList.find("button.close").hide();
    };
    
    /*
     * openCreateDocView -
     * Open create Document view
     */
    this.openCreateDocView = function(docName) {
	domTargets.createDocBlock.show();
    };
    
    /*
     * closeCreateDocView -
     * Close create Document view
     */
    this.closeCreateDocView = function(docName) {
	domTargets.createDocBlock.hide();
    };
}

// load instances of class into variables attached to the
// window
window["user_manager"] = new UserManager();
window["docs_manager"] = new DocsManager();