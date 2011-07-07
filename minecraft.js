#!/usr/bin/env node

var sys = require('sys'),
    fs = require('fs'),
    tty = require('tty').setRawMode(true),   
    http = require('http'),
    spawn = require('child_process').spawn,
    stdin = process.openStdin(),
    util = require('util')
    
    
filename = process.ARGV[2];

function usage() {
     return sys.puts("\nUsage: node minejs.js /path/to/your/minecraft_server.jar\n\n");
     process.exit(0);
};

if (!filename) {
    usage();
 
} else {

}

    minecraft = spawn('/usr/bin/java',['\-Xms1g','\-Xmx1g','\-jar',filename,'nogui']);
    console.log("Node Memory Usage "+util.inspect(process.memoryUsage()));
    sys.puts("\n\nMinecraft launched on PID: " + minecraft.pid);
    sys.puts("Webconsole available on  http://127.0.0.1:1337/ ");

minecraft.stdout.on('data', function (data) {
    console.log('stdout: ' + data);
});

/* get triggeret on jvm stdout activity */
minecraft.stderr.on('data', function (data) {
    /*TODO pharse logfile stream, count users, trigger on meta command*/
    console.log('stderr: ' + data);
});

minecraft.on('exit', function (code) {
    console.log('child process exited with code ' + code);
 
});

/* http webservice */
http.createServer(function (req, res) {
    res.writeHead(200, {'Content-Type': "text/plain;charset=UTF-8"});
    minecraft.stdin.write('say Welcome to Nodemine stranger HTTP client\n');
    res.write("");
    minecraft.stdout.on('data', function (data) {
        res.write(data);
    });
    minecraft.stderr.on('data', function (data) {
        /*TODO pharse logfile stream, count users, trigger on meta command*/
        res.write(data);
    });
}).listen(1337);


/* catching all console input and wraps it to stdin of the java subprocess*/
stdin.on('keypress', function (chunk, key) {
    process.stdout.write(chunk);
    minecraft.stdin.write(chunk);
    process.stdin.resume();
    if (key && key.ctrl && key.name == 'c') {
        sys.puts("CTRL+C detected!!! KILL KILL KILL! X_x");
        minecraft.stdin.write("stop\n");
        minecraft.stdin.end();
        minecraft.kill('SIGHUP');
        process.exit();
    }
  
});


