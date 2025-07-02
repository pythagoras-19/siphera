# Siphera - Unified Communications App

A modern, sleek unified communications application built with React and TypeScript, featuring a beautiful black, silver, and white UI theme.

## Features

- **Modern UI Design**: Clean, professional interface with a dark theme
- **Chat Interface**: Real-time messaging with contact selection
- **Contact Management**: Searchable contact list with status indicators
- **Responsive Layout**: Sidebar navigation with multiple views
- **TypeScript**: Full type safety and better development experience

## Screenshots

The app features:
- Header with app branding and action buttons
- Sidebar navigation (Chat, Contacts, Calls, Settings)
- Main content area that adapts based on selected view
- Contact list with search functionality
- Chat interface with message history
- Status indicators for online/offline contacts

## Getting Started

### Prerequisites

- Node.js (version 14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd siphera
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

## Available Scripts

- `npm start` - Runs the app in development mode
- `npm run build` - Builds the app for production
- `npm test` - Launches the test runner
- `npm run eject` - Ejects from Create React App (one-way operation)

## Project Structure

```
src/
├── components/
│   ├── Header.tsx          # App header with logo and actions
│   ├── Header.css
│   ├── Sidebar.tsx         # Navigation sidebar
│   ├── Sidebar.css
│   ├── ChatArea.tsx        # Chat interface
│   ├── ChatArea.css
│   ├── ContactList.tsx     # Contact management
│   └── ContactList.css
├── App.tsx                 # Main app component
├── App.css                 # Global styles
└── index.tsx              # App entry point
```

## UI Theme

The app uses a sophisticated black, silver, and white color scheme:

- **Primary Background**: Dark (#0f0f0f, #1a1a1a, #2d2d2d)
- **Accent Color**: Blue (#4a90e2, #357abd)
- **Text**: White and light gray (#ffffff, #b0b0b0)
- **Borders**: Subtle gray (#404040)

## Future Enhancements

- Real-time messaging with WebSocket integration
- Voice and video calling capabilities
- File sharing and media support
- User authentication and profiles
- Message encryption
- Mobile responsive design
- Push notifications

## Technologies Used

- React 19
- TypeScript
- CSS3 with modern features
- Create React App

## Contributing

This is a foundation project for a unified communications app. Feel free to extend it with additional features and improvements.

## License

This project is open source and available under the MIT License.
