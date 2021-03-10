var express = require('express');
var router = express.Router();
const { OAuth2Client } = require('google-auth-library');
const { policytroubleshooter } = require('googleapis/build/src/apis/policytroubleshooter');
const CLIENT_ID = process.env.CLIENT_ID;
//const CLIENT_ID = '511289183336-vh5i33jabhhq6d1fa3mcd8fq9h96f7pa.apps.googleusercontent.com';
const client = new OAuth2Client(CLIENT_ID);
const app_id = process.env.APPLICATION_ID;
const app_key = process.env.APPLICATION_KEY;
const fetch = require('node-fetch');
const { render } = require('../app');

console.log('client id: ' + client);
console.log('app id: ' + app_id);
console.log('app key: ' + app_key);

//database
const connectionString = process.env.DATABASE_URL;
const pg = require('pg');
const pool = new pg.Pool({ connectionString: connectionString });

console.log(app_id);
// console.log(CLIENT_ID);
// console.log(process.env.CLIENT_ID);
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
		console.log(payload);
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
router.post('/search_name', checkAuthenticated, async (req, res) => {
	const search_term = req.body.food_search;

	const url =
		'https://api.edamam.com/api/food-database/v2/parser?ingr=' +
		search_term +
		'&app_id=' +
		app_id +
		'&app_key=' +
		app_key;

	const headers = {
		'Content-Type': 'application/json'
	};
	const options = {
		method: 'get',
		//body: JSON.stringify(data),
		headers: {
			'Content-Type': 'application/json'
		}
	};

	fetch(url, { method: 'GET', headers: headers }) //, body: data })
		.then((res) => {
			return res.json();
		})
		.then((json) => {
			//	res.send(json);
			res.render('profile', {
				user: req.user,
				data: json,
				title: 'results'
			});
		});
});
router.get('/protectedRoute', checkAuthenticated, (req, res) => {
	res.send('This route is protected');
});
router.get('/logout', (req, res) => {
	res.clearCookie('session-token');
	res.redirect('/login');
});
router.post('/addFood', checkAuthenticated, (req, res) => {
	let food_name = 'pancakes'; //req.body.label;
	let calories = 69; //req.body.calories;
	let fat = 100; //req.body.fat;
	let protein = 20; //req.body.protein;

	let today = new Date();
	let date_string = today.getDate() + '/' + today.getMonth() + '/' + today.getFullYear();

	let servings = 2; //req.body.servings;
	let meal = 'lunch'; //req.body.meal;

	let userId = req.cookies['session-token'];

	let sql =
		'INSERT INTO log (food_name, calories, fat, protein, date_eaten, servings, meal, userID) VALUES($1, $2, $3, $4, $5, $6, $7, $8)';

	pool.query(sql, [ food_name, calories, fat, protein, date_string, servings, meal, userId ], function(err, result) {
		if (err) {
			console.log('Error adding log', err);
		}
		else {
			console.log('food log added');
		}
	});
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
