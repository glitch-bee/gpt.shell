// This keeps things secure while still allowing some future bridging if needed
window.addEventListener('DOMContentLoaded', () => {
  // Inject JetBrains Mono font family
  const style = document.createElement('style');
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,100..800;1,100..800&display=swap');
    
    * {
      font-family: 'JetBrains Mono', 'Consolas', 'Monaco', 'Courier New', monospace !important;
    }
    
    /* Ensure code blocks and pre elements also use JetBrains Mono */
    code, pre, .code, [class*="code"], [class*="highlight"] {
      font-family: 'JetBrains Mono', 'Consolas', 'Monaco', 'Courier New', monospace !important;
    }
    
    /* Apply to common text elements in ChatGPT interface */
    div, p, span, textarea, input {
      font-family: 'JetBrains Mono', 'Consolas', 'Monaco', 'Courier New', monospace !important;
    }
  `;
  
  document.head.appendChild(style);
});
