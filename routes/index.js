var express = require('express');
var router = express.Router();
var cheerio = require('cheerio');
var basex = require('basex');
var client = new basex.Session("127.0.0.1", 1984, "admin", "admin");
var url = require('url');
var XmlStream = require('xml-stream');
var http = require('http');

var isXQuery = false;


var DEFAULT_NAMESPACE = "XQUERY declare default element namespace 'http://www.tei-c.org/ns/1.0';";
/* GET home page. */
// router.get('/', function(req, res, next) {
//   res.render('index', { title: 'Express' });
// });

client.execute("OPEN Colenso");
// client.execute("xquery //movie[position() 

router.get("/", function(req, res, next) {
client.execute("XQUERY declare default element namespace 'http://www.tei-c.org/ns/1.0'; " +
"/TEI[. contains text 'natives' ftand 'Elizabeth']",
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
  
  var input = decodeInput(req.query.srch + "?" + (isXQuery ? "xquery" : "plain"));
  
  // console.log("INPUT LENGTH: " + input.length);
  // client.execute("XQUERY declare namespace tei='http://www.tei-c.org/ns/1.0'; " +
  // "(collection('Colenso_TEIs/Colenso/private_letters')//tei:p[position() = 1])",
  
  console.log("INPUT: " + input + " URL: " + fullUrl(req));
  
//   // If there is a search
  if (input != null && input.length > 0) {
    
    console.log("SEARCHING GHEE..." + input);
  
    // Check if it is a xml document 
    client.execute("XQUERY db:is-xml('Colenso', '" + input + "')", 
    function(error, xmlResult) {
      
      if (error)
        console.log(error);
      
      if (xmlResult.result == 'true') {
        
        isXML = true;
        
        console.log("OMG, XML!!!");
        
        // Get the filepath and filename of the document
        var filepath = input;
        var filename = filepath.split("/")[(filepath.split("/").length - 1)];
        
        client.execute("XQUERY doc('Colenso_TEIs/" + input + "')",
        function(error, result) {
        
          if (error)
            console.log(error);
          else 
            console.log(result);
 
          console.log("OKAY OKAY O FUCKING KAY");
          res.render('file', {title: 'Search Archives', content: result.result, path: filepath, name: filename });
          return;
        });
      } else {
        
        console.log("                      NOT AN XML");
        // Otherwise continue searching
        client.execute(input, function(error, result) {
        
          if (error)
            console.log("ERROR:" + error);
          else
            console.log("SEARCH RESULT: " + result.result);
          
          var resultsArray = result.result.split("\n");
        
          res.render('results', { title: 'Search Archives', res: resultsArray, srch: (error ? "Bad Input: " + input : req.query.srch)});        
        });
      }
   });
  }
  // No search
  else {
    res.render('results', { title: 'Search Archives', res: '', srch: ''});
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
  
  // Check if it is a xml document 
  client.execute("XQUERY db:is-xml('Colenso', '" + path + "')", 
  function(error, xmlResult) {
    
    if (error)
      console.log(error);
    
    if (xmlResult.result == 'true') {
      
      isXML = true;
      
      console.log("OMG, XML!!!");
      
      // Get the filepath and filename of the document
      var filepath = path;
      var filename = filepath.split("/")[(filepath.split("/").length - 1)];
      
      client.execute("XQUERY doc('Colenso_TEIs/" + path + "')",
      function(error, result) {
      
        if (error)
          console.log(error);
        else 
          console.log(result);
        
        res.render('file', {title: 'Browse Archives', content: result.result, path: filepath, name: filename });
        return;
      });
    } else {
      
      console.log("PATH NORMAL: " + path);
      // Otherwise continue as normal
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
        
        for (var i = 0; i < authors.length; i++) {
          // authors[i] = authors[i].split("/")[depth];
          // console.log("AUTHOR BROWSE: " + authors[i]);
        }
        
        // Filter the list
        authors = authors.filter( onlyUnique );
        
        if (path != "distinct-values (//author/name[@type='person']/text())")
          path += "/";
        
        res.render('browse', { title: 'Browse Archives', authors: authors, path: path});
      });
    }
  });
});

/* DOWNLOAD */
router.get('/download/:name', function(req, res) {
  
  var filepath = req.query.path;
  var input = "XQUERY doc('Colenso_TEIs/" + filepath + "')";
  
  client.execute(input, function(error, result) {
    res.send(result.result);
  });
});

/* EDIT */
router.get('/edit/*', function(req, res) {
  
  console.log("EDITING!!!!");
  
  var editedText = req.body.editBox
  var path = req.params[0];
  console.log(editedText);
  
  if(editedText) {
    
    var input = 'REPLACE ' + path + ' "' + editedText + '"';
    
    client.execute(input, function(error, result) {
   
      if(error)
        console.log(error);
      else
        console.log(result);
    });
  }
});

/* UPLOAD */
router.post('/upload', function(req, res, next) {
  
  var file = req.file;
  var targetLoc = req.query.title;
  console.log("FILE PATH: " + targetLoc);
  
  if(file) {
    
    var input = 'REPLACE ' + targetLoc + file.originalname + ' "' 
    + file.buffer.toString() + '"';
    client.execute(input, function(error, result) {
      
      if(error)
        console.log(error);
      else
        console.log(result);
      
    });
  }
});

