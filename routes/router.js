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

//controller
var edamam_controller = require('../controllers/edamam');

//database
const { Pool } = require('pg');
const { admin_datatransfer_v1 } = require('googleapis');
const { json } = require('express');
const Cookies = require('cookies');
const { homegraph } = require('googleapis/build/src/apis/homegraph');
const pgConnection = new Pool({
	connectionString: process.env.DATABASE_URL,
	ssl: {
		rejectUnauthorized: false
	}
});

router.get('/', (req, res) => {
	res.render('index', {
		user: req.user,
		title: 'Food Tracker'
	});
});
router.get('/about', (req, res) => {
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
});
router.post('/search_name', checkAuthenticated, async (req, res) => {
	const search_term = req.body.food_search;
	console.log();
	const url =
		'https://api.edamam.com/api/food-database/v2/parser?ingr=' +
		search_term +
		'&app_id=' +
		app_id +
		'&app_key=' +
		app_key;

	getData(url, res)
		.then(search_results => {
			res.render('search_results', {
				user: req.user,
				search_results,
				title: 'results'
			});
		})
		.catch(error => console.log(error));
});
router.get('/history', checkAuthenticated, (req, res) => {
	var today = new Date();
	let dateString = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
	getHistory(req.user, res, dateString);
});
router.post('/backDay', checkAuthenticated, (req, res) => {
	let date = req.body.date;
	// console.log(date);
	// const newDate = new Date(date);
	// console.log(newDate);
	// newDate.setDate(newDate.getDate() - 1);
	// console.log(newDate);
	getHistory(req.user, res, date);
});
router.post('/forwardDay', checkAuthenticated, (req, res) => {
	let date = req.body.date;
	const newDate = new Date(date);
	newDate.setDate(newDate.getDate() + 2);
	getHistory(req.user, res, newDate);
});
router.post('/selectDay', checkAuthenticated, (req, res) => {
	let day = req.body.date;
	getHistory(req.user, res, day);
});
router.get('/protectedRoute', checkAuthenticated, (req, res) => {
	res.send('This route is protected');
});
router.get('/logout', (req, res) => {
	console.log('logout');
	res.clearCookie('session-token');
	res.render('index', {
		title: 'home'
	});
});
router.post('/addFood', checkAuthenticated, (req, res) => {
	console.log('add food router');
	let food_name = req.body.label;
	let calories = req.body.calories;
	let fat = req.body.fat;
	let protein = req.body.protein;
	let carb = req.body.carb;
	let servings = req.body.quantity;
	let meal = req.body.meal;
	let date_eaten = req.body.date_eaten;
	let foodId = req.body.foodId;
	let serving_unit = req.body.serving_unit;
	let uri = req.body.uri;

	addFood(
		req,
		res,
		food_name,
		calories,
		fat,
		protein,
		servings,
		meal,
		carb,
		date_eaten,
		serving_unit,
		foodId,
		uri
	).then(() => {
		getHistory(req.user, res, date_eaten);
	});
});
router.post('/directAdd', checkAuthenticated, (req, res) => {
	let toSplit = req.body.serving;
	console.log(toSplit);

	var uri = toSplit.substr(0, toSplit.indexOf(','));
	let serving_unit = toSplit.split(',')[1];

	let food_name = req.body.food_name;
	let quantity = req.body.servingInput;
	let foodId = req.body.foodId;
	let meal = req.body.meal;
	let date_eaten = req.body.date_eaten;

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
		.then(nutrition_results => {
			let calories = Math.round(nutrition_results.totalNutrients.ENERC_KCAL.quantity);
			let fat = Math.round(nutrition_results.totalNutrients.FAT.quantity);
			let protein = Math.round(nutrition_results.totalNutrients.PROCNT.quantity);
			let carb = Math.round(nutrition_results.totalNutrients.CHOCDF.quantity);
			console.log('calories: ' + calories + ' fat: ' + fat + ' protein: ' + protein + ' carb: ' + carb);

			addFood(
				req,
				res,
				food_name,
				calories,
				fat,
				protein,
				quantity,
				meal,
				carb,
				date_eaten,
				serving_unit,
				foodId,
				uri
			).then(() => {
				getHistory(req.user, res, date_eaten);
			});
		})
		.catch(error => console.log(error));
});
router.post('/deleteLog', checkAuthenticated, (req, res) => {
	let logId = req.body.logId;

	let sql = 'DELETE FROM log WHERE id = $1 AND userid = $2';

	pgConnection.connect();
	pgConnection.query(sql, [logId, req.user.id], (err, result) => {
		if (err) {
			console.log(err);
			throw err;
		} else {
			result = result.rows;
			var today = new Date();
			getHistory(req.user, res, today);
		}
	});
});
router.post('/editLog', checkAuthenticated, (req, res) => {
	let quantity = req.body.quantity;
	let uri = req.body.uri;
	let foodId = req.body.foodId;

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

	//get nutrition for updated servings
	postData(url, myFood, res).then(nutrition_results => {
		console.log(nutrition_results);
		let calories = nutrition_results.totalNutrients.ENERC_KCAL.quantity;
		let fat = nutrition_results.totalNutrients.FAT.quantity;
		let protein = nutrition_results.totalNutrients.PROCNT.quantity;
		let carb = nutrition_results.totalNutrients.CHOCDF.quantity;
		let servings = quantity;

		//update DB with new nutrition
		alterTable(req.user, calories, fat, protein, carb, quantity, foodId).then(() => {
			var today = new Date();
			getHistory(req.user, res, today);
		});
	});
});

