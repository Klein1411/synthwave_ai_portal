// Reiichiro Nakano's TFJS ported models for Arbitrary Image Stylization
const styleNetUrl = 'https://cdn.jsdelivr.net/gh/reiinakano/arbitrary-image-stylization-tfjs@master/saved_model_style_js/model.json';
const transformNetUrl = 'https://cdn.jsdelivr.net/gh/reiinakano/arbitrary-image-stylization-tfjs@master/saved_model_transformer_separable_js/model.json';

let styleNet = null;
let transformNet = null;

const statusEl = document.getElementById('status');
const stylizeBtn = document.getElementById('stylize-btn');
const contentImg = document.getElementById('content-img');
const styleImg = document.getElementById('style-img');
const canvas = document.getElementById('stylized-canvas');

const contentUpload = document.getElementById('content-img-upload');
const styleThumbs = document.querySelectorAll('.style-thumb');

// Load user image
contentUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        contentImg.src = URL.createObjectURL(file);
    }
});

// Select style image
styleThumbs.forEach(thumb => {
    thumb.addEventListener('click', (e) => {
        styleThumbs.forEach(t => t.classList.remove('selected'));
        e.target.classList.add('selected');
        styleImg.src = e.target.src;
    });
});

async function loadModel() {
    if (styleNet && transformNet) return;
    
    // Check GPU backend first
    await tf.ready();
    const backend = tf.getBackend();
    console.log(`TensorFlow.js is using backend: ${backend}`);
    
    if (backend === 'webgl' || backend === 'webgpu') {
        statusEl.innerText = `✅ Nhận diện GPU thành công (Backend: ${backend.toUpperCase()}). Đang tải AI Model (khoảng 10MB)...`;
    } else {
        statusEl.innerText = `⚠️ Cảnh báo: Không nhận diện được GPU trình duyệt, đang chạy bằng CPU (${backend}). Đang tải AI Model...`;
    }

    try {
        // Load both the Style and Transform networks
        styleNet = await tf.loadGraphModel(styleNetUrl);
        transformNet = await tf.loadGraphModel(transformNetUrl);
        statusEl.innerText = `✅ Tải Model thành công! Sẵn sàng xử lý với ${backend.toUpperCase()}.`;
    } catch (err) {
        console.error(err);
        statusEl.innerText = '❌ Lỗi tải Model. Hãy kiểm tra console F12.';
    }
}

async function stylize() {
    if (!styleNet || !transformNet) {
        await loadModel();
    }
    if (!styleNet || !transformNet) return;

    statusEl.innerText = 'Đang xử lý Stylize... (Sẽ tốn nhiều CPU/GPU)';
    
    // Allow UI to update
    await tf.nextFrame();
    
    try {
        tf.tidy(() => {
            // Read images
            let contentTensor = tf.browser.fromPixels(contentImg).toFloat().div(tf.scalar(255)).expandDims();
            let styleTensor = tf.browser.fromPixels(styleImg).toFloat().div(tf.scalar(255)).expandDims();

            // 1. Run the style image through the StyleNet to get the style bottleneck representation (100-D vector)
            const styleBottleneck = styleNet.predict(styleTensor);
            
            // 2. Run the content image and the style bottleneck through the TransformNet
            const result = transformNet.predict([contentTensor, styleBottleneck]);
            
            // Output is [1, H, W, 3] in range [0, 1]
            const squeezed = result.squeeze();
            
            // Set canvas size to match result
            canvas.width = squeezed.shape[1];
            canvas.height = squeezed.shape[0];
            
            // Draw result to canvas
            tf.browser.toPixels(squeezed, canvas).then(() => {
                statusEl.innerText = 'Thành công! Tác phẩm nghệ thuật đã hoàn tất.';
            });
        });
    } catch (e) {
        console.error(e);
        statusEl.innerText = 'Có lỗi xảy ra trong quá trình xử lý.';
    }
}

stylizeBtn.addEventListener('click', () => {
    stylize();
});

// Pre-load model on page load
loadModel();
