const mongoose = require('mongoose');

const RecordSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // 確保帳號資料隔離
  type: { type: String, enum: ['income', 'expense'], required: true }, // 收入或支出
  category: { type: String, required: true }, // 挑戰加分項：餐飲、交通、娛樂等
  amount: { type: Number, required: true },
  description: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Record', RecordSchema);