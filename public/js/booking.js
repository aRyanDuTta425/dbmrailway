// DOM Elements
let trainSelect;
let classSelect;
let passengerName;
let passengerAge;
let passengerGender;
let journeyDate;
let seatMap;
let bookingForm;
let addCompartmentBtn;
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
    addCompartmentBtn = document.getElementById('addCompartmentBtn');

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

    try {
        // Check if the schedule exists
        const checkResponse = await fetch(`/api/schedules/${scheduleId}/check`);
        if (!checkResponse.ok) {
            showAlert('Schedule not found', 'danger');
            return;
        }
        
        const checkData = await checkResponse.json();
        if (!checkData.exists) {
            showAlert('Schedule not found', 'danger');
            return;
        }
        
        console.log('Schedule exists:', checkData.schedule);
        
        // Load schedule details and seat map
        await loadScheduleDetails();
        await loadTrainClasses();
        await loadSeatMap();
    } catch (error) {
        console.error('Error initializing page:', error);
        showAlert('Error initializing page: ' + error.message, 'danger');
    }
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
        console.log('Fetching seats for schedule:', scheduleId);
        console.log('Seat map element:', seatMap);
        
        if (!seatMap) {
            console.error('Seat map element not found!');
            showAlert('Error: Seat map element not found', 'danger');
            return;
        }
        
        const response = await fetch(`/api/schedules/${scheduleId}/seats`);
        console.log('Response status:', response.status);
        
        // Handle non-200 responses first
        if (!response.ok) {
            const errorData = await response.json();
            console.error('Server error:', errorData);
            throw new Error(errorData.error || 'Failed to fetch seat map');
        }
        
        // Try to parse the successful response as JSON
        let responseData;
        try {
            responseData = await response.json();
            console.log('Response data:', responseData);
        } catch (parseError) {
            console.error('Error parsing response as JSON:', parseError);
            throw new Error('Invalid response format from server');
        }
        
        // Ensure seats is an array
        if (!Array.isArray(responseData)) {
            console.error('Invalid seats data type:', typeof responseData);
            console.error('Invalid seats data:', responseData);
            throw new Error('Invalid seat data received from server');
        }
        
        // Check if we have any seats
        if (responseData.length === 0) {
            console.log('No seats found for this schedule');
            seatMap.innerHTML = '<div class="alert alert-info">No seats available for this schedule.</div>';
            return;
        }
        
        // Group seats by compartment
        const compartments = {};
        responseData.forEach(seat => {
            if (!compartments[seat.compartment_id]) {
                compartments[seat.compartment_id] = {
                    compartment_number: seat.compartment_number,
                    class_name: seat.class_name,
                    seats: []
                };
            }
            compartments[seat.compartment_id].seats.push(seat);
        });
        
        // Create seat map HTML
        let seatMapHTML = `
            <div class="seat-legend">
                <div class="legend-item">
                    <div class="legend-seat legend-available"></div>
                    <span>Available</span>
                </div>
                <div class="legend-item">
                    <div class="legend-seat legend-occupied"></div>
                    <span>Occupied</span>
                </div>
                <div class="legend-item">
                    <div class="legend-seat legend-selected"></div>
                    <span>Selected</span>
                </div>
            </div>
        `;
        
        Object.entries(compartments).forEach(([compartmentId, compartment]) => {
            seatMapHTML += `
                <div class="compartment mb-4">
                    <h6>Compartment ${compartment.compartment_number} - ${compartment.class_name}</h6>
                    <div class="seat-grid">
                        ${compartment.seats.map(seat => createSeatHTML(seat)).join('')}
                    </div>
                </div>
            `;
        });
        
        console.log('Generated seat map HTML:', seatMapHTML);
        seatMap.innerHTML = seatMapHTML;
        
        // Add click handlers to seats
        const seatElements = document.querySelectorAll('.seat');
        console.log('Found seat elements:', seatElements.length);
        
        seatElements.forEach(seat => {
            seat.addEventListener('click', () => handleSeatClick(seat));
        });
    } catch (error) {
        console.error('Error loading seat map:', error);
        showAlert('Error loading seat map: ' + error.message, 'danger');
        
        // If the schedule doesn't exist, redirect to the train list
        if (error.message.includes('Schedule not found')) {
            setTimeout(() => {
                window.location.href = '/views/passenger/index.html';
            }, 3000);
        }
    }
}

// Create seat HTML
function createSeatHTML(seat) {
    console.log('Creating seat HTML for seat:', seat);
    const statusClass = seat.is_booked ? 'occupied' : 'available';
    const tooltipText = `Compartment ${seat.compartment_number}, Seat ${seat.seat_number}`;
    return `
        <div class="seat ${statusClass}" 
             data-seat-id="${seat.seat_number}"
             data-compartment-id="${seat.compartment_id}"
             data-class-id="${seat.class_id}"
             title="${tooltipText}">
            <div class="seat-number">${seat.compartment_number}-${seat.seat_number}</div>
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