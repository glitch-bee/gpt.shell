const { contextBridge, ipcRenderer } = require('electron');

// This keeps things secure while still allowing some future bridging if needed
window.addEventListener('DOMContentLoaded', () => {
  // Expose API to renderer process
  contextBridge.exposeInMainWorld('electronAPI', {
    openExternal: (url) => ipcRenderer.invoke('open-external', url),
    toggleAlwaysOnTop: () => ipcRenderer.invoke('toggle-always-on-top')
  });
  
  // Verify the API is available
  console.log('electronAPI exposed:', window.electronAPI);
  
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

  // Intercept all link clicks and open in default browser
  document.addEventListener('click', (event) => {
    console.log('Click detected on:', event.target); // Debug all clicks
    
    // Try multiple ways to find the link
    let target = event.target.closest('a');
    if (!target) {
      // Check if the clicked element itself has href
      if (event.target.href) {
        target = event.target;
      }
    }
    
    if (target && target.href) {
      const url = target.href;
      console.log('Link clicked:', url); // Debug logging
      
      // Only intercept links that go to external domains, not internal ChatGPT navigation
      const isExternal = (url.startsWith('http://') || url.startsWith('https://')) && 
                        !url.includes('chat.openai.com') && 
                        !url.includes('chatgpt.com') &&
                        !url.includes('openai.com') &&
                        !url.startsWith('#') &&
                        !url.startsWith('javascript:');
      
      console.log('Is external?', isExternal, 'URL:', url); // More debug info
      
      if (isExternal) {
        console.log('Opening external link:', url); // Debug logging
        event.preventDefault();
        event.stopPropagation();
        
        // Safety check for electronAPI
        if (window.electronAPI && window.electronAPI.openExternal) {
          window.electronAPI.openExternal(url);
        } else {
          console.error('electronAPI not available, falling back to window.open');
          // Fallback - this will likely open in the Electron window, but better than nothing
          window.open(url, '_blank');
        }
      }
    }
  }, true); // Use capture phase to catch events early
  
  // Also try listening for new link creation
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // Check if new links were added
          const links = node.querySelectorAll ? node.querySelectorAll('a[href]') : [];
          links.forEach(link => {
            console.log('New link detected:', link.href);
          });
        }
      });
    });
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
});
