const express = require('express')
const crypto = require("crypto");
const router = express.Router()
const bcrypt = require('bcryptjs')
const {body,validationResult} = require('express-validator')
const User = require('../models/User')
const jwt =require('jsonwebtoken');
const fetchuser = require('../middleware/fetchuser');
const JWT_SECRET = process.env.JWT_SECRET
const PEPPER = process.env.PEPPER


module.exports = router