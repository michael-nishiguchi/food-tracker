var express = require('express');
var router = express.Router();
const { OAuth2Client } = require('google-auth-library');
var CLIENT_ID = '511289183336-vh5i33jabhhq6d1fa3mcd8fq9h96f7pa.apps.googleusercontent.com';
const client = new OAuth2Client(CLIENT_ID);

/* GET home page. */
router.get('/', (req, res, next) => {
	res.render('index', { title: 'Food Tracker' });
});
router.get('/about', (req, res, next) => {
	res.render('about', { title: 'about' });
});
router.get('/profile', checkAuthenticated, (req, res) => {
	let user = req.user;
	res.render('profile', {
		user,
		title: 'profile'
	});
});
router.get('/login', (req, res) => {
	console.log('get login');
	res.render('login', { title: 'Log in' });
});
router.post('/login', (req, res) => {
	let token = req.body.token;

	async function verify() {
		const ticket = await client.verifyIdToken({
			idToken: token,
			audience: CLIENT_ID
		});
		const payload = ticket.getPayload();
		const userid = payload['sub'];
		console.log(payload);
	}
	verify()
		.catch(console.error)
		.then(() => {
			res.cookie('session-token', token);
			res.send('success');
		})
		.catch(console.error);
});

router.get('/protectedRoute', checkAuthenticated, (req, res) => {
	res.send('This route is protected');
});
router.get('/logout', (req, res) => {
	res.clearCookie('session-token');
	res.redirect('/login');
});

function checkAuthenticated(req, res, next) {
	let token = req.cookies['session-token'];

	let user = {};

	async function verify() {
		const ticket = await client.verifyIdToken({
			idToken: token,
			audience: CLIENT_ID // Specify the CLIENT_ID of the app that accesses the backend
		});
		const payload = ticket.getPayload();
		user.name = payload.name;
		user.email = payload.email;
		user.picture = payload.picture;
	}

	verify()
		.then(() => {
			req.user = user;
			next();
		})
		.catch((err) => {
			console.log(err);
			res.redirect('/login');
		});
}
module.exports = router;
