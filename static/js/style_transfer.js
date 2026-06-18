// Model URLs - using TensorFlow Hub's arbitrary image stylization model
const modelUrl = 'https://tfhub.dev/google/magenta/arbitrary-image-stylization-v1-256/2';

let model = null;

const statusEl = document.getElementById('status');
const stylizeBtn = document.getElementById('stylize-btn');
const contentImg = document.getElementById('content-img');
const styleImg = document.getElementById('style-img');
const canvas = document.getElementById('stylized-canvas');
const ctx = canvas.getContext('2d');

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
    if (model) return;
    
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
        // Load the graph model from TFHub directly
        model = await tf.loadGraphModel(modelUrl, {fromTFHub: true});
        statusEl.innerText = `✅ Tải Model thành công! Sẵn sàng xử lý với ${backend.toUpperCase()}.`;
    } catch (err) {
        console.error(err);
        statusEl.innerText = '❌ Lỗi tải Model. Hãy kiểm tra console F12.';
    }
}

async function stylize() {
    if (!model) {
        await loadModel();
    }
    if (!model) return;

    statusEl.innerText = 'Đang xử lý Stylize... (Sẽ tốn nhiều CPU/GPU)';
    
    // We use tf.tidy to clean up memory automatically
    await tf.nextFrame();
    
    try {
        tf.tidy(() => {
            // Resize images for performance (model expects ~256 for style, anything for content)
            const contentTensor = tf.browser.fromPixels(contentImg)
                .toFloat()
                .div(tf.scalar(255))
                .expandDims();
                
            const styleTensor = tf.browser.fromPixels(styleImg)
                .toFloat()
                .div(tf.scalar(255))
                .expandDims();

            // Run model
            const result = model.predict([contentTensor, styleTensor]);
            
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
