// Check for click events on the navbar burger icon
$('.navbar-burger').click(function() {
	// Toggle the "is-active" class on both the "navbar-burger" and the "navbar-menu"
	$('.navbar-burger').toggleClass('is-active');
	$('.navbar-menu').toggleClass('is-active');
});

if (auth2.isSignedIn.get()) {
	var profile = auth2.currentUser.get().getBasicProfile();
	console.log('ID: ' + profile.getId());
	console.log('Full Name: ' + profile.getName());
	console.log('Given Name: ' + profile.getGivenName());
	console.log('Family Name: ' + profile.getFamilyName());
	console.log('Image URL: ' + profile.getImageUrl());
	console.log('Email: ' + profile.getEmail());
}
GoogleUser.getBasicProfile();


function onSignIn(googleUser) {
	var profile = googleUser.getBasicProfile();
	console.log('ID: ' + profile.getId()); // Do not send to your backend! Use an ID token instead.
	console.log('Name: ' + profile.getName());
	console.log('Image URL: ' + profile.getImageUrl());
	console.log('Email: ' + profile.getEmail()); // This is null if the 'email' scope is not present.
	// GoogleSignInOptions gso = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
    //     .requestIdToken(getString(R.string.server_client_id))
    //     .requestEmail()
    //     .build()
}

function signOut() {
	var auth2 = gapi.auth2.getAuthInstance();
	auth2.signOut().then(function() {
		console.log('User signed out.');
	});
}

function myAlert() {

    var profile = googleUser.getBasicProfile();
    console.log('ID: ' + profile.getId()); // Do not send to your backend! Use an ID token instead.
    console.log('Name: ' + profile.getName());
    console.log('Image URL: ' + profile.getImageUrl());
    console.log('Email: ' + profile.getEmail()); // This is null if the 'email' scope is not present.
  
}


//food database 

// https://api.edamam.com/api/food-database/v2/parser?ingr=red%20apple&app_id=90aa6a3e&app_key=24f01456634cdf030a22c0e6bb73f0a3

