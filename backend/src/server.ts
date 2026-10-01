import "express-async-errors"; // patches Express 4 to forward async rejections to errorHandler
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { config } from "@/config";
import { authRouter } from "@/modules/auth/auth.routes";
import { documentsRouter } from "@/modules/documents/documents.routes";
import { chatRouter } from "@/modules/chat/chat.routes";
import { errorHandler } from "@/middleware/errorHandler";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRouter);
app.use("/api/documents", documentsRouter);
app.use("/api/chat", chatRouter);

app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`Server listening on port ${config.port} (${config.env})`);
  console.log(`LLM provider: ${config.llm.provider}`);
});
