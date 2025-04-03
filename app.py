from flask import Flask, request, jsonify, render_template, redirect, abort
import os
import re
import time
import json
import cloudinary
import cloudinary.uploader
import cloudinary.api
import requests
from collections import defaultdict
from itertools import zip_longest
import logging
from dotenv import load_dotenv
from threading import Lock
from io import StringIO

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')

# Initialize Flask app
app = Flask(__name__, static_folder='./static', static_url_path='/static', template_folder='./templates')

# Verify if index.html exists
index_path = os.path.join(app.template_folder, 'index.html')
if not os.path.exists(index_path):
    raise RuntimeError(f"Template file 'index.html' not found at {index_path}")

# Verify required environment variables
required_env_vars = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']
missing_vars = [var for var in required_env_vars if not os.getenv(var)]

if missing_vars:
    raise RuntimeError(f"Missing required environment variables: {', '.join(missing_vars)}")

# Cloudinary Configuration
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True
)

# Lock for thread-safe operations
save_lock = Lock()

# Custom template filters
def batch(iterable, n):
    args = [iter(iterable)] * n
    return zip_longest(*args, fillvalue=None)

app.jinja_env.filters['batch'] = batch

def slugify(value):
    return re.sub(r'\W+', '-', value).strip('-').lower()

app.jinja_env.filters['slugify'] = slugify

def validate_mobile_data(data):
    """Validate mobile data structure"""
    required_fields = [
        'brand', 'model', 'price', 'processor',
        'ram', 'storage', 'battery', 
        'back_camera', 'selfie_camera', 'photo'
    ]
    return all(field in data for field in required_fields)

def clean_mobile_data(data):
    """Clean and standardize mobile data"""
    cleaned = {}
    for key, value in data.items():
        if isinstance(value, str):
            cleaned[key] = value.strip()
        else:
            cleaned[key] = str(value).strip()
    return cleaned

def load_mobile_data():
    """Load mobile data from Cloudinary as text (JSON)"""
    try:
        result = cloudinary.api.resource("uploads.json", resource_type="raw")
        file_url = result.get("secure_url")
        if file_url:
            response = requests.get(file_url)
            response.raise_for_status()
            try:
                data = json.loads(response.text)  # Load from text, not response.json()
            except json.JSONDecodeError:
                logging.error("Failed to decode JSON data, initializing new list")
                return []

            if not isinstance(data, list):
                logging.warning("Invalid data format, initializing new list")
                return []

            valid_data = []
            for item in data:
                if validate_mobile_data(item):
                    valid_data.append(clean_mobile_data(item))
            return valid_data
        return []
    except cloudinary.exceptions.NotFound:
        logging.info("No existing data found, starting fresh")
        return []
    except Exception as e:
        logging.error(f"Error loading mobile data: {e}")
        return []

def save_mobile_data(data):
    """Save mobile data to Cloudinary as text (JSON)"""
    try:
        if not isinstance(data, list):
            raise ValueError("Data must be a list")

        valid_data = [clean_mobile_data(item) for item in data if validate_mobile_data(item)]
        json_str = json.dumps(valid_data, indent=2, ensure_ascii=False)
        json_file = StringIO(json_str)

        with save_lock:
            result = cloudinary.uploader.upload(
                json_file,
                resource_type="raw",
                public_id="uploads.json",
                overwrite=True,
                invalidate=True,
                format="json"
            )

        logging.info("Mobile data saved successfully")
        return result
    except ValueError as ve:
        logging.error(f"Validation error: {ve}")
        raise RuntimeError(f"Validation error: {str(ve)}")
    except Exception as e:
        logging.error(f"Error saving mobile data: {e}", exc_info=True)
        raise RuntimeError(f"Failed to save data: {str(e)}")

@app.route('/')
def home():
    """Home page showing all mobiles grouped by brand"""
    try:
        mobiles = load_mobile_data()
        grouped_mobiles = defaultdict(list)
        for mobile in mobiles:
            grouped_mobiles[mobile['brand']].append(mobile)
        sorted_brands = dict(sorted(grouped_mobiles.items()))
        return render_template('index.html', grouped_mobiles=sorted_brands)
    except Exception as e:
        logging.error(f"Error loading home page: {e}")
        return render_template('error.html', error="Failed to load mobile data"), 500

@app.route('/admin')
def admin():
    """Admin page for uploading new mobiles"""
    return render_template('admin.html')

def allowed_file(filename):
    """Check if file extension is valid"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in {'png', 'jpg', 'jpeg', 'gif'}

@app.route('/upload_mobile', methods=['POST'])
def upload_mobile():
    """Handle mobile data upload with validation"""
    try:
        required_fields = [
            'brand', 'model', 'price', 'processor',
            'ram', 'storage', 'battery', 
            'back_camera', 'selfie_camera'
        ]
        mobile_data = {field: request.form.get(field, '').strip() for field in required_fields}
        if not all(mobile_data.values()):
            return jsonify({'error': 'All fields are required'}), 400
        photo = request.files.get('photo')
        if not photo or photo.filename == '':
            return jsonify({'error': 'Photo is required'}), 400
        if not allowed_file(photo.filename):
            return jsonify({'error': 'Only PNG, JPG, and JPEG files are allowed'}), 400
        timestamp = str(int(time.time()))
        upload_result = cloudinary.uploader.upload(
            photo,
            public_id=f"mobiles/{timestamp}_{photo.filename.replace(' ', '_')}",
            folder="mobiles",
            allowed_formats=['jpg', 'jpeg', 'png']
        )
        mobile_data['photo'] = upload_result.get("secure_url")
        existing_data = load_mobile_data()
        existing_data.append(clean_mobile_data(mobile_data))
        try:
            save_mobile_data(existing_data)
        except RuntimeError as e:
            return jsonify({'error': str(e)}), 500
        return jsonify({
            'message': 'Mobile uploaded successfully!',
            'data': mobile_data
        }), 200
    except Exception as e:
        logging.error(f"Upload error: {e}", exc_info=True)
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    if filename.startswith(('http://', 'https://')):
        return redirect(filename)
    cloudinary_url = f"https://res.cloudinary.com/{cloudinary.config().cloud_name}/image/upload/{filename}"
    return redirect(cloudinary_url)

#Vercel needs this line.
application = app

if __name__ == "__main__":
    try:
        # Run the Flask app
        app.run(host="0.0.0.0", port=5000, debug=True)
    except Exception as e:
        logging.error(f"Failed to start the application: {e}", exc_info=True)