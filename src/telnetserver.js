
var net = require('net');
var events = require('events');
var util = require('util');

var config = require('config').config;

// The TelnetClient class represents a single telnet client
function TelnetClient(server, socket) {
	this.server = server;
	this.socket = socket;
	this.username = null;
	
	this.socket.write("Welcome to minejs, enter 'help' for more information\n");
	this.socket.write("Please enter your username: ");
	
	this.socket.on('data', function(data) {
		this.receiveLine(data.toString('ascii').replace('\n', '').replace('\r', ''));
	}.bind(this));
	this.socket.on('close', function() {
		this.server.emit('disconnect', this);
	}.bind(this));
	socket.on('end', function() {
		this.server.emit('end', this);
	}.bind(this));
}

TelnetClient.prototype.receiveLine = function(line) {
	if (this.username == null) {
		this.username = line;
		this.server.emit('connect', this);
	} else {
		this.server.emit('data', this, line);
	}
}

// The TelnetServer class implements a simple telnet server.
// The following events are emitted by this class:
// 'connect' (client) - when a client has connected
// 'disconnect' (client) - when a client has disconnected
// 'data' (client, text) - when client has entered text
function TelnetServer() {
	events.EventEmitter.call(this);
	this.reset();
}

util.inherits(TelnetServer, events.EventEmitter);

// Resets the internals (user list etc.)
TelnetServer.prototype.reset = function() {
	this.running = false;
	this.terminate = false;
},

// Starts the telnet server
TelnetServer.prototype.start = function() {
	if (this.running)
		return;
		
	log.info("Starting telnet server on port " + config.telnet.port);
	
	this.reset();
	this.running = true;
	
	// Start tcp server
	this.server = net.createServer(function(socket) {
		var client = new TelnetClient(this, socket);
	}.bind(this)).listen(config.telnet.port);
},

TelnetServer.prototype.stop = function() {
	if (!this.running)
		return;
		
	// TODO
	//this.server.stop()
}
	

// Creates a telnet server
function createTelnetServer() {
	return new TelnetServer();
}

module.exports.createTelnetServer = createTelnetServer;
