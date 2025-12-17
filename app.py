import os
import glob
from flask import Flask, render_template, request, jsonify
from PIL import Image, ImageEnhance
import pytesseract
from deep_translator import GoogleTranslator
from gtts import gTTS

app = Flask(__name__)

# --- CONFIGURATION ---
UPLOAD_FOLDER = 'uploads'
STATIC_FOLDER = 'static'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(STATIC_FOLDER, exist_ok=True)

# Update this path to your local Tesseract installation
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

# --- NEW: MULTILINGUAL LANGUAGE MAPPING ---
# Maps Frontend codes to Tesseract OCR codes
TESS_LANG_MAP = {
    # Top 10 Global (2025)
    'en': 'eng', 'zh-CN': 'chi_sim', 'es': 'spa', 'fr': 'fra', 'ar': 'ara',
    'bn': 'ben', 'pt': 'por', 'ru': 'rus', 'ja': 'jpn', 'de': 'deu',
    # Top 15 Indian (Scheduled & Popular)
    'hi': 'hin', 'mr': 'mar', 'te': 'tel', 'ta': 'tam', 'gu': 'guj',
    'ur': 'urd', 'kn': 'kan', 'or': 'ori', 'ml': 'mal', 'pa': 'pan',
    'as': 'asm', 'mai': 'mai', 'sat': 'sat', 'ks': 'kas', 'ne': 'nep'
}

def clean_old_files():
    """Removes old temp files to save space."""
    files = glob.glob(os.path.join(STATIC_FOLDER, '*.mp3')) + \
            glob.glob(os.path.join(UPLOAD_FOLDER, '*'))
    for f in files:
        if not f.endswith('.css') and not f.endswith('.js'):
            try: os.remove(f)
            except: pass

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/process', methods=['POST'])
def process():
    clean_old_files()
    
    # 1. Get Data from Frontend
    source_lang = request.form.get('source_lang', 'auto') 
    target_lang = request.form.get('target_lang', 'en')
    text_input = request.form.get('text_input')
    image_file = request.files.get('image_file')

    extracted_text = ""
    output_text = ""
    audio_url = ""

    try:
        # 2. Handle Image (OCR with Dynamic Language)
        if image_file:
            image_path = os.path.join(UPLOAD_FOLDER, "temp.jpg")
            image_file.save(image_path)
            
            try:
                img = Image.open(image_path).convert('L') 
                enhancer = ImageEnhance.Contrast(img)
                img = enhancer.enhance(2.0)

                # Fetch specific OCR language code
                tess_lang = TESS_LANG_MAP.get(source_lang, 'eng')
                custom_config = r'--oem 3 --psm 6'

                extracted_text = pytesseract.image_to_string(img, config=custom_config, lang=tess_lang)
            except Exception as e:
                print(f"OCR Error: {e}")
                return jsonify({'error': "OCR Error. Ensure language data for Tesseract is installed."})
        else:
            extracted_text = text_input if text_input else ""

        if not extracted_text.strip():
            return jsonify({'error': "No text found to process."})

        # 3. Multilingual Translation
        translator = GoogleTranslator(source=source_lang, target=target_lang)
        output_text = translator.translate(extracted_text)

        # 4. Generate Audio (gTTS)
        try:
            tts = gTTS(text=output_text, lang=target_lang, slow=False)
            audio_filename = f"audio_{target_lang}.mp3"
            tts.save(os.path.join(STATIC_FOLDER, audio_filename))
            audio_url = f"/static/{audio_filename}"
        except Exception:
            audio_url = None 

        return jsonify({
            'input_text': extracted_text,
            'output_text': output_text,
            'audio_url': audio_url
        })

    except Exception as e:
        print(f"Server Error: {e}")
        return jsonify({'error': str(e)})

if __name__ == '__main__':
    app.run(debug=True)