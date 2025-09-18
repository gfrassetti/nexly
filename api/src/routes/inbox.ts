import { Router, Response } from "express";
import { Message } from "../models/Message";
import handleAuth from "../middleware/auth";
import { PipelineStage, Types } from "mongoose";

type AuthRequest = {
  user?: { id?: string; _id?: string };
} & Express.Request;

const router = Router();

/**
 * GET /inbox
 * Devuelve el último mensaje por contacto para el usuario autenticado.
 */
router.get("/", handleAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userIdStr = req.user?.id || req.user?._id;
    if (!userIdStr) return res.status(401).json({ error: "no_user_in_token" });

    // Si en tu schema Message.userId es ObjectId, casteamos:
    const userId = new Types.ObjectId(String(userIdStr));

    const pipeline: PipelineStage[] = [
      { $match: { userId } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$contactId",
          lastMessage: { $first: "$$ROOT" },
        },
      },
      {
        $lookup: {
          from: "contacts",
          localField: "_id",
          foreignField: "_id",
          as: "contact",
        },
      },
      { $unwind: { path: "$contact", preserveNullAndEmptyArrays: false } },
      {
        $project: {
          _id: 0,
          contact: 1,
          lastMessage: 1,
        },
      },
    ];

    const inbox = await Message.aggregate(pipeline);
    return res.json(inbox);
  } catch (err) {
    console.error("inbox_list_failed:", err);
    return res.status(500).json({ error: "failed_to_fetch_inbox" });
  }
});

export default router;
