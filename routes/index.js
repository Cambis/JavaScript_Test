var express = require('express');
var router = express.Router();
var cheerio = require('cheerio');
var basex = require('basex');
var client = new basex.Session("127.0.0.1", 1984, "admin", "admin");

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
    
    if(error)
      console.error(error);
    else 
      res.render('index', { title: 'The Colenso Project', place: result.result });
  });
});

/* SEARCH. */
router.get('/results', function(req, res, next) {
  client.execute("XQUERY declare default element namespace 'http://www.tei-c.org/ns/1.0';" +
  " (//name[@type='place'])[1]",
  function(error, result) {
    if (error)
      console.log(error);
    else
      console.log(result.result);
  });
  res.render('results', { title: 'Search Archives', srch: req.query.srch});
});

/* XQUERY */
router.get("/xquery", function(req, res, next) {
  client.execute("LIST Colenso", 
  function(error, result) { 
    
    if(!error) 
      console.log(res.result)
    else
      console.error(error);
    
    res.render('xquery', { title: 'The Colenso Project', place: result.result });
  });
});

module.exports = router;