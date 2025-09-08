# Admin Dashboard Overhaul - Requirements Document

## Introduction

This specification outlines a comprehensive overhaul of the ChatWii admin dashboard to provide complete administrative control over users, site settings, content management, and system configuration. The current admin dashboard has basic functionality but lacks many essential features for proper site administration.

## Requirements

### Requirement 1: Enhanced User Management System

**User Story:** As an admin, I want comprehensive user management capabilities so that I can effectively moderate and manage all user types on the platform.

#### Acceptance Criteria

1. WHEN admin accesses user management THEN system SHALL display separate sections for VIP users, Standard users, and Bots
2. WHEN admin views VIP users list THEN system SHALL show both online and offline VIP users with action buttons
3. WHEN admin clicks VIP user actions THEN system SHALL provide options: Kick, Ban, Edit, Downgrade
4. WHEN admin views Standard users list THEN system SHALL show online standard users with action buttons  
5. WHEN admin clicks Standard user actions THEN system SHALL provide options: Kick, Ban, Edit, Upgrade to VIP
6. WHEN admin performs kick action THEN system SHALL redirect user to landing page AND show inline warning for 5 seconds
7. WHEN admin accesses Bots section THEN system SHALL allow adding bots with configurable age, gender, country, interests

### Requirement 2: IP and User Banning System

**User Story:** As an admin, I want to manage banned users and IPs so that I can maintain platform security and handle violations effectively.

#### Acceptance Criteria

1. WHEN admin accesses banned users section THEN system SHALL display list of currently banned IPs and users
2. WHEN admin views banned entry THEN system SHALL show ban reason, duration, and unban button
3. WHEN admin performs ban action THEN system SHALL record reason and duration automatically
4. WHEN admin clicks unban button THEN system SHALL remove ban and restore access
5. WHEN user is banned THEN system SHALL prevent access and log IP address

### Requirement 3: Site Management and Configuration

**User Story:** As an admin, I want to configure site-wide settings so that I can control platform behavior and monetization.

#### Acceptance Criteria

1. WHEN admin accesses General settings THEN system SHALL provide Google AdSense link inputs (3 total)
2. WHEN admin saves AdSense links THEN system SHALL reflect changes on site AdSense page immediately
3. WHEN admin toggles maintenance mode THEN system SHALL put entire site in maintenance mode
4. WHEN admin accesses Chat Settings THEN system SHALL allow configuring max image upload count for standard users
5. WHEN admin changes image upload limit THEN system SHALL update limit and reflect on main site (default: 10)

### Requirement 4: Content Moderation and Profanity Management

**User Story:** As an admin, I want to manage profanity filters so that I can maintain appropriate content standards.

#### Acceptance Criteria

1. WHEN admin accesses profanity settings THEN system SHALL provide two separate word lists
2. WHEN admin adds words to nickname profanity list THEN system SHALL prevent those words in nickname input field
3. WHEN admin adds words to chat profanity list THEN system SHALL prevent those words in chat messages
4. WHEN user attempts to use blocked words THEN system SHALL reject input and show appropriate error message

### Requirement 5: VIP Pricing and Avatar Management

**User Story:** As an admin, I want to configure VIP pricing and avatar systems so that I can manage monetization and user customization.

#### Acceptance Criteria

1. WHEN admin accesses VIP Prices THEN system SHALL provide 3 input fields for VIP plan pricing (numbers only)
2. WHEN admin updates VIP prices THEN system SHALL reflect changes on actual site prices immediately
3. WHEN admin accesses Avatars section THEN system SHALL provide VIP and Standard sections with Male/Female categories
4. WHEN VIP male user selects avatar THEN system SHALL show avatars from Male VIP collection
5. WHEN standard user joins THEN system SHALL apply default avatar based on gender automatically

### Requirement 6: Reports and Feedback Management

**User Story:** As an admin, I want to review user reports and feedback so that I can address issues and improve the platform.

#### Acceptance Criteria

1. WHEN admin accesses Reports section THEN system SHALL display all user-submitted reports with reasons
2. WHEN admin views report THEN system SHALL show reporter, reported user, reason, and timestamp
3. WHEN admin accesses Feedback section THEN system SHALL display all user feedback from feedback page
4. WHEN admin reviews feedback THEN system SHALL allow marking as read/resolved and adding admin notes

### Requirement 7: Admin Profile and Settings

**User Story:** As an admin, I want to manage my admin profile and settings so that I can customize my administrative experience.

#### Acceptance Criteria

1. WHEN admin accesses Admin Settings THEN system SHALL allow uploading admin avatar from device
2. WHEN admin changes password THEN system SHALL update admin authentication securely
3. WHEN admin sets display name THEN system SHALL show name when admin appears in chat
4. WHEN admin clicks Chat button THEN system SHALL navigate to main chat interface
5. WHEN admin clicks Logout THEN system SHALL securely log out and redirect to login page

### Requirement 8: Real-time User Kick Functionality

**User Story:** As an admin, I want to kick users in real-time so that I can immediately remove disruptive users from the platform.

#### Acceptance Criteria

1. WHEN admin performs kick action THEN system SHALL immediately update user status to "kicked"
2. WHEN user is kicked THEN system SHALL redirect user to landing page within 5 seconds
3. WHEN kicked user sees redirect THEN system SHALL display inline warning message for 5 seconds
4. WHEN user is kicked THEN system SHALL set user offline and update presence status
5. WHEN kicked user attempts to rejoin THEN system SHALL allow access (kick is temporary)

### Requirement 9: Enhanced Bot Management

**User Story:** As an admin, I want to create and manage bots so that I can maintain platform activity and engagement.

#### Acceptance Criteria

1. WHEN admin adds bot THEN system SHALL create bot user with specified age, gender, country
2. WHEN admin configures bot interests THEN system SHALL store interests for bot behavior
3. WHEN bot is created THEN system SHALL appear as regular user in chat interface
4. WHEN admin manages bots THEN system SHALL provide edit, delete, and status toggle options
5. WHEN bot is active THEN system SHALL show as online user in user list

### Requirement 10: Database Integration and Real-time Updates

**User Story:** As an admin, I want all actions to integrate with the database properly so that changes are persistent and real-time.

#### Acceptance Criteria

1. WHEN admin performs any action THEN system SHALL update appropriate database tables immediately
2. WHEN user status changes THEN system SHALL update both users and presence tables
3. WHEN admin makes configuration changes THEN system SHALL persist settings in database
4. WHEN real-time events occur THEN system SHALL broadcast updates to affected users
5. WHEN admin views data THEN system SHALL display current real-time information