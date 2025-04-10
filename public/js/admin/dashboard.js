// DOM Elements
const totalTrains = document.getElementById('totalTrains');
const activeBookings = document.getElementById('activeBookings');
const todayRevenue = document.getElementById('todayRevenue');
const pendingCancellations = document.getElementById('pendingCancellations');
const recentBookingsTable = document.getElementById('recentBookingsTable').getElementsByTagName('tbody')[0];
const revenueChart = document.getElementById('revenueChart');
const bookingStatsChart = document.getElementById('bookingStatsChart');

// Initialize the page
document.addEventListener('DOMContentLoaded', async () => {
    await loadDashboardStats();
    await loadRecentBookings();
    await initializeCharts();
});

// Load dashboard statistics
async function loadDashboardStats() {
    try {
        const response = await fetch('/api/admin/dashboard/stats');
        const stats = await response.json();
        
        totalTrains.textContent = stats.totalTrains;
        activeBookings.textContent = stats.activeBookings;
        todayRevenue.textContent = `₹${stats.todayRevenue}`;
        pendingCancellations.textContent = stats.pendingCancellations;
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
        showAlert('Error loading dashboard statistics', 'danger');
    }
}

// Load recent bookings
async function loadRecentBookings() {
    try {
        const response = await fetch('/api/admin/recent-bookings');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        // Ensure we have an array of bookings
        const bookings = Array.isArray(data) ? data : [];
        
        recentBookingsTable.innerHTML = '';
        
        if (bookings.length === 0) {
            const row = recentBookingsTable.insertRow();
            row.innerHTML = '<td colspan="6" class="text-center">No recent bookings found</td>';
            return;
        }
        
        bookings.forEach(booking => {
            const row = recentBookingsTable.insertRow();
            row.innerHTML = `
                <td>${booking.booking_id}</td>
                <td>${booking.train_name}</td>
                <td>${booking.passenger_name}</td>
                <td>${formatDate(booking.booking_date)}</td>
                <td>${getStatusBadge(booking.booking_status)}</td>
                <td>
                    <button class="btn btn-info btn-sm" onclick="viewBookingDetails(${booking.booking_id})">
                        <i class="bi bi-eye"></i>
                    </button>
                </td>
            `;
        });
    } catch (error) {
        console.error('Error loading recent bookings:', error);
        recentBookingsTable.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Error loading recent bookings</td></tr>';
    }
}

// Initialize charts
async function initializeCharts() {
    try {
        // Load revenue data
        const revenueResponse = await fetch('/api/admin/dashboard/revenue');
        if (!revenueResponse.ok) {
            throw new Error(`HTTP error! status: ${revenueResponse.status}`);
        }
        const revenueData = await revenueResponse.json();
        
        // Ensure we have arrays for the data
        const dailyRevenue = Array.isArray(revenueData.dailyRevenue) ? revenueData.dailyRevenue : [];
        const classRevenue = Array.isArray(revenueData.classRevenue) ? revenueData.classRevenue : [];
        
        // Create revenue chart
        new Chart(revenueChart, {
            type: 'line',
            data: {
                labels: dailyRevenue.map(item => formatDate(item.date)),
                datasets: [{
                    label: 'Daily Revenue',
                    data: dailyRevenue.map(item => item.revenue),
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: value => `₹${value}`
                        }
                    }
                }
            }
        });
        
        // Load booking statistics
        const statsResponse = await fetch('/api/admin/dashboard/booking-stats');
        if (!statsResponse.ok) {
            throw new Error(`HTTP error! status: ${statsResponse.status}`);
        }
        const statsData = await statsResponse.json();
        
        // Ensure we have arrays for the data
        const statusCounts = Array.isArray(statsData.statusCounts) ? statsData.statusCounts : [];
        
        // Create booking statistics chart
        new Chart(bookingStatsChart, {
            type: 'doughnut',
            data: {
                labels: statusCounts.map(item => item.booking_status),
                datasets: [{
                    data: statusCounts.map(item => item.count),
                    backgroundColor: [
                        'rgb(75, 192, 192)',
                        'rgb(255, 99, 132)',
                        'rgb(54, 162, 235)'
                    ]
                }]
            },
            options: {
                responsive: true
            }
        });
    } catch (error) {
        console.error('Error initializing charts:', error);
        showAlert('Error loading chart data', 'danger');
    }
}

// View booking details
function viewBookingDetails(bookingId) {
    window.location.href = `/views/admin/bookings.html?booking=${bookingId}`;
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