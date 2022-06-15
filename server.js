const users = {
    user1: {
        id: 1,
        name: 'Abdullaziz',
        age: 27,
        role: 'Son'
    },
    user2: {
        id: 2,
        name: 'Mohamed',
        age: 60,
        role: 'Father'
    }
}
const loginUsers = {
    user1: {
        id: 1,
        username: 'Shiine',
        password: '123'
    },
    user2: {
        id: 2,
        username: 'Ookio',
        password: '456'
    }
}
const refreshTokens = [];
const express = require('express');
const app = express();
const jwt = require('jsonwebtoken');
require('dotenv').config();

app.get('/login', (req, res)=> {
    const object = req.headers;
    let user;
    for(let x in loginUsers){
        if(loginUsers[x].username === object.username && loginUsers[x].password === object.password){
            user = loginUsers[x];
        }
    }
    const userCredentials = {username: user.username, password: user.password }
    const accessToken = jwt.sign(userCredentials, process.env.JWT_SECRET_KEY, {expiresIn: '15m'})
    const refreshToken = jwt.sign(userCredentials, process.env.REFRESH_KEY)
    let userInfo;
    for(let x in users){
        if(users[x].id === user.id){
            userInfo = users[x]
        }
    }
    refreshTokens.push(refreshToken)
    console.log(refreshTokens)
    userInfo.accessToken = accessToken;
    userInfo.refreshToken = refreshToken;
    res.json(userInfo)
})
console.log(refreshTokens)

app.get('/userinfo', (req, res)=> {
    const token = req.headers.accesstoken.split(' ')[1]
    console.log(token)
    jwt.verify(token, process.env.JWT_SECRET_KEY, (err, userCredentials)=>{
        if(err){
            res.status(501)
        }
        res.json(userCredentials)
    })
})

app.listen(process.env.PORT, ()=> {
    console.log(`server listening on ${process.env.PORT}`)
})