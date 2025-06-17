from flask import Blueprint, jsonify, request
from sqlite_db import sqlite_storage
import os
from datetime import datetime

# Create a Blueprint for SQLite routes
sqlite_bp = Blueprint('sqlite', __name__)

# User routes
@sqlite_bp.route('/users/<int:id>', methods=['GET'])
def get_user(id):
    """Get user by ID"""
    user = sqlite_storage.get_user(id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify(user)

@sqlite_bp.route('/users/by-username/<username>', methods=['GET'])
def get_user_by_username(username):
    """Get user by username"""
    user = sqlite_storage.get_user_by_username(username)
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify(user)

@sqlite_bp.route('/users', methods=['POST'])
def create_user():
    """Create a new user"""
    data = request.json
    if not data:
        return jsonify({"error": "Invalid request data"}), 400
    
    # Validate required fields
    required_fields = ['username', 'password', 'role']
    for field in required_fields:
        if field not in data:
            return jsonify({"error": f"Missing required field: {field}"}), 400
    
    # Check if username already exists
    existing_user = sqlite_storage.get_user_by_username(data['username'])
    if existing_user:
        return jsonify({"error": "Username already exists"}), 409
    
    # Create the user
    user = sqlite_storage.create_user(data)
    return jsonify(user), 201

# Issue routes
@sqlite_bp.route('/issues', methods=['GET'])
def get_issues():
    """Get all issues"""
    issues = sqlite_storage.get_issues()
    return jsonify(issues)

@sqlite_bp.route('/issues/<int:id>', methods=['GET'])
def get_issue(id):
    """Get issue by ID"""
    issue = sqlite_storage.get_issue(id)
    if not issue:
        return jsonify({"error": "Issue not found"}), 404
    return jsonify(issue)

@sqlite_bp.route('/issues', methods=['POST'])
def create_issue():
    """Create a new issue"""
    data = request.json
    if not data:
        return jsonify({"error": "Invalid request data"}), 400
    
    # Validate required fields
    required_fields = ['title', 'description', 'location', 'reportedById', 'reportedByName']
    for field in required_fields:
        if field not in data:
            return jsonify({"error": f"Missing required field: {field}"}), 400
    
    # Create the issue
    issue = sqlite_storage.create_issue(data)
    return jsonify(issue), 201

@sqlite_bp.route('/issues/<int:id>', methods=['PATCH'])
def update_issue(id):
    """Update an existing issue"""
    data = request.json
    if not data:
        return jsonify({"error": "Invalid request data"}), 400
    
    # Update the issue
    issue = sqlite_storage.update_issue(id, data)
    if not issue:
        return jsonify({"error": "Issue not found"}), 404
    
    return jsonify(issue)

@sqlite_bp.route('/issues/<int:id>', methods=['DELETE'])
def delete_issue(id):
    """Delete an issue"""
    success = sqlite_storage.delete_issue(id)
    if not success:
        return jsonify({"error": "Issue not found"}), 404
    
    return jsonify({"message": f"Issue {id} deleted successfully"})

@sqlite_bp.route('/issues/nearby', methods=['GET'])
def get_nearby_issues():
    """Get issues near a geographical point"""
    lat = request.args.get('lat')
    lng = request.args.get('lng')
    radius = request.args.get('radius', 5)  # Default 5km radius
    
    if not lat or not lng:
        return jsonify({"error": "Missing latitude or longitude parameters"}), 400
    
    issues = sqlite_storage.get_nearby_issues(float(lat), float(lng), float(radius))
    return jsonify(issues)

# Comments routes
@sqlite_bp.route('/issues/<int:issue_id>/comments', methods=['GET'])
def get_comments(issue_id):
    """Get comments for an issue"""
    comments = sqlite_storage.get_comments(issue_id)
    return jsonify(comments)

@sqlite_bp.route('/issues/<int:issue_id>/comments', methods=['POST'])
def create_comment(issue_id):
    """Create a new comment on an issue"""
    data = request.json
    if not data:
        return jsonify({"error": "Invalid request data"}), 400
    
    # Validate required fields
    required_fields = ['content', 'userId', 'userName']
    for field in required_fields:
        if field not in data:
            return jsonify({"error": f"Missing required field: {field}"}), 400
    
    # Add issue ID to the data
    data['issueId'] = issue_id
    
    # Create the comment
    comment = sqlite_storage.create_comment(data)
    return jsonify(comment), 201

# Images routes
@sqlite_bp.route('/issues/<int:issue_id>/images', methods=['GET'])
def get_images(issue_id):
    """Get images for an issue"""
    images = sqlite_storage.get_images_by_issue_id(issue_id)
    return jsonify(images)

# Status history routes
@sqlite_bp.route('/issues/<int:issue_id>/status-history', methods=['GET'])
def get_status_history(issue_id):
    """Get status change history for an issue"""
    history = sqlite_storage.get_status_history(issue_id)
    return jsonify(history)

# Status update routes
@sqlite_bp.route('/issues/<int:id>/status', methods=['PATCH'])
def update_issue_status(id):
    """Update an issue's status"""
    data = request.json
    if not data or 'status' not in data:
        return jsonify({"error": "Missing status field"}), 400
    
    new_status = data['status']
    changed_by_id = data.get('changedById')
    changed_by_name = data.get('changedByName')
    notes = data.get('notes')
    
    issue = sqlite_storage.update_issue_status(id, new_status, changed_by_id, changed_by_name, notes)
    if not issue:
        return jsonify({"error": "Issue not found"}), 404
    
    return jsonify(issue)

@sqlite_bp.route('/issues/<int:id>/fix', methods=['POST'])
def mark_issue_as_fixed(id):
    """Mark an issue as fixed"""
    data = request.json
    if not data:
        return jsonify({"error": "Invalid request data"}), 400
    
    fixed_by_id = data.get('fixedById')
    fixed_by_name = data.get('fixedByName')
    notes = data.get('notes')
    
    if not fixed_by_id or not fixed_by_name:
        return jsonify({"error": "Missing required fields for marking issue as fixed"}), 400
    
    issue = sqlite_storage.mark_issue_as_fixed(id, fixed_by_id, fixed_by_name, notes)
    if not issue:
        return jsonify({"error": "Issue not found"}), 404
    
    return jsonify(issue)

# Filtered issue routes
@sqlite_bp.route('/issues/by-status/<status>', methods=['GET'])
def get_issues_by_status(status):
    """Get issues filtered by status"""
    issues = sqlite_storage.get_issues_by_status(status)
    return jsonify(issues)

@sqlite_bp.route('/issues/by-type/<issue_type>', methods=['GET'])
def get_issues_by_type(issue_type):
    """Get issues filtered by type"""
    issues = sqlite_storage.get_issues_by_type(issue_type)
    return jsonify(issues)

# Statistics routes
@sqlite_bp.route('/statistics', methods=['GET'])
def get_statistics():
    """Get statistics about issues"""
    issue_type = request.args.get('type')
    stats = sqlite_storage.get_issue_statistics(issue_type)
    
    # For UI compatibility, add community members count (this would come from a proper users table)
    stats["communityMembers"] = 156
    
    # Add resolved issues count for backward compatibility
    stats["resolvedIssues"] = stats["fixedIssues"]
    
    # Add cost information
    stats["totalCost"] = 0  # This would need to be calculated from actual data
    stats["estimatedCost"] = 0  # This would need to be calculated from actual data
    
    return jsonify(stats)

# Function to register the blueprint with a Flask app
def register_sqlite_routes(app):
    app.register_blueprint(sqlite_bp, url_prefix='/api')