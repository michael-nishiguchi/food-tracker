// $(document).ready ( function(){
// 	alert("hi");
// 	var date = new Date();
// 	var dateString = date.getFullYear().toString() + '-' + (date.getMonth() + 1).toString().padStart(2, 0) + '-' + date.getDate().toString().padStart(2, 0);

// 	$("#datePicker").value = dateString;
// 	console.log(dateString);
//  });​

$(document).ready(function() {
	var date = new Date();
	var dateString =
		date.getFullYear().toString() +
		'-' +
		(date.getMonth() + 1).toString().padStart(2, 0) +
		'-' +
		date
			.getDate()
			.toString()
			.padStart(2, 0);

	console.log(dateString);
	$('.dateFill').val(dateString);
	//$('input[type=date]').val(dateString);

	//spinner while charts load
	$('img').on('load', function() {
		$('#spinner').fadeOut();
	});
});

//sign into Google
function onSignIn(googleUser) {
	console.log('onSignIn function');
	var id_token = googleUser.getAuthResponse().id_token;

	var xhr = new XMLHttpRequest();
	xhr.open('POST', '/login');
	xhr.setRequestHeader('Content-Type', 'application/json');
	xhr.onload = function() {
		if (xhr.responseText == 'success') {
			console.log('logged in');
			//signOut();
			//$.get('/history');
			//location.assign('/history');
		} else {
			console.log('not logged in');
		}
	};
	xhr.send(JSON.stringify({ token: id_token }));
}

//sign out of GOogle
function signOut() {
	var auth2 = gapi.auth2.getAuthInstance();
	auth2.signOut().then(function() {
		console.log('User signed out.');
		//$.get('/logout');
		location.assign('/logout');
	});
}

function myAlert() {
	var profile = googleUser.getBasicProfile();
	console.log('ID: ' + profile.getId()); // Do not send to your backend! Use an ID token instead.
	console.log('Name: ' + profile.getName());
	console.log('Image URL: ' + profile.getImageUrl());
	console.log('Email: ' + profile.getEmail()); // This is null if the 'email' scope is not present.
}

function goBack() {
	window.history.back();
}

// $('#getCalories').click(function(evt) {
// 	let quantity = $('.servingInput');
// 	console.log(quantity);
// });

//calculate calories as the user types
$(function() {
	var addDiv = false;
	//console.log(myData);
	$('.servingInput').keyup(function(evt) {
		// var newNode = document.createElement('div');
		// newNode.innerHTML = 'test';
		// var referenceNode = document.querySelector(evt.target);
		//referenceNode.after(newNode);

		//var siblings = $(this).siblings();
		var calories = $(this)
			.prev()
			.attr('value');
		console.log(calories);

		var defaultServing = $(this)
			.next()
			.first()
			.find('option:eq(0)')
			.val();
		console.log(defaultServing);

		var servingSize = $(this)
			.next()
			.first()
			.find(':selected')
			.val();
		console.log(servingSize);

		var servings = $(this).next();
		// console.log($(this).next().attr(':selected'));
		// console.log($(this).next());

		// console.log($('option:selected').val());
		// console.log(servings);

		var caloriePerGram = calories / defaultServing;

		function calculateCalories() {}

		// console.log($(this));
		// console.log(evt);
		if (!addDiv) {
			//$(this).after('<p>test</p>');
			$('#totalCalories').text('test');
			//addDiv = true;
		}
	});
});

//food database

// https://api.edamam.com/api/food-database/v2/parser?ingr=red%20apple&app_id=90aa6a3e&app_key=24f01456634cdf030a22c0e6bb73f0a3
