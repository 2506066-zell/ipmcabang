    // --- Quiz Initialization ---
    async function fetchQuestions() {
        showLoader('Mempersiapkan Soal...');
        await new Promise(r => requestAnimationFrame(r));
        nextBtn.style.display = 'none';
        quizHeader.style.display = 'none';

        try {
            // Fetch summary first
            const response = await fetch(`${API_URL}/questions?mode=summary`);
            if (!response.ok) throw new Error('Gagal mengambil data soal dari server.');
            
            const payload = await response.json();
            const sets = payload.sets || [];
            
            if (!sets.length) {
                quizBody.style.display = 'block';
                quizBody.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">🙂</div>
                        <h3>Soal belum tersedia</h3>
                        <p>Coba muat ulang beberapa saat lagi.</p>
                        <button id="empty-reload-quiz" class="login-button">Muat Ulang</button>
                    </div>
                `;
                const btn = document.getElementById('empty-reload-quiz');
                if (btn) btn.addEventListener('click', () => fetchQuestions());
                return;
            }
            quizBody.innerHTML = '';
            showSetPicker(sets);

        } catch (error) {
            quizBody.style.display = 'block';
            quizBody.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">⚠️</div>
                    <h3>Gagal memuat kuis</h3>
                    <p>${error.message}</p>
                    <button id="empty-reload-quiz" class="login-button">Muat Ulang</button>
                </div>`;
            const btn = document.getElementById('empty-reload-quiz');
            if (btn) btn.addEventListener('click', () => fetchQuestions());
            console.error(error);
        } finally {
            hideLoader();
        }
    }

    function showSetPicker(summarySets) {
        userInfoScreen.style.display = 'none';
        if (quizSetPicker) quizSetPicker.style.display = 'block';
        if (quizSetGrid) {
            const counts = {};
            // summarySets is array of { quiz_set: 1, count: 10 }
            summarySets.forEach(s => {
                counts[s.quiz_set] = s.count;
            });

            quizSetGrid.querySelectorAll('.set-card').forEach(btn => {
                const set = Number(btn.dataset.set || 1);
                const count = counts[set] || 0;
                
                const small = quizSetGrid.querySelector(`small[data-count="${set}"]`);
                if (small) small.textContent = `${count} soal`;
                
                btn.disabled = count === 0;
                btn.onclick = async () => {
                    currentQuizSet = set;
                    try {
                        // Check eligibility
                        const can = await fetch(API_URL, { method:'POST', headers:{'Content-Type':'text/plain;charset=utf-8'}, body: JSON.stringify({ action:'publicCanAttempt', session: existingSession, quiz_set: currentQuizSet }) });
                        const data = await can.json();
                        if (!can.ok || data.status !== 'success') {
                            alert(data.message || 'Anda sudah mencoba set ini.');
                            return;
                        }

                        // Fetch actual questions for this set
                        showLoader('Mengunduh Soal...');
                        const qRes = await fetch(`${API_URL}/questions?set=${set}`);
                        if (!qRes.ok) throw new Error('Gagal mengunduh soal.');
                        const qPayload = await qRes.json();
                        let qData = normalizeQuestionsResponse(qPayload);
                        qData = qData.filter(q => q.active !== false);

                        if (!qData.length) {
                            alert('Set ini kosong.');
                            hideLoader();
                            return;
                        }

                        // Prepare quiz
                        quizSeed = `${Date.now()}_${Math.floor(Math.random()*1e6)}`;
                        const srng = seededRandom(quizSeed);
                        // Shuffle questions and options
                        const shuffled = shuffleArray(qData, srng).map(q => ({ ...q, options: shuffleOptions(q.options, srng) }));
                        questionsData = shuffled;
                        
                        if (quizSetPicker) quizSetPicker.style.display = 'none';
                        hideLoader();
                        startQuiz();

                    } catch (e) {
                        console.error(e);
                        alert('Terjadi kesalahan saat memulai kuis: ' + e.message);
                        hideLoader();
                    }
                };
            });
        }
    }
