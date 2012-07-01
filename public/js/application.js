function UserManager() {
    /*
     * logs user out
     */
    this.logout = function()  {
	$.ajax({
	    type: "DELETE"
	    , url: "/"
	    , success: function(response) {
		reloadHome();
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
	documentList: "ul.list-of-documents"
	, docText: "div#doc-area textarea"
	, createDocBlock: "div.documents-section div.create-doc-block"
	, singleDocEntry: Handlebars.compile($("#doc-li-template").html())
	, currentDocLabel: "a.current-doc"
	, errorsBlock: Handlebars.compile($("#errors-template").html())
	, infosBlock: Handlebars.compile($("#infos-template").html())
	, bodySecondContainer: "div.second-container"
    };
    
    /**
     * clearAjaxAlertBlocks ->
     * clears ajax alert infos and errors region to probably prepare for redisplay
     * of new errors or infos.
     *
     */
    var clearAjaxAlertBlocks = function() {
	// clear out all alert blocks in DOM
	$("div.alert").remove();
    };

    /**
     * updateAjaxErrors ->
     * updates ajax errors region with new errors
     * @param errors : list of errors
     */
    var updateAjaxErrors = function(errors) {
	$(domTargets.bodySecondContainer)
	    .prepend(domTargets.errorsBlock({"errors":errors}));
    };


    /**
     * updateAjaxInfos ->
     * updates ajax infos region with new infos
     * @param infos: list of info messages
     */
    var updateAjaxInfos = function(infos) {
	$(domTargets.bodySecondContainer)
	    .prepend(domTargets.infosBlock({"infos":infos}));
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
	$.ajax({
	    type: "PUT"
	    , data: {"docName": docName}
	    , url: "/createdoc"
	    , success: function(response) {
		if (response.errors.length > 0) {
		    clearAjaxAlertBlocks();
		    updateAjaxErrors(response.errors);
		    return;
		} else if (response.infos.length > 0) {
		    clearAjaxAlertBlocks();
		    updateAjaxInfos(response.infos);
		}
		// get new user document object
		var userDocument = response.newDocument;
		
		$(domTargets.documentList)
		    .append(domTargets.singleDocEntry(userDocument))

		// close the createDocView
		docs_manager.closeCreateDocView();
	    }
	});
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
	if (confirm("Are you sure you want to delete the document?")) {
	    $.ajax({
		type: "DELETE"
		, data: {"docId": docId}
		, url: "/deletedoc"
		, success: function(response) {
		    if (response.errors.length > 0) {
			clearAjaxAlertBlocks();
			updateAjaxErrors(response.errors);
			return;
		    } else if (response.infos.length > 0) {
			clearAjaxAlertBlocks();
			updateAjaxInfos(response.infos);
		    }
		    $(domTargets.documentList)
			.find("li[data-doc-id='"+docId+"']")
			.remove();

		    docs_manager.hideDeleteButtons();
		}
	    });
	}

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
	$(domTargets.documentList).find("button.close").show();
    };

    /*
     * hideDeleteButtons -
     * hide all x's in the documentList
     */
    this.hideDeleteButtons = function() {
	$(domTargets.documentList).find("button.close").hide();
    };
    
    /*
     * openCreateDocView -
     * Open create Document view
     */
    this.openCreateDocView = function() {
	$(domTargets.createDocBlock).show()
	    .find('input').attr("value", "");
    };
    
    /*
     * closeCreateDocView -
     * Close create Document view
     */
    this.closeCreateDocView = function() {
	$(domTargets.createDocBlock).hide();
    };
}

// load instances of class into variables attached to the
// window
window["user_manager"] = new UserManager();
window["docs_manager"] = new DocsManager();


// ================ Helper functions =============
var reloadHome = function() {
    document.location.href = '/';
};

// ================ Handle bars helper functions ==========
Handlebars.registerHelper('listalert', function(items, options) {
    var out = "<ul>";
    
    for (var i = 0, l=items.length; i<l;i++) {
	out = out + "<li>" + items[i] + "</li>";
    }
    
    return out + "</ul>";
});
