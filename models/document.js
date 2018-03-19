var mongoose = require( 'mongoose' );
var Schema = mongoose.Schema;

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
// The Document's User Position List is an object with User Id's as keys, and their positions as values
  // The position value is an Array with format: [ lineNum, charNum ]
var Document = new Schema({
  content: {
    type: Array,
    default: []
  },
  userPosList: {
    type: Object,
    default: {}
  }
});

module.exports = mongoose.model( 'documents', Document );
