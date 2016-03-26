var express = require('express');
var router = express.Router();
var cheerio = require('cheerio');
var basex = require('basex');
var client = new basex.Session("127.0.0.1", 1984, "admin", "admin");
var url = require('url');

/* GET home page. */
// router.get('/', function(req, res, next) {
//   res.render('index', { title: 'Express' });
// });

client.execute("OPEN Colenso");
// client.execute("xquery //movie[position() 

router.get("/", function(req, res, next) {
client.execute("XQUERY declare default element namespace 'http://www.tei-c.org/ns/1.0';" +
" (//name[@type='place'])[1] ",
  function (error, result) {
    console.log('Searched');
    console.log(result.result);
    if(error)
      console.error(error + " OH GOD");
    else 
      res.render('index', { title: 'The Colenso Project', place: result.result });
  });
});

/* SEARCH. */
router.get('/results', function(req, res, next) {
  
  var input = decodeInput(req.query.srch);
  
  // client.execute("XQUERY declare namespace tei='http://www.tei-c.org/ns/1.0'; " +
  // "(collection('Colenso_TEIs/Colenso/private_letters')//tei:p[position() = 1])",
  
  console.log("INPUT: " + input + " URL: " + fullUrl(req));
  
//   // If there is a search
  if (input != null && input.length > 0) {
    
    console.log("SEARCHING GHEE..." + input);
    
    client.execute("XQUERY declare default element namespace 'http://www.tei-c.org/ns/1.0';" +
     input,
    
    function(error, result) {
      if (error)
        console.log(error);
      else
        console.log(result.result);
      
      var resultsArray = result.result.split("\n");
      console.log("ENTRIES...");
      
      resultsArray.forEach(function(entry) {
        console.log(entry);
      });
      
      res.render('results', { title: 'Search Archives', res: resultsArray, srch: req.query.srch});
    }); 
  }
  // No search
  else {
    res.render('results', { title: 'Search Archives', res: '', srch: '' });
    console.log("NO SEARCH");
  }
  
});

/* BROWSE */
router.get("/browse", function(req, res, next) {
  
  //db:list('Colenso_TEIs', path);
  
  var path = req.query.path;
  var authors = [];
  var paths = [];
  
  if (!path)
    path = " distinct-values (//author/name[@type='person']/text())";
  
  client.execute("XQUERY declare default element namespace 'http://www.tei-c.org/ns/1.0';" + path, 
  
  function(error, result) { 
    
    if(!error) 
      console.log(res.result)
    else
      console.error(error);
    
    authors = result.result.split("\n");
  });
  
  for (i = 0; i < authors.length; i++) {
    console.log("AUTHOR BROWSE: " + authors[i]);
    paths.push(findPathOfAuthor(authors[i]));
    console.log("PATH BROWSE: " + findPathOfAuthor(authors[i]));
  }
  
  res.render('browse', { title: 'Browse', authors: authors, paths: paths });
});

function findPathOfAuthor(author) {
  
  console.log("AUTHOR: " + author);
  
  path = "for $n in (//title[../author/name[@type='person' and .='" + author + "']]/text())\n" +
"return db:path($n)"

  console.log("PATH: " + path);
  
  client.execute("XQUERY declare default element namespace 'http://www.tei-c.org/ns/1.0';" +
  path, 
  function(error, result) {
    console.log("SEARCHINGS... ");
    if (!error) {
      console.log("IN HERE");
      var beh = result.result.split("\n")
      var eh = beh[0].split("/");
      console.log("EH: " + eh[0]);
      return eh[0];
    }
    if (error) 
      console.log("HOLY SHIT, HOLY SHIT " + error);
  });
  
  console.log("Got here");
  return path;
}

// http://localhost:3000/XQUERY declare default element namespace 'http://www.tei-c.org/ns/1.0'; 
// (//title[../author/name[@type='person' and .='Joseph Dalton Hooker']]/text())

/* HELPER FUNCTIONS */

var url = require('url');

/* Find the URL of a request */
function fullUrl(req) {
  return url.format({
    protocol: req.protocol,
    host: req.get('host'),
    pathname: req.originalUrl
  });
}

function decodeInput(search) {
  
  if (search == null)
    return search;
  
  if (isXQuery(search))
    return search;
  
  // TODO need to change this for plain text
  return search;
}

/* Decode the search to see if it is xquery */
function isXQuery(search) {
  var urlArray = search.split("#");
  return urlArray.length > 2 && (urlArray.indexOf(search) > -1);
}

module.exports = router;