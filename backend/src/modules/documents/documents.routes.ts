import { Router, Response } from "express";
import multer from "multer";
import { AuthenticatedRequest, requireAuth } from "@/middleware/auth.middleware";
import {
  ingestDocument,
  listDocuments,
} from "@/modules/documents/documents.service";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB cap
});

router.use(requireAuth);

router.post("/", upload.single("file"), async (req: AuthenticatedRequest, res: Response) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: "No file uploaded (field name must be 'file')." });
  }

  const allowed = ["application/pdf", "text/plain"];
  if (!allowed.includes(file.mimetype)) {
    return res.status(415).json({
      error: `Unsupported content type: ${file.mimetype}. Allowed: ${allowed.join(", ")}`,
    });
  }

  try {
    const document = await ingestDocument({
      userId: req.userId!,
      filename: file.originalname,
      contentType: file.mimetype,
      buffer: file.buffer,
    });
    return res.status(201).json({ document });
  } catch (err) {
    console.error("Document ingestion failed:", err);
    return res.status(500).json({ error: "Failed to process document." });
  }
});

router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  const documents = await listDocuments(req.userId!);
  return res.json({ documents });
});

export const documentsRouter = router;
