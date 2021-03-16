//sign into Google
function onSignIn(googleUser) {
	var id_token = googleUser.getAuthResponse().id_token;

	var xhr = new XMLHttpRequest();
	xhr.open('POST', '/login');
	xhr.setRequestHeader('Content-Type', 'application/json');
	xhr.onload = function() {
		console.log('Signed in as: ' + xhr.responseText);
		if (xhr.responseText == 'success') {
			console.log('inside javascript');
			signOut();
			location.assign('/profile');
		}
		else {
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
	});
}

// if (auth2 != null && auth2.isSignedIn.get()) {
// 	var profile = auth2.currentUser.get().getBasicProfile();
// 	console.log('ID: ' + profile.getId());
// 	console.log('Full Name: ' + profile.getName());
// 	console.log('Given Name: ' + profile.getGivenName());
// 	console.log('Family Name: ' + profile.getFamilyName());
// 	console.log('Image URL: ' + profile.getImageUrl());
// 	console.log('Email: ' + profile.getEmail());
// }

//GoogleUser.getBasicProfile();

function myAlert() {
	var profile = googleUser.getBasicProfile();
	console.log('ID: ' + profile.getId()); // Do not send to your backend! Use an ID token instead.
	console.log('Name: ' + profile.getName());
	console.log('Image URL: ' + profile.getImageUrl());
	console.log('Email: ' + profile.getEmail()); // This is null if the 'email' scope is not present.
}

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
		var calories = $(this).prev().attr('value');
		console.log(calories);

		var defaultServing = $(this).next().first().find('option:eq(0)').val();
		console.log(defaultServing);

		var servingSize = $(this).next().first().find(':selected').val();
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
