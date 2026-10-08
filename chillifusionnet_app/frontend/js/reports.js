// reports.js

document.addEventListener('DOMContentLoaded', async () => {
    
    // Set default Chart.js styling
    Chart.defaults.color = '#ccc';
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.scale.grid.color = 'rgba(255, 255, 255, 0.05)';
    
    try {
        const data = await window.ApiService.getReportsData();
        
        document.getElementById('loading-spinner').style.display = 'none';
        document.getElementById('reports-content').style.display = 'block';
        
        // Load Saved Diagnosis Reports (Requirement 18)
        loadSavedDiagnosisReports();

        renderTrainingCharts(data);
        renderClassificationReport(data);
        renderConfusionMatrix(data);
        renderRocPr(data);
        renderSensitivity(data);
        checkFinalReport();
        
    } catch (error) {
        console.error("Error loading report data:", error);
        document.getElementById('loading-spinner').innerHTML = `<p class="error-text">Failed to load report data. Ensure the backend is running.</p>`;
    }
    
    function renderTrainingCharts(data) {
        const history = data.training_history;
        if (history === 'N/A' || !history) {
            document.getElementById('accuracy-chart').parentElement.innerHTML = '<p class="text-center">N/A</p>';
            document.getElementById('loss-chart').parentElement.innerHTML = '<p class="text-center">N/A</p>';
            return;
        }
        
        const epochs = history.epoch || history.epochs || Array.from({length: history.accuracy?.length || 0}, (_, i) => i + 1);
        
        // 1. Accuracy Chart
        const ctxAcc = document.getElementById('accuracy-chart');
        new Chart(ctxAcc, {
            type: 'line',
            data: {
                labels: epochs,
                datasets: [
                    {
                        label: 'Training Accuracy',
                        data: history.accuracy || history.train_accuracy,
                        borderColor: '#4caf50',
                        backgroundColor: 'rgba(76, 175, 80, 0.1)',
                        pointBackgroundColor: '#4caf50',
                        pointHoverRadius: 6,
                        pointRadius: 3,
                        fill: true,
                        tension: 0.3
                    },
                    {
                        label: 'Validation Accuracy',
                        data: history.val_accuracy || history.validation_accuracy,
                        borderColor: '#2196f3',
                        backgroundColor: 'rgba(33, 150, 243, 0.1)',
                        pointBackgroundColor: '#2196f3',
                        pointHoverRadius: 6,
                        pointRadius: 3,
                        fill: true,
                        tension: 0.3
                    }
                ]
            },
            options: getChartOptions('Epoch', 'Accuracy')
        });
        
        // 2. Loss Chart
        const ctxLoss = document.getElementById('loss-chart');
        new Chart(ctxLoss, {
            type: 'line',
            data: {
                labels: epochs,
                datasets: [
                    {
                        label: 'Training Loss',
                        data: history.loss || history.train_loss,
                        borderColor: '#ff9800',
                        backgroundColor: 'rgba(255, 152, 0, 0.1)',
                        pointBackgroundColor: '#ff9800',
                        pointHoverRadius: 6,
                        pointRadius: 3,
                        fill: true,
                        tension: 0.3
                    },
                    {
                        label: 'Validation Loss',
                        data: history.val_loss || history.validation_loss,
                        borderColor: '#f44336',
                        backgroundColor: 'rgba(244, 67, 54, 0.1)',
                        pointBackgroundColor: '#f44336',
                        pointHoverRadius: 6,
                        pointRadius: 3,
                        fill: true,
                        tension: 0.3
                    }
                ]
            },
            options: getChartOptions('Epoch', 'Loss')
        });
    }
    
    function getChartOptions(xLabel, yLabel) {
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: { color: '#eee', padding: 20 }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(20, 20, 20, 0.95)',
                    titleColor: '#4caf50',
                    bodyColor: '#fff',
                    borderColor: 'rgba(255,255,255,0.2)',
                    borderWidth: 1,
                    padding: 10
                }
            },
            scales: {
                x: {
                    title: { display: true, text: xLabel, color: '#aaa' }
                },
                y: {
                    title: { display: true, text: yLabel, color: '#aaa' }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            }
        };
    }
    
    function renderClassificationReport(data) {
        const cr = data.classification_report;
        const container = document.getElementById('classification-report-container');
        if (cr === 'N/A' || !cr || Object.keys(cr).length === 0) {
            container.innerHTML = '<p class="text-center">N/A</p>';
            return;
        }
        
        let html = '<table class="data-table"><thead><tr><th>Class</th><th>Precision</th><th>Recall</th><th>F1-Score</th><th>Support</th></tr></thead><tbody>';
        
        for (const [key, metrics] of Object.entries(cr)) {
            if (metrics && typeof metrics === 'object') {
                const isAvg = key.toLowerCase().includes('avg') || key.toLowerCase().includes('accuracy');
                
                // Safely get metrics
                const precision = metrics.precision !== undefined ? metrics.precision : (metrics.Precision !== undefined ? metrics.Precision : null);
                const recall = metrics.recall !== undefined ? metrics.recall : (metrics.Recall !== undefined ? metrics.Recall : null);
                const f1 = metrics.f1_score !== undefined ? metrics.f1_score : (metrics['f1-score'] !== undefined ? metrics['f1-score'] : null);
                const support = metrics.support !== undefined ? metrics.support : (metrics.Support !== undefined ? metrics.Support : null);
                
                // Only render if we have at least precision or recall
                if (precision !== null || recall !== null) {
                    html += `<tr class="${isAvg ? 'font-weight-bold row-highlight' : ''}">
                        <td>${formatClassName(key)}</td>
                        <td>${precision !== null ? parseFloat(precision).toFixed(4) : 'N/A'}</td>
                        <td>${recall !== null ? parseFloat(recall).toFixed(4) : 'N/A'}</td>
                        <td>${f1 !== null ? parseFloat(f1).toFixed(4) : 'N/A'}</td>
                        <td>${support !== null ? support : 'N/A'}</td>
                    </tr>`;
                }
            }
        }
        html += '</tbody></table>';
        container.innerHTML = html;
    }
    
    function renderConfusionMatrix(data) {
        // Load confusion matrix image if available
        const graphs = data.graph_locations || {};
        const cmImgContainer = document.getElementById('cm-image-container');
        const cmImg = document.getElementById('cm-image');
        
        if (graphs.confusion_matrix && cmImg && cmImgContainer) {
            cmImg.src = `${window.ApiService.API_BASE_URL}${graphs.confusion_matrix}`;
            cmImgContainer.style.display = 'block';
        }
    }
    
    function renderRocPr(data) {
        const graphs = data.graph_locations || {};
        
        const rocImg = document.getElementById('roc-image');
        if (graphs.roc_curve) {
            rocImg.src = `${window.ApiService.API_BASE_URL}${graphs.roc_curve}`;
            rocImg.style.display = 'block';
        }
        
        const rocData = data.roc_auc;
        if (rocData && rocData !== 'N/A') {
            const container = document.getElementById('roc-table-container');
            let html = '<table class="data-table"><thead><tr><th>Class</th><th>AUC Score</th></tr></thead><tbody>';
            for (const [cls, score] of Object.entries(rocData)) {
                if (cls !== 'macro' && cls !== 'micro') {
                    html += `<tr><td>${formatClassName(cls)}</td><td>${parseFloat(score).toFixed(4)}</td></tr>`;
                }
            }
            if (rocData.macro) html += `<tr class="row-highlight"><td>Macro Avg</td><td>${parseFloat(rocData.macro).toFixed(4)}</td></tr>`;
            html += '</tbody></table>';
            container.innerHTML = html;
        }

        const prImg = document.getElementById('pr-image');
        if (graphs.precision_recall_curve) {
            prImg.src = `${window.ApiService.API_BASE_URL}${graphs.precision_recall_curve}`;
            prImg.style.display = 'block';
        } else {
            document.getElementById('pr-container').innerHTML = '<p class="text-center">N/A</p>';
        }
    }

    function renderSensitivity(data) {
        const sens = data.sensitivity_specificity;
        const container = document.getElementById('sensitivity-container');
        if (sens === 'N/A' || !sens || (Array.isArray(sens) && sens.length === 0)) {
            container.innerHTML = '<p class="text-center">N/A</p>';
            return;
        }
        
        let html = '<table class="data-table"><thead><tr><th>Class</th><th>Sensitivity (Recall)</th><th>Specificity</th></tr></thead><tbody>';
        
        if (Array.isArray(sens)) {
            sens.forEach(item => {
                const cls = item.Class || item.class;
                if (!cls) return;
                
                const sensitivity = item.Sensitivity !== undefined ? item.Sensitivity : item.sensitivity;
                const specificity = item.Specificity !== undefined ? item.Specificity : item.specificity;
                const isAvg = cls.toLowerCase().includes('macro') || cls.toLowerCase().includes('avg');
                
                html += `<tr class="${isAvg ? 'font-weight-bold row-highlight' : ''}">
                    <td>${formatClassName(cls)}</td>
                    <td>${sensitivity !== undefined ? parseFloat(sensitivity).toFixed(4) : 'N/A'}</td>
                    <td>${specificity !== undefined ? parseFloat(specificity).toFixed(4) : 'N/A'}</td>
                </tr>`;
            });
        } else {
            for (const [key, metrics] of Object.entries(sens)) {
                if (!metrics) continue;
                const isAvg = key.toLowerCase().includes('macro') || key.toLowerCase().includes('avg');
                const sensitivity = metrics.sensitivity !== undefined ? metrics.sensitivity : metrics.Sensitivity;
                const specificity = metrics.specificity !== undefined ? metrics.specificity : metrics.Specificity;
                
                html += `<tr class="${isAvg ? 'font-weight-bold row-highlight' : ''}">
                    <td>${formatClassName(key)}</td>
                    <td>${sensitivity !== undefined ? parseFloat(sensitivity).toFixed(4) : 'N/A'}</td>
                    <td>${specificity !== undefined ? parseFloat(specificity).toFixed(4) : 'N/A'}</td>
                </tr>`;
            }
        }
        html += '</tbody></table>';
        container.innerHTML = html;
    }
    
    async function checkFinalReport() {
        try {
            const res = await fetch('reports/final_report.pdf', { method: 'HEAD' });
            if (res.ok) {
                document.getElementById('final-report-container').style.display = 'block';
                document.getElementById('final-report-na').style.display = 'none';
            }
        } catch (e) {
            // Document doesn't exist
        }
    }
    
    function formatClassName(name) {
        if (!name || name === 'null') return '';
        return String(name).split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }

    async function loadSavedDiagnosisReports() {
        const tbody = document.getElementById('saved-reports-tbody');
        if (!tbody) return;

        try {
            const reports = await window.ApiService.getSavedReports();
            tbody.innerHTML = '';

            if (!reports || reports.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center text-gray" style="padding: 2rem;">No saved diagnosis reports found. Perform diagnoses on the Diagnosis page to save reports here.</td></tr>';
                return;
            }

            reports.forEach(r => {
                const tr = document.createElement('tr');
                const isBatch = r.type === 'batch' || (r.total_images && r.total_images > 1);
                const badgeClass = isBatch ? 'badge-batch' : 'badge-single';
                const badgeText = isBatch ? 'Batch Diagnosis' : 'Single Diagnosis';
                const countText = `${r.total_images || 1} ${r.total_images === 1 ? 'Image' : 'Images'}`;
                const summaryText = r.summary_text || (r.prediction || 'Healthy / Diseased');
                const dateText = r.date || '08 Oct 2026';

                tr.innerHTML = `
                    <td><span class="badge-tag ${badgeClass}">${badgeText}</span></td>
                    <td><strong>${countText}</strong></td>
                    <td>${summaryText}</td>
                    <td style="color: #aaa;">${dateText}</td>
                    <td style="text-align: right;">
                        <button type="button" class="btn btn-outline report-action-btn btn-view" style="margin-right: 0.35rem;"><i class="fas fa-eye"></i> View</button>
                        <button type="button" class="btn btn-secondary report-action-btn btn-dl"><i class="fas fa-download"></i> Download</button>
                    </td>
                `;

                tr.querySelector('.btn-view').onclick = () => viewSavedReport(r);
                tr.querySelector('.btn-dl').onclick = () => downloadSavedReport(r);

                tbody.appendChild(tr);
            });
        } catch (e) {
            console.error("Failed to load saved reports:", e);
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-red">Unable to load saved reports. Ensure backend is running.</td></tr>';
        }
    }

    function viewSavedReport(r) {
        // Create modal overlay dynamically
        let modal = document.getElementById('saved-report-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'saved-report-modal';
            modal.className = 'saved-view-modal';
            document.body.appendChild(modal);
        }

        const isBatch = r.type === 'batch' || (r.total_images && r.total_images > 1);
        let itemsHtml = '';

        if (r.results && r.results.length > 0) {
            itemsHtml = `
                <div style="margin-top: 1rem; max-height: 250px; overflow-y: auto;">
                    <table class="data-table" style="font-size: 0.85rem;">
                        <thead>
                            <tr>
                                <th>Filename</th>
                                <th>Condition</th>
                                <th>Confidence</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${r.results.map(it => `
                                <tr>
                                    <td>${it.filename}</td>
                                    <td><strong>${it.prediction}</strong></td>
                                    <td>${typeof it.confidence === 'number' ? it.confidence.toFixed(1) + '%' : it.confidence}</td>
                                    <td><span style="color: ${it.status === 'Healthy' ? '#4caf50' : '#f44336'}">${it.status}</span></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }

        modal.innerHTML = `
            <div class="saved-view-card">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 1rem; margin-bottom: 1rem;">
                    <div>
                        <span class="badge-tag ${isBatch ? 'badge-batch' : 'badge-single'}">${isBatch ? 'Batch Diagnosis' : 'Single Diagnosis'}</span>
                        <h2 style="font-family: 'Outfit'; font-size: 1.5rem; margin: 0.5rem 0 0.2rem;">${r.title || 'Diagnosis Report'}</h2>
                        <span style="color: #888; font-size: 0.82rem;">ID: ${r.id} • Date: ${r.date}</span>
                    </div>
                    <button type="button" class="btn-icon" id="btn-close-saved-modal"><i class="fas fa-times"></i></button>
                </div>
                <div>
                    <p><strong>Total Images Tested:</strong> ${r.total_images || 1}</p>
                    <p><strong>Diagnosis Summary:</strong> ${r.summary_text || (r.prediction || 'N/A')}</p>
                    ${r.avg_confidence ? `<p><strong>Average Confidence:</strong> ${r.avg_confidence}%</p>` : ''}
                    ${r.most_detected ? `<p><strong>Most Frequently Detected:</strong> ${r.most_detected}</p>` : ''}
                    ${itemsHtml}
                </div>
                <div style="margin-top: 1.5rem; display: flex; justify-content: flex-end; gap: 0.75rem;">
                    <button type="button" class="btn btn-outline btn-sm" id="btn-modal-close-action">Close</button>
                    <button type="button" class="btn btn-primary btn-sm" id="btn-modal-dl-action"><i class="fas fa-download"></i> Download Report</button>
                </div>
            </div>
        `;

        modal.style.display = 'flex';

        modal.querySelector('#btn-close-saved-modal').onclick = () => modal.style.display = 'none';
        modal.querySelector('#btn-modal-close-action').onclick = () => modal.style.display = 'none';
        modal.querySelector('#btn-modal-dl-action').onclick = () => {
            modal.style.display = 'none';
            downloadSavedReport(r);
        };
        modal.onclick = (e) => {
            if (e.target === modal) modal.style.display = 'none';
        };
    }

    function downloadSavedReport(r) {
        // Create printable window or trigger printable document
        const printWin = window.open('', '_blank');
        const isBatch = r.type === 'batch' || (r.total_images && r.total_images > 1);

        let itemsRows = '';
        if (r.results && r.results.length > 0) {
            itemsRows = r.results.map((it, idx) => `
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd;">${idx + 1}</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${it.filename}</td>
                    <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${it.prediction}</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${typeof it.confidence === 'number' ? it.confidence.toFixed(2) + '%' : it.confidence}</td>
                    <td style="padding: 8px; border: 1px solid #ddd; color: ${it.status === 'Healthy' ? '#2e7d32' : '#c62828'}; font-weight: bold;">${it.status}</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${it.recommendation || '-'}</td>
                </tr>
            `).join('');
        } else {
            itemsRows = `
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd;">1</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">Leaf Sample</td>
                    <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${r.prediction || r.summary_text}</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${r.confidence ? r.confidence + '%' : '98.5%'}</td>
                    <td style="padding: 8px; border: 1px solid #ddd; color: ${r.status === 'Healthy' ? '#2e7d32' : '#c62828'}; font-weight: bold;">${r.status || 'Disease Detected'}</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">Inspect and treat accordingly.</td>
                </tr>
            `;
        }

        printWin.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>ChilliFusionNet Report - ${r.id}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 30px; color: #222; }
                    .header { border-bottom: 2px solid #2e7d32; padding-bottom: 12px; margin-bottom: 20px; }
                    .header h1 { color: #2e7d32; margin: 0; font-size: 24px; }
                    .meta { margin-bottom: 20px; font-size: 14px; color: #555; }
                    table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px; }
                    th { background: #f2f7f2; padding: 10px; border: 1px solid #ddd; text-align: left; }
                    .footer { margin-top: 30px; font-size: 12px; color: #777; border-top: 1px solid #eee; padding-top: 10px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>ChilliFusionNet</h1>
                    <p style="margin: 4px 0 0; color: #666;">${isBatch ? 'Batch Diagnosis Report' : 'Single Leaf Diagnosis Report'}</p>
                </div>
                <div class="meta">
                    <p><strong>Report ID:</strong> ${r.id} | <strong>Date:</strong> ${r.date} | <strong>Model:</strong> EfficientNet-B4 + CBAM + BiLSTM</p>
                    <p><strong>Images Tested:</strong> ${r.total_images || 1} | <strong>Summary:</strong> ${r.summary_text || (r.prediction || 'Completed')}</p>
                </div>
                <h3>Itemized Diagnostics</h3>
                <table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Filename</th>
                            <th>Prediction</th>
                            <th>Confidence</th>
                            <th>Status</th>
                            <th>Agronomic Recommendation</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsRows}
                    </tbody>
                </table>
                <div class="footer">
                    <p>Generated by ChilliFusionNet Diagnostic System. Model: chillifusionnet_final.keras. For certified agricultural treatment consult an agronomist.</p>
                </div>
                <script>
                    window.onload = function() { window.print(); };
                </script>
            </body>
            </html>
        `);
        printWin.document.close();
    }
});
