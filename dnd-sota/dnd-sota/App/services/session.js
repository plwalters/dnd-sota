define([], function () {

	var currentUser = ko.observable();
	var currentPlayer = ko.observable();
	var settings = ko.observable(new Settings());

	var session = {
		currentUser: currentUser,
		currentPlayer: currentPlayer,
		settings: settings,
		setSettingsOld: setSettingsOld,
		setSettingsNew: setSettingsNew
	}
	return session;

	function Settings() {
		var self = this;
		self.Old = ko.observable(false);
		self.ShowMap = ko.observable(false);
		self.ShowAttributes = ko.observable(false);
		self.ShowInstructions = ko.observable(false);
	}

	function setSettingsOld () {
		settings().Old(true);
		settings().ShowMap(false);
		settings().ShowAttributes(false);
		settings().ShowInstructions(false);
	}

	function setSettingsNew () {
		settings().Old(false);
		settings().ShowMap(true);
		settings().ShowAttributes(true);
		settings().ShowInstructions(true);
	}

});