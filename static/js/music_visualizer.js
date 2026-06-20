import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { FilmPass } from 'three/addons/postprocessing/FilmPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { RGBShiftShader } from 'three/addons/shaders/RGBShiftShader.js';

// --- UI Elements ---
const overlay = document.getElementById('loading-overlay');
const uiPanel = document.getElementById('ui-panel');
const fileInput = document.getElementById('audio-upload');
const demoBtn = document.getElementById('demo-btn');
const trackName = document.getElementById('track-name');
const demoAudio = document.getElementById('demo-audio');

// UI auto-hide logic
let uiTimeout;
function showUI() {
    uiPanel.classList.remove('hidden');
    clearTimeout(uiTimeout);
    uiTimeout = setTimeout(() => {
        uiPanel.classList.add('hidden');
    }, 3000);
}
document.addEventListener('mousemove', showUI);
showUI();

// --- Audio Setup ---
let audioCtx, analyser, dataArray;
let isPlaying = false;
let audioSource = null;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.8;
        dataArray = new Uint8Array(analyser.frequencyBinCount);
    }
}

fileInput.addEventListener('change', function(e) {
    if (this.files.length === 0) return;
    initAudio();
    const file = this.files[0];
    trackName.innerText = file.name;
    
    const reader = new FileReader();
    reader.onload = function(ev) {
        audioCtx.decodeAudioData(ev.target.result, (buffer) => {
            if (audioSource && audioSource.stop) audioSource.stop();
            if (!demoAudio.paused) demoAudio.pause();
            
            audioSource = audioCtx.createBufferSource();
            audioSource.buffer = buffer;
            audioSource.connect(analyser);
            analyser.connect(audioCtx.destination);
            audioSource.start(0);
            isPlaying = true;
        });
    };
    reader.readAsArrayBuffer(file);
});

demoBtn.addEventListener('click', () => {
    initAudio();
    trackName.innerText = "Demo: Blinding Lights (Inst)";
    if (audioSource && audioSource.stop) audioSource.stop();
    
    if (!demoAudio.srcObject) {
        const source = audioCtx.createMediaElementSource(demoAudio);
        source.connect(analyser);
        analyser.connect(audioCtx.destination);
        demoAudio.crossOrigin = "anonymous";
    }
    
    if (demoAudio.paused) {
        demoAudio.play();
        demoBtn.innerText = "⏸ Tạm dừng";
        isPlaying = true;
    } else {
        demoAudio.pause();
        demoBtn.innerText = "▶ Chạy Demo";
        isPlaying = false;
    }
});

function getAudioData() {
    if (!isPlaying || !analyser) return { bass: 0, mid: 0, treble: 0 };
    analyser.getByteFrequencyData(dataArray);
    let bass = 0, mid = 0, treble = 0;
    for(let i=0; i<10; i++) bass += dataArray[i];
    for(let i=20; i<80; i++) mid += dataArray[i];
    for(let i=150; i<200; i++) treble += dataArray[i];
    
    return {
        bass: (bass / 10) / 255,
        mid: (mid / 60) / 255,
        treble: (treble / 50) / 255
    };
}

// --- Three.js Setup ---
const canvas = document.getElementById('visualizer-canvas');
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000000, 0.015);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 2, 8); // Look slightly down

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// Post Processing
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

// Soft Neon Bloom
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
bloomPass.threshold = 0.15;
bloomPass.strength = 0.6;
bloomPass.radius = 0.5;
composer.addPass(bloomPass);

const filmPass = new FilmPass(0.35, 0.025, 648, false);
composer.addPass(filmPass);

const rgbShiftPass = new ShaderPass(RGBShiftShader);
rgbShiftPass.uniforms['amount'].value = 0.0015;
composer.addPass(rgbShiftPass);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xff00ff, 0.5);
dirLight.position.set(0, 10, -20);
scene.add(dirLight);

// --- 1. Glowing Road ---
// Brighter grid to compensate for lower global bloom
const gridHelper = new THREE.GridHelper(200, 100, 0xff0080, 0x00ffff);
gridHelper.position.y = -1;
scene.add(gridHelper);

// Flat plane under the grid to hide bottom
const planeGeo = new THREE.PlaneGeometry(200, 200);
const planeMat = new THREE.MeshBasicMaterial({ color: 0x010111 });
const plane = new THREE.Mesh(planeGeo, planeMat);
plane.rotation.x = -Math.PI / 2;
plane.position.y = -1.05;
scene.add(plane);


// --- 2. Procedural Skyline (InstancedMesh Chunks) ---
const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const solidMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
const wireMat = new THREE.MeshBasicMaterial({ color: 0x05d9e8, wireframe: true });

