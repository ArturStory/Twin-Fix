// Twin Fix - Main JavaScript file

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Bootstrap tooltips
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Initialize Bootstrap popovers
    var popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    var popoverList = popoverTriggerList.map(function (popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl);
    });

    // Auto-dismiss alerts
    setTimeout(function() {
        var alerts = document.querySelectorAll('.alert:not(.alert-permanent)');
        alerts.forEach(function(alert) {
            var bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        });
    }, 5000); // Close after 5 seconds

    // Handle status filter buttons
    var statusFilterButtons = document.querySelectorAll('[data-filter]');
    statusFilterButtons.forEach(function(button) {
        button.addEventListener('click', function() {
            var filter = this.getAttribute('data-filter');
            var table = document.getElementById('issuesTable');
            
            if (table) {
                var rows = table.querySelectorAll('tbody tr');
                
                rows.forEach(function(row) {
                    if (filter === 'all' || row.getAttribute('data-status') === filter) {
                        row.style.display = '';
                    } else {
                        row.style.display = 'none';
                    }
                });
                
                // Update active state on buttons
                statusFilterButtons.forEach(function(btn) {
                    btn.classList.remove('active');
                });
                this.classList.add('active');
            }
        });
    });

    // Confirm delete actions
    var deleteButtons = document.querySelectorAll('.btn-delete, [data-confirm]');
    deleteButtons.forEach(function(button) {
        button.addEventListener('click', function(e) {
            var message = this.getAttribute('data-confirm-message') || 'Are you sure you want to delete this item? This action cannot be undone.';
            if (!confirm(message)) {
                e.preventDefault();
                return false;
            }
        });
    });

    // Image preview for file inputs
    var imageInputs = document.querySelectorAll('input[type="file"][accept*="image"]');
    imageInputs.forEach(function(input) {
        input.addEventListener('change', function() {
            var previewContainer = document.getElementById(this.getAttribute('data-preview') || 'imagePreview');
            if (!previewContainer) return;
            
            previewContainer.innerHTML = '';
            
            if (this.files && this.files.length > 0) {
                for (var i = 0; i < this.files.length; i++) {
                    if (i >= 5) break; // Limit to 5 previews
                    
                    (function(file) {
                        if (!file.type.match('image.*')) return;
                        
                        var reader = new FileReader();
                        reader.onload = function(e) {
                            var preview = document.createElement('div');
                            preview.className = 'image-preview';
                            
                            var img = document.createElement('img');
                            img.src = e.target.result;
                            img.className = 'img-thumbnail';
                            
                            preview.appendChild(img);
                            previewContainer.appendChild(preview);
                        };
                        
                        reader.readAsDataURL(file);
                    })(this.files[i]);
                }
            }
        });
    });

    // Handle issue priority
    var urgentCheckbox = document.getElementById('urgent');
    var prioritySelect = document.getElementById('priority');
    
    if (urgentCheckbox && prioritySelect) {
        urgentCheckbox.addEventListener('change', function() {
            if (this.checked) {
                prioritySelect.value = 'high';
                prioritySelect.disabled = true;
            } else {
                prioritySelect.disabled = false;
            }
        });
    }

    // Add current year to footer
    var yearElements = document.querySelectorAll('.current-year');
    var currentYear = new Date().getFullYear();
    yearElements.forEach(function(element) {
        element.textContent = currentYear;
    });
});