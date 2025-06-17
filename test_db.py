from app import db, User, Issue

# Function to test database connection
def test_db_connection():
    try:
        # Try to execute a simple query
        result = db.session.execute(db.select(User)).scalars().all()
        print(f"Database connection successful. Found {len(result)} users.")
        return True
    except Exception as e:
        print(f"Database connection error: {e}")
        return False

# Function to test issue creation
def test_create_issue():
    try:
        # Get admin user (user ID 1)
        admin = User.query.filter_by(username='admin').first()
        
        if not admin:
            print("Admin user not found. Creating test user...")
            from werkzeug.security import generate_password_hash
            admin = User(
                username='admin',
                email='admin@example.com',
                password=generate_password_hash('admin'),
                role='admin'
            )
            db.session.add(admin)
            db.session.commit()
            print(f"Created admin user with ID: {admin.id}")
        
        # Create a test issue
        test_issue = Issue(
            title='Test Database Issue',
            description='This is a test issue to verify database connectivity',
            location='Test Location',
            status='pending',
            priority='medium',
            reporter_id=admin.id
        )
        
        db.session.add(test_issue)
        db.session.commit()
        
        print(f"Successfully created test issue with ID: {test_issue.id}")
        return True
    except Exception as e:
        print(f"Error creating test issue: {e}")
        return False

# Run the tests
if __name__ == '__main__':
    from app import app
    
    with app.app_context():
        print("=== Testing Database Connection ===")
        if test_db_connection():
            print("\n=== Testing Issue Creation ===")
            test_create_issue()