import * as THREE from 'https://unpkg.com/three@0.128.0/build/three.module.js';
import { EffectComposer } from 'https://unpkg.com/three@0.128.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://unpkg.com/three@0.128.0/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'https://unpkg.com/three@0.128.0/examples/jsm/postprocessing/UnrealBloomPass.js';

// ==========================================
// PROFESSIONAL SYNTHWAVE SCENE (WEBGL + GLSL)
// ==========================================

const canvas = document.getElementById('bg-canvas');
const scene = new THREE.Scene();

// Sương mù bao phủ chân trời
scene.fog = new THREE.FogExp2(0x01012b, 0.005);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 10, 50);
camera.lookAt(0, 5, 0);

const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Tối ưu hiệu năng
renderer.setClearColor(0x01012b, 1);

// ===== EFFECT COMPOSER (BLOOM) =====
const renderScene = new RenderPass(scene, camera);
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 2.5, 0.5, 0.2);
const composer = new EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(bloomPass);

// ===== 1. MOUNTAIN & ROAD TERRAIN (CUSTOM SHADER) =====
const terrainWidth = 400;
const terrainDepth = 400;
const terrainGeometry = new THREE.PlaneGeometry(terrainWidth, terrainDepth, 150, 150);
terrainGeometry.rotateX(-Math.PI / 2);

// GLSL Simplex 2D Noise
const glslNoise = `
// GLSL textureless classic 2D noise "cnoise",
// with an RSL-style periodic variant "pnoise".
// Author:  Stefan Gustavson (stefan.gustavson@liu.se)
// Version: 2011-08-22
vec4 mod289(vec4 x){return x - floor(x * (1.0 / 289.0)) * 289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
vec2 fade(vec2 t) {return t*t*t*(t*(t*6.0-15.0)+10.0);}
float cnoise(vec2 P){
  vec4 Pi = floor(P.xyxy) + vec4(0.0, 0.0, 1.0, 1.0);
  vec4 Pf = fract(P.xyxy) - vec4(0.0, 0.0, 1.0, 1.0);
  Pi = mod289(Pi); // To avoid truncation effects in permutation
  vec4 ix = Pi.xzxz;
  vec4 iy = Pi.yyww;
  vec4 fx = Pf.xzxz;
  vec4 fy = Pf.yyww;
  vec4 i = permute(permute(ix) + iy);
  vec4 gx = fract(i * (1.0 / 41.0)) * 2.0 - 1.0 ;
  vec4 gy = abs(gx) - 0.5 ;
  vec4 tx = floor(gx + 0.5);
  gx = gx - tx;
  vec2 g00 = vec2(gx.x,gy.x);
  vec2 g10 = vec2(gx.y,gy.y);
  vec2 g01 = vec2(gx.z,gy.z);
  vec2 g11 = vec2(gx.w,gy.w);
  vec4 norm = taylorInvSqrt(vec4(dot(g00, g00), dot(g01, g01), dot(g10, g10), dot(g11, g11)));
  g00 *= norm.x;  g01 *= norm.y;  g10 *= norm.z;  g11 *= norm.w;
  float n00 = dot(g00, vec2(fx.x, fy.x));
  float n10 = dot(g10, vec2(fx.y, fy.y));
  float n01 = dot(g01, vec2(fx.z, fy.z));
  float n11 = dot(g11, vec2(fx.w, fy.w));
  vec2 fade_xy = fade(Pf.xy);
  vec2 n_x = mix(vec2(n00, n01), vec2(n10, n11), fade_xy.x);
  float n_xy = mix(n_x.x, n_x.y, fade_xy.y);
  return 2.3 * n_xy;
}
`;

const terrainVertexShader = `
    uniform float uTime;
    varying vec2 vUv;
    varying float vElevation;
    
    ${glslNoise}

    void main() {
        vUv = uv;
        vec3 pos = position;

        // Dịch chuyển UV theo thời gian để tạo cảm giác di chuyển
        vec2 noisePos = vec2(pos.x * 0.02, pos.z * 0.02 - uTime * 0.5);
        
        // Tính toán độ cao (Mountains)
        float noiseVal = cnoise(noisePos) * 15.0;
        
        // Mask để làm phẳng đoạn giữa (Đường cao tốc)
        float mask = smoothstep(10.0, 30.0, abs(pos.x));
        
        // Cập nhật Y
        pos.y += noiseVal * mask;
        vElevation = pos.y;
        
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
`;

const terrainFragmentShader = `
    uniform vec3 uColor;
    varying vec2 vUv;
    varying float vElevation;

    void main() {
        // Vẽ lưới (Grid)
        float gridX = step(0.95, fract(vUv.x * 100.0));
        float gridY = step(0.95, fract(vUv.y * 100.0));
        float grid = max(gridX, gridY);

        // Phát sáng phụ thuộc vào lưới và độ cao núi
        vec3 color = uColor * grid;
        
        // Tăng sáng ở các đỉnh núi
        color += uColor * (vElevation * 0.05);

        // Alpha: Làm mờ lưới ở những khoảng tối để tránh rối mắt
        float alpha = grid * 0.8;
        
        gl_FragColor = vec4(color, alpha);
    }
`;

