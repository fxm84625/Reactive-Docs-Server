var mongoose = require( 'mongoose' );
var Schema = mongoose.Schema;
var ObjectId = mongoose.Schema.Types.ObjectId;

// The contents of the Document are an EditorState object, from draft.js
  // Documents also have an Owner, and a list of collaborators    // The owner and list of collaborators are user id references
  // Users need a password to access a document
var Document = new Schema({
    content: {
        type: Array,
        default: []
    },
    owner: {
        type: ObjectId,
        required: true,
        ref: "users"
    },
    collaboratorList: {
        type: [{
          type: ObjectId,
          ref: "users"
        }],
        default: [],
    },
    title: {
        type: String,
        default: "Untitled"
    },
    password: {
        type: String
    },
    createdTime: {
        type: Date
    },
    lastEditTime: {
        type: Date
    }
},
    {
        minimize: false
    }
);

module.exports = mongoose.model( 'documents', Document );
