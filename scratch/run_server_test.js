const { spawn } = require('child_process');
const server = spawn('node', ['server/index.js'], {
    env: { ...process.env, PG_PASSWORD: '2005' } // Provide password to avoid prompt
});

server.stdout.on('data', (data) => {
    console.log(`STDOUT: ${data}`);
});

server.stderr.on('data', (data) => {
    console.log(`STDERR: ${data}`);
});

setTimeout(() => {
    server.kill();
    console.log("Server killed after 10s");
    process.exit(0);
}, 10000);
