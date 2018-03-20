/*
    Back-end server
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
        if( saveError ) return handleError( res, saveError );
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
        if( sessionSaveError ) return handleError( res, sessionSaveError );
        res.json({ success: true });
    });
});

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
    if( !req.body.userId ) return handleError( res, "Not logged in (Unable to find userId), cannot creatre new Document" );
    // if( !req.body.password ) return res.json({ success: false, error: "No document password" });
    var updatedDocList;
    User.findById( req.body.userId ).exec()
    .catch( findUserError => handleError( res, findUserError ) )
    .then( foundUser => {
        // if( !foundUser ) return handleError( res, "Invalid User Id" );
        var newDocument = new Document({
            owner: foundUser._id,
            collaboratorList: [ foundUser._id ],
            title: req.body.title,
            createdTime: Date.now(),
            lastEditTime: Date.now()
        });
        updatedDocList = foundUser.docList.slice();
        return newDocument.save();
    })
    .catch( documentSaveError => handleError( res, documentSaveError ) )
    .then( savedDocument => {
        updatedDocList.push( savedDocument._id );
        return User.findByIdAndUpdate( req.body.userId, { docList: updatedDocList } );
    })
    .catch( updateUserError => handleError( res, updateUserError ) )
    .then( updatedUser => {
        res.json({ success: true, documentId: updatedUser.docList[ updatedUser.docList.length - 1 ] });
    });
});

// Save Document
router.post( '/doc/:docId', function( req, res ){

});

// router.post( '/' )

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
