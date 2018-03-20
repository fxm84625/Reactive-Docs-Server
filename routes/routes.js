/*
    Back-end server routes
    All paths take in JSON objects and return JSON objects
*/
var crypto = require( 'crypto' );
var express = require( 'express' );
var passport = require( 'passport' );
var User = require( '../models/user.js' );
var Document = require( '../models/document.js' );
var router = express.Router();

function hashPassword( word ) {
    var hash = crypto.createHash( 'sha256' );
    hash.update( word + 'amazingDisplayOfSkill,withTheGreatestOfEase' );
    return hash.digest( 'hex' );
}
function handleError( res, error ) {
    return res.json({ success: false, error: error });
}

// Register New User      // Hashes password before saving
router.post( '/register', ( req, res ) => {
    if( !req.body.username ) return handleError( res, "No username" );
    if( !req.body.password ) return handleError( res, "No password" );
    if( req.body.password.length < 6 ) return handleError( res, "Password must be at least 6 characters" );
    var newUser = new User({
        username: req.body.username,
        password: hashPassword( req.body.password )
    });
    newUser.save( function( saveError ) {
        if( saveError ) return handleError( res, "Save Error: " + saveError );
        return res.json({ success: true });
    });
});

// Login
router.post( '/login', passport.authenticate( 'local' ), ( req, res ) => {
    req.session.save( sessionSaveError => {
        if( sessionSaveError ) return handleError( res, sessionSaveError );
        res.json({ success: true, userId: req.user._id });
    });
});

// Logout
router.post( '/logout', ( req, res ) => {
    req.logout();
    req.session.save( sessionSaveError => {
        if( sessionSaveError ) return handleError( res, "Logout Session Save Error: " + sessionSaveError );
        res.json({ success: true });
    });
});

// Get a List of Documents that one User has access to
  // Reads a User's docList, which is a list of Document ObjectId's
  // Sends a response with a list of populated Documents
router.get( '/user/:userId', ( req, res ) => {
    if( !req.params.userId ) return handleError( res, "Not Logged in (Unable to find userId), cannot get Document List" );
    User.findById( req.params.userId ).exec()
    .catch( findUserError => handleError( res, "Find User Error: " + findUserError ) )
    .then( foundUser => {
        var docIdList = [];
        foundUser.docList.forEach( item => {
            docIdList.push(
                Document.findById( item )
                .populate( "owner", "username" )
                .populate( "collaboratorList", "username" )
                .exec()
            );
        });
        return Promise.all( docIdList );
    })
    .catch( findDocumentError => handleError( res, "Find Document Error: " + findDocumentError ) )
    .then( foundDocList => {
        res.json({
            success: true,
            docList: foundDocList.sort( ( a, b ) => {
                return b.lastEditTime - a.lastEditTime;
            })
        });
    });
});

// Create new Document
  // Takes in a User Id, to be the owner of the new Document
  // Creates a new Document object
  // Adds the new Document's Id to the User's DocumentList
  // Updates the User's DocumentList
router.post( '/doc/new', ( req, res ) => {
    if( !req.body.userId ) return handleError( res, "Not logged in (Invalid User Id), cannot create new Document" );
    if( !req.body.password ) return handleError( res, "No document password given" );
    var updatedDocList;
    User.findById( req.body.userId ).exec()
    .catch( findUserError => handleError( res, "Find User Error: " + findUserError ) )
    .then( foundUser => {
        var newDocument = new Document({
            owner: foundUser._id,
            password: hashPassword( req.body.password ),
            collaboratorList: [ foundUser._id ],
            title: req.body.title || "untitled",
            createdTime: Date.now(),
            lastEditTime: Date.now()
        });
        updatedDocList = foundUser.docList.slice();
        return newDocument.save();
    })
    .catch( documentUpdateError => handleError( res, "Document Save Error: " + documentUpdateError ) )
    .then( savedDocument => {
        // console.log( "savedDocument: " + savedDocument );
        updatedDocList.push( savedDocument._id );
        return User.findByIdAndUpdate( req.body.userId, { docList: updatedDocList } ).exec();
    })
    .catch( updateUserError => handleError( res, "Update User Error: " + updateUserError ) )
    .then( updatedUser => {
        // console.log( "updatedUser: " + updatedUser );
        res.json({ success: true, documentId: updatedUser.docList[ updatedUser.docList.length - 1 ] });
    });
});

// Helper Function to check if an Array of Schema ObjectId's has a specific Id
  // Returns the index of the found object
  // If not found, returns -1
function arrayIdIndex( id, array ) {
    for( var i = 0; i < array.length; i++ ) {
        if( String(array[i]) == String(id) ) return i;
    }
    return -1;
}

// Add Existing Document
  // Takes in a Document's Id, Document password, and User's Id
  // Adds the Document Id to the User's list of Documents
  // If the User's list of Documents already has this Document Id, send an error
  // If the password does not match the Document's password, send an error
