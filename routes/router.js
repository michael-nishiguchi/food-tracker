var express = require('express');
var router = express.Router();
const { OAuth2Client } = require('google-auth-library');
const { policytroubleshooter } = require('googleapis/build/src/apis/policytroubleshooter');
const CLIENT_ID = process.env.CLIENT_ID;
// const client = new OAuth2Client(CLIENT_ID);
const googleClient = new OAuth2Client(CLIENT_ID);
const app_id = process.env.APPLICATION_ID;
const app_key = process.env.APPLICATION_KEY;
const nutrition_app_id = process.env.NUTRITION_APP_ID;
const nutrition_app_key = process.env.NUTRITION_APP_KEY;
const fetch = require('node-fetch');
const { render, connect } = require('../app');
const { check, validationResult } = require('express-validator');

//date-fns library
const { format } = require('date-fns');
var parseISO = require('date-fns/parseISO');
var add = require('date-fns/add');
var toDate = require('date-fns/toDate');
var getYear = require('date-fns/getYear');
var getMonth = require('date-fns/getMonth');
var getDate = require('date-fns/getDate');

//controller
var edamam_controller = require('../controllers/edamam');

//database
const { Pool, Client } = require('pg');
const pool = new Pool({
	connectionString: process.env.DATABASE_URL,
	ssl: {
		rejectUnauthorized: false
	}
});

pool.on('error', (err, client) => {
	console.error('Unexpected error on idle client', err);
	process.exit(-1);
});

const { admin_datatransfer_v1 } = require('googleapis');
const { json } = require('express');
const Cookies = require('cookies');
const { homegraph } = require('googleapis/build/src/apis/homegraph');

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
	let user = {};

	// console.log(CLIENT_ID);
	// console.log(token);
	async function verify() {
		const ticket = await googleClient.verifyIdToken({
			idToken: token,
			audience: CLIENT_ID
		});
		const payload = ticket.getPayload();
		user.name = payload.name;
		user.email = payload.email;
		user.picture = payload.picture;
		user.id = payload.sub;
		req.user = user;
	}
	verify()
		.then(() => {
			res.cookie('session-token', token);
			console.log('logged in');
			res.send('success');

			// let today = new Date();
			// getHistory(req.user, res, today);
		})
		.catch(console.error);
});

