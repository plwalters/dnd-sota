define([], function () {
	
	var currentMessage = ko.observable();
	var isBlocking = ko.observable();
	var currentMessageNumber = 0;
	var messageQueue = ko.observableArray();

	// When the message queue changes,
	messageQueue.subscribe(function (newValue) {
		// If the message queue is empty
		if (messageQueue().length === 0) {
			// Clear the current message
			currentMessage(null);
		} else {
			// Set the current message to the next entry in the queue
			currentMessage(messageQueue()[0]);
			currentMessage.Visible(true);
		}
	});

	ko.extenders.removeMessage(target, option) {
		// Remove message after it has been visible for 1.5 seconds
		target.Visible.subscribe(function (newValue) {
			if (newValue === true) {
				// Set a timeout to clear the message from queue
				setTimeout(function () { target.Visible(false); }, 1500);
			} else {
				// Remove it from the queue
				messageQueue.remove(target);
			}
		});
		return target;
	}

	function gameMessageObject (message, blocking) {
		var self = this;
		self.Message = ko.observable(message);
		self.Order = currentMessageNumber;
		currentMessageNumber += 1;
		self.Visible = ko.observable(false);
	}

	function addMessage (message, blocking) {
		var thisMessage = ko.observable(new gameMessageObject(message, blocking)).extend({ removeMessage: true });
		messageQueue.push(thisMessage);
	}

	var messagequeue = {
		currentMessage: currentMessage,
		addMessage: addMessage,
		isBlocking: isBlocking
	};
	return messagequeue;

});