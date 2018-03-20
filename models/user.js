var mongoose = require( 'mongoose' );
var Schema = mongoose.Schema;
mongoose.Promise = Promise;

if( !process.env.MONGODB_URI ) throw new Error( "process.env.MONGODB_URI is missing" );
mongoose.connect( process.env.MONGODB_URI );

// Users will have a Username, Password, and an array of Document Id's
    // Each Document Id is the id of a mongoDb Document object that they have access to
var User = new Schema({
    username: {
        type: String
    },
    password: {
        type: String
    },
    docList: {
        type: Array,
        default: []
    }
});

module.exports = mongoose.model( 'users', User );