router.get('/analyze', checkAuthenticated, (req, res) => {
	let sql = 'SELECT * FROM log WHERE userId = $1 ORDER BY date_eaten';
	let values = [req.user.id];

	const client = new Client({
		connectionString: process.env.DATABASE_URL,
		ssl: {
			rejectUnauthorized: false
		}
	});

	client.connect();
	client.query(sql, values, (err, result) => {
		client.end();
		if (err) {
			console.log(err);
			throw err;
		} else {
			result = result.rows;

			//change date format
			for (var i = 0; i < result.length; i++) {
				let day = result[i].date_eaten.getDate();
				let month = result[i].date_eaten.getMonth();
				let year = result[i].date_eaten.getFullYear();
				result[i].date_eaten = result[i].date_eaten.toLocaleString('default', { month: 'short' }) + '/' + day;
			}

			//get totals for each day
			var dayTotalArr = {};
			result.forEach(function(item) {
				if (!dayTotalArr[item.date_eaten]) {
					dayTotalArr[item.date_eaten] = {};
					dayTotalArr[item.date_eaten]['calories'] = 0;
					dayTotalArr[item.date_eaten]['fat'] = 0;
					dayTotalArr[item.date_eaten]['protein'] = 0;
					dayTotalArr[item.date_eaten]['carb'] = 0;
				}
				dayTotalArr[item.date_eaten]['calories'] += item.calories;
				dayTotalArr[item.date_eaten]['fat'] += item.fat;
				dayTotalArr[item.date_eaten]['protein'] += item.protein;
				dayTotalArr[item.date_eaten]['carb'] += item.carb;
			});

			var proteinArr = [],
				dateArr = [],
				calArr = [],
				carbArr = [],
				fatArr = [];

			for (let element in dayTotalArr) {
				proteinArr.push(Math.round(dayTotalArr[element].protein));
				calArr.push(Math.round(dayTotalArr[element].calories));
				carbArr.push(Math.round(dayTotalArr[element].carb));
				fatArr.push(Math.round(dayTotalArr[element].fat));
				dateArr.push(element);
			}

			let nutritionChartData = {
				type: 'line',
				data: {
					labels: dateArr,
					datasets: [
						{ label: 'Protein', data: proteinArr, fill: false, borderColor: 'rgb(102, 86, 135)' },
						{ label: 'Carbs', data: carbArr, fill: false, borderColor: 'rgb(205, 70, 49)' },
						{ label: 'Fat', data: fatArr, fill: false, borderColor: 'rgb(242, 175, 41)' }
					]
				}
			};

			let calorieChartData = {
				type: 'line',
				data: {
					labels: dateArr,
					datasets: [{ label: 'Calories', data: calArr, fill: false, borderColor: 'rgb(75, 187, 187)' }]
				}
			};

			let nutritionChart = 'https://quickchart.io/chart?c=' + JSON.stringify(nutritionChartData);
			let calorieChart = 'https://quickchart.io/chart?c=' + JSON.stringify(calorieChartData);
			res.render('analyze', {
				user: req.user,
				title: 'Analyze',
				nutritionChart,
				calorieChart
			});
		}
	});
});
router.post(
	'/search_name',
	checkAuthenticated,
	check('food_search')
		.trim()
		.escape(),
	(req, res) => {
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
	}
);
router.get('/history', checkAuthenticated, (req, res) => {
	var today = new Date();
	getHistory(req.user, res, today);
});
router.post('/selectDay', checkAuthenticated, (req, res, next) => {
	let date = req.body.date;
	let sendDate = parseISO(date);
	getHistory(req.user, res, sendDate);
});
router.post('/backDay', checkAuthenticated, (req, res) => {
	let date = req.body.date;
	let dateObj = parseISO(date);
	let sendDate = add(dateObj, { days: -1 });
	getHistory(req.user, res, sendDate);
});
router.post('/forwardDay', checkAuthenticated, (req, res) => {
	let date = req.body.date;
	let dateObj = parseISO(date);
	let sendDate = add(dateObj, { days: 1 });
	getHistory(req.user, res, sendDate);
});
router.get('/protectedRoute', checkAuthenticated, (req, res) => {
	res.send('This route is protected');
});
router.get('/logout', (req, res) => {
	res.clearCookie('session-token');
	res.render('index', {
		title: 'home',
		message: 'logout'
	});
});
router.get('/loginView', (req, res) => {
	res.render('login', {
		title: 'Login'
	});
});
router.post(
	'/addFood',
	checkAuthenticated,
	[
		check('toSplit')
			.trim()
			.escape(),
		check('label')
			.trim()
			.escape(),
		check('quantity')
			.trim()
			.escape()
			.matches('[0-9'),
		check('foodId')
			.trim()
			.escape(),
		check('meal')
			.trim()
			.escape(),
		check('date_eaten')
			.trim()
			.escape()
	],
	(req, res) => {
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
			let date = parseISO(date_eaten);
			getHistory(req.user, res, date);
		});
	}
);
router.post(
	'/directAdd',
	checkAuthenticated,
	[
		check('servingInput')
			.trim()
			.escape()
			.matches('[0-9]'),
		check('foodId')
			.trim()
			.escape(),
		check('meal')
			.trim()
			.escape(),
		check('date_eaten')
			.trim()
			.escape()
	],
	(req, res) => {
		let toSplit = req.body.serving;
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

				//add food to postgres DB
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
					let date = parseISO(date_eaten);
					//dispay food log
					getHistory(req.user, res, date);
				});
			})
			.catch(error => console.log(error));
	}
);
router.post(
	'/deleteLog',
	checkAuthenticated,
	check('logId')
		.trim()
		.escape(),
	(req, res) => {
		let logId = req.body.logId;
		let day = req.body.day;
		let month = req.body.month;
		let year = req.body.year;

		var dateObj = new Date(year, month, day);

		let sql = 'DELETE FROM log WHERE id = $1 AND userid = $2';

		pool.connect();
		pool.query(sql, [logId, req.user.id], (err, result) => {
			if (err) {
				console.log(err);
				throw err;
			} else {
				result = result.rows;
				//var today = new Date();
				getHistory(req.user, res, dateObj);
			}
		});
	}
);
router.post(
	'/editLog',
	checkAuthenticated,
	[
		check('quantity')
			.trim()
			.escape(),
		// check('uri')
		// 	.trim()
		// 	.escape(),
		check('foodId')
			.trim()
			.escape()
	],
	(req, res) => {
		let quantity = req.body.quantity;
		let uri = req.body.uri;
		let foodId = req.body.foodId;

		let day = req.body.day;
		let month = req.body.month;
		let year = req.body.year;

		var dateObj = new Date(year, month, day);

		const url =
			'https://api.edamam.com/api/food-database/v2/nutrients?app_id=' +
			nutrition_app_id +
			'&app_key=' +
			nutrition_app_key;

		console.log('uri: ' + uri);
		console.log('quantity: ' + quantity);
		console.log('foodid : ' + foodId);
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
				getHistory(req.user, res, dateObj);
			});
		});
	}
);

