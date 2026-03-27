// --- 🌟 終極全局視覺修正補丁（包含 PC 完美邊框 + Mobile 智慧變形 UI） ---
(function applyGlobalStyleFix() {
    const style = document.createElement('style');
    style.innerHTML = `
        /* ==========================================
           💻 電腦版 (Desktop) 完美邊框修正
           ========================================== */
        @media (min-width: 768px) {
            .table-container { border: 1px solid #e2e8f0 !important; border-radius: 0.5rem !important; box-shadow: none !important; }
            .table-container table { border-collapse: separate !important; border-spacing: 0 !important; border: none !important; }
            .table-container tbody tr { border: none !important; }
            .table-container thead th { border-bottom: 1px solid #e2e8f0 !important; border-left: none !important; border-right: none !important; }
            .table-container tbody tr td { border-bottom: 1px solid #e2e8f0 !important; border-left: none !important; border-right: none !important; }
            .table-container tbody tr:last-child td { border-bottom: none !important; }
            .table-container tbody tr.matrix-row-selected td { background-color: #f0fdf4 !important; }
        }

        /* ==========================================
           📱 手機版 (Mobile) App級智慧按鈕排版
           ========================================== */
        @media (max-width: 767px) {
            /* 1. 暴力洗掉 HTML 檔案中舊有的陽春手機版樣式 */
            .table-container td::before { display: none !important; }
            .table-container td { justify-content: flex-start !important; align-items: stretch !important; }
            
            /* 2. 隱藏傳統標頭，打破表格框架 */
            .table-container thead { display: none !important; }
            .table-container { border: none !important; background: transparent !important; box-shadow: none !important; padding: 0 !important; }
            .table-container table, .table-container tbody { display: block !important; border: none !important; }
            
            /* 3. 每一題變成獨立精美卡片 */
            .table-container tr {
                display: block !important;
                background: #ffffff !important;
                border: 1px solid #e2e8f0 !important;
                border-radius: 1rem !important;
                padding: 1.5rem 1rem !important;
                margin-bottom: 1.5rem !important;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05) !important;
            }

            /* 4. 題幹文字放大加粗 */
            .table-container td:first-child {
                display: block !important;
                font-size: 1.125rem !important;
                font-weight: 700 !important;
                color: #0f172a !important;
                margin-bottom: 1.25rem !important;
                padding: 0 !important;
                border: none !important;
                line-height: 1.5 !important;
            }
            
            /* 5. 選項變成直列式巨型按鈕 */
            .table-container td:not(:first-child) {
                display: block !important;
                position: relative !important;
                padding: 0 !important;
                margin-bottom: 0.75rem !important;
                border: 2px solid #e2e8f0 !important;
                border-radius: 0.75rem !important;
                background: #ffffff !important;
                min-height: 3.5rem !important;
                transition: all 0.2s ease !important;
            }
            .table-container td:last-child { margin-bottom: 0 !important; }
            
            /* 6. 將隱形的 Label 撐滿整個按鈕，達成任意位置皆可點擊 */
            .table-container td:not(:first-child) label {
                position: absolute !important;
                inset: 0 !important;
                width: 100% !important;
                height: 100% !important;
                display: flex !important;
                align-items: center !important;
                justify-content: flex-start !important;
                padding-left: 1.25rem !important;
                cursor: pointer !important;
                -webkit-tap-highlight-color: transparent !important;
            }
            
            /* 7. 自動生成選項文字 (利用 data-label 屬性) */
            .table-container td:not(:first-child)::after {
                content: attr(data-label) !important;
                display: flex !important;
                align-items: center !important;
                min-height: 3.5rem !important;
                margin-left: 3.25rem !important; /* 為左側的圈圈留出空間 */
                font-size: 1.05rem !important;
                font-weight: 600 !important;
                color: #475569 !important;
                pointer-events: none !important; /* 確保點擊可以穿透到按鈕上 */
            }

            /* 🎯 8. 手機端專屬：點擊後的核取高亮狀態 */
            .table-container td:not(:first-child):has(input:checked) {
                background-color: #f0fdf4 !important;
                border-color: #22c55e !important;
            }
            .table-container td:not(:first-child):has(input:checked)::after {
                color: #15803d !important;
            }
            
            /* 放大預設的單選框 */
            .table-container td:not(:first-child) input[type="radio"] {
                transform: scale(1.4) !important;
            }
        }
    `;
    document.head.appendChild(style);
})();
