window.onload = function() {
	//load in google auth lib
	gapi.load('auth2', function() {
		gapi.auth2.init();
	});

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

	var allDates = document.getElementsByClassName('dateFill');

	for (var i = 0; i < allDates.length; i++) {
		allDates[i].value = dateString;
	}

	//spinner fades out when charts load
	var fade = document.getElementById('spinner');
	if (fade != null && fade != 'undefined') {
		var intervalID = setInterval(function() {
			if (!fade.style.opacity) {
				fade.style.opacity = 1;
			}

			if (fade.style.opacity > 0) {
				fade.style.opacity -= 0.1;
			} else {
				fade.style.display = 'none';
				clearInterval(intervalID);
			}
		}, 50);
	}
};

//sign into Google
function onSignIn(googleUser) {
	console.log('onSignIn function');
	var id_token = googleUser.getAuthResponse().id_token;

	var xhr = new XMLHttpRequest();
	xhr.open('POST', '/login');
	xhr.setRequestHeader('Content-Type', 'application/json');
	xhr.onload = function() {
		if (xhr.responseText == 'success') {
			window.location.assign('/history');
		} else {
			console.log('not logged in');
		}
	};
	xhr.send(JSON.stringify({ token: id_token }));
}

//sign out of GOogle
function signOut() {
	console.log('sign out function');
	var auth2 = gapi.auth2.getAuthInstance();
	auth2.signOut().then(function() {
		window.location.assign('/logout');
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
