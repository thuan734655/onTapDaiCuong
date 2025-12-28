// ===== DOM Elements =====
const screens = {
    start: document.getElementById('startScreen'),
    quiz: document.getElementById('quizScreen'),
    result: document.getElementById('resultScreen'),
    review: document.getElementById('reviewScreen')
};

const elements = {
    totalQuestionsPreview: document.getElementById('totalQuestionsPreview'),
    questionCount: document.getElementById('questionCount'),
    quizMode: document.getElementById('quizMode'),
    startBtn: document.getElementById('startBtn'),
    
    currentQuestion: document.getElementById('currentQuestion'),
    totalQuestions: document.getElementById('totalQuestions'),
    progressFill: document.getElementById('progressFill'),
    timer: document.getElementById('timer'),
    questionNumber: document.getElementById('questionNumber'),
    questionText: document.getElementById('questionText'),
    optionsContainer: document.getElementById('optionsContainer'),
    prevBtn: document.getElementById('prevBtn'),
    nextBtn: document.getElementById('nextBtn'),
    submitBtn: document.getElementById('submitBtn'),
    
    resultIcon: document.getElementById('resultIcon'),
    resultTitle: document.getElementById('resultTitle'),
    scoreProgress: document.getElementById('scoreProgress'),
    scoreValue: document.getElementById('scoreValue'),
    correctCount: document.getElementById('correctCount'),
    wrongCount: document.getElementById('wrongCount'),
    totalTime: document.getElementById('totalTime'),
    reviewBtn: document.getElementById('reviewBtn'),
    restartBtn: document.getElementById('restartBtn'),
    
    reviewContent: document.getElementById('reviewContent'),
    backToResultBtn: document.getElementById('backToResultBtn')
};

// ===== State =====
let quizData = null;
let currentQuestions = [];
let currentIndex = 0;
let userAnswers = {};
let timerInterval = null;
let startTime = null;
let elapsedSeconds = 0;

// ===== Initialize =====
async function init() {
    try {
        const response = await fetch('questions.json');
        if (!response.ok) throw new Error('Không thể tải câu hỏi');
        quizData = await response.json();
        
        elements.totalQuestionsPreview.textContent = quizData.totalQuestions;
        setupEventListeners();
    } catch (error) {
        console.error('Error loading questions:', error);
        elements.startBtn.textContent = 'Lỗi tải dữ liệu';
        elements.startBtn.disabled = true;
    }
}

// ===== Event Listeners =====
function setupEventListeners() {
    elements.startBtn.addEventListener('click', startQuiz);
    elements.prevBtn.addEventListener('click', prevQuestion);
    elements.nextBtn.addEventListener('click', nextQuestion);
    elements.submitBtn.addEventListener('click', submitQuiz);
    elements.reviewBtn.addEventListener('click', showReview);
    elements.restartBtn.addEventListener('click', restartQuiz);
    elements.backToResultBtn.addEventListener('click', () => showScreen('result'));
}

// ===== Screen Management =====
function showScreen(screenName) {
    Object.values(screens).forEach(screen => screen.classList.remove('active'));
    screens[screenName].classList.add('active');
}

// ===== Quiz Logic =====
function startQuiz() {
    const countOption = elements.questionCount.value;
    const mode = elements.quizMode.value;
    
    // Prepare questions
    let questions = [...quizData.questions];
    
    if (mode === 'random') {
        questions = shuffleArray(questions);
    }
    
    if (countOption !== 'all') {
        const count = parseInt(countOption);
        questions = questions.slice(0, count);
    }
    
    currentQuestions = questions;
    currentIndex = 0;
    userAnswers = {};
    elapsedSeconds = 0;
    
    // Update UI
    elements.totalQuestions.textContent = currentQuestions.length;
    
    // Start timer
    startTime = Date.now();
    timerInterval = setInterval(updateTimer, 1000);
    
    showScreen('quiz');
    renderQuestion();
}

function renderQuestion() {
    const question = currentQuestions[currentIndex];
    const questionNum = currentIndex + 1;
    
    // Update progress
    elements.currentQuestion.textContent = questionNum;
    elements.questionNumber.textContent = questionNum;
    elements.progressFill.style.width = `${(questionNum / currentQuestions.length) * 100}%`;
    
    // Update question text
    elements.questionText.textContent = question.question;
    
    // Render options
    elements.optionsContainer.innerHTML = '';
    const letters = ['A', 'B', 'C', 'D'];
    
    question.options.forEach((option, index) => {
        const optionEl = document.createElement('div');
        optionEl.className = 'option';
        if (userAnswers[question.id] === index) {
            optionEl.classList.add('selected');
        }
        
        // Lấy text của option (bỏ phần đầu A. B. C. D.)
        let optionText = option.replace(/^[A-D][\.\)]\s*/, '');
        
        optionEl.innerHTML = `
            <span class="option-letter">${letters[index]}</span>
            <span class="option-text">${optionText}</span>
        `;
        
        optionEl.addEventListener('click', () => selectOption(question.id, index));
        elements.optionsContainer.appendChild(optionEl);
    });
    
    // Update navigation buttons
    elements.prevBtn.disabled = currentIndex === 0;
    
    if (currentIndex === currentQuestions.length - 1) {
        elements.nextBtn.classList.add('hidden');
        elements.submitBtn.classList.remove('hidden');
    } else {
        elements.nextBtn.classList.remove('hidden');
        elements.submitBtn.classList.add('hidden');
    }
}