router.post(
	'/getNutrients',
	checkAuthenticated,
	[
		// check('serving')
		// 	.trim()
		// 	.escape(),
		check('servingInput')
			.trim()
			.escape(),
		check('foodId')
			.trim()
			.escape(),
		check('search_results')
			.trim()
			.escape(),
		check('food_name')
			.trim()
			.escape()
	],
	(req, res) => {
		let toSplit = req.body.serving;
		console.log(typeof toSplit);
		console.log('to split: ' + toSplit);
		var uri = toSplit.substr(0, toSplit.indexOf(','));
		let serving_unit = toSplit.split(',')[1];
		let quantity = req.body.servingInput;

		let foodId = req.body.foodId;
		//let search_results = req.body.search_results;
		//search_results = JSON.parse(search_results);
		let foodName = req.body.food_name;

		console.log('quantity: ' + quantity);
		console.log('uri: ' + uri);
		console.log('food id: ' + foodId);

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
				console.log(nutrition_results);
				res.render('nutrition', {
					user: req.user,
					//search_results,
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
	}
);

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
	const client = new Client({
		connectionString: process.env.DATABASE_URL,
		ssl: {
			rejectUnauthorized: false
		}
	});
	let sql =
		'INSERT INTO log (food_name, calories, fat, protein, servings, meal, userId, carb, date_eaten, serving_unit, foodId, uri) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)';

	console.log('SQL: ' + sql);

	//https://node-postgres.com/features/transactions

	// let sql =
	// 	'START TRANSACTION (INSERT INTO log (food_name, calories, fat, protein, servings, meal, userId, carb, date_eaten, serving_unit, foodId, uri) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12))  COMMIT';

	client.connect();
	await client.query(
		sql,
		[food_name, calories, fat, protein, servings, meal, req.user.id, carb, date_eaten, serving_unit, foodId, uri],
		(err, result) => {
			client.end();
			if (err) {
				throw err;
			} else {
				return 'success';
			}
		}
	);
}

//date param - directs to history page
function getHistory(user, res, day) {
	let sql = 'SELECT * FROM log WHERE userId = $1 AND date_eaten = $2 ORDER BY date_eaten DESC';
	let values = [user.id, day];

	const client = new Client({
		connectionString: process.env.DATABASE_URL,
		ssl: {
			rejectUnauthorized: false
		}
	});

	client.connect();
	client.query(sql, [user.id, day], (err, result) => {
		client.end();
		if (err) {
			console.log(err);
			throw err;
		} else {
			result = result.rows;

			let inputDate =
				day.getFullYear() +
				'-' +
				('0' + (day.getMonth() + 1)).slice(-2) +
				'-' +
				('0' + day.getDate()).slice(-2);

			let breakfastTotal = 0,
				lunchTotal = 0,
				dinnerTotal = 0,
				snackTotal = 0;
			let breakfastArr = [],
				lunchArr = [],
				dinnerArr = [],
				snackArr = [];

			result.forEach(item => {
				if (item.meal == 'breakfast') {
					breakfastTotal += item.calories;
					breakfastArr.push(item);
				}
				if (item.meal == 'lunch') {
					lunchTotal += item.calories;
					lunchArr.push(item);
				}
				if (item.meal == 'dinner') {
					dinnerTotal += item.calories;
					dinnerArr.push(item);
				}
				if (item.meal == 'snack') {
					snackTotal += item.calories;
					snackArr.push(item);
				}
			});

			let dayObj = parseISO(inputDate);

			res.render('history', {
				title: 'history',
				user,
				//result,
				dayObj,
				day,
				inputDate,
				breakfastTotal,
				lunchTotal,
				dinnerTotal,
				snackTotal,
				breakfastArr,
				lunchArr,
				dinnerArr,
				snackArr
			});
		}
	});
}

async function alterTable(user, calories, fat, protein, carb, servings, foodId) {
	let sql =
		'UPDATE log SET calories = $1, fat = $2, protein = $3, carb = $4, servings = $5 WHERE userId = $6 AND foodId = $7';

	const client = new Client({
		connectionString: process.env.DATABASE_URL,
		ssl: {
			rejectUnauthorized: false
		}
	});
	client.connect();
	client.query(sql, [calories, fat, protein, carb, servings, user.id, foodId], (err, result) => {
		client.end();
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
		const ticket = await googleClient.verifyIdToken({
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
