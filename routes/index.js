var express = require('express');
var router = express.Router();
var cheerio = require('cheerio');
var basex = require('basex');
var client = new basex.Session("127.0.0.1", 1984, "admin", "admin");
var url = require('url');
var XmlStream = require('xml-stream');
var http = require('http');

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
  
  // XQUERY db:is-xml('Colenso', '" + path + "')";
  // XQUERY doc('Colenso_TEIs/" + path + "')";
  
  var input = decodeInput(req.query.srch);
  var path = req.query.path;
  
  // client.execute("XQUERY declare namespace tei='http://www.tei-c.org/ns/1.0'; " +
  // "(collection('Colenso_TEIs/Colenso/private_letters')//tei:p[position() = 1])",
  
  console.log("INPUT: " + input + " URL: " + fullUrl(req));
  console.log("PATH: " + path);
  
//   // If there is a search
  if (input != null && input.length > 0) {
    
    console.log("SEARCHING GHEE..." + input);
    
    client.execute("XQUERY declare default element namespace 'http://www.tei-c.org/ns/1.0';" +
     input,
    
    function(error, result) {
      
      var isXML = false;
      
      if (error)
        console.log(error);
      else
        console.log("SEARCH RESULT: " + result.result);
      
      // Get the filepath and filename of the document
      var filepath = result.result;
      var filename = filepath.split("/")[(filepath.split("/").length - 1)];
      
      // Check if it is a xml document 
      client.execute("XQUERY db:is-xml('Colenso', '" + result.result + "')", 
      function(error, xmlResult) {
        if (error)
          console.log(error);
        else
          console.log("IS XML? " + result.result);
        
        if (xmlResult.result == 'true') {
          isXML = true;
          console.log("OMG, XML!!!");
          client.execute("XQUERY doc('Colenso_TEIs/" + result.result + "')",
          function(error, result) {
            if (error)
              console.log(error);
            else 
              console.log(result);
            
	    console.log("FILEPATH: " + filepath);
	    console.log("FILENAME: " + filename);
	    
            res.render('file', {title: 'Search Archives', content: result.result, path: filepath, name: filename });
            return;
          });
        } else {
                
          var resultsArray = result.result.split("\n");
          console.log("ENTRIES...");
          
          resultsArray.forEach(function(entry) {
            console.log(entry);
          });
          
          res.render('results', { title: 'Search Archives', res: resultsArray, srch: req.query.srch, path: path});
        }
      });
    }); 
  }
  // No search
  else {
    res.render('results', { title: 'Search Archives', res: '', srch: '', path: '' });
    console.log("NO SEARCH");
  }
  
});

/* BROWSE */
router.get("/browse", function(req, res, next) {
  
  //db:list('Colenso_TEIs', path);
  
  var path = decodeInput(req.query.srch);
  var authors = [];
  
  if (!path)
    path = "distinct-values (//author/name[@type='person']/text())";
  
  console.log("PATH: " + path);
  
  client.execute("XQUERY declare default element namespace 'http://www.tei-c.org/ns/1.0';" + 
  path, 
  
  function(error, result) { 
    
    if(!error) {
      console.log("BROWSE: " + result.result)
    }
    else
      console.error(error);
    
    authors = result.result.toString().split("\n");
    console.log("THERE ARE " + authors.length + " AUTHORS");
  // });
  
    // Find the depth of the directory
    var depth = (path != 'undefined' && path != "distinct-values (//author/name[@type='person']/text())") 
    ? result.result.toString()[0].split("/").length : 0;
    
    console.log("DEPTH: " + depth);
    
    for (var i = 0; i < authors.length; i++) {
      authors[i] = authors[i].split("/")[depth];
      console.log("AUTHOR BROWSE: " + authors[i]);
    }
    
    // Filter the list
    authors = authors.filter( onlyUnique );
    
    if (path != "distinct-values (//author/name[@type='person']/text())")
      path += "/";
    
    res.render('browse', { title: 'Browse', authors: authors});
  });
});

// XXX: do not use me
// "for $n in (//title = title//) return db:path($n)"
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

