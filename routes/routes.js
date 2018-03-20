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
            docIdList.push( Document.findById( item )
            .populate( "owner", "username" )
            .populate( "collaboratorList", "username" )
            .exec() );
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
    .catch( documentSaveError => handleError( res, "Document Save Error: " + documentSaveError ) )
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

// Get Document
  // Takes in a Document's Id as a url parameter
router.get( '/doc/:docId', ( req, res ) => {
    if( !req.params.docId ) return handleError( res, "No Document found (Invalid Document Id), cannot open Document" );
    if( !req.body.userId ) return handleError( res, "No User found (Invalid User Id), cannot open Document" );
    Document.findById( req.params.docId ).exec()
    .catch( documentFindError => handleError( res, "Document Find Error: " + documentFindError ) )
    .then( foundDocument => {
        if( foundDocument.collaboratorList.includes( req.body.userId ) ) {
            return res.json({ success: false, documentId: req.params.docId, error: "Document Add Error: Document already linked to User" });
        }
        return res.json({ success: true, document: foundDocument });
    });
});

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
        if( foundUser.docList.includes( req.body.docId ) ) {
            return handleError( res, "User already has access to this Document (DocId already in User's DocList)" );
        }
        currentUser = foundUser;
        return Document.findById( req.body.docId ).exec();
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

// Save Document
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

// Delete Document
  // Takes in a Document's Id to delete from the database
router.delete( '/doc/:docId', ( req, res ) => {
    if( !req.params.docId ) return handleError( res, "No document found (Invalid Document Id), cannot Delete document" );
    Document.findByIdAndRemove( req.params.docId ).exec()
    .catch( deleteDocumentError => handleError( res, "Delete Document Error: " + deleteDocumentError ) )
    .then( () => {
        res.json({ success: true });
    });
});

module.exports = router;
