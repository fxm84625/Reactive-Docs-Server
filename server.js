// Dependencies
var express = require( 'express' );
var path = require( 'path' );
var bodyParser = require('body-parser');
// var mongoose = require('mongoose');
// var passport = require('passport');
// var LocalStrategy = require('passport-local').Strategy;

var routes = require('./routes/routes.js');
var app = express();

// if( !process.env.MONGODB_URI ) {
  // throw new Error( "process.env.MONGODB_URI is missing" );
// }
// var MONGODB_URI = process.env.MONGODB_URI;

app.use( bodyParser.json() );
app.use( bodyParser.urlencoded({ extended: false }) );
// app.use( require( 'express-session' )({
    // resave: false,
    // saveUninitialized: false
// }));
// app.use(passport.initialize());
// app.use(passport.session());
app.use( express.static(path.join(__dirname, 'public') ) );

app.use( '/', routes );

// Passport Config
var User = require('./models/user.js');
// passport.use( new LocalStrategy( Account.authenticate() ) );
// passport.serializeUser( Account.serializeUser() );
// passport.deserializeUser( Account.deserializeUser() );

// mongoose.connect( MONGODB_URI );

// Catch 404 Error and forward to error handler
app.use( function( req, res, next ) {
    var err = new Error( 'Not Found' );
    err.status = 404;
    next( err );
});

module.exports = app;