router.get('/xquery', function(req, res) {
  isXQuery = true;
});

router.get('/plain', function(req, res) {
  isXQuery = false;
});

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
  
  // Author (?author)
  else if (contains(search, "?author")) {
    console.log("SEARCH IS ?AUTHOR");
    
    var author = removeTags(search);
    console.log("AUTHOR TAG: " + author);
    
    // Special case
    if (contains(author, ".xml"))
      return author;
    
    return "for $file in (//author/name[@type='person' and .='" + author + "'])" +
           "return db:path($file)";
  }
  
  // Specific title (?title)
  else if (contains(search, "?title")) {
    
    console.log("SEARCH IS ?TITLE");
    // Remove tags
    
    refinedSearch = removeTags(search);
    
    // first check if it is an xml
    
//     console.log("SEARCH IS THIS: " + search);
//     
//     // Shit we need to make it a path
//     if (!contains(search, "/")) {
//       
//       console.log("EHHHHHHH");
//       
//       client.execute(DEFAULT_NAMESPACE + "for $file in collection('Colenso')" +
//            "where $file //title[.= '" + title + "']" +
//            "return db:path($file)",
//       function(err, res) {
//         if (!err)
//           search = res.result;
//         console.log("SEARCH IS: " + search + " HERE");
//         
//         return false;
//       });
//     }
//     
//     console.log("BUT: " + search + " HERE");
//     
//     client.execute("XQUERY db:is-xml('Colenso', '" + search + "')",
//     function(error, result) {
//       if (!error) {
//         console.log("This is it boy!!!!");
//         return "XQUERY doc('Colenso_TEIs/" + search + "')";
//       }
//     });
//     
//     console.log("SEARCH IS ?TITLE");
    
     if (!contains(search, "/") && contains(search, "?xquery"))
       return "for $file in collection('Colenso')" +     
              "where $file //title[.= '" + refinedSearch + "']" +
              "return db:path($file)";
      
      return refinedSearch;
//     var title = search;
//     console.log("TITLE: " + title);
//     // return "for $n in (//title[.= " + title + "]/text()) return db:path($n)"
//   
//     return "for $file in collection('Colenso')" +
//            "where $file //title[.= '" + title + "']" +
//            "return db:path($file)";
//     
  }
  
  // XQuery (?xquery)
  else if (contains(search, "?xquery")) {
    console.log("SEARCH IS ?XQUERY");
    
    // Adds namespace for noobs
    var beh = (!contains(search, DEFAULT_NAMESPACE)) ? DEFAULT_NAMESPACE + search.replace("?xquery", "") 
    : search.replace("?xquery", "");
    
    return beh;
  }
  
  // Plain Text (?plain)
  else if (contains(search, "?plain")) {
     console.log("SEARCH IS ?PLAIN");
     
    if (search == null)
      return search;
      
     var query = search.replace("?plain", "");
     console.log("SEARCHING FOR: " + query);
     //  "$file //author/name[.= '" + query + "'])" +
     
     var beh = "for $file in (/TEI[. contains text " + parsePlainSearch(query) + " using wildcards])" + 
               "return db:path($file)";
     
     // beh = "/TEI[. contains text '" + query + "']";
     
//      client.execute("XQUERY declare default element namespace 'http://www.tei-c.org/ns/1.0'; " +
//      query, function(err, res) {
//        if (!err)
//          console.log(res);
//      });
     
     return DEFAULT_NAMESPACE + beh;
     
     // "/TEI[. contains text 'natives' ftand 'Elizabeth']"
     // (//title[../author/name[@type='person' and .='Joseph Dalton Hooker']]/text())
  }
  
  return search;
}

function removeTags(string) {
  if (contains(string, "?xquery"))
    string = string.replace("?xquery", "");
  
  if (contains(string, "?plain"))
    string = string.replace("?plain", "");
  
  if (contains(string, "?title"))
    string = string.replace("?title", "");
  
  if (contains(string, "?author"))
    string = string.replace("?author", "");
  
  return string;
}

/* Decode the search to see what key it contains */
function contains(string, substring) {
  return string.indexOf(substring) > -1;
}

function onlyUnique(value, index, self) { 
  return self.indexOf(value) === index;
}

String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.split(search).join(replacement);
};

String.prototype.splice = function(idx, rem, str) {
    return this.slice(0, idx) + str + this.slice(idx + Math.abs(rem));
};

function parsePlainSearch(string) {
  
  var array = string.split(/(\s+)/);
  
  string = "'" + string;
  
  var special = false;
  
  if (array[0].charAt(0) == '-') {
    special = true;
    string = array[0].splice(1, 0, "'");
  }
  
  string = string.replaceAll(" && ", " 'ftand' ");
  string = string.replaceAll(" || ", " 'ftor' ");
  string = string.replaceAll("&&", " 'ftand' ");
  string = string.replaceAll("||", " 'ftor' ");
  string = string.replaceAll(" -", " 'ftnot' ");
  string = string.replaceAll("-", " 'ftnot' ");
  string += "'";
  
  // Special case
  if (special)
    string = string.replace("'ftnot'", "ftnot");
  
  return string;
}

module.exports = router;