import { Router } from "express";
import { cacheService } from "../services/cacheService";

const router = Router();

router.get("/", async (req, res) => {
  try {
    // Verificar estado de Redis
    const redisStatus = await cacheService.ping();
    
    res.json({ 
      status: "ok",
      services: {
        redis: redisStatus ? "connected" : "disconnected"
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      services: {
        redis: "error"
      },
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
