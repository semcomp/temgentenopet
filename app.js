var express = require('express');
var https = require('https');
var bodyParser = require('body-parser');
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');


var app = express();

app.use(bodyParser.json());


var lastPing = 0;
var status = null;
function store(){
	var url = 'mongodb://mongodb:27017/temgentenopet';
	MongoClient.connect(url, function(err, db) {
		  assert.equal(null, err);
		  var col = db.collection('statuschanges');
		  col.insertOne({
			  status: status,
			  ts: new Date()
		  }, function(err, r){
			  db.close();
		  });
	});
}

app.get('/qwertyuiop/sim', function (req, res) {
	if(status != "sim"){
		status = "sim"
		store();
	}
	res.send("ok");
	lastPing = new Date();
	console.log(status);
});

app.get('/qwertyuiop/nao', function (req, res) {
	if(status != "nao"){
		status = "nao";
		store();
	}
	res.send("ok");
	lastPing = new Date();
	console.log(status);
});

app.get('/qwertyuiop/webhook', function (req, res) {
	res.send("Tem gente no PET: "+ status || "Nao sei");
});
var subscribers = [];
function sendMsg(msg){
	var options = {
		hostname: "api.telegram.org",
		path: '/'+process.env.TELEGRAM_TOKEN+'/sendMessage',
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"Content-Length": msg.length
		}
	}
	var post_req = https.request(options, function (res) {
		console.log('STATUS: ' + res.statusCode);
		console.log('HEADERS: ' + JSON.stringify(res.headers));
	});

	post_req.on('error', function(e) {
	    console.log('problem with request: ' + e.message);
	});

	post_req.write(msg);
	post_req.end();
}
app.post('/qwertyuiop/webhook', function (req, res) {
	console.log(req.body);
	try {
		var responseText = '';
		if(req.body.message.text=="/subscribe"){
			var idx = subscribers.indexOf(req.body.message.chat.id)
			if(idx == -1){
				subscribers.push(req.body.message.chat.id);
			}
			responseText = "Inscrito!";
		} else if(req.body.message.text=="/unsubscribe"){
			var idx = subscribers.indexOf(req.body.message.chat.id)
			if(idx > -1){
				subscribers.splice(idx, 1);
			}
			responseText = "Tchau!";
		} else {
			responseText = "Tem gente no PET: "+ (status || "Nao sei");
			console.log(subscribers);
		}
		var msg = JSON.stringify({
			"chat_id": req.body.message.chat.id,
			"text": responseText,
		});
		res.json("ok");
		sendMsg(msg);
	} catch(e) {
		console.log(e);
		res.json("ok");
	}
});

app.listen(3000, function () {
	console.log('Example app listening on port 3000!');
});
var delay = 3000;
setInterval(function(){
	if(lastPing == 0 || (new Date() - lastPing) < 30000){
		delay = 5000;
		return;
	}
	console.log("Cade??");
	console.log(lastPing);
	console.log(new Date());
	subscribers.forEach(function(chatid){
		var msg = JSON.stringify({
			"chat_id": chatid,
			"text": "Cade meu arduino????",
		});
		sendMsg(msg);
	});
	delay *= 5;
}, 10000);