function selectOption(questionId, optionIndex) {
    // Nếu đã chọn rồi thì không cho chọn lại
    if (userAnswers[questionId] !== undefined) {
        return;
    }
    
    userAnswers[questionId] = optionIndex;
    
    // Lấy câu hỏi hiện tại
    const question = currentQuestions[currentIndex];
    const isCorrect = optionIndex === question.correctAnswer;
    
    // Update UI - hiển thị kết quả
    const options = elements.optionsContainer.querySelectorAll('.option');
    options.forEach((opt, idx) => {
        // Disable tất cả options
        opt.style.pointerEvents = 'none';
        
        if (idx === optionIndex) {
            // Đáp án user chọn
            opt.classList.add(isCorrect ? 'correct' : 'wrong');
        }
        
        if (idx === question.correctAnswer) {
            // Luôn highlight đáp án đúng
            opt.classList.add('correct');
        }
    });
    
    // Tự động chuyển câu sau 1.5 giây
    setTimeout(() => {
        if (currentIndex < currentQuestions.length - 1) {
            nextQuestion();
        }
    }, 1500);
}

function prevQuestion() {
    if (currentIndex > 0) {
        currentIndex--;
        renderQuestion();
    }
}

function nextQuestion() {
    if (currentIndex < currentQuestions.length - 1) {
        currentIndex++;
        renderQuestion();
    }
}

function submitQuiz() {
    // Stop timer
    clearInterval(timerInterval);
    
    // Calculate results
    let correctCount = 0;
    currentQuestions.forEach(q => {
        if (userAnswers[q.id] === q.correctAnswer) {
            correctCount++;
        }
    });
    
    const wrongCount = currentQuestions.length - correctCount;
    const scorePercent = Math.round((correctCount / currentQuestions.length) * 100);
    
    // Update result screen
    elements.correctCount.textContent = correctCount;
    elements.wrongCount.textContent = wrongCount;
    elements.totalTime.textContent = formatTime(elapsedSeconds);
    elements.scoreValue.textContent = scorePercent;
    
    // Animate score circle
    const circumference = 2 * Math.PI * 45;
    const offset = circumference - (scorePercent / 100) * circumference;
    
    // Add gradient definition if not exists
    if (!document.getElementById('scoreGradient')) {
        const svg = elements.scoreProgress.closest('svg');
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        defs.innerHTML = `
            <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style="stop-color:#6366f1"/>
                <stop offset="100%" style="stop-color:#a855f7"/>
            </linearGradient>
        `;
        svg.insertBefore(defs, svg.firstChild);
    }
    
    elements.scoreProgress.style.stroke = 'url(#scoreGradient)';
    setTimeout(() => {
        elements.scoreProgress.style.strokeDashoffset = offset;
    }, 100);
    
    // Set result icon and title
    if (scorePercent >= 80) {
        elements.resultIcon.textContent = '🏆';
        elements.resultTitle.textContent = 'Xuất sắc!';
    } else if (scorePercent >= 60) {
        elements.resultIcon.textContent = '🎉';
        elements.resultTitle.textContent = 'Tốt lắm!';
    } else if (scorePercent >= 40) {
        elements.resultIcon.textContent = '💪';
        elements.resultTitle.textContent = 'Cố gắng hơn nhé!';
    } else {
        elements.resultIcon.textContent = '📚';
        elements.resultTitle.textContent = 'Cần ôn tập thêm!';
    }
    
    showScreen('result');
}

function showReview() {
    elements.reviewContent.innerHTML = '';
    
    currentQuestions.forEach((q, idx) => {
        const userAnswer = userAnswers[q.id];
        const isCorrect = userAnswer === q.correctAnswer;
        const letters = ['A', 'B', 'C', 'D'];
        
        const reviewItem = document.createElement('div');
        reviewItem.className = `review-item ${isCorrect ? 'correct' : 'wrong'}`;
        
        let optionsHtml = q.options.map((opt, optIdx) => {
            let classes = ['review-option'];
            let badges = [];
            
            // Lấy text của option (bỏ phần đầu A. B. C. D.)
            let optionText = opt.replace(/^[A-D][\.\)]\s*/, '');
            
            if (optIdx === userAnswer && userAnswer !== q.correctAnswer) {
                classes.push('user-answer');
                badges.push('<span class="review-badge your-answer">Đáp án của bạn</span>');
            }
            
            if (optIdx === q.correctAnswer) {
                classes.push('correct-answer');
                badges.push('<span class="review-badge correct">Đáp án đúng</span>');
            }
            
            return `
                <div class="${classes.join(' ')}">
                    <strong>${letters[optIdx]}.</strong> ${optionText}
                    ${badges.join('')}
                </div>
            `;
        }).join('');
        
        reviewItem.innerHTML = `
            <div class="review-question">
                <span class="review-question-number">Câu ${idx + 1}:</span>
                <span>${q.question}</span>
            </div>
            <div class="review-options">
                ${optionsHtml}
            </div>
        `;
        
        elements.reviewContent.appendChild(reviewItem);
    });
    
    showScreen('review');
}

function restartQuiz() {
    // Reset score circle
    elements.scoreProgress.style.strokeDashoffset = 283;
    
    showScreen('start');
}

// ===== Timer =====
function updateTimer() {
    elapsedSeconds++;
    elements.timer.textContent = formatTime(elapsedSeconds);
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// ===== Utilities =====
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// ===== Start App =====
init();
