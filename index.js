const Pool = require('pg').Pool;
const cors = require('cors');
const { response } = require('express');
const express = require('express');
const app = express()
const port = 5000
let result;
const pool = new Pool({
  host: 'localhost',
  user: 'postgres',
  port: 5432,
  password: 'postgres',
  database: 'Bogaad Store'
})

app.use(express.json());
app.use(cors())

app.get('/products/:category/:id', async(req,res) => {
  try {
    const urlParams = req.params
    const query = await pool.query("SELECT * FROM " + urlParams.category +  " WHERE id = " + parseInt(urlParams.id));
    const b64 = query.rows[0].image
    res.setHeader('Content-type', 'image/jpg');
    res.send(b64);
    } catch (e) {
      console.log(e.message)
  }
})

app.get('/users', async(req,res) => {
  try {
    const object = req.headers;
    const query = await pool.query(`SELECT * FROM users WHERE email = '${object.email}';`);
    const dbResponse = query.rows[0];
    if(dbResponse.password === object.password){
      delete dbResponse.password;
      res.status(200).send(JSON.stringify(dbResponse));
    } else {
      res.status(401).send()
    }
    } catch (e) {
      res.status(404).send(JSON.stringify('Email or Password is incorrect, try again'));
  }
})

app.post('/users', async(req,res) => {
  try {
    const object = req.body;
    console.log(object)
    const query = await pool.query(`INSERT INTO users (email, name, surname, password) VALUES ( '${object.email}', '${object.name}',
      '${object.surname}', '${object.password}') `);
    res.status(201).send(JSON.stringify(`User with the email: ${object.email} is created`));
    } catch (e) {
      res.status(400).send()
  }
})

app.put('/users', async(req,res)=> {
  try {
    const object = req.body;
    console.log(object)
    let query = await pool.query(`SELECT * FROM users WHERE email = '${object.email}';`);
    // console.log(query.rows[0])
    if(object.password === query.rows[0].password) {
      query = await pool.query(`UPDATE users SET ${object.key} = '${object.value}'  WHERE email = '${object.email}';`);
      query = await pool.query(`SELECT * FROM users WHERE email = '${object.email}';`);
      console.log()
      res.status(200).send(JSON.stringify(query.rows[0][object.key]))
    }

  } catch (e) {
    res.status(401).send(e.message)
  }
})

app.delete('/users', async(req, res)=> {
  try {
    const object = req.body;
    console.log(object)
    let query = await pool.query(`SELECT * FROM users WHERE email = '${object.email}';`);
    if(object.password === query.rows[0].password) {
      query = await pool.query(`DELETE FROM users WHERE email = '${object.email}';`);
      res.status(204).send(JSON.stringify({response: 'user is deleted from the database!'}))
    } else {
      res.status(401).send(JSON.stringify({response: 'Password is incorrect'}))
    }
  } catch (e) {
    res.status(404).send(e.message)
  }
})

app.get('/test', async(req,res)=> {
  try {
    let query = await pool.query('SELECT * FROM test;');
    res.status(200).send(query.rows[0]);
  } catch(e){
    console.log(e.message)
  }
})

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`)
})


// for(let i = 1; i < 9; i++){
//   console.log(
//     `INSERT INTO trousers (id, image) VALUES (${i}, pg_read_binary_file('C://Users/Public/Product Images/trousers/${i} trouser.png'));`
//   )
// }