function createCityChunk() {
    const chunk = new THREE.Group();
    const count = 300;
    const solidInst = new THREE.InstancedMesh(boxGeo, solidMat, count);
    const wireInst = new THREE.InstancedMesh(boxGeo, wireMat, count);
    
    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
        // Leave a gap in the center for the road (-15 to 15)
        let x = Math.random() * 80 + 15;
        if (Math.random() > 0.5) x = -x;
        
        const z = -Math.random() * 200;
        const height = Math.random() * 40 + 10;
        const width = Math.random() * 4 + 3;
        const depth = Math.random() * 4 + 3;
        
        dummy.position.set(x, height / 2 - 1, z);
        
        // Solid
        dummy.scale.set(width, height, depth);
        dummy.updateMatrix();
        solidInst.setMatrixAt(i, dummy.matrix);
        
        // Wireframe (slightly larger to avoid z-fighting)
        dummy.scale.set(width * 1.01, height * 1.01, depth * 1.01);
        dummy.updateMatrix();
        wireInst.setMatrixAt(i, dummy.matrix);
    }
    chunk.add(solidInst);
    chunk.add(wireInst);
    return chunk;
}

const cityChunks = [createCityChunk(), createCityChunk()];
cityChunks[0].position.z = 0;
cityChunks[1].position.z = -200;
scene.add(cityChunks[0]);
scene.add(cityChunks[1]);


// --- 3. Palm Trees & Streetlights ---
const propsGroup = new THREE.Group();
scene.add(propsGroup);
const props = [];

// Helper to create a low-poly palm tree
function createPalmTree() {
    const tree = new THREE.Group();
    // Trunk
    const trunkGeo = new THREE.CylinderGeometry(0.2, 0.4, 8, 5);
    const trunkMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 4;
    tree.add(trunk);
    
    // Leaves (Neon Pink)
    const leafMat = new THREE.MeshBasicMaterial({ color: 0xff2a6d, side: THREE.DoubleSide });
    for (let i = 0; i < 5; i++) {
        const leafGeo = new THREE.PlaneGeometry(1, 4);
        const leaf = new THREE.Mesh(leafGeo, leafMat);
        leaf.position.y = 8;
        leaf.rotation.x = Math.PI / 4;
        leaf.rotation.y = (i / 5) * Math.PI * 2;
        // Shift outward
        leaf.translateX(0);
        leaf.translateY(1.5);
        leaf.translateZ(1);
        tree.add(leaf);
    }
    return tree;
}

// Helper to create a neon streetlight
function createStreetlight() {
    const light = new THREE.Group();
    const poleGeo = new THREE.CylinderGeometry(0.1, 0.1, 6, 4);
    const poleMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.y = 3;
    light.add(pole);
    
    const bulbGeo = new THREE.BoxGeometry(1.5, 0.2, 0.5);
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0x05d9e8 });
    const bulb = new THREE.Mesh(bulbGeo, bulbMat);
    bulb.position.set(0.5, 6, 0);
    light.add(bulb);
    return light;
}

// Generate alternating props along the road
for (let i = 0; i < 40; i++) {
    const zPos = -i * 10;
    // Alternate sides and types
    const isLeft = i % 2 === 0;
    const isTree = i % 4 < 2;
    
    const prop = isTree ? createPalmTree() : createStreetlight();
    
    prop.position.x = isLeft ? -10 : 10;
    if (isLeft && !isTree) {
        // mirror streetlight
        prop.rotation.y = Math.PI;
    }
    prop.position.y = -1;
    prop.position.z = zPos;
    
    propsGroup.add(prop);
    props.push(prop);
}

// --- 4. The Synthwave Sun & Starry Sky ---
// A. Starry Sky (Points)
const starCount = 5000;
const starPositions = new Float32Array(starCount * 3);
for (let i = 0; i < starCount * 3; i += 3) {
    starPositions[i] = (Math.random() - 0.5) * 800;
    starPositions[i+1] = (Math.random() - 0.5) * 400 + 100;
    starPositions[i+2] = -Math.random() * 800; // Far behind
}
const starGeo = new THREE.BufferGeometry();
starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
const starMat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 1.5,
    sizeAttenuation: true
});
const stars = new THREE.Points(starGeo, starMat);
scene.add(stars);

// B. Sun (Audio-Reactive Shader)
const sunGeo = new THREE.CircleGeometry(40, 64);
const sunMat = new THREE.ShaderMaterial({
    uniforms: {
        time: { value: 0 },
        uBass: { value: 0 },
        colorTop: { value: new THREE.Color(0xff0080) },
        colorBottom: { value: new THREE.Color(0xffd700) }
    },
    vertexShader: `
        uniform float uBass;
        varying vec2 vUv;
        void main() {
            vUv = uv;
            // Scale sun smoothly based on bass
            vec3 newPosition = position * (1.0 + uBass * 0.3);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
        }
    `,
    fragmentShader: `
        uniform float time;
        uniform float uBass;
        uniform vec3 colorTop;
        uniform vec3 colorBottom;
        varying vec2 vUv;
        
        void main() {
            // Emphasize colors when bass hits
            vec3 activeTop = mix(colorTop, vec3(1.0, 0.0, 0.0), uBass * 0.5);
            vec3 color = mix(colorBottom, activeTop, vUv.y);
            
            // Scanlines move faster and get slightly thicker with bass
            float scanline = step(0.1 + uBass * 0.1, fract(vUv.y * 20.0 - time * (0.5 + uBass * 2.0)));
            if(vUv.y < 0.5) {
                color *= scanline;
            }
            // Boost overall brightness to pierce through lower global bloom
            gl_FragColor = vec4(color * 1.5, 1.0);
        }
    `,
    transparent: true,
    fog: false
});
const sunMesh = new THREE.Mesh(sunGeo, sunMat);
sunMesh.position.set(0, 15, -200); // Moved further back
scene.add(sunMesh);


