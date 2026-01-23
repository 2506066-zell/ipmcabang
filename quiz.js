document.addEventListener('DOMContentLoaded', () => {
    const loader = document.getElementById('loader');
    const quizContent = document.getElementById('quiz-content');
    const quizForm = document.getElementById('quiz-form');
    const submitBtn = document.getElementById('submit-btn');
    const resultContainer = document.getElementById('result-container');
    const scoreSpan = document.getElementById('score');
    const usernameInput = document.getElementById('username');

    const API_URL = 'https://script.google.com/macros/s/AKfycbz52KPpNn9d763MW3Ka0SGdLMdlstfSq5qmlz-i16JK-c3B4y8s5uK9MBplnwPLDpXT5g/exec';

    async function fetchQuiz() {
        try {
            const response = await fetch(API_URL);
            const data = await response.json();
            displayQuiz(data.questions);
        } catch (error) {
            loader.textContent = 'Gagal memuat soal. Coba lagi nanti.';
            console.error('Error fetching quiz:', error);
        }
    }

    function displayQuiz(questions) {
        loader.classList.add('hidden');
        quizContent.classList.remove('hidden');
        
        questions.forEach((q, index) => {
            const questionBlock = document.createElement('div');
            questionBlock.className = 'question-block';

            const questionText = document.createElement('p');
            questionText.className = 'question-text';
            questionText.textContent = `${index + 1}. ${q.question}`;
            questionBlock.appendChild(questionText);

            const optionsContainer = document.createElement('div');
            optionsContainer.className = 'options-container';

            q.options.forEach(option => {
                const label = document.createElement('label');
                label.className = 'option-label';
                
                const input = document.createElement('input');
                input.type = 'radio';
                input.name = `question${index}`;
                input.value = option;
                
                label.appendChild(input);
                label.appendChild(document.createTextNode(option));
                optionsContainer.appendChild(label);
            });

            questionBlock.appendChild(optionsContainer);
            quizForm.appendChild(questionBlock);
        });
    }

    submitBtn.addEventListener('click', async () => {
        const username = usernameInput.value.trim();
        if (!username) {
            alert('Silakan masukkan nama Anda.');
            return;
        }

        const answers = [];
        const questions = quizForm.querySelectorAll('.question-block');
        questions.forEach((q, index) => {
            const selected = q.querySelector(`input[name="question${index}"]:checked`);
            answers.push(selected ? selected.value : null);
        });

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: username,
                    answers: answers,
                }),
            });

            const result = await response.json();
            
            if(result.status === "success") {
                quizContent.classList.add('hidden');
                resultContainer.classList.remove('hidden');
                scoreSpan.textContent = `${result.score}/${questions.length}`;
            } else {
                alert('Gagal mengirim hasil: ' + result.message);
            }

        } catch (error) {
            alert('Gagal mengirim hasil: ' + error.message);
            console.error('Error submitting quiz:', error);
        }
    });

    fetchQuiz();
});