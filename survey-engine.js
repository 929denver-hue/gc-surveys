// 檔案名稱：survey-engine.js
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
// --- 全局視覺修正補丁：消除矩陣題外框粗細不均 ---
(function applyGlobalStyleFix() {
    const style = document.createElement('style');
    style.innerHTML = `
        .table-container { border: 1px solid #e2e8f0 !important; box-shadow: none !important; }
        .table-container table { border-collapse: collapse !important; }
        .table-container tbody tr:last-child td, .table-container tbody tr:last-child th { border-bottom: 0 !important; }
        .table-container th:last-child, .table-container td:last-child { border-right: 0 !important; }
    `;
    document.head.appendChild(style);
})();
    
    render() {
        let html = `
            <div class="fixed top-0 left-0 w-full bg-white shadow-sm z-50 border-b border-gray-200">
                <div class="max-w-3xl mx-auto px-4 py-2 flex items-center justify-between">
                    <span class="text-xs font-bold text-gray-500">整體作答進度</span>
                    <span id="overall-progress-text" class="text-xs font-bold text-indigo-600">0%</span>
                </div>
                <div class="w-full h-1.5 bg-gray-100">
                    <div id="overall-progress-bar" class="h-1.5 bg-indigo-500 transition-all duration-500" style="width: 0%"></div>
                </div>
            </div>

            <main class="max-w-3xl mx-auto mt-12 md:mt-16 bg-white shadow-md md:rounded-lg overflow-hidden" id="main-container">
                <div class="bg-indigo-600 text-white p-6">
                    <h1 class="text-2xl font-bold">${this.config.title}</h1>
                    <p class="mt-2 text-indigo-100">${this.config.description}</p>
                    <p class="mt-1 text-sm text-indigo-200"><span class="text-red-400 font-bold">*</span>表示必填問題</p>
                </div>

                <form id="impactForm" class="p-6 space-y-10" novalidate>
                    <input type="hidden" name="survey_target" value="${this.config.surveyId}">
        `;

        // 1. 基本問題 (動態加入副標題)
        if (this.config.baseQuestion) {
            this.totalRequired += 1;
            let descHtml = this.config.baseQuestion.description ? `<p class="text-sm text-gray-500 mb-6">${this.config.baseQuestion.description}</p>` : '';
            html += `
                <section>
                    <h2 class="text-xl font-bold border-b border-gray-200 pb-2 mb-4">基本問題</h2>
                    ${descHtml}
                    <div class="mb-8 p-4 bg-white border border-gray-200 rounded-lg shadow-sm" data-name="q0_container">
                        <label class="block font-semibold mb-4 text-lg">${this.config.baseQuestion.title} <span class="text-red-500 font-bold">*</span></label>
                        <div class="space-y-3">
                            ${this.config.baseQuestion.options.map(opt => `
                                <label class="flex items-center space-x-3 cursor-pointer p-2 hover:bg-gray-50 rounded">
                                    <input type="radio" name="q0" value="${opt}" class="w-5 h-5 text-indigo-600" required>
                                    <span class="text-gray-700">${opt}</span>
                                </label>
                            `).join('')}
                        </div>
                    </div>
                </section>
            `;
        }

        // 2. 矩陣題 1 & 2 (動態加入副標題)
        let matrixDescHtml = this.config.matrixDescription ? `<p class="text-sm text-gray-500 mb-6">${this.config.matrixDescription}</p>` : '';
        html += `
            <section>
                <h2 class="text-xl font-bold border-b border-gray-200 pb-2 mb-4">個別面向</h2>
                ${matrixDescHtml}
                ${this.renderMatrix('q1', this.config.matrix1)}
                ${this.renderMatrix('q2', this.config.matrix2)}
            </section>
        `;

        // 3. 價值結構 (點數題，維持不變)
        if (this.config.pointsConfig) {
            this.totalRequired += this.config.pointsConfig.items.length;
            html += `
                <section class="bg-indigo-50/50 p-4 rounded-xl" id="points-section-container">
                    <h2 class="text-xl font-bold border-b border-gray-200 pb-2 mb-4">價值結構</h2>
                    <p class="text-sm text-gray-700 mb-4 bg-white border border-indigo-100 p-3 rounded">${this.config.pointsConfig.description}</p>
                    
                    <div class="sticky top-10 bg-indigo-50/90 backdrop-blur py-3 z-10 border-b border-indigo-200 mb-6 -mx-4 px-4">
                        <div class="flex justify-between text-sm font-bold mb-1">
                            <span class="text-indigo-900">點數分配進度</span>
                            <span id="point-status" class="text-indigo-600">0 / 100</span>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-2">
                            <div id="point-progress-bar" class="bg-indigo-600 h-2 rounded-full transition-all" style="width: 0%"></div>
                        </div>
                    </div>

                    <div class="space-y-4 max-w-sm mx-auto" id="point-inputs">
                        ${this.config.pointsConfig.items.map((item, i) => `
                            <div class="point-container bg-white p-1 rounded transition-all">
                                <label class="block mb-1 font-semibold text-gray-800">${i+1}. ${item}<span class="text-red-500 font-bold">*</span></label>
                                <input type="number" name="point_${i+1}" min="0" max="100" inputmode="numeric" class="point-input w-full border border-gray-300 rounded p-3 text-lg focus:ring-indigo-500" required placeholder="請輸入點數">
                            </div>
                        `).join('')}
                    </div>
                </section>
            `;
        }

        // 4. 精進之處與回饋 (維持不變)
        html += `
            <section>
                <h2 class="text-xl font-bold border-b border-gray-200 pb-2 mb-4">精進之處</h2>
                ${this.renderMatrix('q7', this.config.matrix3)}
                <div class="mb-8 mt-8">
                    <label class="block font-semibold mb-3">2. 其他意見回饋</label>
                    <textarea name="other_feedback" class="w-full border border-gray-300 rounded p-3 h-24 focus:ring-indigo-500" placeholder="您的回答"></textarea>
                </div>
            </section>
            </form>
            <div class="pb-8 pt-4 text-center text-sm text-gray-400 border-t border-gray-100 mx-6">
                這份表單是在 樹冠影響力投資股份有限公司 中建立
            </div>
            </main>

            <div id="sticky-footer" class="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 p-4 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)] z-40 flex flex-col md:flex-row justify-between items-center gap-3">
                <span id="footer-msg" class="text-gray-500 font-medium text-sm">請完成所有必填項目</span>
                <div class="flex gap-4">
                    <button type="button" class="text-sm font-bold text-gray-400 hover:text-red-500 px-2" id="clear-btn">清除表單</button>
                    <button type="submit" form="impactForm" id="submit-btn" class="bg-indigo-600 text-white px-8 py-3 rounded font-bold hover:bg-indigo-700 shadow-md">送出問卷</button>
                </div>
            </div>
        `;
        this.app.innerHTML = html;
    }

    renderMatrix(namePrefix, matrixConfig) {
        this.totalRequired += matrixConfig.items.length;
        return `
            <div class="mb-8">
                <label class="block font-semibold mb-3 text-lg">${matrixConfig.title} <span class="text-red-500 font-bold">*</span></label>
                <div class="table-container overflow-x-auto border-0 md:border border-gray-200 rounded">
                    <table class="w-full text-sm text-left whitespace-nowrap">
                        <thead class="bg-gray-50 border-b hidden md:table-header-group">
                            <tr>
                                <th class="p-3 w-1/3"></th>
                                ${matrixConfig.labels.map(l => `<th class="p-3 text-center">${l}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-200">
                            ${matrixConfig.items.map((item, index) => `
                                <tr class="hover:bg-gray-50 transition-colors border-transparent border-2" data-name="${namePrefix}_${index}">
                                    <td class="p-3 font-medium whitespace-normal text-gray-800">${item}</td>
                                    ${matrixConfig.labels.map(label => `
                                        <td class="p-3 text-center" data-label="${label}">
                                            <label class="cursor-pointer block w-full h-full flex items-center justify-end md:justify-center">
                                                <input type="radio" name="${namePrefix}_${index}" value="${label}" class="w-5 h-5 text-indigo-600">
                                            </label>
                                        </td>
                                    `).join('')}
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    bindEvents() {
        const form = document.getElementById('impactForm');
        
        // 互動反饋與暫存
        form.addEventListener('change', (e) => {
            if (e.target.type === 'radio') {
                if (e.target.name === 'q0') {
                    e.target.closest('[data-name="q0_container"]').classList.remove('error-highlight');
                } else {
                    const tr = e.target.closest('tr');
                    tr.parentElement.querySelectorAll('tr').forEach(r => r.classList.remove('matrix-row-selected'));
                    tr.classList.remove('error-highlight');
                    tr.classList.add('matrix-row-selected');
                }
            }
            this.saveDraft();
            this.updateProgress();
        });

        // 點數計算
        if (this.config.pointsConfig) {
            document.querySelectorAll('.point-input').forEach(input => {
                input.addEventListener('input', () => {
                    input.value = Math.abs(input.value); // 防負數
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
            pBar.className = "bg-green-500 h-2 rounded-full transition-all";
            pStatus.className = "text-green-600 font-bold";
        } else {
            const isOver = total > 100;
            pBar.className = `${isOver ? 'bg-red-500' : 'bg-indigo-600'} h-2 rounded-full transition-all`;
            pStatus.className = `${isOver ? 'text-red-500' : 'text-indigo-600'} font-bold`;
        }
        return total;
    }

    updateProgress() {
        let answered = 0;
        const form = document.getElementById('impactForm');
        const data = new FormData(form);
        
        // 計算 Radio 題
        for (let [key, value] of data.entries()) {
            if (key.startsWith('q') && value) answered++;
        }
        // 計算數字題
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
                    if(key !== 'q0') target.closest('tr')?.classList.add('matrix-row-selected');
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

        // 防呆驗證
        const checkRadioGroup = (namePrefix, length) => {
            for(let i=0; i<length; i++) {
                if(!document.querySelector(`input[name="${namePrefix}_${i}"]:checked`)) {
                    isValid = false;
                    const el = document.querySelector(`tr[data-name="${namePrefix}_${i}"]`);
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

        // 送出資料
        const submitBtn = document.getElementById('submit-btn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = `資料寫入中...`; // 省略 SVG 以節省字數
        
        const dataObj = Object.fromEntries(new FormData(form).entries());
        dataObj.submit_time = new Date().toLocaleString('zh-TW');

        try {
            // ⚠️ 請填入您的萬能路由 API 網址
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
                        <div class="text-6xl mb-4">🎉</div><h2 class="text-3xl font-bold text-indigo-700 mb-4">問卷送出成功！</h2>
                        <p class="text-gray-600">非常感謝您的寶貴回饋，這對我們意義重大。</p>
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
