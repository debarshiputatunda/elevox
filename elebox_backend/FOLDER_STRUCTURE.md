ELEBOX_BACKEND/
│
├── app/                     # Main application source code
│   │
│   ├── api/                 # API route definitions/endpoints
│   ├── core/                # Core application configuration and startup logic
│   ├── middlewares/         # Custom middleware (authentication, logging, validation, etc.)
│   ├── models/              # Database models/ORM entities
│   ├── repositories/        # Database access layer (queries and data operations)
│   ├── schemas/             # Request/response validation schemas (Pydantic)
│   ├── services/            # Business logic layer
│   ├── tasks/               # Background jobs, scheduled tasks, async workers
│   ├── utils/               # Helper and utility functions
│   └── main.py              # Application entry point
│
├── deployments/             # Deployment-related files (Docker, Kubernetes, CI/CD configs)
│
├── docs/                    # Project documentation and API references
│
├── migrations/              # Database migration files and version history
│
├── scripts/                 # Standalone utility scripts and automation tools
│
├── tests/                   # Unit, integration, and end-to-end tests
│
├── .env                     # Environment variables (not committed)
├── .env.example             # Example environment configuration
├── .gitignore               # Git ignored files and directories
├── README.md                # Project documentation
└── requirements.txt         # Python dependencies