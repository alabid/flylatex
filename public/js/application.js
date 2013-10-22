function UserManager() {
    /*
     * logs user out
     */
    this.logout = function()  {
        $.ajax({ type: "DELETE"
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
    // ========= Global variables here ==========
    var currentDoc = null
    , oldDoc = null
    , versionNum = 0
    , data = {
        currentPage : 0
        , logPages : []
        , prevNextLogsHTML : "<div style='margin-bottom: 20px;'><button title='Last Page' class='btn' onclick='docs_manager.loadLogsPreviousPage();' style='margin-right: 20px;'><i class='icon-arrow-left'></i></button><button title='Next Page' class='btn' onclick='docs_manager.loadLogsNextPage();'><i class='pull-right icon-arrow-right'></i></button></div><div class='main-content'>"
        , docOptions : null
    };

    /**
     * init ->
     * initialize DocsManager
     */
    this.init = function() {
        if (document.location.href.indexOf("document") != -1) {
            $(domTargets.viewLogsButton).clickover({width: 500});
        }
    };
    
    // ==========================================

    this.downloadPDFDoc = function(documentId, documentName) {
        window.open('/servepdf/'+documentId);
    };

    /**
     * sharePDFDoc ->
     * @param documentId : id of document to share
     * @param documentName : name of document to share
     */
    this.sharePDFDoc = function(documentId, documentName) {
        // open dialog with url only if user
        // selects to make the pdf public:
        // and only if user has 'share' access
        
        // then give a url for sharing
        // user should be also be able to turn the 'share' pdf button
    };
    
    /**
     * changeScale
     * @param scale : num to change scale to
     */
    this.changeScale = function(newScale) {
        // change scale here
        data.docOptions.scale = parseFloat(newScale);
        
        // re-render the page
        renderPage(data.docOptions.pageNum);
    };
    
    /**
     * compileAndRender ->
     * compiles the currently displayed latex file
     * into pdf and renders the pdf
     * @param id : id of document to compile and render
     */
    this.compileAndRender = function(documentId, documentName) {
        // first try to save the current document being displayed
        $.ajax({type: "POST"
                , data: {"documentId" : documentId}
                , url: "/savedoc"
                , success: function(response) {
                    // update alerts
                    updateAlerts(response);
                    
                    if (response.errors.length > 0) {
                        return;
                    }
                    
                    // if no errors encountered, 
                    // then try to compile the document
                    $.ajax({ type: "POST"
                             , data: {"documentId": documentId
                                      , "documentName" : documentName}
                             , url: "/compiledoc"
                             , success: function(response) {
                                 // update alerts
                                 updateAlerts(response);
                                 
                                 // update logs for most recent pdf compile
                                 // if any errors found in the log, then display
                                 // error in compile message to user
                                 var isError = false;
                                 
                                 updateLogs(response.logs);
                                 
                                 if (response.errors.length > 0) {
                                     isError = true;
                                 }
                                 
                                 // PDFJS.disableWorker = true;
                                 PDFJS.workerSrc = "/js/pdf.js";
                                 if (!isError) {
                                     data.docOptions = {
                                         pdfDoc : null
                                         , pageNum : 1 // start by rendering page 1
                                         , scale : 1.0 // default scale of page
                                         , canvas : document.getElementById("the-canvas")
                                         , ctx : document.getElementById("the-canvas").getContext("2d")
                                     };
                                     
                                     
                                     // Asynchronously download PDF as an ArrayBuffer
                                     PDFJS.getDocument("http://"+document.location.host+response.compiledDocURI)
                                         .then(function(_pdfDoc){
                                             data.docOptions.pdfDoc = _pdfDoc;
                                             
                                             renderPage(data.docOptions.pageNum);
                                         });
                                 }
                             }
                           });
                }
               });
    };
    
    /**
     * updateLogs ->
     * @param logText : text of logs
     *
     * @return true if successful. false if not.
     */
    var updateLogs = function(logText) {    
        var lines = logText.split("\n")
        , noError = true
        , LINES_PER_PAGE = 10
        , i = 0;
        
        // apportion log pages
        while (i*LINES_PER_PAGE < lines.length) {
            data.logPages.push(lines.slice(i*LINES_PER_PAGE, (i+1)*LINES_PER_PAGE).join("<br/>"));
            i++;
        }
        
        // update contents on the 'view logs' button
        // with the last page
        loadLogPage(data.logPages[data.currentPage]);
        
        for (var i = 0; i < lines.length; i++) {
            // if '!' in line, there's an error
            if (lines[i].indexOf("!") != -1) {
                noError = false;
            }
        }
        return  noError;
    };
    
    /**
     * Get page info from document, resize canvas accordingly, and render page
     *
     * @param num : the page number to render
     */
    var renderPage = function(num) {
        // get document options
        var docOptions = data.docOptions;
        
        // Using promise to fetch the page
        docOptions.pdfDoc.getPage(num)
            .then(function(page) {
                var viewport = page.getViewport(docOptions.scale);
                docOptions.canvas.height = viewport.height;
                docOptions.canvas.width = viewport.width;
                
                // Render PDF page into canvas context
                var renderContext = {
                    canvasContext: docOptions.ctx,
                    viewport: viewport
                };
                page.render(renderContext);
            });
        
        // Update page counters
        document.getElementById("page_num").textContent = docOptions.pageNum;
        document.getElementById("page_count").textContent = docOptions.pdfDoc.numPages;
    };
    
    /**
     * loadLogPage
     * @param logText : text of log
     */
    var loadLogPage = function(logText) {
        // update 'log text', prepending some controls
        $(domTargets.viewLogsButton).attr("data-content"
                                          , data.prevNextLogsHTML+logText+"</div>");
        // also update log contents if displayed
        $(domTargets.popoverContent).html(logText+"</div>");
    };
    
    /**
     * goPreviousPage ->
     * go the previous page
     *
     */
    this.goPreviousPage = function() {
        // get document options
        var docOptions = data.docOptions;
        
        if (docOptions.pageNum <= 1)
            return;
        docOptions.pageNum--;
        renderPage(docOptions.pageNum);
    };
    
    /**
     * Go to next page
     */
    this.goNextPage = function() {
        // get document options
        var docOptions = data.docOptions;
        
        
        if (docOptions.pageNum >= docOptions.pdfDoc.numPages)
            return;
        docOptions.pageNum++;
        renderPage(docOptions.pageNum);
    };
    
    
    
    /**
     * Load next log page, if any
     */
    this.loadLogsNextPage = function() {    
        if (data.currentPage+1 < data.logPages.length) {
            data.currentPage++;
            
            loadLogPage(data.logPages[data.currentPage]);
        }
    };
    
    /**
     * Load previous log page, if any
     */
    this.loadLogsPreviousPage = function() {    
        if (data.currentPage-1 > 0) {
            data.currentPage--;
            
            loadLogPage(data.logPages[data.currentPage]);
        }
    };
    
    /*
     * reqReadAccess
     * @param _id -> id of document to request read access to
     */
    this.reqReadAccess = function(id, name) {
        displayRequestAccess('read', id, name);
    };
    
    /*
     * reqWriteAccess
     * @param _id -> id of document to request write access to
     */
    this.reqWriteAccess = function(id, name) {
        displayRequestAccess('write', id, name);    
    };    
    
    /*
     * displayRequestAccess ->
     * open a light box that shows the accesses a user's requesting for.
     * 
     * @param type: either read, write or a list of privileges
     */
    var displayRequestAccess = function(privs, id, name) {
        if (typeof privs == "undefined")  {
            return; 
        }
        // get current privs the user has
        var privsForDoc = [];
        $(domTargets.documentList).find("[data-doc-id="+id+"] button")
            .filter(":disabled")
            .each(function(i, elem) {
                privsForDoc.push($(elem).text().toLowerCase());
            });
        
        // remove any previously displayed request access modals
        $("#request-access").remove();
        
        // default request object
        var requestObj = {docId: id
                          , docName: name
                          , read: false
                          , write: false };
        
        privsForDoc.forEach(function(item, index){
            requestObj[item] = true;
        });
        
        if (typeof privs.push != "undefined") {
            privs.forEach(function(item, index) {
                requestObj[item] = true;    
            });
        } else if (typeof privs == "string") {
            requestObj[privs] = true;
        }
        // prepend the modal to the DOM and display
        $(domTargets.bodySecondContainer)
            .prepend(domTargets.requestAccessBlock(requestObj));
        
        $("#request-access").modal("show");
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
        $.ajax({type: "PUT"
                , data: {"docName": docName}
                , url: "/createdoc"
                , success: function(response) {
                    // update alerts
                    updateAlerts(response);
                    // check if any errors
                    if (response.errors.length > 0) {
                        return;
                    }
                    
                    // get new user document object
                    var userDocument = response.newDocument;
                    
                    $(domTargets.documentList)
                        .append(domTargets.singleDocEntry(userDocument));
                    
                    // close the createDocView
                    docs_manager.closeCreateDocView();
                    
                    // hide delete buttons in case they were previously shown
                    docs_manager.hideDeleteButtons();
                }
               });
    };
    
    /**
     * showCompilerView ->
     * shrink editor and expand compiler view
     * @param jButton : jQuery object of button
     */
    this.showCompilerView = function(jButton) {
        // hide compiler text
        jButton.text("Hide PDF View")
            .attr("onclick", "docs_manager.hideCompilerView($(this));");
        $("#editor, #header").css("width", "600px");
        // show compiler view
        $('.compiler-view').slideLeftShow();
    };
    
    /**
     * hideCompilerView ->
     * expand editor and collapse compiler view
     */
    this.hideCompilerView = function(jButton) {
        // show compiler text
        jButton.text("Show PDF View")
            .attr("onclick", "docs_manager.showCompilerView($(this));");
        $("#editor, #header").css("width", "1200px");
        // hide compiler view
        $('.compiler-view').slideRightHide();
    };
    
    /*
     * this.openDocOnLoad - 
     * open the document when you load the page
     *
     * @param onloadDoc -> object that looks like this
     *   var onloadDoc = {
     *  "id" :
     * , "name": 
     * , "text": 
     * , "lastSaved":
     * , "sharesWith":
     * , "readAccess" :
     * , "writeAccess" :
     * , "canShare" : 
     * };
     *
     *
     * Open the document in the editor on load
     * so load the document from the database
     * then put the document lines in the textarea
     * 
     */
    this.openDocOnLoad = function(onloadDoc) {
        // open sharejs doc in session first
        sharejs.open(onloadDoc.id, "text", function(error, doc) {
            if (oldDoc) {
                oldDoc.close();
            }
            currentDoc = doc; // store doc object               
            
            // compile and render document
            // docs_manager.compileAndRender(onloadDoc.id, onloadDoc.name);
            
            var userDoc = onloadDoc
            , writeAccess = userDoc.writeAccess == "true";
            
            // make editor writeable if user has write permission on document
            if (writeAccess) {
                editor.setReadOnly(false);
            } else {
                editor.setReadOnly(true);
            }
            
            // update "last saved" info box
            updateLastSavedInfo(jQuery.timeago(new Date(userDoc.lastSaved)));
            
            // load document text here
            if (doc.created) {
                doc.insert(0, userDoc.text);
            }
            
            doc.attach_ace(editor);
            
            oldDoc = doc;       
        });      
    };
    
    
    /*
     * this.deleteDoc
     * delete the document
     */
    this.deleteDoc = function(docId, docName) {
        bootbox.confirm("Are you sure you want to delete the document '" + docName + "' ?"
                        , function(yes) {
                            if (yes) {
                                $.ajax({type: "DELETE"
                                        , data: {"docId": docId}
                                        , url: "/deletedoc"
                                        , success: function(response) {
                                            // update alerts
                                            updateAlerts(response);
                                            
                                            $(domTargets.documentList)
                                                .find("li[data-doc-id='"+docId+"']")
                                                .remove();
                                            
                                            docs_manager.hideDeleteButtons();
                                        }
                                       });
                            }
                        });        
    };
    
    /*
     * this.openShareDoc
     * @param -> id of document you want to share
     */
    this.openShareDoc = function(id, name) {
        // remove any previously display share modals
        $("#share-modal").remove();
        
        // prepend modal to DOM and display
        $(domTargets.bodySecondContainer)
            .prepend(domTargets.shareDocumentBlock({docId:id, docName: name}));
        $("#share-modal").modal("show");
        
        // put typeahead feature
        $("#share-modal [name=userToShare]").typeahead()
            .on("keyup", getAutoCompleteData);
    };
    
    /*
     * this.saveDoc
     *
     * @param docId -> id of document to save
     * @param docName -> name of document to save
     *
     * Save the document in the db
     * 
     */
    this.saveDoc = function(docId, docName) {
        // save the document
        $.ajax({type: "POST"
                , data: {"documentId" : docId}
                , url: "/savedoc"
                , success: function(response) {
                    // update alerts
                    updateAlerts(response);
                }
               });
    };
    
    /*
     * this.shareDoc
     * @param docId: id of document to share
     * @param docName: name of document to share
     * @param userToShare: username of the user to share document with
     * @param withReadAccess: grant userToShare read access
     * @param withWriteAccess: grant userToShare write access
     */
    this.shareDoc = function(docId, docName
                             ,userToShare 
                             , withReadAccess, withWriteAccess) {
        withReadAccess = (withReadAccess === "true");
        withWriteAccess = (withWriteAccess === "true");
        
        // send message to other user notifying him that you want to grant him
        // access to a document
        var options = {
            "docId":docId
            ,"docName":docName
            , "userToShare": userToShare
            , "withReadAccess":withReadAccess
            , "withWriteAccess":withWriteAccess
        };
        user_messages.sendMessage('shareAccess', options);
    };
    
    /*
     * this.requestDoc
     * @param docId: id of document to request access to
     * @param docName: name of document to request access to
     * @param withReadAccess: request read access
     * @param withWriteAccess: request write access
     */
    this.requestDoc = function(docId, docName
                               , withReadAccess, withWriteAccess) {
        
        withReadAccess = (withReadAccess === "true");
        withWriteAccess = (withWriteAccess === "true");
        
        // send message to all users that have share access to the document
        // that has documentId, docId
        // if no user has shareAccess to the document, notify user
        // that no user has shareAccess to that document
        var options = {
            "docId":docId
            ,"docName":docName
            , "withReadAccess":withReadAccess
            , "withWriteAccess":withWriteAccess
        };
        user_messages.sendMessage('requestAccess', options);
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

function UserMessages() {    
    var data = {
        messageTypes: ['requestAccess', 'shareAccess']
    };
    
    /*
     * showMessages -
     * show the messages that the user currently has.
     * open a dialog and fill with messages
     */
    this.showMessages = function() {
        // fill dialog box with messages
        $.ajax({
                   type: "GET"
                   , url: "/showmessages"
                   , success: function(response) {
                       // update alerts
                       updateAlerts(response);
                       
                       if (response.messages.length == 0) {
                           return;
                       } else {
                           // add some more essential information
                           // to the template object
                           var messagesForTemplate = []
                           , priv;
                           response.messages
                               .forEach(function(item, index) {
                                   // set shareAccess, requestAccess flags
                                   // some sugar
                                   item.isRequestAccess = item.messageType == 0;
                                   item.isShareAccess = item.messageType == 1;
                                   // temporarily use priv here
                                   priv = item.access;
                                   item.readAccess = item.writeAccess = false;
                                   // de-couple privileges
                                   if (priv >= 4) {
                                       priv -= 4;
                                       item.readAccess = true;
                                   }
                                   if (priv >= 2) {
                                       priv -= 2;
                                       item.writeAccess = true;
                                   }
                                   messagesForTemplate.push(item);
                               });
                           
                           $("#messages-modal").remove();
                           $(domTargets.bodySecondContainer)
                               .prepend(domTargets.showMessagesBlock({"messages": messagesForTemplate}));
                           $("#messages-modal").modal("show");
                       }
                   }
        });
    };
    /*
     * sendMessage -
     * @param messageType -> type of message to send
     * @param options -> map of message meta-data and content
     *  options = {'docId':,'docName':,['userToShare':],'withReadAccess':,
     *             'withWriteAccess':,}
     * 
     */
    this.sendMessage = function(messageType, options) {
        // check if message type allowed
        if (data.messageTypes.indexOf(messageType) == -1) {
            return;
        }
        switch (messageType) {
        case 'requestAccess':
            $.ajax({
                type: "POST"
                , data: {"options":options}
                , url: "/requestaccess"
                , success: function(response) {
                    // update alerts
                    updateAlerts(response);
                }
            });
            break;
        case 'shareAccess':
            $.ajax({
                type: "POST"
                , data: {"options":options}
                , url: "/shareaccess"
                , success: function(response) {
                    // update alerts
                    updateAlerts(response);
                }
            });
            break;
        default:
            console.log("It's either I'm doing sth wrong or ya messing with me!");
        }
    };
    /**
     * grantAccess ->
     * grant another user access to a document you have full access to.
     * @param fromUser - user requesting access to some document
     * @param documentId - document id of document
     * @param documentName - document name of document
     * @param access - access to be granted to fromUser
     */
    this.grantAccess = function(fromUser, documentId, documentName, access) {
        $.ajax({
            type: "POST"
            , url: "/grantaccess"
            , data: {"userToGrant": fromUser
                     , "documentId":documentId
                     , "documentName":documentName
                     , "access":access}
            , success: function(response) {
                // update alerts
                updateAlerts(response);
                
                // delete the message
                deleteMessage(fromUser, documentId, access);
            }
        });
    };
    
    /**
     * acceptAccess ->
     * accept access to document
     * @param fromUser - user granting you access to some document
     * @param documentId - document id of document
     * @param documentName - document name of document
     * @param access - access to be granted to current user
     */
    this.acceptAccess = function(fromUser, documentId, documentName, access) {
        $.ajax({
            type: "POST"
            , url: "/acceptaccess"
            , data: {"acceptFromUser":fromUser,
                     "documentId":documentId, 
                     "documentName":documentName, 
                     "access":access}
            , success: function(response) {
                // update alerts
                updateAlerts(response);
                
                // delete message
                deleteMessage(fromUser, documentId, access);
                
                if (response.reDisplay) {
                    $(domTargets.documentList).empty();
                    
                    // redisplay the entire list of documents
                    response.userDocuments
                        .forEach(function(item, index) {
                            $(domTargets.documentList)
                                .append(domTargets.singleDocEntry(item));
                        });
                }
            }
        });
    };
    
    /**
     * declineAccess ->
     * decline request from another user.
     * In order words, just delete the message (mark as read).
     * @param fromUser -> user that sent request
     * @param documentId -> id of document concerned
     * @param access -> access
     */
    this.declineAccess = function(fromUser, documentId, access) {
        // for now, just delet ethe message
        deleteMessage(fromUser, documentId, access);
    };
    
    
    /**
     * deleteMessage -
     * delete the message from messages collection
     */
    var deleteMessage = function(fromUser, documentId, access) {
        $.ajax({
            type: "POST"
            , url: "/deletemessage"
            , data: {"fromUser":fromUser
                     , "documentId":documentId
                     , "access":access}
            , success: function(response) {
                // update alerts
                updateAlerts(response);
            }
        });
    };
};

/*
 * Global Variables
 */
var domTargets = {
    documentList: "ul.list-of-documents"
    , createDocBlock: "div.documents-section div.create-doc-block"
    , singleDocEntry: Handlebars.compile($("#doc-li-template").html())
    , currentDocLabel: "#header #docname"
    , errorsBlock: Handlebars.compile($("#errors-template").html())
    , infosBlock: Handlebars.compile($("#infos-template").html())
    , shareDocumentBlock: Handlebars.compile($("#share-document-modal").html())
    , showMessagesBlock: Handlebars.compile($("#messages-for-user").html())
    , requestAccessBlock: Handlebars.compile($("#request-access-modal").html())
    , bodySecondContainer: "div.second-container"
    , lastSavedSpan: "#header #last-saved-time"
    , currentUserName: "#current-user-name"
    , viewLogsButton : ".pdf-render #view-logs"
    , popoverContent :  ".popover-content p .main-content"
};


// load instances of class into variables attached to the
// window
window["user_manager"] = new UserManager();

window["docs_manager"] = new DocsManager();
docs_manager.init(); // initialize 'docs_manager'

window["user_messages"] = new UserMessages();



// ================ Helper functions =============
var reloadHome = function() {
    document.location.href = '/';
};

/**
 * updateLastSavedInfo ->
 * updates the "last saved" display time 
 */
var updateLastSavedInfo = function(timeText) {
    $(domTargets.lastSavedSpan).html(timeText).closest("small").show();
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

/**
 * updateAlerts ->
 * @param response object gotten from an async. HTTP
 * request
 */
var updateAlerts = function(response) {
    // nothing to display
    if (!response.errors && !response.infos) {
        return;
    }
    
    if (response.errors.length > 0) {
        clearAjaxAlertBlocks();
        updateAjaxErrors(response.errors);
        return;
    } else if (response.infos.length > 0) {
        clearAjaxAlertBlocks();
        updateAjaxInfos(response.infos);
    }   
}

// ================ Handle bars helper functions ==========
// listalert handler
Handlebars.registerHelper('listalert', function(items, options) {
    var out = "<ul>";
    
    for (var i = 0, l=items.length; i<l;i++) {
        out = out + "<li>" + items[i] + "</li>";
    }
    
    return out + "</ul>";
});

// displaymessages handler
Handlebars.registerHelper('displaymessages', function(items, options) {
    var out = "<ul class='nav nav-list'>\n<li class='nav-header'>Messages</li>";
    
    for (var i = 0, l=items.length; i<l;i++) {
        out = out + '<li onclick="$(this).addClass(\'active\').siblings(\'li\').removeClass(\'active\');">' + options.fn(items[i]) + "</li>";
    }
    return out + "</ul>";
});

/**
 * getAutoCompleteData ->
 * get auto complete data from server.
 * @param ev : event
 */
var getAutoCompleteData = function(ev) {
    ev.stopPropagation();
    ev.preventDefault();
    
    //filter out up/down, tab, enter, and escape keys
    if( $.inArray(ev.keyCode,[40,38,9,13,27]) === -1 ){
        
        var self = $(this);
        
        //set typeahead source to empty
        self.data('typeahead').source = [];
        
        //active used so we aren't triggering duplicate keyup events
        if( !self.data('active') && self.val().length > 0){
            
            self.data('active', true);
            
            //Do data request. Insert your own API logic here.
            $.ajax({
                type: "GET"
                , url: "/autocomplete"
                , data: {
                    word: $(this).val()
                    , purpose: $(this).attr('data-purpose')
                }
                , success: function(data) {
                    
                    //set this to true when your callback executes
                    self.data('active',true);
                    
                    //Filter out your own parameters. Populate them into an array, since this is what typeahead's source requires
                    var arr = [],
                        i=data.results.length;
                    while(i--){
                        arr[i] = data.results[i];
                    }
                    
                    //set your results into the typehead's source 
                    self.data('typeahead').source = arr;
                    
                    //trigger keyup on the typeahead to make it search
                    self.trigger('keyup');
                    
                    //All done, set to false to prepare for the next remote query.
                    self.data('active', false);
                }       
            });     
        }
    }
};
