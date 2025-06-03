from flask import Flask, send_from_directory
import os

app = Flask(__name__)
TEMP_FOLDER = os.path.abspath("temp_images")

@app.route('/temp_images/<filename>')
def serve_temp_image(filename):
    return send_from_directory(TEMP_FOLDER, filename)

if __name__ == '__main__':
    app.run(port=5055)
