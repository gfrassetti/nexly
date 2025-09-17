// src/routes/inbox.ts
import { Router } from "express";
import { Message } from "../models/Message";
import handleAuth from "../middleware/auth";

const router = Router();

// Últimos mensajes de cada contacto
router.get("/", handleAuth, async (req: any, res) => {
  try {
    const pipeline = [
      { $match: { userId: req.user.id } },
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
      { $unwind: "$contact" },
      {
        $project: {
          _id: 0,
          contact: 1,
          lastMessage: 1,
        },
      },
    ];

    const inbox = await Message.aggregate(pipeline);
    res.json(inbox);
  } catch (err) {
    res.status(500).json({ error: "failed_to_fetch_inbox" });
  }
});

export default router;