const terrainMaterial = new THREE.ShaderMaterial({
    uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0xff2a6d) } // Pink truyền thống
    },
    vertexShader: terrainVertexShader,
    fragmentShader: terrainFragmentShader,
    transparent: true,
    wireframe: false // Không dùng wireframe thật, dùng Shader vẽ lưới
});

const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
terrain.position.z = -100;
scene.add(terrain);

// ===== 2. NEON SUN SCANLINES (CUSTOM SHADER) =====
const sunGeometry = new THREE.PlaneGeometry(200, 200, 1, 1);
const sunVertexShader = `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;
const sunFragmentShader = `
    varying vec2 vUv;
    uniform float uTime;

    void main() {
        // Gradient: Top (Yellow) -> Bottom (Pink)
        vec3 topColor = vec3(1.0, 0.9, 0.0); // Yellow
        vec3 bottomColor = vec3(1.0, 0.16, 0.42); // Pink
        vec3 color = mix(bottomColor, topColor, vUv.y);
        
        // Cắt hình tròn
        float dist = distance(vUv, vec2(0.5));
        float circle = 1.0 - smoothstep(0.48, 0.5, dist);
        
        // Scanlines: các vạch cắt ngang
        // Tạo dải tần số phi tuyến tính (dày ở dưới, mỏng ở trên)
        float scanlineFreq = 30.0;
        float scanlinePhase = vUv.y * scanlineFreq - uTime * 2.0;
        float line = sin(scanlinePhase);
        
        // Chỉ áp dụng scanline ở nửa dưới (vUv.y < 0.5)
        float scanlineMask = smoothstep(0.3, 0.6, vUv.y) + step(0.0, line);
        scanlineMask = clamp(scanlineMask, 0.0, 1.0);

        gl_FragColor = vec4(color * 1.5, circle * scanlineMask);
    }
`;

const sunMaterial = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: sunVertexShader,
    fragmentShader: sunFragmentShader,
    transparent: true,
    depthWrite: false
});

const sun = new THREE.Mesh(sunGeometry, sunMaterial);
// Chắc chắn Mặt trời luôn nằm xa nhất và đúng độ cao
sun.position.set(0, 30, -250); 
scene.add(sun);


// ===== 3. PALM TREES / TREES (InstancedMesh) =====
// Tạo 2 hàng cây dọc theo con đường
const treeCount = 60;
// Dùng một hình nón đơn giản làm "Cây thông neon" hoặc cây cọ low-poly
const treeGeometry = new THREE.ConeGeometry(2, 10, 4);
const treeMaterial = new THREE.MeshBasicMaterial({
    color: 0x05d9e8, // Cyan Neon
    wireframe: true,
    transparent: true,
    opacity: 0.8
});

const treeInstancedMesh = new THREE.InstancedMesh(treeGeometry, treeMaterial, treeCount);
const dummy = new THREE.Object3D();

const treeData = [];
for (let i = 0; i < treeCount; i++) {
    const isLeft = i % 2 === 0;
    const x = isLeft ? -15 : 15;
    const z = -Math.random() * terrainDepth;
    treeData.push({ x, z });
    
    dummy.position.set(x, 5, z);
    dummy.updateMatrix();
    treeInstancedMesh.setMatrixAt(i, dummy.matrix);
}
scene.add(treeInstancedMesh);


// ===== ANIMATION LOGIC =====
const clock = new THREE.Clock();
const speed = 40;

function animate() {
    requestAnimationFrame(animate);
    
    const elapsedTime = clock.getElapsedTime();
    const delta = clock.getDelta();

    // 1. Update Shader Uniforms
    terrainMaterial.uniforms.uTime.value = elapsedTime;
    sunMaterial.uniforms.uTime.value = elapsedTime;

    // 2. Animate Trees (Move forward)
    for (let i = 0; i < treeCount; i++) {
        const data = treeData[i];
        let currentZ = data.z + (elapsedTime * speed);
        // Loop trees back to the horizon when they pass the camera
        currentZ = -(terrainDepth) + (currentZ % terrainDepth);
        if (currentZ > 50) currentZ -= terrainDepth;
        
        dummy.position.set(data.x, 5, currentZ);
        dummy.updateMatrix();
        treeInstancedMesh.setMatrixAt(i, dummy.matrix);
    }
    treeInstancedMesh.instanceMatrix.needsUpdate = true;

    // Thay vì dùng renderer.render, dùng composer để chạy Bloom
    composer.render();
}

// Handle Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
});

animate();
