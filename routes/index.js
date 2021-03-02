var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Food Tracker' });
});
router.post('/verifyToken', function(req, res, next) {
  return res.redirect("https://facebook.com");
});
module.exports = router;
