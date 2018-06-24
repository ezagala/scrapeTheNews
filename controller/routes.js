const path = require("path");
const axios = require("axios");
const cheerio = require("cheerio");
const db = require("../models");
const moment = require("moment");

module.exports = app => {

  // Retrieve all headlines from the DB 
  app.get("/", function (req, res) {

    db.Article.find({})
      .then(function (Article) {
        res.json(Article);
      })
      .catch(function (err) {
        res.json(err);
      });

  });

  // Get route that scrapes the specified site for the content 
  app.get('/scrape', (req, res) => {

    // Capture the current date
    const date = moment().format("YYYY/MM/DD");

    // Pass the Democracy Now URL with the current date interpolated
    axios.get(`https://www.democracynow.org/${date}/headlines/`).then(function (response) {

      // Define shorthand for cheerio 
      const $ = cheerio.load(response.data);

      // Traverse each element with the headline class
      $(".headline").each(function (i, element) {

        // Declare object to store each piece
        const result = {};

        // Grab & store the piece's contents 
        result.headline = $(element)
          .children("h2")
          .text();

        result.imgSrc = $(element)
          .children("img")
          .attr("src");

        result.summary = $(element)
          .children(".headline_body")
          .children(".headline_summary")
          .children("p")
          .text();

        result.date = $(element)
          .children(".news_label")
          .children(".date")
          .text()

        // Create a new Article using the `result` object built from scraping
        db.Article.create(result)
          .then(function (dbArticle) {
            // View the added result in the console
            console.log(dbArticle);
          })
          .catch(function (err) {
            // If an error occurred, send it to the client
            return res.json(err);
          });

      });
    }).catch((error) => { // Catch any errors that may have occured hitting the URL
      // Error
      if (error.response) {
        // Log message if the server responds with anything except success 
        // Would be nice to render something that tells the user there are likely no headlines listed for the requested date (probably because it's the weekend). 
        console.log("The request was made and the server responded with a status code that falls out of the range of 2xx")
      } else if (error.request) {
        // The request was made but no response was received
        console.log("error.request is: ", error.request);
      } else {
        // Something happened in setting up the request that triggered an Error
        console.log('Error', error.message);
      }
      console.log("error.config is: ", error.config);
    });
    // Otherwise, all is well
    res.send("Woopty Woop!");
  });


  // Route for grabbing a specific Article by id, populate it with it's note
  app.get("/articles/:id", function (req, res) {
    // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
    db.Article.findOne({ _id: req.params.id })
      // ..and populate all of the notes associated with it
      .populate("Note")
      .then(function (dbArticle) {
        // If we were able to successfully find an Article with the given id, send it back to the client
        res.json(dbArticle);

      })
      .catch(function (err) {
        // If an error occurred, send it to the client
        res.json(err);
      });
  });

  // Route for saving/updating an Article's associated Note
  app.post("/articles/:id", function (req, res) {
    // Create a new note and pass the req.body to the entry
    db.Note.create( req.body)
      .then(function (dbNote) {
        console.log("The note should be: ", dbNote);
        // If a Note was created successfully, find one Article with an `_id` equal to `req.params.id`. Update the Article to be associated with the new Note
        return db.Article.findOneAndUpdate({ _id: req.params.id }, { note: dbNote._id }, { new: true });
      })
      .then(function (dbArticle) {
        // Send article back to the client
        res.json(dbArticle);
      })
      .catch(function (err) {
        // Catch errors and send em to the client 
        res.json(err);
      });
  });

  // Get note that is associated with an article
  app.get("/note/:id", (req, res) => {
    // id is the *article* id, not the note id 
    const id = req.params.id; 
    // Search for the article by id 
    db.Article.findOne({_id: id})
      .then(dbArticle => {
        // Then return the results of the search for the article's note by the note's id
        return db.Note.findOne({_id: dbArticle.note}); 
      }).then(function (dbNote) {
        // Send note back to the client
        res.json(dbNote);
      })
      .catch(function (err) {
        // Catch errors and send em to the client 
        res.json(err);
      });
  })

  // Delete note associated with an article 
  app.delete("/delete/:id", (req, res) => {
    // id is the *article* id, not the note id 
    const id = req.params.id; 
    // Search for the article by id 
    db.Article.findOne({_id: id})
      .then(dbArticle => {
        // Then return the results of the search for the article's note by the note's id
        return db.Note.remove({_id: dbArticle.note}); 
      }).then(function (dbNote) {
        // Send note back to the client
        db.Article.update({_id: id}, {$set: {note: ""}}); 
        res.send(`You've deleted the following note: ${dbNote}`);
      })
      .catch(function (err) {
        // Catch errors and send em to the client 
        res.json(err);
      });
  })

}