// DOM Elements
const searchForm = document.getElementById('searchForm');
const fromStation = document.getElementById('fromStation');
const toStation = document.getElementById('toStation');
const date = document.getElementById('date');
const trainsTable = document.getElementById('trainsTable').getElementsByTagName('tbody')[0];

// Initialize the page
document.addEventListener('DOMContentLoaded', async () => {
    await loadStations();
    await loadTrains();
});

// Load stations for dropdown
async function loadStations() {
    try {
        const response = await fetch('/api/stations');
        const stations = await response.json();
        
        stations.forEach(station => {
            const option = document.createElement('option');
            option.value = station.station_id;
            option.textContent = `${station.station_name} (${station.city})`;
            
            fromStation.appendChild(option.cloneNode(true));
            toStation.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading stations:', error);
        showAlert('Error loading stations', 'danger');
    }
}

// Load trains based on search criteria
async function loadTrains() {
    try {
        // Check if required fields are filled
        if (!fromStation.value || !toStation.value || !date.value) {
            showAlert('Please fill in all search fields', 'warning');
            return;
        }

        // Check if from and to stations are different
        if (fromStation.value === toStation.value) {
            showAlert('Please select different stations for departure and arrival', 'warning');
            return;
        }

        const response = await fetch('/api/search-trains', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from_station: fromStation.value,
                to_station: toStation.value,
                date: date.value
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const trains = await response.json();
        console.log('Received trains:', trains);
        
        displayTrains(trains);
    } catch (error) {
        console.error('Error loading trains:', error);
        showAlert('Error loading trains: ' + error.message, 'danger');
    }
}

// Display trains in the table
function displayTrains(trains) {
    trainsTable.innerHTML = '';
    
    if (trains.length === 0) {
        const row = trainsTable.insertRow();
        row.innerHTML = '<td colspan="8" class="text-center">No trains found for this route.</td>';
        return;
    }
    
    trains.forEach(train => {
        const row = trainsTable.insertRow();
        row.innerHTML = `
            <td>${train.train_name}</td>
            <td>${train.from_station_name}</td>
            <td>${train.to_station_name}</td>
            <td>${formatTime(train.departure_time)}</td>
            <td>${formatTime(train.arrival_time)}</td>
            <td>${train.train_type}</td>
            <td>₹${Math.round(train.distance_km * train.fare_per_km)}</td>
            <td>
                <button class="btn btn-primary btn-sm" onclick="bookTicket(${train.schedule_id})">
                    Book Now
                </button>
            </td>
        `;
    });
}

// Format time for display
function formatTime(time) {
    return new Date('1970-01-01T' + time).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Get status badge HTML
function getStatusBadge(status) {
    const badges = {
        'on_time': '<span class="badge bg-success">On Time</span>',
        'delayed': '<span class="badge bg-warning">Delayed</span>',
        'cancelled': '<span class="badge bg-danger">Cancelled</span>'
    };
    return badges[status] || '<span class="badge bg-secondary">Unknown</span>';
}

// Handle search form submission
searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    loadTrains();
});

// Book ticket function
function bookTicket(scheduleId) {
    window.location.href = `/views/passenger/book-ticket.html?schedule=${scheduleId}`;
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