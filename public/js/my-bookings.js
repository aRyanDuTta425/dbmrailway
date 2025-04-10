// DOM Elements
const searchBooking = document.getElementById('searchBooking');
const filterStatus = document.getElementById('filterStatus');
const bookingsTable = document.getElementById('bookingsTable').getElementsByTagName('tbody')[0];
const bookingDetailsModal = new bootstrap.Modal(document.getElementById('bookingDetailsModal'));
const cancelBookingBtn = document.getElementById('cancelBookingBtn');

let currentBookingId = null;

// Initialize the page
document.addEventListener('DOMContentLoaded', async () => {
    // Get booking ID from URL if present
    const urlParams = new URLSearchParams(window.location.search);
    const bookingId = urlParams.get('booking');
    
    if (bookingId) {
        await showBookingDetails(bookingId);
    } else {
        await loadBookings();
    }
});

// Load bookings
async function loadBookings() {
    try {
        const params = new URLSearchParams({
            search: searchBooking.value,
            status: filterStatus.value
        });

        const response = await fetch(`/api/bookings?${params}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        // Ensure we have an array of bookings
        const bookings = Array.isArray(data) ? data : [];
        displayBookings(bookings);
    } catch (error) {
        console.error('Error loading bookings:', error);
        showAlert('Error loading bookings', 'danger');
        // Display empty table on error
        displayBookings([]);
    }
}

// Display bookings in the table
function displayBookings(bookings) {
    bookingsTable.innerHTML = '';
    
    bookings.forEach(booking => {
        const row = bookingsTable.insertRow();
        row.innerHTML = `
            <td>${booking.booking_id}</td>
            <td>${booking.train_name}</td>
            <td>${booking.from_station_name}</td>
            <td>${booking.to_station_name}</td>
            <td>${formatDate(booking.journey_date)}</td>
            <td>${booking.passenger_name}</td>
            <td>${booking.seat_number}</td>
            <td>${getStatusBadge(booking.booking_status)}</td>
            <td>
                <button class="btn btn-info btn-sm" onclick="showBookingDetails(${booking.booking_id})">
                    View
                </button>
                ${booking.booking_status === 'confirmed' ? `
                    <button class="btn btn-danger btn-sm" onclick="cancelBooking(${booking.booking_id})">
                        Cancel
                    </button>
                ` : ''}
            </td>
        `;
    });
}

// Show booking details
async function showBookingDetails(bookingId) {
    try {
        const response = await fetch(`/api/bookings/${bookingId}`);
        const booking = await response.json();
        
        // Update modal content
        document.getElementById('modalPassengerName').textContent = booking.passenger_name;
        document.getElementById('modalPassengerAge').textContent = booking.passenger_age;
        document.getElementById('modalPassengerGender').textContent = booking.passenger_gender;
        document.getElementById('modalTrainName').textContent = booking.train_name;
        document.getElementById('modalJourneyDate').textContent = formatDate(booking.journey_date);
        document.getElementById('modalSeatNumber').textContent = booking.seat_number;
        document.getElementById('modalFareAmount').textContent = `₹${booking.fare_amount}`;
        document.getElementById('modalPaymentStatus').textContent = booking.payment_status;
        document.getElementById('modalBookingStatus').textContent = booking.booking_status;
        
        // Show/hide cancel button based on booking status
        cancelBookingBtn.style.display = booking.booking_status === 'confirmed' ? 'block' : 'none';
        
        // Store current booking ID
        currentBookingId = bookingId;
        
        // Show modal
        bookingDetailsModal.show();
    } catch (error) {
        console.error('Error loading booking details:', error);
        showAlert('Error loading booking details', 'danger');
    }
}

// Cancel booking
async function cancelBooking(bookingId) {
    if (!confirm('Are you sure you want to cancel this booking?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/bookings/${bookingId}/cancel`, {
            method: 'POST'
        });
        
        if (!response.ok) {
            throw new Error('Failed to cancel booking');
        }
        
        showAlert('Booking cancelled successfully', 'success');
        bookingDetailsModal.hide();
        await loadBookings();
    } catch (error) {
        console.error('Error cancelling booking:', error);
        showAlert('Error cancelling booking', 'danger');
    }
}

// Format date for display
function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Get status badge HTML
function getStatusBadge(status) {
    const badges = {
        'confirmed': '<span class="badge bg-success">Confirmed</span>',
        'cancelled': '<span class="badge bg-danger">Cancelled</span>',
        'completed': '<span class="badge bg-info">Completed</span>'
    };
    return badges[status] || '<span class="badge bg-secondary">Unknown</span>';
}

// Handle search and filter
searchBooking.addEventListener('input', loadBookings);
filterStatus.addEventListener('change', loadBookings);

// Handle cancel button click in modal
cancelBookingBtn.addEventListener('click', () => {
    if (currentBookingId) {
        cancelBooking(currentBookingId);
    }
});

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