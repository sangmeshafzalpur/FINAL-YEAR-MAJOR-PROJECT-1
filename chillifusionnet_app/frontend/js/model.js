// model.js

document.addEventListener('DOMContentLoaded', async () => {
    
    const modelInfoGrid = document.getElementById('model-info-grid');
    
    try {
        if (window.ApiService) {
            const data = await window.ApiService.getModelInfo();
            
            document.getElementById('mi-input-shape').textContent = data.input_shape || 'N/A';
            document.getElementById('mi-output-shape').textContent = data.output_shape || 'N/A';
            document.getElementById('mi-parameters').textContent = data.parameters || 'N/A';
            document.getElementById('mi-architecture').textContent = data.architecture || 'N/A';
            
            if (data.classes) {
                const classesContainer = document.getElementById('mi-classes');
                classesContainer.innerHTML = '';
                const ul = document.createElement('ul');
                ul.style.listStyleType = 'none';
                ul.style.padding = '0';
                ul.style.display = 'flex';
                ul.style.gap = '10px';
                ul.style.flexWrap = 'wrap';
                
                Object.values(data.classes).forEach(cls => {
                    const li = document.createElement('li');
                    li.textContent = cls;
                    li.style.background = 'rgba(76, 175, 80, 0.2)';
                    li.style.padding = '4px 10px';
                    li.style.borderRadius = '20px';
                    li.style.fontSize = '0.9rem';
                    li.style.color = '#fff';
                    ul.appendChild(li);
                });
                classesContainer.appendChild(ul);
            }
        }
    } catch (err) {
        console.error('Failed to fetch model info', err);
        const els = ['mi-input-shape', 'mi-output-shape', 'mi-parameters', 'mi-architecture', 'mi-classes'];
        els.forEach(el => {
            if (document.getElementById(el)) {
                document.getElementById(el).textContent = 'Failed to load';
            }
        });
    }
});
