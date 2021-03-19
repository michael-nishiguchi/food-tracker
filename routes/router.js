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

//database
const { Pool } = require('pg');
const { admin_datatransfer_v1 } = require('googleapis');
const { json } = require('express');
const Cookies = require('cookies');
const pgConnection = new Pool({
	connectionString: process.env.DATABASE_URL,
	ssl: {
		rejectUnauthorized: false
	}
});

router.get('/', checkAuthenticated, (req, res, next) => {
	res.render('index', {
		user: req.user,
		title: 'Food Tracker'
	});
});
router.get('/about', (req, res, next) => {
	res.render('about', { title: 'about' });
});
router.get('/profile', checkAuthenticated, (req, res) => {
	res.render('profile', {
		user: req.user,
		title: 'profile'
	});
});
router.get('/login', (req, res) => {
	console.log('navigate login page');
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
	}
	verify()
		.then(() => {
			res.cookie('session-token', token);
			res.send('success');
		})
		.catch(console.error);
	console.log('end of login');
});
router.post('/search_name', checkAuthenticated, async (req, res) => {
	const search_term = req.body.food_search;
	//res.clearCookie('curr-search');
	console.log();
	const url =
		'https://api.edamam.com/api/food-database/v2/parser?ingr=' +
		search_term +
		'&app_id=' +
		app_id +
		'&app_key=' +
		app_key;

	getData(url, res)
		.then((search_results) => {
			// res.send(search_results);
			//console.log(JSON.stringify(search_results));
			res.render('profile', {
				user: req.user,
				search_results,
				title: 'results'
			});
		})
		.catch((error) => console.log(error));
});
router.get('/history', checkAuthenticated, (req, res) => {
	res.render('history', {
		title: 'results',
		user: req.user
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
	console.log('add food router');
	let food_name = req.body.label;

	let calories = req.body.calories;

	let fat = req.body.fat; //req.body.fat;
	let protein = req.body.protein; //req.body.protein;
	let carb = req.body.carb; //req.body.carb;

	let servings = req.body.quantity; //req.body.servings;
	let meal = req.body.meal; //req.body.meal;

	let userId = req.user.id;

	let sql =
		'INSERT INTO log (food_name, calories, fat, protein, servings, meal, userID, carb) VALUES($1, $2, $3, $4, $5, $6, $7, $8)';

	pgConnection.connect();
	pgConnection.query(sql, [ food_name, calories, fat, protein, servings, meal, userId, carb ], (err, result) => {
		if (err) {
			throw err;
		}
		else {
			console.log('food added');

			getHistory(userId, req.user, res);
		}
	});
});
router.get('/getHistory', checkAuthenticated, (req, res) => {});
router.post('/getNutrients', checkAuthenticated, (req, res) => {
	let quantity = req.body.servingInput;

	//let serving = req.body.serving;

	let uri = req.body.serving;
	// let servingUnit = req.body.serving[1];

	let foodId = req.body.foodId;
	let search_results = req.body.search_results;
	search_results = JSON.parse(search_results);
	let foodName = req.body.food_name;

	//let servingUnit = req.body.servingUnit;

	// let foodLabel = uri.substr(52);
	// console.log(foodLabel);

	//repopulate results

	const url =
		'https://api.edamam.com/api/food-database/v2/nutrients?app_id=' +
		nutrition_app_id +
		'&app_key=' +
		nutrition_app_key;

	let myFood = {
		ingredients: [
			{
				quantity: Number(quantity),
				measureURI: uri,
				foodId: foodId
			}
		]
	};

	postData(url, myFood, res)
		.then((nutrition_results) => {
			//console.log(nutrition_results);
			res.render('nutrition', {
				user: req.user,
				search_results,
				title: 'results',
				nutrition_results,
				food_name: foodName,
				quantity: quantity
			});
		})
		.catch((error) => console.log(error));
});

async function getData(url = '', res) {
	const response = await fetch(url, {
		method: 'GET',
		cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
		credentials: 'same-origin' // include, *same-origin, omit
	});
	return response.json();
}

async function postData(url = '', data, res) {
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
