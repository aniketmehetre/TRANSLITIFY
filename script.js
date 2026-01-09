document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. DOM ELEMENTS ---
    
    // Main Controls
    const translateBtn = document.getElementById('translate-btn');
    const inputText = document.getElementById('inputText');
    const outputText = document.getElementById('outputText');
    const sourceLang = document.getElementById('source-lang');
    const targetLang = document.getElementById('target-lang');
    const audioBtn = document.getElementById('audio-btn');
    const audioPlayer = document.getElementById('audio-player');
    const statusMsg = document.getElementById('status-msg');
    const clearBtn = document.getElementById('clear-btn');
    const charCount = document.getElementById('char-count');
    const copyBtn = document.getElementById('copy-btn');
    const swapBtn = document.getElementById('swap-btn');
    
    // Image & Camera Elements
    const scanBtn = document.getElementById('scan-btn');
    const fileInput = document.getElementById('fileInput'); // The hidden file input
    const previewArea = document.getElementById('preview-area');
    const imageDisplay = document.getElementById('image-display');
    
    // Modal Elements (For Laptop Webcam)
    const cameraModal = document.getElementById('camera-modal');
    const videoFeed = document.getElementById('video-feed');
    const canvas = document.getElementById('canvas');
    const captureBtn = document.getElementById('capture-btn');
    const closeCameraBtn = document.getElementById('close-camera-btn');

    // --- 2. STATE VARIABLES ---
    let currentAudioUrl = null;
    let capturedBlob = null; // Stores the webcam photo
    let stream = null;       // Stores the active camera stream

    // --- 3. CAMERA LOGIC ---

    // Open Camera Modal
    scanBtn.addEventListener('click', async () => {
        cameraModal.style.display = 'flex';
        try {
            // Request Camera Access
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
            videoFeed.srcObject = stream;
        } catch (err) {
            alert("Error accessing camera. Please allow permissions. \nDetails: " + err);
            cameraModal.style.display = 'none';
        }
    });

    // Capture Photo from Video Feed
    captureBtn.addEventListener('click', () => {
        if (!stream) return;

        // Draw video frame to canvas
        const context = canvas.getContext('2d');
        canvas.width = videoFeed.videoWidth;
        canvas.height = videoFeed.videoHeight;
        context.drawImage(videoFeed, 0, 0, canvas.width, canvas.height);
        
        // Convert Canvas to Blob (Image File)
        canvas.toBlob((blob) => {
            capturedBlob = blob; // Save for sending later
            
            // Show Preview
            const imageUrl = URL.createObjectURL(blob);
            imageDisplay.src = imageUrl;
            previewArea.style.display = 'block';
            
            inputText.value = "[Webcam Photo Captured] Ready to Process.";
            
            // Cleanup
            stopCamera();
        }, 'image/jpeg');
    });

    // Close Modal Button
    closeCameraBtn.addEventListener('click', stopCamera);

    // Helper: Stop Camera Stream & Close Modal
    function stopCamera() {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
        cameraModal.style.display = 'none';
    }

    // --- 4. FILE UPLOAD LOGIC ---

    // Listen for file selection (Upload Button)
    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            
            // Reset webcam capture if user chooses to upload instead
            capturedBlob = null; 

            // Show Preview
            const imageUrl = URL.createObjectURL(file);
            imageDisplay.src = imageUrl;
            previewArea.style.display = 'block';

            inputText.value = `[File Selected: ${file.name}] Ready to Process.`;
        }
    });

    // --- 5. TRANSLATION LOGIC (Main Backend Call) ---

    translateBtn.addEventListener('click', async () => {
        // Prepare Form Data
        const formData = new FormData();
        formData.append('source_lang', sourceLang.value);
        formData.append('target_lang', targetLang.value);
        formData.append('text_input', inputText.value);
        
        // Priority: Webcam Blob > Uploaded File
        if (capturedBlob) {
            formData.append('image_file', capturedBlob, 'webcam-snap.jpg');
        } else if (fileInput.files.length > 0) {
            formData.append('image_file', fileInput.files[0]);
        }

        // UI Updates: Loading State
        statusMsg.style.display = 'block';
        statusMsg.textContent = 'Processing...';
        outputText.value = "Translating...";
        outputText.style.opacity = "0.7";
        
        try {
            // Send to Python
            const response = await fetch('/process', {
                method: 'POST',
                body: formData
            });
            const data = await response.json();

            outputText.style.opacity = "1";

            if (data.error) {
                outputText.value = "Error: " + data.error;
            } else {
                // Success: Update Text & Audio
                if(data.input_text) inputText.value = data.input_text; // Update if OCR was used
                outputText.value = data.output_text;
                currentAudioUrl = data.audio_url;
            }
        } catch (err) {
            outputText.value = "Network Error. Please check connection.";
            console.error(err);
        } finally {
            statusMsg.style.display = 'none';
        }
    });

    // --- 6. AUDIO PLAYBACK ---
    audioBtn.addEventListener('click', (e) => {
        e.preventDefault(); // Prevent button from submitting form if inside one
        if (currentAudioUrl) {
            // Add timestamp to prevent browser caching old audio files
            audioPlayer.src = currentAudioUrl + "?t=" + new Date().getTime();
            audioPlayer.style.display = "block";
            audioPlayer.play();
        } else {
            alert("No audio available. Try translating something first.");
        }
    });

    // --- 7. UTILITY TOOLS ---

    // Clear Button: Resets everything
    clearBtn.addEventListener('click', () => {
        inputText.value = '';
        outputText.value = '';
        fileInput.value = ''; // Reset file input
        capturedBlob = null;  // Reset webcam capture
        previewArea.style.display = 'none'; // Hide image preview
        imageDisplay.src = '#';
        charCount.textContent = '0/5000';
        currentAudioUrl = null;
    });

    // Character Counter
    inputText.addEventListener('input', () => {
        charCount.textContent = inputText.value.length + '/5000';
    });

    // Copy to Clipboard
    copyBtn.addEventListener('click', () => {
        if(outputText.value) {
            navigator.clipboard.writeText(outputText.value);
            alert("Translation copied to clipboard!");
        }
    });

    // Swap Languages
    swapBtn.addEventListener('click', () => {
        const temp = sourceLang.value;
        sourceLang.value = targetLang.value;
        targetLang.value = temp;
        
        // Also swap text if present
        const tempText = inputText.value;
        inputText.value = outputText.value;
        outputText.value = tempText;
    });

});