router.post( '/doc/add', ( req, res ) => {
    if( !req.body.docId ) return handleError( res, "No Document found (Invalid Document Id), cannot add Document" );
    if( !req.body.userId ) return handleError( res, "No User found (Invalid User Id), cannot add Document" );
    if( !req.body.password ) return handleError( res, "No password Given, cannot add Document" );
    var currentUser;
    User.findById( req.body.userId ).exec()
    .catch( findUserError => handleError( res, "Find User Error: " + findUserError ) )
    .then( foundUser => {
        if( arrayIdIndex( req.body.docId, foundUser.docList ) !== -1 ) {
            return handleError( res, "User already linked to this Document (DocId already in User's DocList)" );
        }
        else {
            currentUser = foundUser;
            return Document.findById( req.body.docId ).exec();
        }
    })
    .catch( documentFindError => handleError( res, "Document Find Error: " + documentFindError ) )
    .then( foundDocument => {
        if( foundDocument.password != hashPassword( req.body.password ) ) return handleError( res, "Incorrect Document password" );
        foundDocument.collaboratorList.push( req.body.userId );
        return foundDocument.save();
    })
    .catch( documentUpdateErorr => handleError( res, "Document Update Error: " + documentUpdateErorr ) )
    .then( updatedDocument => {
        currentUser.docList.push( updatedDocument._id );
        return currentUser.save();
    })
    .catch( updateUserError => handleError( res, "Update User Error: " + updateUserError ) )
    .then( updatedUser => {
        return res.json({ success: true });
    });
});

// Delete Document
  // Takes in a Document's Id to delete from the database
  // If the User is the Document owner, the Document is removed for all Users
  // If the User is a collaborator, the Document is Unlinked from that User
router.post( '/doc/remove/', ( req, res ) => {
    if( !req.body.docId ) return handleError( res, "No document found (Invalid Document Id), cannot Unlink document" );
    if( !req.body.userId ) return handleError( res, "No user found (Invalid User Id), cannot Unlink document");
    var currentUser;
    User.findById( req.body.userId ).exec()
    .catch( findUserError => handleError( res, "Find User Error: " + findUserError ) )
    .then( foundUser => {
        currentUser = foundUser;
        return Document.findById( req.body.docId ).exec();
    })
    .catch( findDocumentError => handleError( res, "Find Document Error: " + findDocumentError ) )
    .then( foundDocument => {
        if( foundDocument.owner == req.body.userId ) {
            deleteDocument( foundDocument, res );
        }
        else {
            unlinkDocument( currentUser, foundDocument, res );
        }
    });
});

// Helper function to unlink one document from a user
// Removes the User's Id from the Document's Collaborator List
  // Takes in the Mongoose Models: User and Document
  // Returns a JSON response
function unlinkDocument( user, document, res ) {
    var docIndex = arrayIdIndex( document._id, user.docList );
    if( docIndex === -1 ) return handleError( res, "Document Unlink Error: Document not in User's Document List" );
    user.docList.splice( docIndex, 1 );
    user.save()
    .catch( updateUserError => handleError( res, "Update User Error: " + updateUserError ) )
    .then( updatedUser => {
        var userIndex = arrayIdIndex( user._id, document.collaboratorList );
        if( userIndex === -1 ) return handleError( res, "User Unlink Error: User not in Document's Collaborator List" );
        document.collaboratorList.splice( userIndex, 1 );
        return document.save();
    })
    .catch( documentUpdateError => handleError( res, "Document Update Error: " + documentUpdateError ) )
    .then( updatedDocument => {
        res.json({ success: true, action: "unlink" });
    });
}

// Helper function to unlink a Document from all Users's document List,
// Then delete the Document
  // Takes in a Mongoose Model: Document
  // Returns a JSON response
function deleteDocument( document, res ) {
    User.find( {} ).exec()
    .catch( userFindError => handleError( res, "User Find All Error: " + userFindError ) )
    .then( foundUserList => {
        var udpatedUserPromiseArr = [];
        for( var i = 0; i < foundUserList.length; i++ ) {
            var idIndex = arrayIdIndex( document._id, foundUserList[i].docList );
            if( idIndex !== -1 ) foundUserList[i].docList.splice( idIndex, 1 );
            udpatedUserPromiseArr.push( foundUserList[i].save() );
        }
        return Promise.all( udpatedUserPromiseArr );
    })
    .catch( updateUserError => handleError( res, "Update User Error: " + updateUserError ) )
    .then( updatedUserArr => {
        return document.remove();
    })
    .catch( documentDeleteError => handleError( res, "Document Delete Error: " + documentDeleteError ) )
    .then( () => {
        res.json({ success: true, action: "delete" });
    });
}

// Open Document to Edit
  // Takes in a Document's Id as a url parameter
router.get( '/doc/:docId', ( req, res ) => {
    if( !req.params.docId ) return handleError( res, "No Document found (Invalid Document Id), cannot open Document" );
    Document.findById( req.params.docId ).exec()
    .catch( documentFindError => handleError( res, "Document Find Error: " + documentFindError ) )
    .then( foundDocument => {
        return res.json({ success: true, document: foundDocument });
    });
});

// Save/Update Document
  // Takes in a Document's Id as a url parameter
  // Takes in the Id of the User that did the edit
  // Takes in the Document content, to save to the database
router.post( '/doc/:docId', ( req, res ) => {
    if( !req.params.docId ) return handleError( res, "No document found (Invalid Document Id), cannot Save Document" );
    if( !req.body.userId ) return handleError( res, "No user found (Invalid User Id), cannot Save Document" );
    if( !req.body.content ) return handleError( res, "No document content found, cannot Save Document" );
    var documentUpdateObj = {
        content: req.body.content,
        lastEditTime: Date.now()
    };
    this.body.title ? documentUpdateObj.title = this.body.title : null;
    Document.findByIdAndUpdate( req.params.docId, documentUpdateObj ).exec()
    .catch( findDocumentError => handleError( res, "Find Document Error: " + findDocumentError ) )
    .then( updatedDocument => {
        res.json({ success: true });
    });
});

// Test function
router.post( '/test', ( req, res ) => {
    User.findById( req.body.userId ).exec()
    .then( foundUser => {
        var docList = foundUser.docList;
        console.log( docList[0] == "5ab1594ef0073141e0def86e" );
        res.json({ item: docList[0] })
    })
});

module.exports = router;
