// Three.js Setup
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x01012b, 0.002);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 100;
camera.position.y = 30;

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x01012b, 1);
container.appendChild(renderer.domElement);

// Create Synthwave Terrain (Wireframe Grid)
const geometry = new THREE.PlaneGeometry(400, 400, 40, 40);
// Displace vertices to create mountains
const positionAttribute = geometry.attributes.position;
for (let i = 0; i < positionAttribute.count; i++) {
    const x = positionAttribute.getX(i);
    const y = positionAttribute.getY(i);
    // Create a valley in the middle
    const dist = Math.abs(x);
    let z = 0;
    if (dist > 20) {
        z = Math.random() * (dist / 2);
    }
    positionAttribute.setZ(i, z);
}
geometry.computeVertexNormals();

const material = new THREE.MeshBasicMaterial({ 
    color: 0xff2a6d, 
    wireframe: true,
    transparent: true,
    opacity: 0.5
});
const terrain = new THREE.Mesh(geometry, material);
terrain.rotation.x = -Math.PI / 2;
scene.add(terrain);

// Create central Sun/Sphere
const sunGeometry = new THREE.SphereGeometry(20, 32, 32);
const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xf1c40f, wireframe: true });
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
sun.position.y = 10;
sun.position.z = -50;
scene.add(sun);

// Particles
const particleCount = 1000;
const particlesGeom = new THREE.BufferGeometry();
const particlesPos = new Float32Array(particleCount * 3);
for(let i=0; i<particleCount*3; i++) {
    particlesPos[i] = (Math.random() - 0.5) * 200;
}
particlesGeom.setAttribute('position', new THREE.BufferAttribute(particlesPos, 3));
const particlesMat = new THREE.PointsMaterial({color: 0x05d9e8, size: 0.5});
const particles = new THREE.Points(particlesGeom, particlesMat);
scene.add(particles);

// Audio Setup
let audioContext, analyser, dataArray, source;
const audioElement = new Audio();
const upload = document.getElementById('audio-upload');
const playBtn = document.getElementById('play-btn');
let isPlaying = false;

upload.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const url = URL.createObjectURL(file);
        audioElement.src = url;
        setupAudio();
    }
});

playBtn.addEventListener('click', () => {
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
    }
    if (isPlaying) {
        audioElement.pause();
    } else {
        audioElement.play();
        setupAudio(); // Ensure context is created on user gesture
    }
    isPlaying = !isPlaying;
});

function setupAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source = audioContext.createMediaElementSource(audioElement);
        source.connect(analyser);
        analyser.connect(audioContext.destination);
        dataArray = new Uint8Array(analyser.frequencyBinCount);
    }
}

// Animation Loop
let time = 0;
function animate() {
    requestAnimationFrame(animate);

    time += 0.01;

    // Move terrain to simulate flying forward
    terrain.position.z = (time * 10) % 10;

    let avgFreq = 0;
    if (analyser) {
        analyser.getByteFrequencyData(dataArray);
        
        // Calculate average frequency for bass
        let sum = 0;
        for(let i=0; i<10; i++) {
            sum += dataArray[i];
        }
        avgFreq = sum / 10;
        
        // Scale sun based on bass
        const scale = 1 + (avgFreq / 255) * 0.5;
        sun.scale.set(scale, scale, scale);

        // Change sun color based on high frequencies
        let highSum = 0;
        for(let i=50; i<100; i++) {
            highSum += dataArray[i];
        }
        if (highSum > 1000) {
            sunMaterial.color.setHex(0x05d9e8); // Cyan flash
        } else {
            sunMaterial.color.setHex(0xf1c40f); // Yellow default
        }

        // Modulate terrain wireframe thickness or opacity
        material.opacity = 0.3 + (avgFreq / 255) * 0.7;
    }

    sun.rotation.y += 0.005;
    sun.rotation.x += 0.005;

    particles.rotation.y += 0.001;

    renderer.render(scene, camera);
}

// Resize handler
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
