class SurveyEngine {
    constructor(config) {
        this.config = config;
        this.app = document.getElementById('app');
        this.storageKey = `gc_survey_${config.surveyId}`;
        this.totalRequired = 0;
        this.init();
    }

    init() {
        this.render();
        this.bindEvents();
        this.loadDraft();
        this.updateProgress();
    }
    
    render() {
        let html = `
            <style>
                /* --- 🌟 全局專業級問卷視覺 CSS (手機/電腦雙棲) --- */
                .matrix-row { transition: background-color 0.2s ease; }
                
                /* 💻 桌機版專屬 (>=768px)：選中整行變綠 */
                @media (min-width: 768px) { 
                    .matrix-row.matrix-row-selected { background-color: #f0fdf4 !important; } 
                }
                
                /* 📱 手機版專屬 (<=767px)：Zebra Striping 交替背景色 */
                @media (max-width: 767px) {
                    /* 整體群組化：把題目連線起來，移除單題框線 */
                    .matrix-group-mobile { 
                        border: 1px solid #e2e8f0; 
                        border-radius: 1rem; 
                        overflow: hidden; 
                        background: #ffffff;
                        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
                    }
                    .matrix-row {
                        background-color: #ffffff;
                        border-bottom: 1px solid #f1f5f9 !important; /* 題目之間細線分隔 */
                    }
                    /* Zebra Striping：偶數行變淡淡灰，看得出是一系列的項目 */
                    .matrix-row:nth-child(even) {
                        background-color: #f8fafc !important; /* bg-slate-50 */
                    }
                    
                    /* 📱 手機端高亮狀態：選中後不論純白或淡灰底，都要變成淡淡藍 (與 PC 分開) */
                    .matrix-row.matrix-row-selected {
                        background-color: #f0fdf4 !important; /* 選中行變淡淡綠 */
                    }

                    /* 📱 手機端選項按鈕選中後的專業藍色回饋 (配合 CSS :has() 語法) */
                    .option-btn-mobile:has(input:checked) {
                        border-color: #6366f1 !important; /* 藍色邊框 */
                        background-color: #eef2ff !important; /* 藍色底 */
                        transform: translateY(-1px);
                        box-shadow: 0 2px 4px rgba(99,102,241,0.1);
                    }
                    .option-btn-mobile:has(input:checked) span { 
                        color: #4338ca !important; /* 深藍色文字 */
                        font-weight: 800 !important; 
                    }
                }
                
                /* 錯誤提示高亮 (共用) */
                .error-highlight { border: 2px solid #ef4444 !important; background-color: #fef2f2 !important; border-radius: 0.75rem !important; }
            </style>

            <div class="fixed top-0 left-0 w-full bg-white shadow-sm z-50 border-b border-gray-200">
                <div class="max-w-3xl mx-auto px-4 py-2 flex items-center justify-between">
                    <span class="text-xs font-bold text-gray-500">整體作答進度</span>
                    <span id="overall-progress-text" class="text-xs font-bold text-indigo-600">0%</span>
                </div>
                <div class="w-full h-1.5 bg-gray-100">
                    <div id="overall-progress-bar" class="h-1.5 bg-indigo-500 transition-all duration-500" style="width: 0%"></div>
                </div>
            </div>

            <main class="max-w-4xl mx-auto mt-12 md:mt-16 bg-white md:shadow-xl md:rounded-xl overflow-hidden mb-12" id="main-container">
                <div class="bg-indigo-600 text-white p-6 md:p-10">
                    <h1 class="text-2xl md:text-3xl font-bold leading-tight">${this.config.title}</h1>
                    <p class="mt-4 text-indigo-100 md:text-lg leading-relaxed">${this.config.description}</p>
                    <p class="mt-2 text-sm text-indigo-200"><span class="text-red-400 font-bold">*</span>表示必填問題</p>
                </div>

                <form id="impactForm" class="p-4 md:p-10 space-y-12" novalidate>
                    <input type="hidden" name="survey_target" value="${this.config.surveyId}">
        `;

        // 1. 基本問題
        if (this.config.baseQuestion) {
            this.totalRequired += 1;
            let descHtml = this.config.baseQuestion.description ? `<p class="text-sm text-gray-500 mb-6">${this.config.baseQuestion.description}</p>` : '';
            html += `
                <section>
                    <h2 class="text-2xl font-bold border-b-2 border-gray-100 pb-3 mb-5 text-gray-800">基本問題</h2>
                    ${descHtml}
                    <div class="mb-8 p-5 bg-white border border-gray-200 rounded-xl shadow-sm" data-name="q0_container">
                        <label class="block font-bold mb-4 text-lg text-gray-800">${this.config.baseQuestion.title} <span class="text-red-500 font-bold">*</span></label>
                        <div class="space-y-3">
                            ${this.config.baseQuestion.options.map(opt => `
                                <label class="flex items-center space-x-3 cursor-pointer p-3 border border-gray-100 rounded-lg hover:bg-indigo-50 transition-colors">
                                    <input type="radio" name="q0" value="${opt}" class="w-5 h-5 text-indigo-600 focus:ring-indigo-500" required>
                                    <span class="text-gray-700 font-medium">${opt}</span>
                                </label>
                            `).join('')}
                        </div>
                    </div>
                </section>
            `;
        }

        // 2. 矩陣題 1 & 2
        let matrixDescHtml = this.config.matrixDescription ? `<p class="text-gray-500 mb-6 font-medium text-base">${this.config.matrixDescription}</p>` : '';
        html += `
            <section>
                <h2 class="text-2xl font-bold border-b-2 border-gray-100 pb-3 mb-5 text-gray-800">個別面向</h2>
                ${matrixDescHtml}
                ${this.renderMatrix('q1', this.config.matrix1)}
                ${this.renderMatrix('q2', this.config.matrix2)}
            </section>
        `;

        // 3. 價值結構 (點數題，維持原本設計)
        if (this.config.pointsConfig) {
            this.totalRequired += this.config.pointsConfig.items.length;
            html += `
                <section class="bg-indigo-50/50 p-5 md:p-10 rounded-2xl border border-indigo-100" id="points-section-container">
                    <h2 class="text-2xl font-bold border-b-2 border-indigo-200 pb-3 mb-5 text-indigo-900">價值結構</h2>
                    <p class="text-sm text-indigo-800 mb-6 bg-white shadow p-4 rounded-xl font-medium leading-relaxed">${this.config.pointsConfig.description}</p>
                    
                    <div class="sticky top-10 bg-white/90 backdrop-blur-md py-4 z-10 border-b border-indigo-100 mb-6 -mx-5 px-5 md:-mx-10 md:px-10 shadow-sm">
                        <div class="flex justify-between text-sm font-bold mb-2">
                            <span class="text-gray-700">點數分配進度</span>
                            <span id="point-status" class="text-indigo-600 text-lg">0 / 100</span>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-2.5">
                            <div id="point-progress-bar" class="bg-indigo-600 h-2.5 rounded-full transition-all duration-300" style="width: 0%"></div>
                        </div>
                    </div>

                    <div class="space-y-4 max-w-lg mx-auto" id="point-inputs">
                        ${this.config.pointsConfig.items.map((item, i) => `
                            <div class="point-container bg-white p-4 rounded-xl shadow-sm border border-gray-100 transition-all">
                                <label class="block mb-3 font-bold text-gray-800 text-base">${i+1}. ${item}<span class="text-red-500">*</span></label>
                                <input type="number" name="point_${i+1}" min="0" max="100" inputmode="numeric" class="point-input w-full border border-gray-300 rounded-lg p-3 text-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow" required placeholder="請輸入分配點數 (例如: 20)">
                            </div>
                        `).join('')}
                    </div>
                </section>
            `;
        }

        // 4. 精進之處與回饋
        html += `
            <section>
                <h2 class="text-2xl font-bold border-b-2 border-gray-100 pb-3 mb-5 text-gray-800">精進之處</h2>
                ${this.renderMatrix('q7', this.config.matrix3)}
                <div class="mb-8 mt-10 bg-gray-50 p-6 md:p-10 rounded-xl border border-gray-200">
                    <label class="block font-bold mb-4 text-xl text-gray-800">2. 其他意見回饋 <span class="text-sm font-normal text-gray-500">(選填)</span></label>
                    <textarea name="other_feedback" class="w-full border border-gray-300 rounded-xl p-4 h-36 focus:ring-2 focus:ring-indigo-500 outline-none resize-none" placeholder="有什麼想告訴我們的嗎？歡迎在此填寫..."></textarea>
                </div>
            </section>
            </form>
            <div class="pb-10 pt-6 text-center text-sm text-gray-400 mx-6 border-t border-gray-100 mt-10">
                內部問卷系統 © 樹冠影響力投資股份有限公司
            </div>
            </main>

            <div id="sticky-footer" class="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 p-4 shadow-[0_-10px_20px_-5px_rgba(0,0,0,0.1)] z-40 flex flex-col md:flex-row justify-between items-center gap-3">
                <span id="footer-msg" class="text-gray-500 font-bold text-sm">請確認完成所有必填項目</span>
                <div class="flex gap-4 w-full md:w-auto">
                    <button type="button" class="text-sm font-bold text-gray-400 hover:text-red-500 px-4 py-3 md:py-0 w-1/3 md:w-auto" id="clear-btn">清除</button>
                    <button type="submit" form="impactForm" id="submit-btn" class="bg-indigo-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-indigo-700 shadow-md w-2/3 md:w-auto text-lg md:text-base transition-colors h-12 md:h-auto flex items-center justify-center">送出問卷</button>
                </div>
            </div>
        `;
        this.app.innerHTML = html;
    }

