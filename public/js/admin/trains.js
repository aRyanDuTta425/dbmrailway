// DOM Elements
const trainsTable = document.getElementById('trainsTable').getElementsByTagName('tbody')[0];
const trainModal = new bootstrap.Modal(document.getElementById('trainModal'));
const trainForm = document.getElementById('trainForm');
const trainId = document.getElementById('trainId');
const trainName = document.getElementById('trainName');
const trainType = document.getElementById('trainType');
const totalSeats = document.getElementById('totalSeats');
const farePerKm = document.getElementById('farePerKm');
const isActive = document.getElementById('isActive');
const compartmentsList = document.getElementById('compartmentsList');
const addCompartmentBtn = document.getElementById('addCompartmentBtn');
const compartmentTemplate = document.getElementById('compartmentTemplate');

// Initialize the page
document.addEventListener('DOMContentLoaded', async () => {
    await loadTrains();
    await loadTrainTypes();
    await loadTrainClasses();
});

// Load trains
async function loadTrains() {
    try {
        const response = await fetch('/api/admin/trains');
        const trains = await response.json();
        
        displayTrains(trains);
    } catch (error) {
        console.error('Error loading trains:', error);
        showAlert('Error loading trains', 'danger');
    }
}

// Display trains in the table
function displayTrains(trains) {
    trainsTable.innerHTML = '';
    
    trains.forEach(train => {
        const row = trainsTable.insertRow();
        row.innerHTML = `
            <td>${train.train_id}</td>
            <td>${train.train_name}</td>
            <td>${train.type_name}</td>
            <td>${train.total_seats}</td>
            <td>₹${train.fare_per_km}</td>
            <td>${getStatusBadge(train.is_active)}</td>
            <td>
                <button class="btn btn-info btn-sm" onclick="editTrain(${train.train_id})">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-danger btn-sm" onclick="deleteTrain(${train.train_id})">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;
    });
}

// Load train types
async function loadTrainTypes() {
    try {
        const response = await fetch('/api/train-types');
        const types = await response.json();
        
        trainType.innerHTML = '<option value="">Select Type</option>';
        types.forEach(type => {
            const option = document.createElement('option');
            option.value = type.type_id;
            option.textContent = type.type_name;
            trainType.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading train types:', error);
        showAlert('Error loading train types', 'danger');
    }
}

// Load train classes
async function loadTrainClasses() {
    try {
        const response = await fetch('/api/train-classes');
        const classes = await response.json();
        
        // Update all class select elements
        document.querySelectorAll('.compartment-class').forEach(select => {
            select.innerHTML = '<option value="">Select Class</option>';
            classes.forEach(trainClass => {
                const option = document.createElement('option');
                option.value = trainClass.class_id;
                option.textContent = trainClass.class_name;
                select.appendChild(option);
            });
        });
    } catch (error) {
        console.error('Error loading train classes:', error);
        showAlert('Error loading train classes', 'danger');
    }
}

// Add new compartment
addCompartmentBtn.addEventListener('click', () => {
    const compartment = compartmentTemplate.content.cloneNode(true);
    compartmentsList.appendChild(compartment);
    loadTrainClasses(); // Reload classes for the new select
});

// Remove compartment
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-compartment')) {
        e.target.closest('.compartment-item').remove();
    }
});

// Edit train
async function editTrain(trainId) {
    try {
        const response = await fetch(`/api/admin/trains/${trainId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch train details');
        }
        
        const data = await response.json();
        const train = data.train; // Extract train data from the nested structure
        
        // Populate form
        document.getElementById('trainModalTitle').textContent = 'Edit Train';
        document.getElementById('trainId').value = train.train_id;
        trainName.value = train.train_name;
        trainType.value = train.train_type;
        totalSeats.value = train.total_seats;
        farePerKm.value = train.fare_per_km;
        isActive.checked = train.is_active;
        
        // Load compartments
        compartmentsList.innerHTML = '';
        if (data.compartments && Array.isArray(data.compartments)) {
            data.compartments.forEach(compartment => {
                const compartmentElement = compartmentTemplate.content.cloneNode(true);
                const item = compartmentElement.querySelector('.compartment-item');
                
                item.querySelector('.compartment-class').value = compartment.class_id;
                item.querySelector('.compartment-number').value = compartment.compartment_number;
                item.querySelector('.compartment-seats').value = compartment.total_seats;
                
                compartmentsList.appendChild(compartmentElement);
            });
        }
        
        loadTrainClasses(); // Reload classes for all selects
        trainModal.show();
    } catch (error) {
        console.error('Error loading train details:', error);
        showAlert('Error loading train details: ' + error.message, 'danger');
    }
}

// Delete train
async function deleteTrain(trainId) {
    if (!confirm('Are you sure you want to delete this train?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/trains/${trainId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error('Failed to delete train');
        }
        
        showAlert('Train deleted successfully', 'success');
        await loadTrains();
    } catch (error) {
        console.error('Error deleting train:', error);
        showAlert('Error deleting train', 'danger');
    }
}

// Handle form submission
document.getElementById('saveTrainBtn').addEventListener('click', async () => {
    try {
        const compartments = Array.from(compartmentsList.children).map(item => ({
            class_id: parseInt(item.querySelector('.compartment-class').value) || null,
            compartment_number: parseInt(item.querySelector('.compartment-number').value) || null,
            total_seats: parseInt(item.querySelector('.compartment-seats').value) || null
        }));
        
        const trainData = {
            train_name: trainName.value,
            train_type: parseInt(trainType.value) || null,
            total_seats: parseInt(totalSeats.value) || null,
            fare_per_km: parseFloat(farePerKm.value) || null,
            is_active: isActive.checked,
            compartments: compartments
        };
        
        const url = trainId.value ? `/api/admin/trains/${trainId.value}` : '/api/admin/trains';
        const method = trainId.value ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(trainData)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to save train');
        }
        
        const savedTrain = await response.json();
        showAlert(`Train ${trainId.value ? 'updated' : 'created'} successfully`, 'success');
        trainModal.hide();
        await loadTrains();
        
        // Reset form
        trainForm.reset();
        trainId.value = '';
        document.getElementById('trainModalTitle').textContent = 'Add New Train';
        compartmentsList.innerHTML = '';
    } catch (error) {
        console.error('Error saving train:', error);
        showAlert(error.message, 'danger');
    }
});

// Reset form when modal is closed
document.getElementById('trainModal').addEventListener('hidden.bs.modal', () => {
    trainForm.reset();
    trainId.value = '';
    document.getElementById('trainModalTitle').textContent = 'Add New Train';
    compartmentsList.innerHTML = '';
});

// Get status badge HTML
function getStatusBadge(isActive) {
    return isActive ? 
        '<span class="badge bg-success">Active</span>' : 
        '<span class="badge bg-danger">Inactive</span>';
}

// Show alert message
function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    const container = document.querySelector('.container');
    container.insertBefore(alertDiv, container.firstChild);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
} 