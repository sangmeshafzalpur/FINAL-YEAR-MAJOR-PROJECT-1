import os
from pathlib import Path

base_dir = Path(r"c:\Users\sangm\OneDrive\git remote\OneDrive\Desktop\Major Model\CHILLIFUSIONNET\chillifusionnet_app_advanced\chillifusionnet_app\frontend")

# Create directories
os.makedirs(base_dir / "css", exist_ok=True)
os.makedirs(base_dir / "js", exist_ok=True)
os.makedirs(base_dir / "components", exist_ok=True)

# Boilerplate contents
html_boilerplate = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ChilliFusionNet</title>
    <link rel="stylesheet" href="css/style.css">
    <link rel="stylesheet" href="css/responsive.css">
</head>
<body>
    <div id="navbar-container"></div>
    
    <main class="container">
        <h1>{title}</h1>
        <p>This page is currently under construction.</p>
    </main>

    <div id="footer-container"></div>

    <script src="js/app.js"></script>
</body>
</html>
"""

css_boilerplate = """/* {title} */
"""

js_boilerplate = """// {title}
"""

component_boilerplate = """<!-- {title} Component -->
<div class="{title}-wrapper">
    <h3>{title}</h3>
</div>
"""

# HTML Files
html_files = ["index.html", "dashboard.html", "diagnosis.html", "model.html", "reports.html", "about.html"]
for f in html_files:
    title = f.replace(".html", "").title()
    with open(base_dir / f, "w") as file:
        file.write(html_boilerplate.format(title=title))

# CSS Files
css_files = ["style.css", "landing.css", "dashboard.css", "diagnosis.css", "model.css", "reports.css", "animations.css", "responsive.css"]
for f in css_files:
    with open(base_dir / "css" / f, "w") as file:
        file.write(css_boilerplate.format(title=f))

# JS Files
js_files = ["app.js", "api.js", "dashboard.js", "diagnosis.js", "model.js", "reports.js"]
for f in js_files:
    with open(base_dir / "js" / f, "w") as file:
        file.write(js_boilerplate.format(title=f))

# Components
components = ["navbar.html", "footer.html", "sidebar.html", "loader.html"]
for f in components:
    title = f.replace(".html", "").title()
    with open(base_dir / "components" / f, "w") as file:
        file.write(component_boilerplate.format(title=title))

# Add base styles and variables to style.css
base_style = """/* 
  ChilliFusionNet Design System 
  Theme: CHILLI + AGRICULTURE + AI 
*/

:root {
    /* Colors */
    --primary-red: #D32F2F;
    --primary-green: #2E7D32;
    --dark-bg: #121212;
    --darker-bg: #0A0A0A;
    --light-text: #F5F5F5;
    --glass-bg: rgba(255, 255, 255, 0.05);
    --glass-border: rgba(255, 255, 255, 0.1);
    
    /* Gradients */
    --gradient-primary: linear-gradient(135deg, var(--primary-red), var(--primary-green));
    
    /* Layout */
    --border-radius: 16px;
    --transition-speed: 0.3s;
}

body {
    margin: 0;
    padding: 0;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background-color: var(--dark-bg);
    color: var(--light-text);
    line-height: 1.6;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
}

/* Glassmorphism Card */
.glass-card {
    background: var(--glass-bg);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid var(--glass-border);
    border-radius: var(--border-radius);
    padding: 2rem;
    box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
}
"""
with open(base_dir / "css" / "style.css", "w") as file:
    file.write(base_style)

# Add component injection to app.js
app_js = """// Main Application Logic

async function loadComponent(elementId, componentPath) {
    try {
        const response = await fetch(`components/${componentPath}`);
        if (!response.ok) throw new Error('Failed to load component');
        const html = await response.text();
        document.getElementById(elementId).innerHTML = html;
    } catch (error) {
        console.error('Error loading component:', error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Load common components
    loadComponent('navbar-container', 'navbar.html');
    loadComponent('footer-container', 'footer.html');
});
"""
with open(base_dir / "js" / "app.js", "w") as file:
    file.write(app_js)

print("Frontend scaffold generated successfully!")
