import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";

export const createApp = async () => {
  const app = express();

  // Mount Stripe webhook BEFORE JSON middleware to preserve raw body
  app.use('/api/stripe-webhook', express.raw({ type: 'application/json' }));

  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // Setup routes
  await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
  });

  return app;
};

// Create app instance for tests
export const app = createApp();