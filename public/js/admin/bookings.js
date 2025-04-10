// DOM Elements
const bookingsTable = document.getElementById('bookingsTable').getElementsByTagName('tbody')[0];
const bookingSearchForm = document.getElementById('bookingSearchForm');
const bookingStatusFilter = document.getElementById('bookingStatusFilter');
const bookingDateFilter = document.getElementById('bookingDateFilter');

// Initialize the page
document.addEventListener('DOMContentLoaded', async () => {
    await loadBookings();
    setupEventListeners();
});

// Load bookings with optional filters
async function loadBookings(filters = {}) {
    try {
        let url = '/api/admin/bookings';
        const queryParams = new URLSearchParams();
        
        if (filters.status) {
            queryParams.append('status', filters.status);
        }
        
        if (filters.date) {
            queryParams.append('date', filters.date);
        }
        
        if (queryParams.toString()) {
            url += `?${queryParams.toString()}`;
        }
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const bookings = await response.json();
        displayBookings(bookings);
    } catch (error) {
        console.error('Error loading bookings:', error);
        showAlert('Error loading bookings', 'danger');
    }
}

// Display bookings in the table
function displayBookings(bookings) {
    bookingsTable.innerHTML = '';
    
    if (bookings.length === 0) {
        const row = bookingsTable.insertRow();
        row.innerHTML = '<td colspan="8" class="text-center">No bookings found</td>';
        return;
    }
    
    bookings.forEach(booking => {
        const row = bookingsTable.insertRow();
        row.innerHTML = `
            <td>${booking.booking_id}</td>
            <td>${booking.train_name}</td>
            <td>${booking.passenger_name}</td>
            <td>${formatDate(booking.booking_date)}</td>
            <td>${booking.seat_number}</td>
            <td>₹${booking.fare_amount}</td>
            <td>${getStatusBadge(booking.booking_status)}</td>
            <td>
                <button class="btn btn-info btn-sm" onclick="viewBookingDetails(${booking.booking_id})">
                    <i class="bi bi-eye"></i>
                </button>
                ${booking.booking_status === 'pending' ? `
                    <button class="btn btn-success btn-sm" onclick="updateBookingStatus(${booking.booking_id}, 'confirmed')">
                        <i class="bi bi-check-lg"></i>
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="updateBookingStatus(${booking.booking_id}, 'cancelled')">
                        <i class="bi bi-x-lg"></i>
                    </button>
                ` : ''}
            </td>
        `;
    });
}

// Setup event listeners
function setupEventListeners() {
    if (bookingSearchForm) {
        bookingSearchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const filters = {
                status: bookingStatusFilter.value,
                date: bookingDateFilter.value
            };
            loadBookings(filters);
        });
    }
}

// View booking details
async function viewBookingDetails(bookingId) {
    try {
        const response = await fetch(`/api/admin/bookings/${bookingId}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const booking = await response.json();
        
        // Update modal content with booking details
        document.getElementById('modalPassengerName').textContent = booking.passenger_name;
        document.getElementById('modalPassengerAge').textContent = booking.passenger_age;
        document.getElementById('modalPassengerGender').textContent = booking.passenger_gender;
        document.getElementById('modalTrainName').textContent = booking.train_name;
        document.getElementById('modalJourneyDate').textContent = formatDate(booking.booking_date);
        document.getElementById('modalSeatNumber').textContent = booking.seat_number;
        document.getElementById('modalFareAmount').textContent = `₹${booking.fare_amount}`;
        document.getElementById('modalPaymentStatus').textContent = booking.payment_status;
        document.getElementById('modalBookingStatus').textContent = booking.booking_status;
        
        // Show/hide cancel button based on booking status
        const cancelBookingBtn = document.getElementById('cancelBookingBtn');
        if (cancelBookingBtn) {
            cancelBookingBtn.style.display = booking.booking_status === 'confirmed' ? 'block' : 'none';
        }
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('bookingDetailsModal'));
        modal.show();
    } catch (error) {
        console.error('Error loading booking details:', error);
        showAlert('Error loading booking details', 'danger');
    }
}

// Update booking status
async function updateBookingStatus(bookingId, newStatus) {
    if (!confirm(`Are you sure you want to ${newStatus === 'confirmed' ? 'confirm' : 'cancel'} this booking?`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/bookings/${bookingId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        showAlert(`Booking ${newStatus} successfully`, 'success');
        await loadBookings();
    } catch (error) {
        console.error('Error updating booking status:', error);
        showAlert('Error updating booking status', 'danger');
    }
}

// Utility functions
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function getStatusBadge(status) {
    const badges = {
        'confirmed': 'bg-success',
        'pending': 'bg-warning',
        'cancelled': 'bg-danger'
    };
    
    return `<span class="badge ${badges[status] || 'bg-secondary'}">${status}</span>`;
}

// Show alert message
function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    const container = document.querySelector('.container-fluid');
    container.insertBefore(alertDiv, container.firstChild);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
} 