router.post('/getNutrients', checkAuthenticated, (req, res) => {
	let toSplit = req.body.serving;

	var uri = toSplit.substr(0, toSplit.indexOf(','));
	let serving_unit = toSplit.split(',')[1];
	let quantity = req.body.servingInput;

	let foodId = req.body.foodId;
	let search_results = req.body.search_results;
	search_results = JSON.parse(search_results);
	let foodName = req.body.food_name;

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
		.then(nutrition_results => {
			console.log(nutrition_results.totalNutrients);
			res.render('nutrition', {
				user: req.user,
				search_results,
				title: 'results',
				nutrition_results,
				food_name: foodName,
				quantity: quantity,
				foodId,
				serving_unit,
				uri
			});
		})
		.catch(error => console.log(error));
});

async function getData(url = '', res) {
	const response = await fetch(url, {
		method: 'GET',
		cache: 'no-cache',
		credentials: 'same-origin'
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
		body: JSON.stringify(data)
	});
	console.log('data posted');
	return response.json();
}

//food nutrients param
//throws error, no return
async function addFood(
	req,
	res,
	food_name,
	calories,
	fat,
	protein,
	servings,
	meal,
	carb,
	date_eaten,
	serving_unit,
	foodId,
	uri
) {
	let sql =
		'INSERT INTO log (food_name, calories, fat, protein, servings, meal, userId, carb, date_eaten, serving_unit, foodId, uri) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)';

	pgConnection.connect();
	pgConnection.query(
		sql,
		[food_name, calories, fat, protein, servings, meal, req.user.id, carb, date_eaten, serving_unit, foodId, uri],
		(err, result) => {
			if (err) {
				throw err;
			} else {
				return 'success';
			}
		}
	);
}

// date param - directs to history page
function getHistory(user, res, day) {
	let sql = 'SELECT * FROM log WHERE userId = $1 AND date_eaten = $2 ORDER BY date_eaten DESC';

	pgConnection.connect();
	pgConnection.query(sql, [user.id, day], (err, result) => {
		if (err) {
			console.log(err);
			throw err;
		} else {
			result = result.rows;
			let dayObj = new Date(day);

			let inputDate =
				dayObj.getFullYear() +
				'-' +
				('0' + (dayObj.getMonth() + 1)).slice(-2) +
				'-' +
				('0' + dayObj.getDate()).slice(-2);

			res.render('history', {
				title: 'history',
				user,
				result,
				dayObj,
				day,
				inputDate
			});
		}
	});
}

async function alterTable(user, calories, fat, protein, carb, servings, foodId) {
	let sql =
		'UPDATE log SET calories = $1, fat = $2, protein = $3, carb = $4, servings = $5 WHERE userId = $6 AND foodId = $7';

	pgConnection.connect();
	pgConnection.query(sql, [calories, fat, protein, carb, servings, user.id, foodId], (err, result) => {
		if (err) {
			console.log(err);
			throw err;
		} else {
			return 'success';
		}
	});
}

function checkAuthenticated(req, res, next) {
	let token = req.cookies['session-token'];
	let user = {};

	if (token == null) {
		console.log('no token. no auth');
		res.render('index', {
			title: 'Home',
			message: 'Please log in or create an account'
		});
		return;
	}
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
		.catch(err => {
			console.log(err);
			res.render('index', {
				title: 'home',
				message: 'Please log in or create an account'
			});
		});
}
module.exports = router;