// --- 5. Retro Sports Car ---
const carGroup = new THREE.Group();
const carBodyMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
const carNeonMat = new THREE.MeshBasicMaterial({ color: 0xff2a6d });

// Chassis
const chassis = new THREE.Mesh(new THREE.BoxGeometry(2, 0.4, 4), carBodyMat);
chassis.position.y = 0.4;
carGroup.add(chassis);

// Cabin
const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 2), carBodyMat);
cabin.position.set(0, 0.85, -0.5);
carGroup.add(cabin);

// Tail Lights (Neon)
const tailLight = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.15, 0.1), carNeonMat);
tailLight.position.set(0, 0.5, 2.05);
carGroup.add(tailLight);

// Wheels
const wheelGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.4, 8);
const wheelMat = new THREE.MeshBasicMaterial({ color: 0x05d9e8, wireframe: true });
const wheelPositions = [
    [-1.1, 0.3, 1.2], [1.1, 0.3, 1.2],
    [-1.1, 0.3, -1.2], [1.1, 0.3, -1.2]
];
const wheels = [];
wheelPositions.forEach(pos => {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(pos[0], pos[1], pos[2]);
    carGroup.add(wheel);
    wheels.push(wheel);
});

carGroup.position.set(0, -0.8, 4); // Fixed near camera
scene.add(carGroup);


// --- Animation Loop ---
const clock = new THREE.Clock();
let smoothedBass = 0;
let smoothedTreble = 0;
let smoothedMid = 0;

function animate() {
    requestAnimationFrame(animate);
    
    const delta = clock.getDelta();
    const time = clock.getElapsedTime();
    
    sunMat.uniforms.time.value = time;
    
    // Audio processing
    const audio = getAudioData();
    smoothedBass += (audio.bass - smoothedBass) * 0.15;
    smoothedTreble += (audio.treble - smoothedTreble) * 0.2;
    smoothedMid += (audio.mid - smoothedMid) * 0.1;
    
    // Calculate speed based on audio
    const speed = delta * (30 + smoothedMid * 100);
    
    // 1. Move Grid (Road)
    gridHelper.position.z += speed;
    if (gridHelper.position.z > 2) {
        gridHelper.position.z -= 2; // Loop grid tiles seamlessly
    }
    
    // 2. Move City Chunks
    cityChunks.forEach(chunk => {
        chunk.position.z += speed;
        if (chunk.position.z > 200) {
            chunk.position.z -= 400; // Recycle chunk to the back
        }
    });
    
    // 3. Move Props (Trees & Lights)
    props.forEach(prop => {
        prop.position.z += speed;
        if (prop.position.z > 10) {
            prop.position.z -= 400; // Send back
        }
    });
    
    // Pass Bass to Sun Shader
    sunMat.uniforms.uBass.value = smoothedBass;
    
    // 4. Car Animation
    // Wheels spinning
    wheels.forEach(w => w.rotation.x -= speed * 0.5);
    // Gentle bouncing chassis (removed chaotic recoil)
    const bounce = Math.sin(time * 20) * 0.05 + smoothedBass * 0.1;
    chassis.position.y = 0.4 + bounce;
    cabin.position.y = 0.85 + bounce;
    tailLight.position.y = 0.5 + bounce;
    
    // 5. Starry Sky Motion (A+B)
    const starAttr = starGeo.attributes.position;
    for(let i = 0; i < starAttr.count; i++) {
        let z = starAttr.getZ(i);
        z += speed * 0.5; // Stars moving towards camera
        if(z > 10) z -= 800; // Reset far back
        starAttr.setZ(i, z);
    }
    starAttr.needsUpdate = true;
    
    // 6. Post Processing (Subtle Glitch)
    rgbShiftPass.uniforms['amount'].value = 0.0015 + (smoothedTreble * 0.01) + (smoothedBass * 0.005);
    bloomPass.strength = 0.6 + smoothedBass * 0.2;

    composer.render();
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
});

// Hide loading
setTimeout(() => {
    overlay.style.opacity = '0';
    setTimeout(() => overlay.remove(), 500);
    animate();
}, 1000);
