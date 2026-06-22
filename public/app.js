// 切換介面顯示
function toggleView(isLoggedIn) {
  if (isLoggedIn) {
    document.getElementById('auth-section').classList.add('hidden');
    document.getElementById('app-section').classList.remove('hidden');
    fetchRecords();
  } else {
    document.getElementById('auth-section').classList.remove('hidden');
    document.getElementById('app-section').classList.add('hidden');
  }
}

// 處理登入與註冊
async function handleAuth(action) {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  // 🎯 挑戰加分項：輸入限制 (前端阻擋)
  if (action === 'register' && password.length < 6) {
    alert('⚠️ 註冊失敗：密碼少於 6 個字！');
    return;
  }

  const res = await fetch(`/api/auth/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data = await res.json();

  if (res.ok) {
    alert(data.message || '操作成功！');
    if (action === 'login') toggleView(true);
  } else {
    alert(`錯誤: ${data.message}`);
  }
}

// 處理登出
async function handleLogout() {
  await fetch('/api/auth/logout', { method: 'POST' });
  toggleView(false);
}

// 取得記帳列表與動態渲染 (SPA 局部更新)
async function fetchRecords() {
  const res = await fetch('/api/accounts');
  
  // 🛡️ 未登入安全攔截處理
  if (res.status === 401) {
    toggleView(false);
    return;
  }

  const records = await res.json();
  const list = document.getElementById('record-list');
  list.innerHTML = '';

  let totalIncome = 0;
  let totalExpense = 0;

  records.forEach(r => {
    // 統計金額 (加分項)
    if (r.type === 'income') totalIncome += r.amount;
    if (r.type === 'expense') totalExpense += r.amount;

    // 局部渲染表格
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="color: ${r.type === 'income' ? 'green' : 'red'}">${r.type === 'income' ? '收入' : '支出'}</td>
      <td>${r.category}</td>
      <td>$${r.amount}</td>
      <td>${r.description || ''}</td>
      <td><button onclick="deleteRecord('${r._id}')">刪除</button></td>
    `;
    list.appendChild(tr);
  });

  // 🎯 挑戰加分項：自動計算看板更新
  document.getElementById('total-income').innerText = totalIncome;
  document.getElementById('total-expense').innerText = totalExpense;
  document.getElementById('total-balance').innerText = totalIncome - totalExpense;
}

// 新增記帳 (SPA 免重載)
async function addRecord(e) {
  e.preventDefault(); // 阻擋表單預設的整頁重載行為！
  const type = document.getElementById('type').value;
  const category = document.getElementById('category').value;
  const amount = document.getElementById('amount').value;
  const description = document.getElementById('description').value;

  const res = await fetch('/api/accounts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, category, amount, description })
  });

  if (res.ok) {
    document.getElementById('ledger-form').reset();
    fetchRecords(); // 局部刷新資料，左上角重新整理完全不閃爍
  }
}

// 刪除記帳 (SPA 免重載)
async function deleteRecord(id) {
  const res = await fetch(`/api/accounts/${id}`, { method: 'DELETE' });
  if (res.ok) {
    fetchRecords(); // 局部刷新
  }
}