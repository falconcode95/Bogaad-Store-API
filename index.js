const Pool = require('pg').Pool;
const cors = require('cors');
const CryptoJS = require('crypto-js');
const jwt = require('jsonwebtoken');
const express = require('express');
require('dotenv').config();
const app = express();
const stripe = require('stripe')(process.env.STRIPE_KEY)
const pool = new Pool({
  host: process.env.HOST,
  user: process.env.USER,
  port: process.env.db_PORT,
  password: process.env.PASSWORD,
  database: process.env.DATABASE,
  ssl: {
    rejectUnauthorized: false,
  }
})
app.use(express.json());
app.use(cors());

app.get('/', (req, res)=> {
  res.send('<h1>Welcome to Bogaad Store API!</h1>')
})

app.post('/payment', async (req, res)=> {
  try {  
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: 'payment',
      line_items: req.body,
      success_url: 'http://localhost:3000/success',
      cancel_url: 'http://localhost:3000/Cart'
    })
    res.json({url: session.url})
  } catch (error) {
    console.log(error)
  }
})

app.get('/products/:category', async(req,res) => {
  try {
    const urlParams = req.params
    // const data = parseInt(urlParams.id);
    // const text = 'SELECT * FROM ' + urlParams.category + ' WHERE id = $1'
    // const values = [data]
    const query = await pool.query('SELECT * FROM ' + urlParams.category);
    // console.log(query);
    // const links = query.rows.map(item => item.link);
    const link = query.rows;
    const response = link.map(item => item.link)
    // console.log(link)
    // res.setHeader('Content-type', 'text/html');
    res.send(response);
    } catch (e) {
      console.log(e.message)
  }
})

app.get('/shortcut', (req, res)=> {
  try {
      const token = req.headers.accesstoken.split(' ')[1];
      jwt.verify(token, process.env.JWT_SECRET_KEY, async (err, userCredentials)=> {
        if(err){
          res.status(401)
      }
      let query = await pool.query(`SELECT * FROM users WHERE email = '${userCredentials.email}';`);
      const dbResponse = query.rows[0];
      query = await pool.query(`SELECT * FROM user_data WHERE user_id = '${dbResponse.id}';`);
      const normalQuery = query.rows[0];
      delete dbResponse.password;
      if(normalQuery){
        dbResponse.jsonCart = normalQuery.cart_data;
        dbResponse.jsonWishList = normalQuery.wishlist_data;
      }
      res.status(200).send(JSON.stringify(dbResponse));
    })
  } catch (e) {
    res.status(500)
  }
})

