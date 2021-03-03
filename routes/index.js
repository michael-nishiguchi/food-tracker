var express = require('express');
var router = express.Router();
const { OAuth2Client } = require('google-auth-library');

/* GET home page. */
router.get('/', (req, res, next) => {
	res.render('index', { title: 'Food Tracker' });
});
router.get('/about', (req, res, next) => {
	res.render('about', { title: 'about' });
});
router.post('/login', (req, res, next) => {
	var CLIENT_ID = '511289183336-vh5i33jabhhq6d1fa3mcd8fq9h96f7pa.apps.googleusercontent.com';

	let token = req.body.token;

	const client = new OAuth2Client(CLIENT_ID);

	async function verify() {
		const ticket = await client.verifyIdToken({
			idToken: token,
			audience: CLIENT_ID
		});
		const payload = ticket.getPayload();
		const userid = payload['sub'];
		console.log(payload);
	}
	verify().catch(console.error).then(() => {
		res.cookie('session-token', token);
		res.send('success');
	});
});
router.get('/logout', (req, res) => {
	res.clearCookie('session-token');
	res.redirect('/login');
});
module.exports = router;
