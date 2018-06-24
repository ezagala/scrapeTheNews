const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const ArticleSchema = new Schema({
  // `title` is required and of type String
  headline: {
    type: String,
    required: true,
    unique: true
  },
  // `link` is required and of type String
  imgSrc: {
    type: String,
    required: true
  },
  summary: {
    type: String, 
    required: false
  },
  date: {
    type: String
  },
  note: {
    type: Schema.Types.ObjectId,
    ref: "Note"
  }
});


const Article = mongoose.model("Article", ArticleSchema);

// Export the Article model
module.exports = Article;
