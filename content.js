console.log("[Pokemon Cafe Bot] Script loaded.");
let CFG = {};
let STATUS_SELECTORS = [];

function updateStatusUI() {
  STATUS_SELECTORS.forEach((s, idx) => {
    if (!s) {
      return;
    }
    const el = document.querySelector(s.selector);
    const div = document.getElementById(`status-step-${idx}`);
    if (div) {
      if (el) {
        div.style.backgroundColor = '#a2f0a2';
      } else {
        div.style.backgroundColor = '';
      }
    }
  });
}


const STATUS_CONTAINER_ID = '__pokemon_cafe_status_container__';
const TOGGLE_STATE_KEY = '__pokemon_cafe_toggle_state__';
const PEOPLE_SELECT_COOLING_TIME = 5;
const PEOPLE_SELECT_COOLING_TIME_KEY = '__pokemon_cafe_cooling_time__';

function createStatusUI() {
  if (document.getElementById(STATUS_CONTAINER_ID)) return;

  const container = document.createElement('div');
  container.id = STATUS_CONTAINER_ID;
  container.style.position = 'fixed';
  container.style.bottom = '80px';
  container.style.right = '20px';
  container.style.backgroundColor = '#f1f1f1';
  container.style.border = '1px solid #999';
  container.style.padding = '10px';
  container.style.zIndex = '9999';
  container.style.borderRadius = '5px';
  container.style.fontSize = '12px';
  container.style.boxShadow = '0 0 5px rgba(0,0,0,0.2)';

  STATUS_SELECTORS.forEach((s, idx) => {
    const div = document.createElement('div');
    div.innerText = s.text;
    div.dataset.selector = s.selector;
    div.id = `status-step-${idx}`;
    div.style.marginBottom = '4px';
    container.appendChild(div);
  });

  document.body.appendChild(container);
}


let mainIntervalId = null;

function handleExecutionStateChange() {
  if (isPaused()) {
    console.log('[Bot] 切換為暫停狀態');
    if (mainIntervalId) {
      clearInterval(mainIntervalId);
      mainIntervalId = null;
    }
  } else {
    console.log('[Bot] 切換為執行狀態');
    main(); // 初始先執行一次
    // mainIntervalId = setInterval(main, 1000); // 可依你需要的頻率調整
  }
}

function createToggleButton() {
  const btn = document.createElement('button');
  btn.innerText = isPaused() ? '▶️ 開始' : '⏸️ 暫停';
  btn.style.position = 'fixed';
  btn.style.bottom = '20px';
  btn.style.right = '20px';
  btn.style.padding = '10px 16px';
  btn.style.backgroundColor = '#007bff';
  btn.style.color = '#fff';
  btn.style.border = 'none';
  btn.style.borderRadius = '5px';
  btn.style.fontSize = '14px';
  btn.style.zIndex = '10000';
  btn.style.cursor = 'pointer';
  btn.onclick = () => {
    const now = isPaused();
    const newState = now ? 'running' : 'paused';
    localStorage.setItem(TOGGLE_STATE_KEY, newState);
    btn.innerText = newState === 'running' ? '⏸️ 暫停' : '▶️ 開始';
    handleExecutionStateChange();
  };
  document.body.appendChild(btn);
}

function isPaused() {
  return localStorage.getItem(TOGGLE_STATE_KEY) !== 'running';
}

function tryClick(selector, actionText) {
  if (isPaused() === 'paused') {
    return;
}

  const el = document.querySelector(selector);

  if (el) {
    console.log(`[Bot] 執行: ${actionText}`);
    el.click();
  } else {
    console.log(`[Bot] 尚未找到: ${actionText}`);
  }
}

