document.addEventListener('DOMContentLoaded', () => {
    
    // --- Elements ---
    const translateBtn = document.getElementById('translate-btn');
    const inputText = document.getElementById('inputText');
    const outputText = document.getElementById('outputText');
    const sourceLang = document.getElementById('source-lang');
    const targetLang = document.getElementById('target-lang');
    const cameraInput = document.getElementById('cameraInput');
    const audioBtn = document.getElementById('audio-btn');
    const audioPlayer = document.getElementById('audio-player');
    const statusMsg = document.getElementById('status-msg');
    const clearBtn = document.getElementById('clear-btn');
    const charCount = document.getElementById('char-count');
    
    let currentAudioUrl = null;

    // --- 1. Handle Translation ---
    translateBtn.addEventListener('click', async () => {
        // Prepare Data
        const formData = new FormData();
        formData.append('source_lang', sourceLang.value);
        formData.append('target_lang', targetLang.value);
        formData.append('text_input', inputText.value);
        
        // Add image if selected
        if (cameraInput.files.length > 0) {
            formData.append('image_file', cameraInput.files[0]);
        }

        // Show Loading
        statusMsg.style.display = 'block';
        statusMsg.textContent = 'Processing...';
        outputText.placeholder = "Translating...";
        
        try {
            const response = await fetch('/process', {
                method: 'POST',
                body: formData
            });
            const data = await response.json();

            if (data.error) {
                outputText.value = "Error: " + data.error;
            } else {
                // Update UI
                if(data.input_text) inputText.value = data.input_text; // Update if OCR happened
                outputText.value = data.output_text;
                currentAudioUrl = data.audio_url;
            }
        } catch (err) {
            outputText.value = "Network Error: " + err;
        } finally {
            statusMsg.style.display = 'none';
        }
    });

    // --- 2. Handle Audio ---
    audioBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (currentAudioUrl) {
            // Add random query param to avoid browser caching old audio
            audioPlayer.src = currentAudioUrl + "?t=" + new Date().getTime();
            audioPlayer.play();
        } else {
            alert("No audio available for this translation.");
        }
    });

    // --- 3. Extra Tools ---
    clearBtn.addEventListener('click', () => {
        inputText.value = '';
        outputText.value = '';
        cameraInput.value = ''; // Reset file input
        charCount.textContent = '0/5000';
    });

    inputText.addEventListener('input', () => {
        charCount.textContent = inputText.value.length + '/5000';
    });
    
    // Show user a file is selected
    cameraInput.addEventListener('change', () => {
        if(cameraInput.files.length > 0){
            inputText.value = "[Image Selected: " + cameraInput.files[0].name + "] Click Transliterate.";
        }
    });
});