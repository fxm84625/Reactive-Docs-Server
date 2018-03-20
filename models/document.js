var mongoose = require( 'mongoose' );
var Schema = mongoose.Schema;
var ObjectId = mongoose.Schema.Types.ObjectId;

// The contents of the Document are a 2D Array
    // Each Outer Array represents one line of the Document,
    // and each Inner array represents one of the characters of that line.
    /**
            <span style={ float: right }>
            <span style={ color: green }> H </span>
            <span style={ color: black }> o </span>
            <span style={ color: blue  }> C </span>
            </span>
    **/
// Documents also have Owners ( creators ), a list of collaborators, and a password
var Document = new Schema({
    content: {
        type: Object,
        default: {}
    },
    owner: {
        type: ObjectId,
        required: true,
        ref: "users"
    },
    collaboratorList: {
        type: Array,
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
});

module.exports = mongoose.model( 'documents', Document );
