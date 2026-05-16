const pool = require('./server/db');
pool.query("SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_schema = 'public'").then(res => { console.log(JSON.stringify(res.rows, null, 2)); process.exit(0); })
