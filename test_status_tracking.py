from app import db, User, Issue, StatusChange, IssueStatus, app

def test_status_tracking():
    """
    Test issue status tracking and history functionality
    """
    with app.app_context():
        try:
            # Find an admin user
            admin = User.query.filter_by(username='admin').first()
            
            if not admin:
                print("Admin user not found. Please run the app first to create default users.")
                return
                
            # Find a technician user
            technician = User.query.filter_by(role='technician').first()
            
            if not technician:
                print("Technician user not found. Please run the app first to create default users.")
                return
            
            # Create a test issue
            test_issue = Issue(
                title='Test Status Tracking Issue',
                description='This is a test issue to verify status tracking',
                location='Building A, Room 101',
                status=IssueStatus.PENDING,
                priority='medium',
                reporter_id=admin.id,
                estimated_cost=100.0
            )
            
            print("Creating test issue...")
            db.session.add(test_issue)
            db.session.commit()
            print(f"Created issue with ID: {test_issue.id}")
            
            # Assign to technician and change status to in_progress
            print("\nAssigning issue to technician...")
            test_issue.technician_id = technician.id
            test_issue.update_status(IssueStatus.IN_PROGRESS)
            db.session.commit()
            
            # Change status to scheduled
            print("\nChanging status to SCHEDULED...")
            test_issue.update_status(IssueStatus.SCHEDULED)
            db.session.commit()
            
            # Change status to in_progress again
            print("\nChanging status back to IN_PROGRESS...")
            test_issue.update_status(IssueStatus.IN_PROGRESS)
            db.session.commit()
            
            # Add final cost and complete
            print("\nAdding final cost and completing issue...")
            test_issue.final_cost = 95.50
            test_issue.update_status(IssueStatus.COMPLETED)
            db.session.commit()
            
            # Get and display status history
            status_changes = StatusChange.query.filter_by(issue_id=test_issue.id).order_by(StatusChange.changed_at.desc()).all()
            
            print("\n== Status Change History ==")
            for i, change in enumerate(status_changes):
                changed_by = User.query.get(change.changed_by_id) if change.changed_by_id else None
                changed_by_name = changed_by.username if changed_by else "System"
                
                print(f"{i+1}. {change.old_status} → {change.new_status}")
                print(f"   Changed by: {changed_by_name}")
                print(f"   Changed at: {change.changed_at}")
                print()
            
            print(f"Issue final status: {test_issue.status}")
            print(f"Issue final cost: ${test_issue.final_cost}")
            
            return True
            
        except Exception as e:
            print(f"Error testing status tracking: {e}")
            return False

if __name__ == "__main__":
    test_status_tracking()