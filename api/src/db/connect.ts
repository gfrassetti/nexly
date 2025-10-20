import mongoose from "mongoose";
import { config } from "../config";

export const connectDB = async () => {
  try {
    console.log("Attempting to connect to MongoDB with URI:", config.mongoUri);
    await mongoose.connect(config.mongoUri, {
      dbName: "nexly", // <- fuerza el nombre de la base
    });
    console.log("MongoDB connected");
  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  }
};
