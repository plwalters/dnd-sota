define([], function () {
	
	console.log('Session laoded');

	var currentUser = ko.observable();
	var currentPlayer = ko.observable();

	var session = {
		currentUser: currentUser,
		currentPlayer: currentPlayer
	}
	return session;

});