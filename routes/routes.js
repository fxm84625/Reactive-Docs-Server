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
    return res.json({ success: false, error: error })
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
        res.json({ success: true });
    });
});

// Login
router.post( '/login', passport.authenticate( 'local' ), ( req, res ) => {
    req.session.save( sessionSaveError => {
        if( sessionSaveError ) return handleError( res, sessionSaveError );
        res.json({ success: true, userId: req.user._id });
    });
});
// Login method without passports
/* router.post( '/login', function( req, res ) {
    if( !req.body.username ) return res.json({ success: false, error: "No username" });
    if( !req.body.password ) return res.json({ success: false, error: "No password" });
    User.findOne( { username: req.body.username }, function( findUserError, foundUser ) {
        if( findUserError ) return res.json({ success: false, error: findUserError });
        if( !foundUser ) return res.json({ success: false, error: "Incorrect Username" });
        if( foundUser.password != hashPassword( req.body.password ) ) return res.json({ success: false, error: "Incorrect Password" });
        res.json({ success: true, userId: foundUser._id, userDocList: foundUser.docList });
    });
}); */

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
            docIdList.push( Document.findById( item ).populate( "owner" ).exec() );
        });
        return Promise.all( docIdList );
    })
    .catch( findDocumentError => handleError( res, "Find Document Error: " + findDocumentError ) )
    .then( foundDocList => {
        res.json({ success: true, docList: foundDocList });
    });
});

// Create new Document
  // Checks if User is logged in
  // Creates a new Document object
  // Adds the new Document's Id to the User's DocumentList
  // Updates the User's DocumentList
router.post( '/doc/new', ( req, res ) => {
    if( !req.body.userId ) return handleError( res, "Not logged in (Invalid User Id), cannot create new Document" );
    // if( !req.body.password ) return res.json({ success: false, error: "No document password" });
    var updatedDocList;
    User.findById( req.body.userId ).exec()
    .catch( findUserError => handleError( res, "Find User Error: " + findUserError ) )
    .then( foundUser => {
        // if( !foundUser ) return handleError( res, "Invalid User Id" );
        var newDocument = new Document({
            owner: foundUser._id,
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
        updatedDocList.push( savedDocument._id );
        return User.findByIdAndUpdate( req.body.userId, { docList: updatedDocList } );
    })
    .catch( updateUserError => handleError( res, "Update User Error: " + updateUserError ) )
    .then( updatedUser => {
        res.json({ success: true, documentId: updatedUser.docList[ updatedUser.docList.length - 1 ] });
    });
});

// Get Document
  // Takes in a Document's Id as a url parameter
router.get( '/doc/:docId', ( req, res ) => {
    if( !req.params.docId ) return handleError( res, "No document found (Invalid Document Id), cannot open Document" );
    Document.findById( req.params.docId ).exec()
    .catch( documentFindError => handleError( res, "Document Find Error: " + documentFindError ) )
    .then( foundDocument => {
        res.json({ success: true, document: foundDocument });
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

/**
    class App
    render() {
        this.state.page === "login" ? <Login /> : null
        this.state.page === "register" ? <Register /> : null
        this.state.page === "main" ? <Main /> : null
        this.state.page === "document" ? <Document /> : null
    }
**
    /login
    /register
    /user/:userId
    /doc/:docId

    [ doc, doc, doc, doc ]
    doc: {

    }
**/
