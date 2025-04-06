let timerDisplay = document.getElementById('timer');
let fillBar = document.getElementById('fill');

let defaultDuration = 300; // 5:00 in seconds
let duration = defaultDuration;
let countdownInterval;

function formatTime(seconds) {
  let min = Math.floor(seconds / 60);
  let sec = seconds % 60;
  return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

function updateDisplay() {
  timerDisplay.textContent = formatTime(duration);

  // Fill bar logic
  if (duration <= 300) {
    let fillPercent = ((300 - duration) / 300) * 100;
    fillBar.style.width = `${fillPercent}%`;
  } else {
    fillBar.style.width = '0%';
  }
}

function startCountdown() {
  clearInterval(countdownInterval);
  countdownInterval = setInterval(() => {
    if (duration > 0) {
      duration--;
      updateDisplay();
    } else {
      clearInterval(countdownInterval);
    }
  }, 1000);
}

function increaseTime() {
  duration += 60;
  updateDisplay();
}

function decreaseTime() {
  if (duration >= 60) {
    duration -= 60;
    updateDisplay();
  } else {
    duration == 0;
    updateDisplay();
  }
}

function resetTimer() {
  duration = defaultDuration;
  updateDisplay();
}

updateDisplay();
startCountdown();
