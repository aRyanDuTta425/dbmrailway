// DOM Elements
const stationsTable = document.getElementById('stationsTable').getElementsByTagName('tbody')[0];
const stationModal = new bootstrap.Modal(document.getElementById('stationModal'));
const stationForm = document.getElementById('stationForm');
const stationId = document.getElementById('stationId');
const stationName = document.getElementById('stationName');
const city = document.getElementById('city');
const state = document.getElementById('state');
const platformCount = document.getElementById('platformCount');
const isActive = document.getElementById('isActive');
const saveStationBtn = document.getElementById('saveStationBtn');

// Initialize the page
document.addEventListener('DOMContentLoaded', async () => {
    await loadStations();
});

// Load stations
async function loadStations() {
    try {
        const response = await fetch('/api/admin/stations');
        const stations = await response.json();
        
        displayStations(stations);
    } catch (error) {
        console.error('Error loading stations:', error);
        showAlert('Error loading stations', 'danger');
    }
}

// Display stations in the table
function displayStations(stations) {
    stationsTable.innerHTML = '';
    
    stations.forEach(station => {
        const row = stationsTable.insertRow();
        row.innerHTML = `
            <td>${station.station_id}</td>
            <td>${station.station_name}</td>
            <td>${station.city}</td>
            <td>${station.state}</td>
            <td>${station.platform_count}</td>
            <td>${getStatusBadge(station.is_active)}</td>
            <td>
                <button class="btn btn-info btn-sm" onclick="editStation(${station.station_id})">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-danger btn-sm" onclick="deleteStation(${station.station_id})">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;
    });
}

// Edit station
async function editStation(id) {
    try {
        const response = await fetch(`/api/admin/stations/${id}`);
        const station = await response.json();
        
        // Populate form
        document.getElementById('stationModalTitle').textContent = 'Edit Station';
        stationId.value = station.station_id;
        stationName.value = station.station_name;
        city.value = station.city;
        state.value = station.state;
        platformCount.value = station.platform_count;
        isActive.checked = station.is_active;
        
        stationModal.show();
    } catch (error) {
        console.error('Error loading station details:', error);
        showAlert('Error loading station details', 'danger');
    }
}

// Delete station
async function deleteStation(id) {
    if (!confirm('Are you sure you want to delete this station?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/stations/${id}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error('Failed to delete station');
        }
        
        showAlert('Station deleted successfully', 'success');
        await loadStations();
    } catch (error) {
        console.error('Error deleting station:', error);
        showAlert('Error deleting station', 'danger');
    }
}

// Handle form submission
saveStationBtn.addEventListener('click', async () => {
    try {
        // Disable the button to prevent double submission
        saveStationBtn.disabled = true;
        
        const stationData = {
            station_name: stationName.value,
            city: city.value,
            state: state.value,
            platform_count: parseInt(platformCount.value),
            is_active: isActive.checked
        };
        
        let url = '/api/admin/stations';
        let method = 'POST';
        
        // If we have a stationId, this is an update
        if (stationId.value) {
            url = `/api/admin/stations/${stationId.value}`;
            method = 'PUT';
        }
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(stationData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to save station');
        }
        
        showAlert('Station saved successfully', 'success');
        
        // Reset form and modal
        stationForm.reset();
        stationId.value = '';
        document.getElementById('stationModalTitle').textContent = 'Add New Station';
        stationModal.hide();
        
        // Reload stations after a short delay to ensure the modal is closed
        setTimeout(async () => {
            await loadStations();
        }, 100);
    } catch (error) {
        console.error('Error saving station:', error);
        showAlert(error.message, 'danger');
    } finally {
        // Re-enable the button
        saveStationBtn.disabled = false;
    }
});

// Reset form when modal is closed
document.getElementById('stationModal').addEventListener('hidden.bs.modal', () => {
    stationForm.reset();
    stationId.value = '';
    document.getElementById('stationModalTitle').textContent = 'Add New Station';
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