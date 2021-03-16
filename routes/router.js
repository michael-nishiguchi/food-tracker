var express = require('express');
var router = express.Router();
const { OAuth2Client } = require('google-auth-library');
const { policytroubleshooter } = require('googleapis/build/src/apis/policytroubleshooter');
const CLIENT_ID = process.env.CLIENT_ID;
const client = new OAuth2Client(CLIENT_ID);
const app_id = process.env.APPLICATION_ID;
const app_key = process.env.APPLICATION_KEY;
const nutrition_app_id = process.env.NUTRITION_APP_ID;
const nutrition_app_key = process.env.NUTRITION_APP_KEY;
const fetch = require('node-fetch');
const { render } = require('../app');

//edamam api
const { NutritionAnalysisClient } = require('edamam-api');

//database
const { Pool } = require('pg');
const { admin_datatransfer_v1 } = require('googleapis');
const pgConnection = new Pool({
	connectionString: process.env.DATABASE_URL,
	ssl: {
		rejectUnauthorized: false
	}
});

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
	console.log('client id: ' + CLIENT_ID);
	console.log('app id: ' + app_id);
	console.log('app key: ' + app_key);
	let token = req.body.token;
	console.log('token: ' + token);

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

	// const headers = {
	// 	'Content-Type': 'application/json'
	// };
	// const options = {
	// 	method: 'get',
	// 	//body: JSON.stringify(data),
	// 	headers: {
	// 		'Content-Type': 'application/json'
	// 	}
	// };

	// fetch(url, { method: 'GET', headers: headers })
	// 	.then((res) => {
	// 		return res.json();
	// 	})
	// 	.then((json) => {
	// 		//	res.send(json);
	// 		res.render('profile', {
	// 			user: req.user,
	// 			data: json,
	// 			title: 'results'
	// 		});
	// 	});
	// Example POST method implementation:

	// postData(url, res).then((data) => {
	// 	console.log(data);
	// });

	getData(url, res)
		.then((data) => {
			//console.log(data);
			res.render('profile', {
				user: req.user,
				data,
				title: 'results'
			});
		})
		.catch((error) => console.log(error));
});
router.get('/history', (req, res) => {
	res.render('history', {
		title: 'results'
	});
});
router.get('/protectedRoute', checkAuthenticated, (req, res) => {
	res.send('This route is protected');
});
router.get('/logout', (req, res) => {
	res.clearCookie('session-token');
	res.redirect('/login');
});

router.get('/asdf', checkAuthenticated, (req, res) => {
	res.render('history', {
		title: 'results',
		message: 'asdfasdfasdf'
	});
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

	let userId = req.user.id;

	let sql =
		'INSERT INTO log (food_name, calories, fat, protein, date_eaten, servings, meal, userID) VALUES($1, $2, $3, $4, $5, $6, $7, $8)';

	pgConnection.connect();
	pgConnection.query(
		sql,
		[ food_name, calories, fat, protein, date_string, servings, meal, userId ],
		(err, result) => {
			if (err) {
				throw err;
			}
			else {
				console.log('food added');

				getHistory(userId, req.user, res);
			}
		}
	);
});
router.post('/getNutrients', checkAuthenticated, (req, res) => {
	let quantity = req.body.servingInput;
	let uri = req.body.serving;
	let foodId = req.body.foodId;

	// 	headers: {
	// 		'Content-Type': 'application/json'
	// 	}
	// };

	// fetch(url, { method: 'GET', headers: headers }) //, body: data })

	const url =
		'https://api.edamam.com/api/food-database/v2/nutrients?app_id=' +
		nutrition_app_id +
		'&app_key=' +
		nutrition_app_key;

	console.log(url);
	var myFood =
		'{"ingredients": [ { "quantity": ' + quantity + ', "measureURI": "' + uri + '", "foodId": "' + foodId + '"} ]}';
	console.log(myFood);
	myFood =
		'{"ingredients": [ { "quantity": 2, "measureURI": "http://www.edamam.com/ontologies/edamam.owl#Measure_ounce", "foodId": "food_akjf74ibll2id8aqb8xbha4t4axl"} ]}';
	console.log(myFood);
	postData(url, myFood, res)
		.then((data) => {
			res.send(data);
		})
		.catch((error) => console.log(error));
	//------------------------------------
	//------------------------------------
	//------------------------------------

	// const options = {
	// 	method: 'POST',

	// 	headers: {
	// 		'Content-Type': 'application/json'
	// 	}
	// };
	// const headers = {
	// 	'Content-Type': 'application/json'
	// };

	// var myFood =
	// 	'{"ingredients": [ { "quantity": ' + foodId + ', "measureURI": ' + uri + ', "foodId": ' + foodId + '} ]}';
	// console.log(myFood);

	// fetch(url, { method: 'POST', headers: headers }) //, body: data })
	// 	.then((res) => {
	// 		return res.json();
	// 	})
	// 	.then((json) => {
	// 		res.send(json);
	// 		// res.render('profile', {
	// 		// 	user: req.user,
	// 		// 	data: json,
	// 		// 	title: 'results'
	// 		// });
	// 	});
});

//curl -d @food.json -H "Content-Type: application/json" "https://api.edamam.com/api/food-database/v2/nutrients?app_id=9764ac59&app_key=975715f777eaff025dd5068d83816dfd"

async function getData(url = '', res) {
	const response = await fetch(url, {
		method: 'GET',
		cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
		credentials: 'same-origin' // include, *same-origin, omit

		// headers: {
		// 	'Content-Type': 'application/json'
		// },
		//body: JSON.stringify(data) // body data type must match "Content-Type" header
	});
	return response.json();
}

async function postData(url = '', data, res) {
	console.log(data);
	const response = await fetch(url, {
		method: 'POST',
		cache: 'no-cache',
		credentials: 'same-origin',

		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(data) // body data type must match "Content-Type" header
	});
	console.log('data posted');
	return response.json();
}

function getHistory(userId, user, res) {
	let sql = 'SELECT * FROM log WHERE userId = $1';

	const pgConnection = new Pool({
		connectionString: process.env.DATABASE_URL,
		ssl: {
			rejectUnauthorized: false
		}
	});

	pgConnection.connect();

	pgConnection.query(sql, [ userId ], (err, result) => {
		if (err) {
			throw err;
		}
		else {
			//res.send(result);
			res.render('history', {
				title: 'history',
				result,
				user
			});
			return;
		}
	});
	return;
}

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
		user.id = payload.sub;
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
