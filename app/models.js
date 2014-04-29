dndSota.models.attribute(name, value) {
	var self = this;
	self.name = ko.observable(name);
	self.value = ko.observable(value || 0);
}

dndSota.models.weapon(name, damage, value) {
	var self = this;
	self.name = ko.observable(name);
	self.damage = ko.observable(damage);
	self.value = ko.observable(value || 0);
}

dndSota.models.armor(name, defense, value) {
	var self = this;
	self.name = ko.observable(name);
	self.defense = ko.observable(defense);
	self.value = ko.observable(value || 0);
}

dndSota.models.item(name, quantity, value) {
	var self = this;
	self.name = ko.observable(name);
	self.quantity = ko.observable(quantity || 0);
	self.value = ko.observable(value || 0);
}

dndSota.models.classType(name, startinggold) {
	var self = this;
	self.name = ko.observable(name);
	self.startingGold = ko.observable(startinggold || 0);
}