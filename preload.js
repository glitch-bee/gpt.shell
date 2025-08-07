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

  // AGGRESSIVE: Intercept ALL clicks that might navigate away
  document.addEventListener('click', (event) => {
    console.log('Click detected on:', event.target, 'Type:', event.target.nodeName); // Debug all clicks
    
    // Try multiple ways to find the link or clickable element
    let target = event.target.closest('a');
    let url = null;
    
    if (target && target.href) {
      url = target.href;
    } else {
      // Check if the clicked element itself has href
      if (event.target.href) {
        target = event.target;
        url = target.href;
      } else {
        // Look for ANY clickable elements that might navigate
        const clickableParent = event.target.closest('[data-href], [onclick], .clickable, [role="button"], [role="link"], [data-url], [data-link], button, div[onclick]');
        if (clickableParent) {
          // Check for ANY data attributes that might contain URLs
          url = clickableParent.getAttribute('data-href') || 
                clickableParent.getAttribute('href') ||
                clickableParent.getAttribute('data-url') ||
                clickableParent.getAttribute('data-link') ||
                clickableParent.getAttribute('data-target-url');
          
          // Also check if there's an onclick that might contain a URL
          const onclick = clickableParent.getAttribute('onclick');
          if (onclick && !url) {
            const urlMatch = onclick.match(/https?:\/\/[^\s'"]+/);
            if (urlMatch) {
              url = urlMatch[0];
            }
          }
        }
        
        // Search through ALL parent elements for any navigation hints
        let parent = event.target.parentElement;
        while (parent && !url && parent !== document.body) {
          if (parent.href) {
            url = parent.href;
            target = parent;
            break;
          }
          // Check for data attributes on parents too
          url = parent.getAttribute('data-href') || 
                parent.getAttribute('data-url') ||
                parent.getAttribute('data-link');
          if (url) break;
          parent = parent.parentElement;
        }
      }
    }
    
    if (url) {
      console.log('Link/URL found:', url); // Debug logging
      
      // AGGRESSIVE: Only allow ChatGPT internal navigation - everything else goes to default browser
      const isInternalChatGPT = url.includes('chat.openai.com') || 
                               url.includes('chatgpt.com') ||
                               url.includes('openai.com') ||
                               url.startsWith('#') ||
                               url.startsWith('/') ||
                               url.startsWith('javascript:') ||
                               url.startsWith('mailto:') ||
                               url === window.location.href;
      
      console.log('Is internal ChatGPT?', isInternalChatGPT, 'URL:', url); // More debug info
      
      if (!isInternalChatGPT && (url.startsWith('http://') || url.startsWith('https://'))) {
        console.log('INTERCEPTING: Opening external link in default browser:', url); // Debug logging
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        
        // Safety check for electronAPI
        if (window.electronAPI && window.electronAPI.openExternal) {
          window.electronAPI.openExternal(url);
        } else {
          console.error('electronAPI not available for:', url);
        }
        return false;
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

  // NUCLEAR OPTION: Override window.open completely
  const originalOpen = window.open;
  window.open = function(url, target, features) {
    console.log('window.open intercepted:', url, 'target:', target);
    
    // If it's ANY external URL, send to default browser
    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      const isInternalChatGPT = url.includes('chat.openai.com') || 
                               url.includes('chatgpt.com') ||
                               url.includes('openai.com');
      
      if (!isInternalChatGPT) {
        console.log('BLOCKING window.open, redirecting to default browser:', url);
        if (window.electronAPI && window.electronAPI.openExternal) {
          window.electronAPI.openExternal(url);
        }
        return null; // Don't open anything in Electron
      }
    }
    
    // For internal ChatGPT URLs, allow normal behavior (same window navigation)
    if (url && (url.includes('chat.openai.com') || url.includes('chatgpt.com') || url.includes('openai.com'))) {
      // Instead of opening a new window, navigate in current window
      window.location.href = url;
      return null;
    }
    
    // Block everything else
    return null;
  };

  // Monitor location changes
  let currentUrl = window.location.href;
  const checkLocationChange = () => {
    if (window.location.href !== currentUrl) {
      console.log('Location changed from', currentUrl, 'to', window.location.href);
      currentUrl = window.location.href;
      
      // If it's an external URL, redirect to default browser
      if ((currentUrl.startsWith('http://') || currentUrl.startsWith('https://')) && 
          !currentUrl.includes('chat.openai.com') && 
          !currentUrl.includes('chatgpt.com') &&
          !currentUrl.includes('openai.com')) {
        console.log('External navigation detected, opening in default browser:', currentUrl);
        if (window.electronAPI && window.electronAPI.openExternal) {
          window.electronAPI.openExternal(currentUrl);
          // Navigate back to ChatGPT
          window.location.href = 'https://chat.openai.com';
        }
      }
    }
  };
  
  // Check for location changes periodically
  setInterval(checkLocationChange, 1000);

  // Additional aggressive protection: Block form submissions to external sites
  document.addEventListener('submit', (event) => {
    const form = event.target;
    if (form && form.action) {
      const isExternal = (form.action.startsWith('http://') || form.action.startsWith('https://')) &&
                        !form.action.includes('chat.openai.com') &&
                        !form.action.includes('chatgpt.com') &&
                        !form.action.includes('openai.com');
      
      if (isExternal) {
        console.log('Blocking external form submission to:', form.action);
        event.preventDefault();
        if (window.electronAPI && window.electronAPI.openExternal) {
          window.electronAPI.openExternal(form.action);
        }
      }
    }
  }, true);

  // Block middle-click and right-click "open in new window" attempts
  document.addEventListener('mousedown', (event) => {
    if (event.button === 1 || event.button === 2) { // middle click or right click
      const target = event.target.closest('a');
      if (target && target.href) {
        const isExternal = (target.href.startsWith('http://') || target.href.startsWith('https://')) &&
                          !target.href.includes('chat.openai.com') &&
                          !target.href.includes('chatgpt.com') &&
                          !target.href.includes('openai.com');
        
        if (isExternal) {
          console.log('Intercepting middle/right click on external link:', target.href);
          event.preventDefault();
          event.stopPropagation();
          if (window.electronAPI && window.electronAPI.openExternal) {
            window.electronAPI.openExternal(target.href);
          }
        }
      }
    }
  }, true);
});
