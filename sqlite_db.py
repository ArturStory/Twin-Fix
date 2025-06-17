import sqlite3
import os
import json
from datetime import datetime

class SQLiteStorage:
    """
    SQLite implementation of storage for Twin Fix application.
    This provides a lightweight database alternative to PostgreSQL.
    """
    def __init__(self, db_path='issues.db'):
        self.db_path = db_path
        self.initialize_db()
    
    def initialize_db(self):
        """Create database tables if they don't exist"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Users table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            email TEXT UNIQUE,
            password TEXT NOT NULL,
            role TEXT NOT NULL
        )
        ''')
        
        # Issues table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS issues (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            location TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            priority TEXT DEFAULT 'medium',
            issue_type TEXT DEFAULT 'other',
            latitude REAL,
            longitude REAL,
            pin_x REAL,
            pin_y REAL,
            is_interior_pin INTEGER,
            reported_by_id INTEGER NOT NULL,
            reported_by_name TEXT NOT NULL,
            estimated_cost REAL DEFAULT 0,
            final_cost REAL,
            fixed_by_id INTEGER,
            fixed_by_name TEXT,
            fixed_at TEXT,
            time_to_fix INTEGER,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (reported_by_id) REFERENCES users(id),
            FOREIGN KEY (fixed_by_id) REFERENCES users(id)
        )
        ''')
        
        # Images table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS images (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL,
            issue_id INTEGER NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE
        )
        ''')
        
        # Comments table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            content TEXT NOT NULL,
            user_id INTEGER NOT NULL,
            user_name TEXT NOT NULL,
            issue_id INTEGER NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE
        )
        ''')
        
        # Status history table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS status_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            issue_id INTEGER NOT NULL,
            old_status TEXT NOT NULL,
            new_status TEXT NOT NULL,
            changed_by_id INTEGER,
            changed_by_name TEXT,
            notes TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE,
            FOREIGN KEY (changed_by_id) REFERENCES users(id)
        )
        ''')
        
        conn.commit()
        conn.close()
    
    # User operations
    def get_user(self, id):
        """Get user by ID"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM users WHERE id = ?', (id,))
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return dict(row)
        return None
    
    def get_user_by_username(self, username):
        """Get user by username"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM users WHERE username = ?', (username,))
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return dict(row)
        return None
    
    def create_user(self, user):
        """Create a new user"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
        INSERT INTO users (username, email, password, role)
        VALUES (?, ?, ?, ?)
        ''', (user['username'], user.get('email'), user['password'], user['role']))
        
        user_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return {**user, 'id': user_id}
    
    # Issue operations
    def get_issues(self):
        """Get all issues"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('''
        SELECT i.*, 
               GROUP_CONCAT(img.filename) as image_filenames
        FROM issues i
        LEFT JOIN images img ON i.id = img.issue_id
        GROUP BY i.id
        ORDER BY i.created_at DESC
        ''')
        
        rows = cursor.fetchall()
        issues = []
        
        for row in dict(row):
            issue = dict(row)
            # Convert image filenames to list or empty list
            if issue['image_filenames']:
                issue['image_urls'] = issue['image_filenames'].split(',')
            else:
                issue['image_urls'] = []
            del issue['image_filenames']
            issues.append(issue)
        
        conn.close()
        return issues
    
    def get_issue(self, id):
        """Get issue by ID"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('''
        SELECT i.*, 
               GROUP_CONCAT(img.filename) as image_filenames
        FROM issues i
        LEFT JOIN images img ON i.id = img.issue_id
        WHERE i.id = ?
        GROUP BY i.id
        ''', (id,))
        
        row = cursor.fetchone()
        conn.close()
        
        if row:
            issue = dict(row)
            # Convert image filenames to list or empty list
            if issue['image_filenames']:
                issue['image_urls'] = issue['image_filenames'].split(',')
            else:
                issue['image_urls'] = []
            del issue['image_filenames']
            return issue
        return None
    
    def create_issue(self, issue):
        """Create a new issue"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        now = datetime.utcnow().isoformat()
        
        cursor.execute('''
        INSERT INTO issues (
            title, description, location, status, priority, issue_type,
            latitude, longitude, pin_x, pin_y, is_interior_pin,
            reported_by_id, reported_by_name, estimated_cost,
            created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            issue['title'], issue['description'], issue['location'],
            issue.get('status', 'pending'), issue.get('priority', 'medium'), issue.get('issueType', 'other'),
            issue.get('latitude'), issue.get('longitude'), issue.get('pinX'), issue.get('pinY'), issue.get('isInteriorPin'),
            issue['reportedById'], issue['reportedByName'], issue.get('estimatedCost', 0),
            now, now
        ))
        
        issue_id = cursor.lastrowid
        
        # Add images if provided
        if 'imageUrls' in issue and issue['imageUrls']:
            for url in issue['imageUrls']:
                cursor.execute('''
                INSERT INTO images (filename, issue_id, created_at)
                VALUES (?, ?, ?)
                ''', (url, issue_id, now))
        
        conn.commit()
        conn.close()
        
        return self.get_issue(issue_id)
    
    def update_issue(self, id, update_data):
        """Update an existing issue"""
        issue = self.get_issue(id)
        if not issue:
            return None
            
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Build the SET part of the SQL statement dynamically
        set_parts = []
        params = []
        
        # Map frontend field names to database field names
        field_mapping = {
            'title': 'title',
            'description': 'description',
            'location': 'location',
            'status': 'status',
            'priority': 'priority',
            'issueType': 'issue_type',
            'latitude': 'latitude',
            'longitude': 'longitude',
            'pinX': 'pin_x',
            'pinY': 'pin_y',
            'isInteriorPin': 'is_interior_pin',
            'estimatedCost': 'estimated_cost',
            'finalCost': 'final_cost'
        }
        
        for key, value in update_data.items():
            if key in field_mapping:
                set_parts.append(f"{field_mapping[key]} = ?")
                params.append(value)
        
        # Always update the updated_at timestamp
        set_parts.append("updated_at = ?")
        params.append(datetime.utcnow().isoformat())
        
        # Add the issue ID to the parameters
        params.append(id)
        
        # Construct and execute the SQL statement
        sql = f"UPDATE issues SET {', '.join(set_parts)} WHERE id = ?"
        cursor.execute(sql, params)
        
        conn.commit()
        conn.close()
        
        return self.get_issue(id)
    
    def delete_issue(self, id):
        """Delete an issue"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('DELETE FROM issues WHERE id = ?', (id,))
        deleted = cursor.rowcount > 0
        
        conn.commit()
        conn.close()
        
        return deleted
    
    def get_nearby_issues(self, lat, lng, radius):
        """
        Get issues near a geographical point
        This is a simple implementation using SQLite (limited geo capabilities)
        """
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Simple distance calculation
        cursor.execute('''
        SELECT i.*,
               GROUP_CONCAT(img.filename) as image_filenames
        FROM issues i
        LEFT JOIN images img ON i.id = img.issue_id
        WHERE i.latitude IS NOT NULL AND i.longitude IS NOT NULL
        GROUP BY i.id
        ''')
        
        rows = cursor.fetchall()
        conn.close()
        
        # Filter in Python (SQLite doesn't have geo functions)
        issues = []
        for row in rows:
            issue = dict(row)
            # Calculate approximate distance (not accounting for Earth's curvature)
            if issue['latitude'] and issue['longitude']:
                distance = ((float(issue['latitude']) - float(lat))**2 + 
                           (float(issue['longitude']) - float(lng))**2)**0.5
                # Convert to approximate kilometers (very rough approximation)
                distance_km = distance * 111  # 1 degree is roughly 111 km
                
                if distance_km <= float(radius):
                    # Convert image filenames to list or empty list
                    if issue['image_filenames']:
                        issue['image_urls'] = issue['image_filenames'].split(',')
                    else:
                        issue['image_urls'] = []
                    del issue['image_filenames']
                    issues.append(issue)
        
        return issues
    
    # Comment operations
    def get_comments(self, issue_id):
        """Get comments for an issue"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('''
        SELECT * FROM comments
        WHERE issue_id = ?
        ORDER BY created_at ASC
        ''', (issue_id,))
        
        rows = cursor.fetchall()
        conn.close()
        
        return [dict(row) for row in rows]
    
    def create_comment(self, comment):
        """Create a new comment"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        now = datetime.utcnow().isoformat()
        
        cursor.execute('''
        INSERT INTO comments (content, user_id, user_name, issue_id, created_at)
        VALUES (?, ?, ?, ?, ?)
        ''', (
            comment['content'], comment['userId'], comment['userName'],
            comment['issueId'], now
        ))
        
        comment_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        # Get the created comment
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM comments WHERE id = ?', (comment_id,))
        row = cursor.fetchone()
        conn.close()
        
        return dict(row) if row else None
    
    # Image operations
    def get_image(self, id):
        """Get image by ID"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM images WHERE id = ?', (id,))
        row = cursor.fetchone()
        conn.close()
        
        return dict(row) if row else None
    
    def get_images_by_issue_id(self, issue_id):
        """Get all images for an issue"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM images WHERE issue_id = ?', (issue_id,))
        rows = cursor.fetchall()
        conn.close()
        
        return [dict(row) for row in rows]
    
    def create_image(self, image):
        """Add an image to an issue"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        now = datetime.utcnow().isoformat()
        
        cursor.execute('''
        INSERT INTO images (filename, issue_id, created_at)
        VALUES (?, ?, ?)
        ''', (image['filename'], image['issueId'], now))
        
        image_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return self.get_image(image_id)
    
    # Status history operations
    def get_status_history(self, issue_id):
        """Get status change history for an issue"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('''
        SELECT * FROM status_history
        WHERE issue_id = ?
        ORDER BY created_at DESC
        ''', (issue_id,))
        
        rows = cursor.fetchall()
        conn.close()
        
        return [dict(row) for row in rows]
    
    def create_status_history(self, history):
        """Record a status change in history"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        now = datetime.utcnow().isoformat()
        
        cursor.execute('''
        INSERT INTO status_history (
            issue_id, old_status, new_status, 
            changed_by_id, changed_by_name, notes, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            history['issueId'], history['oldStatus'], history['newStatus'],
            history.get('changedById'), history.get('changedByName'),
            history.get('notes'), now
        ))
        
        history_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        # Get the created history record
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM status_history WHERE id = ?', (history_id,))
        row = cursor.fetchone()
        conn.close()
        
        return dict(row) if row else None
    
    # Status filtering operations
    def get_issues_by_status(self, status):
        """Get issues filtered by status"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('''
        SELECT i.*,
               GROUP_CONCAT(img.filename) as image_filenames
        FROM issues i
        LEFT JOIN images img ON i.id = img.issue_id
        WHERE i.status = ?
        GROUP BY i.id
        ORDER BY i.created_at DESC
        ''', (status,))
        
        rows = cursor.fetchall()
        issues = []
        
        for row in rows:
            issue = dict(row)
            # Convert image filenames to list or empty list
            if issue['image_filenames']:
                issue['image_urls'] = issue['image_filenames'].split(',')
            else:
                issue['image_urls'] = []
            del issue['image_filenames']
            issues.append(issue)
        
        conn.close()
        return issues
    
    def get_issues_by_type(self, issue_type):
        """Get issues filtered by type"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('''
        SELECT i.*,
               GROUP_CONCAT(img.filename) as image_filenames
        FROM issues i
        LEFT JOIN images img ON i.id = img.issue_id
        WHERE i.issue_type = ?
        GROUP BY i.id
        ORDER BY i.created_at DESC
        ''', (issue_type,))
        
        rows = cursor.fetchall()
        issues = []
        
        for row in rows:
            issue = dict(row)
            # Convert image filenames to list or empty list
            if issue['image_filenames']:
                issue['image_urls'] = issue['image_filenames'].split(',')
            else:
                issue['image_urls'] = []
            del issue['image_filenames']
            issues.append(issue)
        
        conn.close()
        return issues
    
    def update_issue_status(self, id, new_status, changed_by_id=None, changed_by_name=None, notes=None):
        """Update an issue's status and record the change in history"""
        issue = self.get_issue(id)
        if not issue:
            return None
            
        old_status = issue['status']
        
        # If status hasn't changed, return the issue as is
        if old_status == new_status:
            return issue
            
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        now = datetime.utcnow().isoformat()
        
        # Update the issue's status
        cursor.execute('''
        UPDATE issues
        SET status = ?, updated_at = ?
        WHERE id = ?
        ''', (new_status, now, id))
        
        # Record the status change in history
        cursor.execute('''
        INSERT INTO status_history (
            issue_id, old_status, new_status, 
            changed_by_id, changed_by_name, notes, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (id, old_status, new_status, changed_by_id, changed_by_name, notes, now))
        
        # If the issue is marked as fixed, update fixed_at and time_to_fix
        if new_status == 'fixed':
            fixed_at = now
            
            # Calculate time to fix (in minutes)
            created_timestamp = datetime.fromisoformat(issue['created_at'])
            fixed_timestamp = datetime.fromisoformat(fixed_at)
            time_to_fix = int((fixed_timestamp - created_timestamp).total_seconds() / 60)
            
            cursor.execute('''
            UPDATE issues
            SET fixed_at = ?, time_to_fix = ?, fixed_by_id = ?, fixed_by_name = ?
            WHERE id = ?
            ''', (fixed_at, time_to_fix, changed_by_id, changed_by_name, id))
        
        conn.commit()
        conn.close()
        
        return self.get_issue(id)
    
    def mark_issue_as_fixed(self, id, fixed_by_id, fixed_by_name, notes=None):
        """Mark an issue as fixed"""
        return self.update_issue_status(id, 'fixed', fixed_by_id, fixed_by_name, notes)
    
    def get_issue_statistics(self, issue_type=None):
        """Get statistics about issues"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Base query parts
        base_select = "COUNT(*) as count"
        base_from = "issues"
        base_where = ""
        params = []
        
        # Add filter by issue_type if provided
        if issue_type:
            base_where = "WHERE issue_type = ?"
            params.append(issue_type)
        
        # Total issues count
        cursor.execute(f"SELECT {base_select} FROM {base_from} {base_where}", params)
        total_issues = cursor.fetchone()[0]
        
        # Open issues count (not fixed)
        where_clause = "WHERE status != 'fixed'"
        if issue_type:
            where_clause += " AND issue_type = ?"
        
        cursor.execute(f"SELECT COUNT(*) FROM {base_from} {where_clause}", params if issue_type else [])
        open_issues = cursor.fetchone()[0]
        
        # Fixed issues count
        where_clause = "WHERE status = 'fixed'"
        if issue_type:
            where_clause += " AND issue_type = ?"
        
        cursor.execute(f"SELECT COUNT(*) FROM {base_from} {where_clause}", params if issue_type else [])
        fixed_issues = cursor.fetchone()[0]
        
        # Average fix time (for fixed issues)
        where_clause = "WHERE status = 'fixed' AND time_to_fix IS NOT NULL"
        if issue_type:
            where_clause += " AND issue_type = ?"
        
        cursor.execute(f"SELECT AVG(time_to_fix) FROM {base_from} {where_clause}", params if issue_type else [])
        avg_fix_time = cursor.fetchone()[0]
        
        # Most reported location
        group_clause = "GROUP BY location"
        order_clause = "ORDER BY COUNT(*) DESC LIMIT 1"
        
        location_where = base_where if base_where else "WHERE 1=1"
        cursor.execute(f"SELECT location, COUNT(*) as count FROM {base_from} {location_where} {group_clause} {order_clause}", params)
        location_row = cursor.fetchone()
        most_reported_location = location_row[0] if location_row else None
        
        # Last fix date
        where_clause = "WHERE status = 'fixed' AND fixed_at IS NOT NULL"
        if issue_type:
            where_clause += " AND issue_type = ?"
        
        cursor.execute(f"SELECT fixed_at FROM {base_from} {where_clause} ORDER BY fixed_at DESC LIMIT 1", params if issue_type else [])
        last_fix_row = cursor.fetchone()
        last_fix_date = last_fix_row[0] if last_fix_row else None
        
        conn.close()
        
        return {
            "totalIssues": total_issues,
            "openIssues": open_issues,
            "fixedIssues": fixed_issues,
            "averageFixTime": avg_fix_time,
            "mostReportedLocation": most_reported_location,
            "lastFixDate": last_fix_date
        }


# Initialize SQLite storage with default database path
sqlite_storage = SQLiteStorage()

# Example usage:
if __name__ == "__main__":
    # Test the SQLite storage
    print("Testing SQLite storage")
    
    # Create a test user
    test_user = {
        "username": "test_user",
        "email": "test@example.com",
        "password": "hashed_password",
        "role": "reporter"
    }
    
    # Check if user already exists
    existing_user = sqlite_storage.get_user_by_username("test_user")
    if not existing_user:
        # Create the user
        created_user = sqlite_storage.create_user(test_user)
        print(f"Created user: {created_user}")
    else:
        print(f"User already exists: {existing_user}")
    
    # Create a test issue
    test_issue = {
        "title": "Test Issue",
        "description": "This is a test issue created from SQLite storage",
        "location": "Test Location",
        "status": "pending",
        "priority": "medium",
        "issueType": "other",
        "reportedById": 1,
        "reportedByName": "Test User",
        "estimatedCost": 100
    }
    
    created_issue = sqlite_storage.create_issue(test_issue)
    print(f"Created issue: {created_issue}")
    
    # Update the issue status
    updated_issue = sqlite_storage.update_issue_status(
        created_issue['id'], 
        'in_progress', 
        changed_by_id=1, 
        changed_by_name="Test User", 
        notes="Started working on this"
    )
    print(f"Updated issue status: {updated_issue}")
    
    # Get status history
    history = sqlite_storage.get_status_history(created_issue['id'])
    print(f"Status history: {history}")
    
    # Mark as fixed
    fixed_issue = sqlite_storage.mark_issue_as_fixed(
        created_issue['id'],
        fixed_by_id=1,
        fixed_by_name="Test User",
        notes="Issue fixed successfully"
    )
    print(f"Fixed issue: {fixed_issue}")
    
    # Get updated status history
    updated_history = sqlite_storage.get_status_history(created_issue['id'])
    print(f"Updated status history: {updated_history}")
    
    # Get statistics
    stats = sqlite_storage.get_issue_statistics()
    print(f"Statistics: {stats}")