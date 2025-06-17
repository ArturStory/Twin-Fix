from flask import Flask, jsonify, request, render_template
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from sqlite_routes import register_sqlite_routes
import os

# Create a Flask application
app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'dev_key_for_testing')

# Register SQLite routes
register_sqlite_routes(app)

# Root route
@app.route('/')
def index():
    return jsonify({"message": "TwinFix API with SQLite is running"})

# Run the application
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)