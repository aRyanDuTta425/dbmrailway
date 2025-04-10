# Railway Management System Database Schema

## Entity Relationship Diagram

```mermaid
erDiagram
    trains ||--o{ schedules : "has"
    trains ||--o{ train_compartments : "has"
    trains }|--|| train_types : "belongs to"
    train_compartments }|--|| train_classes : "belongs to"
    schedules ||--o{ seat_status : "has"
    schedules }|--|| routes : "belongs to"
    routes }|--|| stations : "from"
    routes }|--|| stations : "to"
    stations ||--o{ routes : "source"
    stations ||--o{ routes : "destination"
    train_compartments ||--o{ seat_status : "has"
    schedules ||--o{ bookings : "has"
    bookings }|--|| seat_status : "references"

    trains {
        int train_id PK
        string train_name
        int train_type FK
        int total_seats
        decimal fare_per_km
        boolean is_active
    }

    train_types {
        int type_id PK
        string type_name
        string description
    }

    train_compartments {
        int compartment_id PK
        int train_id FK
        int class_id FK
        int compartment_number
        int total_seats
    }

    train_classes {
        int class_id PK
        string class_name
        string description
        decimal fare_multiplier
    }

    stations {
        int station_id PK
        string station_name
        string city
        string state
        int platform_count
        boolean is_active
    }

    routes {
        int route_id PK
        int from_station FK
        int to_station FK
        boolean is_active
    }

    schedules {
        int schedule_id PK
        int train_id FK
        int route_id FK
        time departure_time
        time arrival_time
        string[] days_of_operation
        boolean is_active
    }

    seat_status {
        int compartment_id FK
        int seat_number
        int schedule_id FK
        string status
    }

    bookings {
        int booking_id PK
        int schedule_id FK
        int compartment_id FK
        int seat_number
        string passenger_name
        int passenger_age
        string passenger_gender
        string booking_status
        date booking_date
        decimal fare_amount
        string payment_status
    }
```

## Table Descriptions

### Trains

- Stores information about all trains in the system
- Each train belongs to a specific type (e.g., Express, Superfast)
- Contains basic train information like name, total seats, and fare per kilometer

### Train Types

- Defines different categories of trains
- Contains type name and description
- Used to categorize trains (e.g., Express, Superfast, etc.)

### Train Compartments

- Represents individual compartments in each train
- Links to train classes for fare calculation
- Contains compartment number and total seats

### Train Classes

- Defines different classes of travel (e.g., First Class, Second Class)
- Contains fare multiplier for price calculation
- Includes class description and name

### Stations

- Stores information about all railway stations
- Contains location details (city, state)
- Includes platform count and active status

### Routes

- Defines paths between stations
- Links source and destination stations
- Used to create train schedules

### Schedules

- Contains train timings and routes
- Includes departure and arrival times
- Stores days of operation
- Links trains to specific routes

### Seat Status

- Tracks seat availability for each schedule
- Contains current status of each seat
- Used for booking management

### Bookings

- Stores passenger booking information
- Links to schedules and seats
- Contains passenger details and payment status

## Key Features

1. Multi-class train support
2. Flexible scheduling system
3. Seat availability tracking
4. Route management
5. Station management
6. Booking system with passenger details
7. Fare calculation based on distance and class
