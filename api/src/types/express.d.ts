// Extensión de tipos para Express
declare namespace Express {
  interface Request {
    user?: {
      id?: string;
      _id?: string;
      email?: string;
      role?: string;
      iat?: number;
      exp?: number;
    };
    rawBody?: Buffer;
  }
}
