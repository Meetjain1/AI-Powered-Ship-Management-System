# AI-Powered Ship Management System

An intelligent ship management system that optimizes route planning, predicts fuel consumption, and schedules maintenance using AI/ML techniques.

## 🚢 Features

- **Intelligent Route Planning**: Optimizes routes based on historical data and weather conditions
- **Fuel Consumption Prediction**: AI-powered fuel estimation considering load, route, and weather
- **Smart Maintenance Scheduling**: Predictive maintenance based on ship usage patterns
- **Real-time Analytics**: Comprehensive insights on route efficiency and fuel trends
- **Secure API Access**: RESTful endpoints with JWT authentication
- **Containerized Deployment**: Docker-ready with automated CI/CD via GitHub Actions

## 🛠️ Tech Stack

- **Backend**: Node.js + Express.js
- **Database**: MongoDB
- **AI/ML**: TensorFlow.js
- **Authentication**: JWT
- **Documentation**: Swagger/OpenAPI
- **Testing**: Jest + Supertest
- **Logging**: Winston
- **CI/CD**: GitHub Actions
- **Containerization**: Docker

## 📋 Prerequisites

- Node.js >= 18
- MongoDB >= 6.0
- Docker (for containerized deployment)
- OpenWeather API key (for weather data)

## 🚀 Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/ship-management-system.git
   cd ship-management-system
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Run tests**
   ```bash
   npm test
   ```

## 🐳 Docker Deployment

1. **Build the image**
   ```bash
   docker build -t ship-management-system .
   ```

2. **Run with docker-compose**
   ```bash
   docker-compose up -d
   ```

## 📚 API Documentation

### Route Planning
- `POST /api/v1/route-plan`
  ```json
  {
    "departure": "Port A",
    "destination": "Port B",
    "estimatedTime": "2024-03-20T10:00:00Z",
    "cargoWeight": 5000,
    "weather": {
      "windSpeed": 10,
      "waveHeight": 2
    }
  }
  ```

### Fuel Estimation
- `GET /api/v1/fuel-estimate?routeId=123`
  ```json
  {
    "estimatedFuel": 5000,
    "unit": "liters",
    "confidence": 0.95
  }
  ```

### Maintenance Schedule
- `GET /api/v1/maintenance-schedule?shipId=456`
  ```json
  {
    "nextMaintenance": "2024-04-15",
    "suggestedTasks": ["Engine Check", "Hull Inspection"]
  }
  ```

### Analytics
- `GET /api/v1/analytics?timeframe=monthly`
  ```json
  {
    "fuelEfficiency": 85,
    "routeOptimization": 92,
    "maintenanceHealth": 88
  }
  ```

## 🔐 Environment Variables

```env
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/ship_management
JWT_SECRET=your_jwt_secret
OPENWEATHER_API_KEY=your_api_key
```

## 📁 Project Structure

```
ship-management-system/
├── src/
│   ├── config/         # Configuration files
│   ├── controllers/    # Route controllers
│   ├── models/        # Database models
│   ├── routes/        # API routes
│   ├── services/      # Business logic
│   ├── utils/         # Utility functions
│   └── ai/            # AI/ML models
├── tests/             # Test files
├── docs/             # Additional documentation
└── docker/           # Docker configuration
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific test suite
npm test -- routes.test.js

# Generate coverage report
npm run test:coverage
```

## 📈 AI Model Training

The system uses TensorFlow.js for:
- Route optimization using historical journey data
- Fuel consumption prediction based on multiple parameters
- Maintenance scheduling using usage patterns

Model training scripts are located in `src/ai/training/`.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

- Your Name - Initial work

## 🙏 Acknowledgments

- OpenWeather API for weather data
- TensorFlow.js team for ML capabilities
- MongoDB team for database solutions 