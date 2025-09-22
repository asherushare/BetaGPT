import express from "express";
import Thread from "../models/Thread.js";
import getOpenAIAPIResponse from "../utils/openai.js";


const router = express.Router();

//test
router.post("/test", async (req, res) => {
    try {
        const thread = new Thread({
            threadId: "abcs",
            title: "Testing New Thread"
        })

        const response = await thread.save();
        res.send(response);

    } catch(err) {
        res.status(500).json({ error: "Failed to save in DB" });
    }
});

// Get all threads
router.get("/thread", async(req, res) => {
    try {
        const threads = await Thread.find({}).sort({updatedAt: -1});
        res.json(threads);
    } catch(err) {
        console.error('Get threads error:', err.message);
        res.status(500).json({ error: "Failed to fetch threads" });
    }
})

router.get("/thread/:threadId", async(req, res) => {
    const {threadId} = req.params;
    try {
        const thread = await Thread.findOne({ threadId });
        if (!thread) {
            return res.status(404).json({ error: "Thread not found" });
        }
        res.json(thread.messages);
    } catch(err) {
        res.status(500).json({ error: "Failed to fetch thread" });
    }
})

router.delete("/thread/:threadId", async(req, res) => {
    const { threadId } = req.params;
    try {
        const thread = await Thread.findOneAndDelete({ threadId });
        if (!thread) {
            return res.status(404).json({ error: "Thread not found" });
        }
        res.json({ message: "Thread deleted successfully" });
    } catch(err) {
        res.status(500).json({ error: "Failed to delete thread" });
    }
})

router.post("/chat", async(req, res) => {
    const { threadId, message } = req.body;

    if (!threadId || !message) {
        return res.status(400).json({ error: "Thread ID and message are required" });
    }

    try {
        let thread = await Thread.findOne({ threadId });
        
        if (!thread) {
            // Create a new thread in DB
            thread = new Thread({
                threadId,
                title: message.substring(0, 50) + (message.length > 50 ? '...' : ''), // Truncate long titles
                messages: [{ role: "user", content: message }]
            });
        } else {
            thread.messages.push({ role: "user", content: message });
        }

        // Get OpenAI response
        const assistantReply = await getOpenAIAPIResponse(message);
        
        // Add assistant reply to thread
        thread.messages.push({ role: "assistant", content: assistantReply });
        thread.updatedAt = new Date();
        
        // Save thread to database
        await thread.save();

        res.json({ reply: assistantReply });

    } catch(err) {
        console.error('Chat API Error:', err.message);
        res.status(500).json({ 
            error: "Failed to process chat message",
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
})


export default router;