/* DOWNLOAD */
router.get('/download/:name', function(req, res) {
  
  var filepath = req.query.path;
  var input = "XQUERY doc('Colenso_TEIs/" + filepath + "')";
  
  client.execute(input, function(error, result) {
    res.send(result.result);
  });
});

/* EDIT */
router.get('/edit/:name', function(req, res) {
  
  var filepath = req.query.path;
  
  // This needs to be the edited file
  var filename = filepath.split("/")[(filepath.split("/").length - 1)];
  
  console.log("FILE TO BE OVERWRITTEN: " + filename);
  var input = "XQUERY xmldb:remove(Colenso, 'Colenso_TEIs/" + filepath + "');" +
  "XQUERY xmldb:store(Colenso, 'Colenso_TEIs/" + filename + "')";
  console.log("IN HERE CUZ");
  
  
  
});
/* DOWNLOAD 
// I think I went over board with this...
router.get("/download", function(req, res, next) {
  
  var request = http.get(url).on('response', function(response) {
    
    // Store documents here
    var documents = {};
    
    var processDocument = function(item) {
      
      // Collect document properties
      var document = {};
      document.type = item.$name;
      document.title = item['dc:title'];
      document.date = item['dc:date'];
      document.verURL = item.$['rdf:about'];
      document.trURL = item['doc:versionOf'].$['rdf:resource'];

      // If we have already seen a version of this document
      if (documents[document.trURL]) {
	  // Check to see if this one is newer and if so overwrite it
	  var old = documents[document.trURL];
	  if (old.date < document.date) {
	      documents[document.trURL] = document;
	  }
      } else {
	  // Store the new entry
	  documents[document.trURL] = document;
      }
    };
    
    var xml = new XmlStream(response, 'utf8');
    
    // Process each type of document
    xml.on('updateElement: WD', processDocument);
    xml.on('updateElement: LastCall', processDocument);
    xml.on('updateElement: CR', processDocument);
    xml.on('updateElement: PR', processDocument);
    xml.on('updateElement: REC', processDocument);
    xml.on('updateElement: NOTE', processDocument);

    xml.on('end', function () {
        
	// Write out JSON data of documents collection
        console.log(JSON.stringify(documents));
    });
  });
});

*/
// http://localhost:3000/XQUERY declare default element namespace 'http://www.tei-c.org/ns/1.0'; 
// (//title[../author/name[@type='person' and .='Joseph Dalton Hooker']]/text())

/* HELPER FUNCTIONS */
/* Find the URL of a request */
function fullUrl(req) {
  return url.format({
    protocol: req.protocol,
    host: req.get('host'),
    pathname: req.originalUrl
  });
}

/* Decode the input to parse to basex */
function decodeInput(search) {
  
  console.log("DECODING INPUT... ");
  
  // Bad search or no search
  if (search == null) {
    console.log("SEARCH IS NULL");
    return search;
  }
  
  // XQuery (#xquery)
  else if (contains(search, "xquery")) {
    console.log("SEARCH IS #XQUERY");
    return search;
  }
  
  // Author (?author)
  else if (contains(search, "?author")) {
    console.log("SEARCH IS ?AUTHOR");
    
    var authorArray = search.split("?");
    var author = authorArray[0];
    
    return "for $file in (//author/name[@type='person' and .='" + author + "'])" +
           "return db:path($file)";
  }
  
  // Specific title (?title)
  else if (contains(search, "?title")) {
    
    console.log("SEARCH IS ?TITLE");
    
    var titleArray = search.split("?");
    var title = titleArray[0];
    
    console.log("TITLE: " + title);
    // return "for $n in (//title[.= " + title + "]/text()) return db:path($n)"
  
   return "for $file in collection('Colenso')" +
          "where $file //title[.= '" + title + "']" +
          "return db:path($file)";
    
  }
  
  // TODO need to change this for plain text
  // Plain text (#plain)
  console.log("SEARCH IS #PLAIN");
  return search;
}

/* Decode the search to see what key it contains */
function contains(string, substring) {
  console.log("SEARCH: " + string);
  // var urlArray = search.split("?");
  // return urlArray.length > 2 && (urlArray.indexOf(item) > -1);
  return string.indexOf(substring) > -1;
}

function onlyUnique(value, index, self) { 
    return self.indexOf(value) === index;
}

module.exports = router;