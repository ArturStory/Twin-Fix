#!/bin/bash

# Create tables and setup initial data
python create_tables.py

# Start the Flask application
echo "Starting Flask application on port 5050..."
python app.py