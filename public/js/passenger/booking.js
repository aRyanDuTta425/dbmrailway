// DOM Elements
let trainSelect;
let classSelect;
let passengerName;
let passengerAge;
let passengerGender;
let journeyDate;
let seatMap;
let bookingForm;
let selectedSeat = null;
let scheduleId = null;

// Initialize the page
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize DOM elements
    trainSelect = document.getElementById('trainSelect');
    classSelect = document.getElementById('classSelect');
    passengerName = document.getElementById('passengerName');
    passengerAge = document.getElementById('passengerAge');
    passengerGender = document.getElementById('passengerGender');
    journeyDate = document.getElementById('journeyDate');
    seatMap = document.getElementById('seatMap');
    bookingForm = document.getElementById('bookingForm');

    // Get schedule ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    scheduleId = urlParams.get('schedule');
    
    if (!scheduleId) {
        showAlert('Invalid schedule selected', 'danger');
        return;
    }

    // Set the schedule ID in the hidden input
    const scheduleIdInput = document.getElementById('scheduleId');
    if (scheduleIdInput) {
        scheduleIdInput.value = scheduleId;
    }

    // Set up form submission handler
    if (bookingForm) {
        bookingForm.addEventListener('submit', handleFormSubmit);
    }

    await loadScheduleDetails();
    await loadTrainClasses();
    await loadSeatMap();
});

// Load schedule details
async function loadScheduleDetails() {
    try {
        const response = await fetch(`/api/schedules/${scheduleId}`);
        const schedule = await response.json();
        
        // Set journey date to today's date
        const today = new Date();
        journeyDate.value = today.toISOString().split('T')[0];
        journeyDate.min = today.toISOString().split('T')[0];
        
        // Set train info
        trainSelect.value = schedule.train_id;
        trainSelect.disabled = true;
    } catch (error) {
        console.error('Error loading schedule details:', error);
        showAlert('Error loading schedule details', 'danger');
    }
}

