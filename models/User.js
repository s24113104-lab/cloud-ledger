const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true } // 之後會存入加密後的密碼
});

module.exports = mongoose.model('User', UserSchema);