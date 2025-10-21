# 🔧 Technical Implementation Plan

## From Development to Production

### **IMMEDIATE NEXT STEPS (Week 1-2)**

#### **1. Backend API Development**

```typescript
// Priority 1: Replace localStorage with real API calls

// Current AuthBridgeService needs real API endpoints:
class AuthBridgeService {
  async login(email: string, password: string, companyDomain?: string) {
    // Replace this mock with real API call:
    const response = await this.http.post('/api/auth/login', {
      email, password, companyDomain
    }).toPromise();
  }
}

// Need to implement:
- POST /api/auth/login
- POST /api/auth/logout
- POST /api/auth/refresh-token
- GET /api/auth/verify-token
```

#### **2. Database Schema Design**

```sql
-- Priority tables needed immediately:

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('super-admin', 'company-admin', 'user')),
  company_id UUID REFERENCES companies(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Companies table
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  domain VARCHAR(255),
  industry VARCHAR(100),
  active BOOLEAN DEFAULT true,
  settings JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Templates table
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  form_type VARCHAR(100) NOT NULL,
  content JSONB NOT NULL,
  is_universal BOOLEAN DEFAULT false,
  is_company_specific BOOLEAN DEFAULT false,
  visibility VARCHAR(50) DEFAULT 'company',
  created_by UUID REFERENCES users(id),
  company_id UUID REFERENCES companies(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Template assignments table (many-to-many)
CREATE TABLE template_company_assignments (
  template_id UUID REFERENCES templates(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP DEFAULT NOW(),
  assigned_by UUID REFERENCES users(id),
  PRIMARY KEY (template_id, company_id)
);
```

#### **3. Express.js Backend Structure**

```typescript
// File: server/src/app.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/users', userRoutes);

// File: server/src/routes/auth.ts
import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const router = Router();

router.post('/login', async (req, res) => {
  const { email, password, companyDomain } = req.body;
  
  // Validate user credentials
  const user = await User.findOne({ where: { email } });
  if (!user || !await bcrypt.compare(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  // Generate JWT token
  const token = jwt.sign(
    { userId: user.id, companyId: user.company_id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
  
  res.json({ token, user, company: user.company });
});
```

---

### **PHASE 1: INFRASTRUCTURE SETUP (Week 2-4)**

#### **4. Docker Configuration**

```dockerfile
# File: Dockerfile.frontend
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80

# File: Dockerfile.backend
FROM node:18-alpine
WORKDIR /app
COPY server/package*.json ./
RUN npm ci
COPY server/ .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]

# File: docker-compose.yml
version: '3.8'
services:
  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    ports:
      - "80:80"
    depends_on:
      - backend

  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/gringo
      - JWT_SECRET=your-secret-key
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=gringo
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

#### **5. Environment Configuration**

```typescript
// File: server/src/config/database.ts
import { Sequelize } from 'sequelize';

export const sequelize = new Sequelize(process.env.DATABASE_URL!, {
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development',
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

// File: server/src/config/redis.ts
import Redis from 'ioredis';

export const redis = new Redis(process.env.REDIS_URL);

// File: .env.production
DATABASE_URL=postgresql://user:password@db:5432/gringo_prod
JWT_SECRET=your-super-secure-jwt-secret-key
REDIS_URL=redis://redis:6379
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_S3_BUCKET=gringo-templates
NODE_ENV=production
```

---

### **PHASE 2: SERVICE INTEGRATION (Week 4-6)**

#### **6. File Storage Service**

```typescript
// File: server/src/services/StorageService.ts
import AWS from 'aws-sdk';
import multer from 'multer';

export class StorageService {
  private s3: AWS.S3;

  constructor() {
    this.s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION
    });
  }

  async uploadTemplate(file: Express.Multer.File, companyId: string): Promise<string> {
    const key = `templates/${companyId}/${Date.now()}-${file.originalname}`;
    
    const params = {
      Bucket: process.env.AWS_S3_BUCKET!,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype
    };

    const result = await this.s3.upload(params).promise();
    return result.Location;
  }

  async generatePDF(templateContent: any, formData: any): Promise<Buffer> {
    // Implement PDF generation using puppeteer or similar
    // Return PDF buffer
  }
}
```

#### **7. Email Service Integration**

```typescript
// File: server/src/services/EmailService.ts
import nodemailer from 'nodemailer';

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  async sendWelcomeEmail(user: any) {
    await this.transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to: user.email,
      subject: 'Welcome to Gringo Template Management',
      html: `<h1>Welcome ${user.name}!</h1>`
    });
  }

  async sendPasswordReset(user: any, resetToken: string) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    await this.transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to: user.email,
      subject: 'Password Reset Request',
      html: `<a href="${resetUrl}">Reset your password</a>`
    });
  }
}
```

---

### **PHASE 3: PRODUCTION DEPLOYMENT (Week 6-8)**

#### **8. Kubernetes Deployment**

```yaml
# File: k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: gringo-frontend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: gringo-frontend
  template:
    metadata:
      labels:
        app: gringo-frontend
    spec:
      containers:
      - name: frontend
        image: gringo/frontend:latest
        ports:
        - containerPort: 80
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"

---
apiVersion: v1
kind: Service
metadata:
  name: gringo-frontend-service
spec:
  selector:
    app: gringo-frontend
  ports:
  - port: 80
    targetPort: 80
  type: LoadBalancer
```

#### **9. CI/CD Pipeline (GitHub Actions)**

```yaml
# File: .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
      with:
        node-version: '18'
    - run: npm ci
    - run: npm run test
    - run: npm run lint
    - run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Build and push Docker images
      run: |
        docker build -t gringo/frontend:${{ github.sha }} -f Dockerfile.frontend .
        docker build -t gringo/backend:${{ github.sha }} -f Dockerfile.backend .
        
    - name: Deploy to Kubernetes
      run: |
        kubectl set image deployment/gringo-frontend frontend=gringo/frontend:${{ github.sha }}
        kubectl set image deployment/gringo-backend backend=gringo/backend:${{ github.sha }}
```

---

### **IMMEDIATE ACTION ITEMS (This Week)**

#### **Critical Path Items:**

1. **Setup PostgreSQL database** (local development first)
2. **Create Express.js API server** with authentication endpoints
3. **Update Angular services** to use real API calls instead of localStorage
4. **Implement file upload** for template management
5. **Setup basic Docker containers** for development

#### **Code Changes Needed:**

```typescript
// Update TemplateStorageService to use HTTP client
@Injectable({
  providedIn: 'root'
})
export class TemplateStorageService {
  constructor(private http: HttpClient) {}

  getTemplatesForCurrentUser(): Observable<Template[]> {
    return this.http.get<Template[]>('/api/templates/user');
  }

  assignTemplateToCompanies(templateId: string, companyIds: string[]): Observable<Template> {
    return this.http.post<Template>(`/api/templates/${templateId}/assign`, { companyIds });
  }
}
```

The system architecture is **excellent** and ready for production scaling. The main work needed is **infrastructure development** and **API implementation** rather than architectural changes.

**Estimated MVP Timeline: 8-12 weeks with dedicated development team.**