function trySelectOption(selector) {
  if (isPaused() === 'paused') {
    return;
  }
  const select = document.querySelector(selector);
  const table = document.getElementById('forms-step-1');
  if (table) {
    console.log('[Bot] table found');
  }
  if (select && !table) {
    console.log(`[Bot] 選擇 value="${CFG['SEAT_NUM']}", ${selector}`);
    select.value = CFG['SEAT_NUM'];
    const now_time = new Date() / 1000;
    const time_diff = now_time - localStorage.getItem(PEOPLE_SELECT_COOLING_TIME_KEY) | 0;
    console.log("time diff: ", time_diff);
    console.log("localStorage.getItem: ", localStorage.getItem(PEOPLE_SELECT_COOLING_TIME_KEY));
    if (time_diff >= PEOPLE_SELECT_COOLING_TIME){
      localStorage.setItem(PEOPLE_SELECT_COOLING_TIME_KEY, now_time);
    select.dispatchEvent(new Event('change'));
      return ;
    }
    console.log("[Bot] Cooling time expired, reload by manual, time diff: ", time_diff);
    
  } else {
    console.log(`[Bot] 尚未找到 value="${CFG['SEAT_NUM']}"`);
  }
}

function submitStep2Form(cfg_date) {
  if (isPaused() === 'paused') {
    return;
  }

  const dateStr = new Date(cfg_date).toString();
  const input = document.querySelector('input#date');
  const form = document.querySelector('form#step2-form');

  if (!input || !form) {
    console.error('[submitStep2Form] 找不到 input#date 或 form#step2-form');
    return;
  }

  input.value = dateStr;
  console.log(`[submitStep2Form] 填入日期: ${dateStr}`);

  form.submit();
}

function clickFirstAvailableCell() {
  const cells = document.querySelectorAll('.time-cell');
  if (!cells || cells.length === 0) {
    return;
  }
  for (const cell of cells) {
    const statusBoxes = cell.querySelectorAll('.status-box .status');
    
    for (const status of statusBoxes) {
      if (status.textContent.includes('Available')) {
        console.log(`点击可用時段：${cell} ${status} `);
        // cell.click();
        return; // 找到第一個就停止
      }
    }
  }

  console.log('沒有找到 Available 的時段。');
}

function main() {
  chrome.storage.local.get('reservationConfig', (result) => {
    if (result.reservationConfig) {
      CFG = result.reservationConfig;
      console.log('讀取到設定：', CFG);
      STATUS_SELECTORS = [ 
        { text: '打勾同意', selector: '#forms-agree > div > div > div.button-container > label' },
        { text: '點選同意按鈕', selector: '#forms-agree > div > div > div.button-container-agree > button' },
        { text: 'captcha verify 按鈕', selector: '#amzn-captcha-verify-button' },
        { text: 'Make a Reservation', selector: 'body > div.container > div > div.column.is-8 > div > div.button-container > a' },
        { text: `選擇 ${CFG['SEAT_NUM']} 人`, selector: 'body > div.container > div > div.column.is-8 > div > div.field > form > div > select' },
        { text: '選日期', selector: 'form#step2-form' },
        { text: '選時間', selector: 'aaa' },
        { text: '填電話姓名EMAIL', selector: 'bbb' },
      ];
      createStatusUI();
      updateStatusUI();
      createToggleButton();

      if (isPaused()) {
        console.log('[Bot] 目前為暫停狀態，不執行自動操作');
        return;
      }
    
      tryClick('#forms-agree > div > div > div.button-container > label', '打勾同意');
      tryClick('#forms-agree > div > div > div.button-container-agree > button', '點選同意按鈕');
      tryClick('#amzn-captcha-verify-button', '按鈕captcha');
      tryClick('body > div.container > div > div.column.is-8 > div > div.button-container > a', '下一頁按鈕');
      trySelectOption('body > div.container > div > div.column.is-8 > div > div.field > form > div > select');
      submitStep2Form(CFG['DATE']);
      clickFirstAvailableCell();
    
    } else { 
      console.warn('尚未設定參數');
    }
  });

}

if (document.readyState === 'complete') {
  main();
} else {
  window.addEventListener('load', main);
}
