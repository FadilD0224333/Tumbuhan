/**
 * Web AR Application
 * Menggunakan AR.js + A-Frame + Three.js
 */

class WebARApp {
    constructor() {
        this.scene = null;
        this.marker = null;
        this.modelContainer = null;
        this.isMarkerDetected = false;
        this.currentScale = 0.5;
        this.rotationSpeed = 0.5;
        this.autoRotate = true;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupUI();
        this.loadModel();
        console.log('🚀 Web AR App initialized');
    }

    setupEventListeners() {
        // Marker events
        const marker = document.getElementById('hiro-marker');
        
        marker.addEventListener('markerFound', () => {
            this.onMarkerFound();
        });

        marker.addEventListener('markerLost', () => {
            this.onMarkerLost();
        });

        // Window resize
        window.addEventListener('resize', () => {
            this.onResize();
        });
    }

    setupUI() {
        // Hide loading after initialization
        setTimeout(() => {
            document.getElementById('loading-screen').classList.add('hidden');
        }, 3000);
    }

    onMarkerFound() {
        this.isMarkerDetected = true;
        this.updateStatus(true);
        this.showMarkerGuide(false);
        this.showInfoPanel(true);
        
        // Add appear animation
        if (this.modelContainer) {
            this.modelContainer.classList.add('model-appear');
        }
        
        console.log('✅ Marker detected');
    }

    onMarkerLost() {
        this.isMarkerDetected = false;
        this.updateStatus(false);
        this.showMarkerGuide(true);
        this.showInfoPanel(false);
        
        console.log('❌ Marker lost');
    }

    updateStatus(detected) {
        const dot = document.getElementById('status-dot');
        const text = document.getElementById('status-text');
        
        if (detected) {
            dot.classList.add('active');
            text.textContent = 'Marker Terdeteksi!';
        } else {
            dot.classList.remove('active');
            text.textContent = 'Mencari Marker...';
        }
    }

    showMarkerGuide(show) {
        const guide = document.getElementById('marker-guide');
        if (show) {
            guide.classList.remove('hidden');
        } else {
            guide.classList.add('hidden');
        }
    }

    showInfoPanel(show) {
        const panel = document.getElementById('info-panel');
        if (show) {
            panel.classList.add('show');
        } else {
            panel.classList.remove('show');
        }
    }

    loadModel() {
        // Model sudah di-load via A-Frame assets
        // Untuk model custom, gunakan GLTFLoader Three.js
        this.modelContainer = document.getElementById('model-container');
    }

    resetModel() {
        if (this.modelContainer) {
            this.modelContainer.setAttribute('rotation', '0 0 0');
            this.modelContainer.setAttribute('scale', '0.5 0.5 0.5');
            this.currentScale = 0.5;
            this.autoRotate = true;
        }
    }

    takeScreenshot() {
        const canvas = document.querySelector('a-scene').canvas;
        if (canvas) {
            const link = document.createElement('a');
            link.download = `ar-capture-${Date.now()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            
            // Flash effect
            const flash = document.getElementById('flash');
            flash.classList.add('active');
            setTimeout(() => flash.classList.remove('active'), 100);
        }
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }

    onResize() {
        // Handle responsive adjustments
        console.log('Window resized');
    }

    // Animation loop
    animate() {
        if (this.isMarkerDetected && this.modelContainer && this.autoRotate) {
            const rotation = this.modelContainer.getAttribute('rotation');
            this.modelContainer.setAttribute('rotation', {
                x: rotation.x,
                y: rotation.y + this.rotationSpeed,
                z: rotation.z
            });
        }
        requestAnimationFrame(() => this.animate());
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new WebARApp();
    app.animate();
    
    // Expose to global for button access
    window.arApp = app;
});