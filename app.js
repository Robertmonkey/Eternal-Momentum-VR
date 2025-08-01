import { start as startVR } from './vrMain.js';

const loadingEl = document.getElementById('loadingScreen');

function main() {
    // Immediately start the VR setup process. This will add the "Enter VR" button to the page.
    startVR();
    
    // Hide the initial HTML loading screen once the VR button is ready.
    if (loadingEl) {
        loadingEl.style.opacity = '0';
        setTimeout(() => {
            loadingEl.style.display = 'none';
        }, 500);
    }
}

window.addEventListener('load', main);
