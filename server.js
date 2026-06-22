require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const User = require('./models/User');
const Record = require('./models/Record');

const app = express();

// Middleware
app.use(express.json());
app.use(express.static('public')); // 託管前端靜態網頁
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 1 天過期
}));

// 資料庫連接
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected...'))
  .catch(err => console.log(err));

// 🛡️ 檢查登入狀態的中介軟體 (未登入安全攔截)
const authMiddleware = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: '未獲授權，請先登入' });
  }
  next();
};

/* ================= AUTH API ================= */

// 1. 註冊 (含前端/後端密碼長度檢查與加密)
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (password.length < 6) { // 挑戰加分項：輸入限制
      return res.status(400).json({ message: '密碼長度必須至少 6 個字' });
    }
    
    const userExists = await User.findOne({ username });
    if (userExists) return res.status(400).json({ message: '帳號已被註冊' });

    // 🔥 密碼安全加密 ($2b$ 開頭)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();
    res.status(201).json({ message: '註冊成功！' });
  } catch (err) {
    res.status(500).json({ message: '伺服器錯誤' });
  }
});

// 2. 登入
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ message: '帳號或密碼錯誤' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: '帳號或密碼錯誤' });

    req.session.userId = user._id; // 將用戶 ID 存入 session
    res.json({ message: '登入成功' });
  } catch (err) {
    res.status(500).json({ message: '伺服器錯誤' });
  }
});

// 3. 登出
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ message: '無法登出' });
    res.clearCookie('connect.sid');
    res.json({ message: '已成功登出' });
  });
});

/* ================= ACCOUNTS API (帳務資料隔離) ================= */

// 1. 取得該登入使用者的所有記帳資料
app.get('/api/accounts', authMiddleware, async (req, res) => {
  try {
    // 🔒 帳號資料隔離：只查詢 userId 等於當前 session.userId 的資料
    const records = await Record.find({ userId: req.session.userId }).sort({ createdAt: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: '無法取得資料' });
  }
});

// 2. 新增記帳資料
app.post('/api/accounts', authMiddleware, async (req, res) => {
  try {
    const { type, category, amount, description } = req.body;
    const newRecord = new Record({
      userId: req.session.userId, // 綁定當前用戶
      type,
      category,
      amount: Number(amount),
      description
    });
    await newRecord.save();
    res.status(201).json(newRecord);
  } catch (err) {
    res.status(500).json({ message: '新增失敗' });
  }
});

// 3. 刪除記帳資料
app.delete('/api/accounts/:id', authMiddleware, async (req, res) => {
  try {
    // 🔒 安全刪除：確保該筆資料確實屬於該登入使用者
    const record = await Record.findOneAndDelete({ _id: req.params.id, userId: req.session.userId });
    if (!record) return res.status(404).json({ message: '找不到該筆資料或無權限刪除' });
    res.json({ message: '資料已成功刪除' });
  } catch (err) {
    res.status(500).json({ message: '刪除失敗' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));