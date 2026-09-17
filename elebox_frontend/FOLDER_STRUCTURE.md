ELEBOX_FRONTEND/
│
├── public/                  # Static assets served directly by the web server
│   ├── favicon.ico          # Application favicon
│   └── index.html           # Root HTML template
│
├── src/                     # Main React application source code
│   │
│   ├── assets/              # Static frontend assets
│   │   ├── images/          # Images used throughout the application
│   │   ├── icons/           # SVGs and icon files
│   │   └── styles/          # Global styles, themes, and CSS utilities
│   │
│   ├── components/          # Reusable UI components
│   │   │
│   │   ├── common/          # Generic reusable components
│   │   │   ├── Button.jsx
│   │   │   ├── Input.jsx
│   │   │   └── Loader.jsx
│   │   │
│   │   └── layout/          # Layout-specific components
│   │       ├── Navbar.jsx
│   │       ├── Sidebar.jsx
│   │       └── Footer.jsx
│   │
│   ├── pages/               # Route-level application pages
│   │   ├── Home/
│   │   │   └── Home.jsx
│   │   │
│   │   ├── Login/
│   │   │   └── Login.jsx
│   │   │
│   │   └── Dashboard/
│   │       └── Dashboard.jsx
│   │
│   ├── services/            # API communication layer
│   │   ├── api.js           # Axios instance and global API configuration
│   │   └── authService.js   # Authentication-related API calls
│   │
│   ├── hooks/               # Custom React hooks
│   │   ├── useAuth.js
│   │   └── useFetch.js
│   │
│   ├── context/             # React Context providers for global state
│   │   ├── AuthContext.jsx
│   │   └── ThemeContext.jsx
│   │
│   ├── routes/              # Routing configuration and route guards
│   │   ├── AppRoutes.jsx
│   │   └── ProtectedRoute.jsx
│   │
│   ├── utils/               # Helper functions and reusable utilities
│   │   ├── constants.js
│   │   ├── helpers.js
│   │   └── validators.js
│   │
│   ├── App.jsx              # Root React component
│   ├── main.jsx             # React application entry point
│   └── index.css            # Global styles
│
├── .env                     # Environment variables (not committed)
├── .gitignore               # Git ignored files and directories
├── package.json             # Project metadata and dependencies
├── vite.config.js           # Vite configuration
└── README.md                # Project documentation