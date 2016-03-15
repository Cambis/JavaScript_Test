
var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
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

module.exports = router;