    // --- 🌟 專業級雙棲排版引擎 (Zebra Striping版) ---
    renderMatrix(namePrefix, matrixConfig) {
        this.totalRequired += matrixConfig.items.length;
        const optionCount = matrixConfig.labels.length;

        return `
            <div class="mb-12">
                <label class="block font-bold mb-6 text-xl text-indigo-900 border-l-4 border-indigo-500 pl-3">
                    ${matrixConfig.title} <span class="text-red-500">*</span>
                </label>

                <div class="hidden md:flex flex-row items-center px-4 pb-3 border-b-2 border-gray-800 mb-1">
                    <div class="flex-[3] pr-4"></div>
                    ${matrixConfig.labels.map(l => `
                        <div class="flex-[1] text-center font-bold text-sm text-gray-500">${l}</div>
                    `).join('')}
                </div>

                <div class="matrix-group-mobile md:space-y-0">
                    ${matrixConfig.items.map((item, index) => `
                        <div class="matrix-row p-5 md:p-4 hover:bg-gray-50 md:border-b md:border-gray-100" data-name="${namePrefix}_${index}">

                            <div class="flex flex-col md:flex-row md:items-center">

                                <div class="flex-[3] pr-4 font-bold md:font-medium text-lg md:text-sm text-gray-800 mb-5 md:mb-0 leading-relaxed md:leading-normal">
                                    <div class="md:hidden inline-block bg-indigo-100 text-indigo-800 text-xs font-bold px-2 py-1 rounded-full mb-3">第 ${index + 1} 題</div>
                                    <div>${item}</div>
                                </div>

                                <div class="flex flex-col md:flex-row space-y-3.5 md:space-y-0 w-full md:w-auto md:flex-[${optionCount}] gap-x-0">
                                    ${matrixConfig.labels.map(label => `
                                        <label class="option-btn option-btn-mobile flex-[1] flex items-center md:justify-center p-4 md:p-0 border-2 border-gray-100 rounded-xl md:border-none md:rounded-none cursor-pointer md:hover:bg-indigo-50 transition-all transition-transform">
                                            <input type="radio" name="${namePrefix}_${index}" value="${label}" class="w-6 h-6 md:w-5 md:h-5 text-indigo-600 border-gray-300 focus:ring-indigo-500">
                                            <span class="ml-3.5 md:hidden font-bold text-lg text-gray-600">${label}</span>
                                        </label>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // --- 事件綁定與其他功能 (與之前相同，確保穩定性) ---
    bindEvents() {
        const form = document.getElementById('impactForm');
        
        form.addEventListener('change', (e) => {
            if (e.target.type === 'radio') {
                if (e.target.name === 'q0') {
                    e.target.closest('[data-name="q0_container"]').classList.remove('error-highlight');
                } else {
                    const row = e.target.closest('.matrix-row');
                    row.classList.remove('error-highlight');
                    // 標示選中行 (CSS控制PC/Mobile視覺)
                    row.classList.add('matrix-row-selected');
                }
            }
            this.saveDraft();
            this.updateProgress();
        });

        if (this.config.pointsConfig) {
            document.querySelectorAll('.point-input').forEach(input => {
                input.addEventListener('input', () => {
                    input.value = Math.abs(input.value); 
                    input.closest('.point-container').classList.remove('error-highlight');
                    this.calculatePoints();
                    this.saveDraft();
                    this.updateProgress();
                });
            });
        }

        document.getElementById('clear-btn').addEventListener('click', () => this.clearForm());
        form.addEventListener('submit', (e) => this.submitForm(e));
    }

    calculatePoints() {
        let total = 0;
        document.querySelectorAll('.point-input').forEach(input => total += (parseInt(input.value) || 0));
        
        const pBar = document.getElementById('point-progress-bar');
        const pStatus = document.getElementById('point-status');
        
        pBar.style.width = `${Math.min(total, 100)}%`;
        pStatus.textContent = `${total} / 100`;
        
        if (total === 100) {
            pBar.className = "bg-green-500 h-2.5 rounded-full transition-all duration-300";
            pStatus.className = "text-green-600 font-bold text-lg";
        } else {
            const isOver = total > 100;
            pBar.className = `${isOver ? 'bg-red-500' : 'bg-indigo-600'} h-2.5 rounded-full transition-all duration-300`;
            pStatus.className = `${isOver ? 'text-red-500' : 'text-indigo-600'} font-bold text-lg`;
        }
        return total;
    }

    updateProgress() {
        let answered = 0;
        const form = document.getElementById('impactForm');
        const data = new FormData(form);
        
        for (let [key, value] of data.entries()) {
            if (key.startsWith('q') && value) answered++;
        }
        document.querySelectorAll('.point-input').forEach(input => {
            if (input.value !== '' && !isNaN(parseInt(input.value))) answered++;
        });

        const percentage = Math.round((answered / this.totalRequired) * 100);
        document.getElementById('overall-progress-bar').style.width = `${percentage}%`;
        document.getElementById('overall-progress-text').innerText = `${percentage}%`;
    }

    saveDraft() {
        const data = Object.fromEntries(new FormData(document.getElementById('impactForm')).entries());
        localStorage.setItem(this.storageKey, JSON.stringify(data));
    }

    loadDraft() {
        const draft = localStorage.getItem(this.storageKey);
        if (!draft) return;
        const data = JSON.parse(draft);
        const form = document.getElementById('impactForm');
        
        Object.entries(data).forEach(([key, value]) => {
            const el = form.elements[key];
            if (!el) return;
            if (el.length) {
                const target = Array.from(el).find(r => r.value === value);
                if (target) {
                    target.checked = true;
                    if(key !== 'q0') target.closest('.matrix-row')?.classList.add('matrix-row-selected');
                }
            } else {
                el.value = value;
            }
        });
        if (this.config.pointsConfig) this.calculatePoints();
    }

    clearForm() {
        if(confirm('確定要清除所有填寫進度嗎？這將無法復原。')) {
            document.getElementById('impactForm').reset();
            localStorage.removeItem(this.storageKey);
            document.querySelectorAll('.matrix-row-selected, .error-highlight').forEach(el => el.classList.remove('matrix-row-selected', 'error-highlight'));
            if (this.config.pointsConfig) this.calculatePoints();
            this.updateProgress();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    async submitForm(e) {
        e.preventDefault();
        document.querySelectorAll('.error-highlight').forEach(el => el.classList.remove('error-highlight'));
        
        let isValid = true;
        let firstInvalidEl = null;
        const form = document.getElementById('impactForm');

        const checkRadioGroup = (namePrefix, length) => {
            for(let i=0; i<length; i++) {
                if(!document.querySelector(`input[name="${namePrefix}_${i}"]:checked`)) {
                    isValid = false;
                    const el = document.querySelector(`div[data-name="${namePrefix}_${i}"]`);
                    el.classList.add('error-highlight');
                    if(!firstInvalidEl) firstInvalidEl = el;
                }
            }
        };

        if (this.config.baseQuestion && !document.querySelector(`input[name="q0"]:checked`)) {
            isValid = false;
            firstInvalidEl = document.querySelector('[data-name="q0_container"]');
            firstInvalidEl.classList.add('error-highlight');
        }

        checkRadioGroup('q1', this.config.matrix1.items.length);
        checkRadioGroup('q2', this.config.matrix2.items.length);
        checkRadioGroup('q7', this.config.matrix3.items.length);

        if (this.config.pointsConfig) {
            let totalPts = 0;
            document.querySelectorAll('.point-input').forEach(input => {
                if(input.value === '') {
                    isValid = false;
                    const container = input.closest('.point-container');
                    container.classList.add('error-highlight');
                    if(!firstInvalidEl) firstInvalidEl = container;
                }
                totalPts += (parseInt(input.value) || 0);
            });
            if (isValid && totalPts !== 100) {
                isValid = false;
                firstInvalidEl = document.getElementById('points-section-container');
                firstInvalidEl.classList.add('error-highlight');
                alert(`價值結構的點數加總必須剛好為 100 點！（目前為 ${totalPts} 點）`);
            }
        }

        if (!isValid) {
            const y = firstInvalidEl.getBoundingClientRect().top + window.scrollY - 80;
            window.scrollTo({ top: y, behavior: 'smooth' });
            return;
        }

        const submitBtn = document.getElementById('submit-btn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = `資料寫入中...`; 
        
        const dataObj = Object.fromEntries(new FormData(form).entries());
        dataObj.submit_time = new Date().toLocaleString('zh-TW');

        try {
            const API_URL = 'https://script.google.com/macros/s/AKfycbyz4GriyYF0U9KfWrWAITKjffWK90bNxbEYZQs4GqG2RulzrZo2Tu_z8c3MceYgiyaGYA/exec';
            const response = await fetch(API_URL, {
                method: 'POST', body: JSON.stringify(dataObj), headers: { 'Content-Type': 'text/plain;charset=utf-8' }
            });
            const result = await response.json();
            
            if (result.status === 'success') {
                localStorage.removeItem(this.storageKey);
                document.getElementById('sticky-footer').style.display = 'none';
                document.querySelector('.fixed.top-0').style.display = 'none';
                document.getElementById('main-container').innerHTML = `
                    <div class="p-12 text-center bg-white rounded-lg mt-8">
                        <div class="text-6xl mb-6">🎉</div><h2 class="text-3xl font-bold text-indigo-700 mb-4">問卷送出成功！</h2>
                        <p class="text-gray-600 text-lg">非常感謝您的寶貴回饋，這對我們意義重大。</p>
                    </div>`;
                window.scrollTo(0, 0);
            } else throw new Error(result.message);
        } catch (error) {
            alert('伺服器連線異常，但您的進度已保留！');
            submitBtn.disabled = false;
            submitBtn.textContent = '送出問卷';
        }
    }
}
