// ========================= Put socket.io logic here ==============================

// === CHANGE protocol, hostname, if necessary ===
var socketIOURI = ["http://", "localhost", ":", socketIOPort].join("");
var socket = io.connect(socketIOURI);

// handle the changedDocument event
socket.on("changedDocument", function(docString) {
  var document;
  if (typeof docString == "string") {
    document = JSON.parse(docString);
  } else if (typeof docString == "object") {
    document = docString;
  } else {
    console.log("Wrong type for docString");
    return;
  }

  // get my current username
  if (document.forUser !== $(domTargets.currentUserName).text().trim()) {
    return;
  }
  console.log("document=>");
  console.log(document);
  // add to my list of documents in my session
  $.ajax({type: "POST"
          , url: "/reloadsession"
          , data: {"document": document}
          , success: function(response) {
            // update alerts
            updateAlerts(response);
            console.log("response from reload session=>");
            console.log(response);
            // redisplay documents
            $(domTargets.documentList).empty();
            response.userDocuments
              .forEach(function(item, index) {
                $(domTargets.documentList)
                  .append(domTargets.singleDocEntry(item));

                var writeAccess;
                if (typeof item.writeAccess == "string") {
                  writeAccess = (item.writeAccess == "true");
                } else {
                  writeAccess = item.writeAccess;
                }

                // if write access is needed by the person who's currently
                // making changes to a document, then give the user access
                if ($("#docname").length > 0) {
                  if (writeAccess && $("#docname").attr("data-doc-id").trim() == item.id) {
                    editor.setReadOnln(false);
                  }
                }
              });
          }
         });
});

// handle the newMessage event
socket.on("newMessage", function(messageStr) {
  var message = JSON.parse(messageStr);

  if (message.toUser !== $(domTargets.currentUserName).text().trim()) {
    return;
  }

  // notify user instantly of message
  var response = {infos:[], errors:[]};
  response.infos.push("You have a new message from '" + message.fromUser + "'"
                      + " about the document '" + message.documentName + "'."
                        + " Check your mail for more details!");
  updateAlerts(response);
});

// handle the savedDocument event
socket.on("savedDocument", function(messageStr) {
  var message = JSON.parse(messageStr);

  if (message.sharesWith.indexOf($(domTargets.currentUserName).text().trim()) != -1) {
    updateLastSavedInfo(jQuery.timeago(new Date(message.lastModified)));
  }
});

// =================================================================================

