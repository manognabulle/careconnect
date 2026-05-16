const pool = require("./server/db.js");
pool.query("SELECT * FROM medicines").then(res => {
  console.log(res.rows);
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