// Load train classes
async function loadTrainClasses() {
    try {
        const response = await fetch('/api/train-classes');
        const classes = await response.json();
        
        classes.forEach(trainClass => {
            const option = document.createElement('option');
            option.value = trainClass.class_id;
            option.textContent = `${trainClass.class_name} (${trainClass.description})`;
            classSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading train classes:', error);
        showAlert('Error loading train classes', 'danger');
    }
}

// Load seat map
async function loadSeatMap() {
    try {
        const response = await fetch(`/api/schedules/${scheduleId}/seats`);
        const seats = await response.json();
        
        // Group seats by compartment
        const compartments = {};
        seats.forEach(seat => {
            if (!compartments[seat.compartment_id]) {
                compartments[seat.compartment_id] = [];
            }
            compartments[seat.compartment_id].push(seat);
        });
        
        // Create seat map HTML
        let seatMapHTML = '';
        Object.entries(compartments).forEach(([compartmentId, compartmentSeats]) => {
            seatMapHTML += `
                <div class="compartment mb-4">
                    <h6>Compartment ${compartmentSeats[0].compartment_number} - ${compartmentSeats[0].class_name}</h6>
                    <div class="seat-grid">
                        ${compartmentSeats.map(seat => createSeatHTML(seat)).join('')}
                    </div>
                </div>
            `;
        });
        
        seatMap.innerHTML = seatMapHTML;
        
        // Add click handlers to seats
        document.querySelectorAll('.seat').forEach(seat => {
            seat.addEventListener('click', () => handleSeatClick(seat));
        });
    } catch (error) {
        console.error('Error loading seat map:', error);
        showAlert('Error loading seat map', 'danger');
    }
}

// Create seat HTML
function createSeatHTML(seat) {
    const statusClass = seat.is_booked ? 'occupied' : 'available';
    return `
        <div class="seat ${statusClass}" 
             data-seat-id="${seat.seat_number}"
             data-compartment-id="${seat.compartment_id}"
             data-class-id="${seat.class_id}">
            ${seat.seat_number}
        </div>
    `;
}

// Handle seat click
function handleSeatClick(eventOrElement) {
    // Handle both event object and direct element clicks
    const seatElement = eventOrElement.currentTarget || eventOrElement;
    
    // Check if seat is occupied
    if (seatElement.classList.contains('occupied')) {
        showAlert('This seat is already occupied', 'warning');
        return;
    }

    // Remove selected class from previously selected seat
    document.querySelectorAll('.seat.selected').forEach(seat => {
        seat.classList.remove('selected');
    });

    // Add selected class to clicked seat
    seatElement.classList.add('selected');

    // Store selected seat information
    selectedSeat = {
        seatNumber: seatElement.dataset.seatId,
        compartmentId: seatElement.dataset.compartmentId,
        classId: seatElement.dataset.classId
    };

    // Update hidden input fields if they exist
    const seatNumberInput = document.getElementById('seatNumber');
    const compartmentIdInput = document.getElementById('compartmentId');
    const classIdInput = document.getElementById('classId');

    if (seatNumberInput) seatNumberInput.value = selectedSeat.seatNumber;
    if (compartmentIdInput) compartmentIdInput.value = selectedSeat.compartmentId;
    if (classIdInput) classIdInput.value = selectedSeat.classId;

    showAlert('Seat selected successfully!', 'success');
}

// Handle form submission
async function handleFormSubmit(e) {
    e.preventDefault();
    console.log('Form submission started');

    if (!selectedSeat) {
        showAlert('Please select a seat first', 'danger');
        return;
    }

    // Get form elements
    const scheduleIdInput = document.getElementById('scheduleId');
    const passengerNameInput = document.getElementById('passengerName');
    const passengerAgeInput = document.getElementById('passengerAge');
    const passengerGenderInput = document.getElementById('passengerGender');

    // Debug: Log element existence
    console.log('Form elements check:', {
        scheduleIdInput: !!scheduleIdInput,
        passengerNameInput: !!passengerNameInput,
        passengerAgeInput: !!passengerAgeInput,
        passengerGenderInput: !!passengerGenderInput
    });

    // Check if all required elements exist
    if (!scheduleIdInput || !passengerNameInput || !passengerAgeInput || !passengerGenderInput) {
        console.error('Missing form elements:', {
            scheduleIdInput: !!scheduleIdInput,
            passengerNameInput: !!passengerNameInput,
            passengerAgeInput: !!passengerAgeInput,
            passengerGenderInput: !!passengerGenderInput
        });
        showAlert('Form elements not found. Please refresh the page and try again.', 'danger');
        return;
    }

    const scheduleId = scheduleIdInput.value;
    const compartmentId = selectedSeat.compartmentId;
    const seatNumber = selectedSeat.seatNumber;

    console.log('Booking data:', {
        scheduleId,
        compartmentId,
        seatNumber,
        passengerName: passengerNameInput.value,
        passengerAge: passengerAgeInput.value,
        passengerGender: passengerGenderInput.value
    });

    try {
        // Get fare information
        console.log('Fetching fare information...');
        const fareResponse = await fetch(`/api/schedules/${scheduleId}/fare?compartment_id=${compartmentId}`);
        if (!fareResponse.ok) {
            const errorData = await fareResponse.json();
            throw new Error(errorData.error || 'Failed to get fare information');
        }
        const fareData = await fareResponse.json();
        console.log('Fare data received:', fareData);

        if (!fareData.total_fare) {
            throw new Error('Invalid fare data received');
        }

        // Confirm fare with user
        if (!confirm(`Total fare: ₹${fareData.total_fare}. Do you want to proceed with the booking?`)) {
            return;
        }

        // Create booking
        const bookingData = {
            schedule_id: scheduleId,
            compartment_id: compartmentId,
            seat_number: seatNumber,
            passenger_name: passengerNameInput.value,
            passenger_age: passengerAgeInput.value,
            passenger_gender: passengerGenderInput.value,
            fare_amount: fareData.total_fare
        };

        console.log('Sending booking data:', bookingData);
        const bookingResponse = await fetch('/api/bookings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(bookingData)
        });

        if (!bookingResponse.ok) {
            const errorData = await bookingResponse.json();
            throw new Error(errorData.error || 'Failed to create booking');
        }

        const bookingResult = await bookingResponse.json();
        console.log('Booking result:', bookingResult);
        showAlert(`Booking successful! Your booking ID is: ${bookingResult.booking_id}`, 'success');
        
        // Reset form and redirect
        if (bookingForm) {
            bookingForm.reset();
        }
        selectedSeat = null;
        document.querySelectorAll('.seat.selected').forEach(seat => {
            seat.classList.remove('selected');
        });
        setTimeout(() => {
            window.location.href = '/views/passenger/my-bookings.html';
        }, 2000);

    } catch (error) {
        console.error('Error in form submission:', error);
        showAlert(error.message, 'danger');
    }
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