app.get('/users', async(req,res) => {
  try {
    const object = req.headers;
    const text = 'SELECT * FROM users WHERE email = $1';
    const value = [object.email]
    let query = await pool.query(text, value);
    const dbResponse = query.rows[0];
    const decryptedPassword = CryptoJS.AES.decrypt(dbResponse.password, process.env.ENCRYPT_SECRET).toString(CryptoJS.enc.Utf8);
    if(decryptedPassword === object.password){
      query = await pool.query(`SELECT * FROM user_data WHERE user_id = '${dbResponse.id}';`);
      const normalQuery = query.rows[0];
      const userCredentials = {email: object.email, password: object.password};
      const accessToken = jwt.sign(userCredentials, process.env.JWT_SECRET_KEY, {expiresIn: '1w'})
      // console.log(accessToken);
      delete dbResponse.password;
      dbResponse.accessToken = accessToken;
      if(normalQuery){
        dbResponse.jsonCart = normalQuery.cart_data && normalQuery.cart_data;
        dbResponse.jsonWishList = normalQuery.wishlist_data && normalQuery.cart_data;
      }
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
    const encryptedPassword = CryptoJS.AES.encrypt(object.password, process.env.ENCRYPT_SECRET).toString();
    const text = 'INSERT INTO users (email, name, surname, password) VALUES ($1, $2, $3, $4)'
    const values = [object.email, object.name, object.surname, encryptedPassword]
    const query = await pool.query(text, values);
    res.status(201).send(JSON.stringify(`User with the email: ${object.email} is created`)); 
    } catch (e) {
      res.status(400).send()
  }
})

app.put('/users', async(req,res)=> {
  try {
    const object = req.body;
    const text = 'SELECT * FROM users WHERE email = $1'
    const values = [object.email]
    let query = await pool.query(text, values);
    const decryptedPassword = CryptoJS.AES.decrypt(query.rows[0].password, process.env.ENCRYPT_SECRET).toString(CryptoJS.enc.Utf8);
    if(object.password === decryptedPassword) {
      const text1 = `UPDATE users SET ${object.key} = $1  WHERE email = $2`
      const values1 = [object.value, object.email];
      query = await pool.query(text1, values1);
      const text2 = 'SELECT * FROM users WHERE email = $1'
      const values2 = [object.email];
      query = await pool.query(text2, values2);
      res.status(200).send(JSON.stringify(query.rows[0][object.key]))
    }

  } catch (e) {
    res.status(401).send(e.message)
  }
})

app.delete('/users', async(req, res)=> {
  try {
    const object = req.body;
    const text = 'SELECT * FROM users WHERE email = $1';
    const value = [object.email]
    let query = await pool.query(text, value);
    const decryptedPassword = CryptoJS.AES.decrypt(query.rows[0].password, process.env.ENCRYPT_SECRET).toString(CryptoJS.enc.Utf8);
    if(object.password === decryptedPassword) {
      const text1 = 'DELETE FROM users WHERE email = $1';
      const value1 = [object.email]
      query = await pool.query(text1, value1);
      res.status(200).send(JSON.stringify({response: 'user is deleted from the database!'}))
    } else {
      res.status(401).send(JSON.stringify({response: 'Password is incorrect'}))
    }
  } catch (e) {
    res.status(404).send(e.message)
  }
})

app.post('/userdata', async(req,res)=> {
  try {
    const object = req.body;
    const text = 'SELECT * FROM users WHERE email = $1';
    const value = [object.email]
    let query = await pool.query(text, value);
    const userId = query.rows[0].id;
    if(object.jsonCart && object.jsonWishList){
      const text1 = 'INSERT INTO user_data (user_id, cart_data, wishlist_data) VALUES (' + userId + ' , $1, $2) ON CONFLICT (user_id) DO UPDATE SET cart_data = EXCLUDED.cart_data, wishlist_data = EXCLUDED.wishlist_data';
      const value1 = [JSON.stringify(object.jsonCart), JSON.stringify(object.jsonWishList)]
      let query = await pool.query(text1, value1);
    } else if(object.jsonCart && !object.jsonWishList){
      const text2 = 'INSERT INTO user_data (user_id, cart_data) VALUES (' + userId + ' , $1) ON CONFLICT (user_id) DO UPDATE SET cart_data = EXCLUDED.cart_data, wishlist_data = EXCLUDED.wishlist_data';
      const value2 = [JSON.stringify(object.jsonCart)]
      let query = await pool.query(text2, value2);
    } else if(!object.jsonCart && object.jsonWishList){
      const text3 = 'INSERT INTO user_data (user_id, wishlist_data) VALUES (' + userId + ' , $1) ON CONFLICT (user_id) DO UPDATE SET cart_data = EXCLUDED.cart_data, wishlist_data = EXCLUDED.wishlist_data';
      const value3 = [JSON.stringify(object.jsonWishList)]
      let query = await pool.query(text3, value3);
    }
    res.status(201).send(JSON.stringify({dataReceived: true}));
  } catch(e){
    res.status(400).send(e.message)
    console.log(e.message)
  }
})

app.listen(process.env.PORT || 5000, () => {
  console.log(`Server is listening on port ${process.env.PORT}`)
})


// for(let i = 1; i < 9; i++){
//   console.log(
//     `INSERT INTO trousers (id, image) VALUES (${i}, pg_read_binary_file('C://Users/Public/Product Images/trousers/${i} trouser.png'));`
//   )
// }


// INSERT INTO test (name, surname, year) VALUES ('abdi', 'warsame', 1994)
// ON CONFLICT (name)
// DO 
// UPDATE SET surname = EXCLUDED.surname, year = EXCLUDED.year;