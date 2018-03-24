var mongoose = require( 'mongoose' );
var Schema = mongoose.Schema;
var ObjectId = mongoose.Schema.Types.ObjectId;

var Document = new Schema({
    /** /* The array represents the history, which is all saved versions of the Document
        content: [
            {
                editorState: EditorState rawContent,
                saveTime: Date,
                username: String,
                title: String
            }
        ]
    */
    content: {
        type: Array,
        default: []
    },
    /** /* The latest Auto-save of the Document
        autosave: {
            editorState: EditorState rawContent,
            saveTime: Date,
            title: String
        }
    */
    autosave: {
        type: Object,
        default: {}
    },
    // A User Id, which is the creator and owner of this Document
    owner: {
        type: ObjectId,
        required: true,
        ref: "users"
    },
    // A list of User Id's, representing all Users that have access to this Document
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
    // Password is used for other Users access this Document
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
