
var net = require('net');
var url = require('url');
var events = require('events');
var util = require('util');
var express = require('express');
var MemStore = require('connect').session.MemoryStore;

require('express-resource');
require('datejs');

var config = require('config').config;

var self = null;

var app = express.createServer();

var sessionStore = new MemStore({ reapInterval: 6000 * 10 });

app.configure(function() {
	app.use(express.logger());
	app.use(express.static(__dirname + '/public'));
	app.use(express.bodyParser());
	app.use(express.cookieParser());
	app.use(express.session({
		secret: 'minejsforpresident',
		store: sessionStore,
	}));
});

app.configure('development', function() {
	app.use(express.errorHandler({
		dumpExceptions: true,
		showStack: true,
	}));
});

app.configure('production', function() {
	app.use(express.errorHandler());
});

app.set('view engine', 'jade');
app.set('views', __dirname + '/views');
app.set('view options', {
	layout: 'layout.jade',
});

var pages = [
	{ title: 'Chat', link: 'chat', role: 'guest' },
	{ title: 'Items', link: 'items', role: 'user' },
	{ title: 'Users', link: 'users', role: 'admin' },
];

app.dynamicHelpers({
	session: function(req, res) {
		return req.session;
	},
	flash: function(req, res) {
		return req.flash();
	},
	pages: function(req, res) {
		if (req.session.user) {
			return pages;
		}
		return [];
	},
});

function requiresLogin(req, res, next) {
	if (config.frontend.hasOwnProperty('fakeLogin')) {
		user = userList.userByName(config.frontend.fakeLogin);
		if (user)
			req.session.user = user;
	}
	
	if (req.session.user) {
		next();
	} else {
		res.redirect('sessions/new?redir=' + req.url);
	}
};

// Configuration

// Dynamically create javascript file containing client-side configuration
app.get('/scripts/config.js', function(req, res) {
	// Variables exported to the client-side
	var vars = {
		sid: req.sessionID || '',
		user: req.session.user.name,
		role: req.session.user.role,
		maxStacks: config.settings.maxStacks,
		overviewer: config.overviewer,
	};
	
	// Create javascript snippet containing the variables
	res.writeHead(200, { 'Content-Type': 'text/javascript' });
	res.end('{ config = ' + JSON.stringify(vars) + '; }');
});

// Session controller

var userList = require('userlist').instance;

app.get('/sessions/new', function(req, res) {
	res.render('sessions/new', { locals: {
		redir: req.query.redir
	}});
});

app.get('/sessions/destroy', function(req, res) {
	delete req.session.user;
	res.redirect('/');
});

app.post('/sessions', function(req, res) {
	var user = userList.userByName(req.body.username);
	if (user && user.checkPassword(req.body.password)) {
		req.session.user = user;
		res.redirect(req.body.redir || '/')
	} else {
		req.flash('warn', 'Login failed.');
		res.render('sessions/new', { locals: {
			redir: req.body.redir
		}});
	}
});

// Home page controller
app.get('/', requiresLogin, function(req, res) {
	res.render('index');
});

// Resources

// TODO these should need login
app.resource('users', require('./resources/users'));
app.resource('items', require('./resources/items'));

var itemList = require('itemlist').instance;

// Instance command handler
var commandHandler = require('commandhandler').createCommandHandler();

app.listen(config.frontend.port);

// Socket.IO server

function FrontendClient(socket, username) {
	this.socket = socket;
	this.user = userList.userByName(username);
	
	this.chat('console', null, 'Welcome to the minejs chat');
	
	this.socket.on('chat', function(data) {
		var timestamp = Math.round((new Date()).getTime() / 1000);
		this.socket.broadcast.emit('chat', { user: this.user.name, timestamp: timestamp, text: data.text });
		this.chat(this.user.name, timestamp, data.text);
		instance.emit('chat', this, timestamp, data.text);
		instance.addChatHistory(this.user.name, timestamp, data.text);
	}.bind(this));
	this.socket.on('console', function(data) {
		this.console(data.text);
		instance.emit('console', this, data.text);
	}.bind(this));
	this.socket.on('monitor', function(data) {
		this.monitor(data.text);
		instance.emit('monitor', this, data.text);
	}.bind(this));
	this.socket.on('command', function(data) {
		instance.emit('command', this, data.cmd, data);
	}.bind(this));
}

FrontendClient.prototype.chat = function(username, timestamp, text) {
	if (!timestamp)
		timestamp = Math.round((new Date()).getTime() / 1000);
	this.socket.emit('chat', { user: username, timestamp: timestamp, text: text });
}

FrontendClient.prototype.console = function(text) {
	this.socket.emit('console', { text: text });
}

FrontendClient.prototype.monitor = function(text) {
	this.socket.emit('monitor', { text: text });
}

FrontendClient.prototype.notify = function(action, args) {
	this.socket.emit('notify', { action: action, args: args });
}

FrontendClient.prototype.sendChatHistory = function() {
	for (var i = 0; i < instance.chatHistory.length; i++) {
		var item = instance.chatHistory[i];
		this.chat(item.username, item.timestamp, item.text);
	}
}

//io = require('socket.io').listen(config.socket.port, config.socket.host);
io = require('socket.io').listen(app);

io.configure(function() {
	io.set('log level', 1);
});

io.sockets.on('connection', function (socket) {
	socket.on('sid', function(data) {
		sessionStore.get(data.sid, function(error, session) {
			if (session && session.user) {
				var client = new FrontendClient(socket, session.user.name);
				instance.clients.push(client);
				socket.emit('accept');
				socket.client = client;
				instance.emit('connect', client);
			} else {
				socket.emit('deny');
			}
	    }.bind(socket));
	}.bind(socket));
	socket.on('disconnect', function(data) {
		if (socket.client) {
			instance.clients.splice(instance.clients.indexOf(socket.client), 1);
			instance.emit('disconnect', socket.client);
		}
	});
});


// Constructor
function Frontend() {
	events.EventEmitter.call(this);
	this.clients = [];
	this.chatHistory = [];
};

util.inherits(Frontend, events.EventEmitter);

Frontend.prototype.chatHistoryLength = 50;

Frontend.prototype.chat = function(username, text) {
	var timestamp = Math.round((new Date()).getTime() / 1000);
	this.addChatHistory(username, timestamp, text);
	for (var i = 0; i < this.clients.length; i++)
		this.clients[i].chat(username, timestamp, text);
}

Frontend.prototype.notify = function(action, args) {
	for (var i = 0; i < this.clients.length; i++)
		this.clients[i].notify(action, args);
}

Frontend.prototype.addChatHistory = function(username, timestamp, text) {
	// Keep messages in history
	this.chatHistory.push({ username: username, timestamp: timestamp, text: text });
	if (this.chatHistory.length > this.chatHistoryLength)
		this.chatHistory.splice(0, this.chatHistory.length - this.chatHistoryLength);
}

var instance = new Frontend();

module.exports.instance = instance;
