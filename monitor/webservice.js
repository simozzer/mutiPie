var http = require('http');
const { exec } = require("child_process");

console.log("Starting stats server on 8083")

http.createServer(function(req, res) {

let x = new Promise((resolve,reject) => {
  exec("mymonall", (error, stdout, stderr) => {
    if (error) {
        console.log(`error: ${error.message}`);
        reject(error);
    }
    if (stderr) {
        console.log(`stderr: ${stderr}`);
        reject(stderr);
    }
    resolve(stdout);
  });
}); 
x.then((data) => {
res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Request-Method', '*');
	res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET');
	res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type');

  res.write(data) // a response to the client
  res.end(); //end the response
}).catch( err => {
  res.write(JSON.stringify(err));
});

}).listen(8083); //the server object listens on port 8083
