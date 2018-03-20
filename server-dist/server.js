'use strict';

// Dependencies
var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;

var routes = require('../routes/routes.js');
var app = express();

// if( !process.env.MONGODB_URI ) {
// throw new Error( "process.env.MONGODB_URI is missing" );
// }
// var MONGODB_URI = process.env.MONGODB_URI;
// mongoose.connect( MONGODB_URI );

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(require('express-session')({
    secret: "theTopHalfOfAPizza",
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);

var crypto = require('crypto');
function hashPassword(word) {
    var hash = crypto.createHash('sha256');
    hash.update(word + 'amazingDisplayOfSkill,withTheGreatestOfEase');
    return hash.digest('hex');
}
// Passport Config
var User = require('../models/user.js');
passport.use(new LocalStrategy(function (username, password, done) {
    User.findOne({ username: username }).exec().catch(function (findUserError) {
        return done(findUserError);
    }).then(function (foundUser) {
        if (!foundUser) return done("null", false, { message: "Incorrect Username" });
        if (foundUser.password !== hashPassword(password)) return done("null", false, { message: "Incorrect Password" });
        return done(null, foundUser);
    });
}));
passport.serializeUser(function (user, done) {
    done(null, user.id);
});
passport.deserializeUser(function (id, done) {
    User.findById(id).exec().catch(function (findUserError) {
        return done(findUserError);
    }).then(function (foundUser) {
        if (!foundUser) return done("null", false, { message: "Unable to find User" });
        done(null, foundUser);
    });
});

// Catch 404 Error and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

module.exports = app;