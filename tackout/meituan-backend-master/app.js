import express from 'express';
import './mongodb/db.js';
import router from './routes/index.js';
import cookieParser from 'cookie-parser'
import session from 'express-session';
import MongoStore from 'connect-mongo';
import bodyParser from 'body-parser'
import multer from 'multer';
import config from './config'
import path from 'path';

const app = express();

app.use(express.static(path.join(__dirname, 'public')));

let storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/upload_imgs')
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + file.originalname)
  }
});

let upload = multer({storage: storage});

app.all('*', (req, res, next) => {
  const allowedOrigins = ['http://localhost:8080', 'http://127.0.0.1:8080'];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Origin, Accept");
  res.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("X-Powered-By", '3.2.1');
  res.header("Cache-Control", "public,max-age=60000");
  if (req.method === 'OPTIONS') {
    res.send(200);
  } else {
    next();
  }
});

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json({}));
app.use(cookieParser());

// 使用 MongoDB 存储 session
app.use(session({
  name: 'mt-session',
  secret: 'meituan',
  resave: true,
  saveUninitialized: false,
  rolling: false,
  store: MongoStore.create({
    mongoUrl: config.sessionStorageURL,
    touchAfter: 24 * 3600 // 24小时内只更新一次
  }),
  cookie: {
    httpOnly: false,
    secure: false,
    maxAge: 365 * 24 * 60 * 60 * 1000,
    sameSite: 'lax'
  }
}));

// Debug: log all requests to /admin/
app.use((req, res, next) => {
  if (req.path.startsWith('/admin/')) {
    console.log('=== REQUEST ===');
    console.log('Path:', req.path);
    console.log('Cookie header:', req.headers.cookie);
    console.log('Cookies parsed:', req.cookies);
    console.log('Session ID:', req.sessionID);
    console.log('Session user_id:', req.session && req.session.user_id);
  }
  next();
});

router(app);
console.log('*********************************')
console.log(`service start on ${config.port}`)
console.log('*********************************')
app.listen(config.port);

module.exports = app;
