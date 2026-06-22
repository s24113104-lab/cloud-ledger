// 1. 切換介面顯示
function toggleView(isLoggedIn) {
  if (isLoggedIn) {
    document.getElementById('auth-section').classList.add('hidden');
    document.getElementById('app-section').classList.remove('hidden');
    fetchRecords(); // 登入成功或狀態確認後，抓取資料
  } else {
    document.getElementById('auth-section').classList.remove('hidden');
    document.getElementById('app-section').classList.add('hidden');
  }
}

// 2. 處理登入與註冊
async function handleAuth(action) {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

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

// 3. 處理登出
async function handleLogout() {
  await fetch('/api/auth/logout', { method: 'POST' });
  toggleView(false);
}

// 4. 取得記帳列表與動態渲染 (SPA 局部更新)
async function fetchRecords() {
  const res = await fetch('/api/accounts');
  
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
    if (r.type === 'income') totalIncome += r.amount;
    if (r.type === 'expense') totalExpense += r.amount;

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

  document.getElementById('total-income').innerText = totalIncome;
  document.getElementById('total-expense').innerText = totalExpense;
  document.getElementById('total-balance').innerText = totalIncome - totalExpense;
}

// 5. 新增記帳
async function addRecord(e) {
  e.preventDefault(); 
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
    fetchRecords(); 
  }
}

// 6. 刪除記帳
async function deleteRecord(id) {
  const res = await fetch(`/api/accounts/${id}`, { method: 'DELETE' });
  if (res.ok) {
    fetchRecords(); 
  }
}

// ========================================================
// 🔥 🔥 關鍵修正：每次網頁重新整理（F5）時，自動呼叫後端驗證 Session
// ========================================================
window.addEventListener('DOMContentLoaded', async () => {
  try {
    const res = await fetch('/api/auth/status');
    const data = await res.json();
    
    if (data.loggedIn) {
      // 🟢 如果後端回報目前 Session 依然有效，直接切換到記帳畫面
      toggleView(true); 
    } else {
      // 🔴 若沒有登入過，保持在登入畫面
      toggleView(false);
    }
  } catch (err) {
    console.error('檢查登入狀態失敗：', err);
    toggleView(false);
  }
});