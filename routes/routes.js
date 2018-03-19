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

// Register New User
  // Saves a hashed version of the password
router.post( '/register', function( req, res, next ) {
  if( !req.body.username ) return res.json({ success: false, error: "Error: No username" });
  if( !req.body.password ) return res.json({ success: false, error: "Error: No password" });
  var newUser = new User({
    username: req.body.username,
    password: hashPassword( req.body.password )
  });
  newUser.save( function( saveError ) {
    if( saveError ) return res.json({ success: false, error: saveError });
    res.json({ success: true });
  });
});

// Login
router.post( '/login', function( req, res, next ) {
  if( !req.body.username ) return res.json({ success: false, error: "Error: No username" });
  if( !req.body.password ) return res.json({ success: false, error: "Error: No password" });
  User.findOne( { username: req.body.username }, function( findUserError, foundUser ) {
    if( findUserError ) return res.json({ success: false, error: findUserError });
    if( !foundUser ) return res.json({ success: false, error: "Incorrect Username" });
    if( foundUser.password != hashPassword( req.body.password ) ) return res.json({ success: false, error: "Incorrect Password" });
    res.json({ success: true, userId: foundUser._id, userDocList: foundUser.docList });
  });
});

// Create new Document
router.post( '/newDoc' function( req, res, next ) {
  if( !req.body.userId ) return res.json({ success: false, error: "Not logged in" });
  User.findById( req.body.userId, function( findUserError, foundUser ){
    if( findUserError ) return res.json({ success: false, error: findUserError });
    if( !foundUser ) return res.json({ success: false, error: "Invalid User Id" });
    var newDocument = new Document({});
    newDocument.save( function( saveError, savedDocument ) {
      if( saveError ) return res.json({ success: false, error: saveError });
      res.json({ success: true, documentId: savedDocument._id });
    });
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
  
**/
