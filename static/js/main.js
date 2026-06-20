console.log("Welcome to Synthwave AI Portal!");

// --- Custom Cyberpunk Cursor ---
const cursorDot = document.createElement('div');
cursorDot.classList.add('custom-cursor-dot');
document.body.appendChild(cursorDot);

const cursorRing = document.createElement('div');
cursorRing.classList.add('custom-cursor-ring');
document.body.appendChild(cursorRing);

let mouseX = window.innerWidth / 2;
let mouseY = window.innerHeight / 2;
let ringX = mouseX;
let ringY = mouseY;

document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    
    // Dot follows exactly
    cursorDot.style.left = mouseX + 'px';
    cursorDot.style.top = mouseY + 'px';
});

// Lerp loop for the ring (fluid delay)
function animateCursor() {
    // Lerp formula: current + (target - current) * factor
    ringX += (mouseX - ringX) * 0.15;
    ringY += (mouseY - ringY) * 0.15;
    
    cursorRing.style.left = ringX + 'px';
    cursorRing.style.top = ringY + 'px';
    
    requestAnimationFrame(animateCursor);
}
animateCursor();

// --- Hover State for Interactive Elements ---
const interactables = document.querySelectorAll('a, .btn-neon, .card, button');

interactables.forEach(el => {
    el.addEventListener('mouseenter', () => {
        cursorRing.classList.add('hovering');
    });
    el.addEventListener('mouseleave', () => {
        cursorRing.classList.remove('hovering');
        
        // Reset magnetic transform
        el.style.transform = '';
    });
});

// --- Magnetic Soft/Bouncy Physics ---
// Apply to buttons and cards
const magneticElements = document.querySelectorAll('.btn-neon, .card');

magneticElements.forEach(el => {
    el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        // Calculate distance from center
        const distanceX = e.clientX - centerX;
        const distanceY = e.clientY - centerY;
        
        // Bouncy soft pull: move element slightly towards cursor (max ~15px)
        const pullX = distanceX * 0.15;
        const pullY = distanceY * 0.15;
        
        el.style.transform = `translate(${pullX}px, ${pullY}px)`;
    });
});
