// ============================================================
// Chat Controller
// POST /api/v1/chat — Main chat endpoint
// GET  /api/v1/chat/sessions — List user's sessions
// ============================================================

import {
  Controller, Post, Get, Body, Param,
  UseGuards, Req, Res, HttpCode, HttpStatus,
  UseInterceptors, UploadedFile,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { extname } from "path";
import * as fs from "fs";
import { Response, Request } from "express";
import { AuthGuard } from "../auth/auth.guard";
import { ChatService } from "./chat.service";
import { ChatRequest } from "@must-iq/shared-types";
import { PaginationOptionsDto } from "../common/dto/pagination.dto";
import { Query } from "@nestjs/common";

@Controller("chat")
@UseGuards(AuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) { }

  // -------------------------------------------------------------------
  // POST /api/v1/chat
  // Send a message. Supports streaming (SSE) or JSON response.
  // -------------------------------------------------------------------
  @Post()
  @HttpCode(HttpStatus.OK)
  async chat(
    @Body() body: ChatRequest,
    @Req() req: Request,
    @Res() res: Response
  ) {
    const user = (req as any).user;

    if (body.stream) {
      // Server-Sent Events for streaming response
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      await this.chatService.streamChat(body, user, (chunk: string) => {
        res.write(`data: ${chunk}\n\n`);
      });

      res.write(`data: [DONE]\n\n`);
      res.end();
    } else {
      const result = await this.chatService.chat(body, user);
      res.json(result);
    }
  }

  // -------------------------------------------------------------------
  // POST /api/v1/chat/upload
  // Receives an image to avoid Base64 JSON network overhead
  // -------------------------------------------------------------------
  @Post("upload")
  @UseInterceptors(FileInterceptor("file", {
    storage: diskStorage({
      destination: (req, file, cb) => {
        const dest = "./uploads";
        if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
        cb(null, dest);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, file.fieldname + "-" + uniqueSuffix + extname(file.originalname));
      }
    })
  }))
  async uploadFile(@UploadedFile() file: any, @Req() req: Request) {
    const backendUrl = `${req.protocol}://${req.get("host")}`;
    return { url: `${backendUrl}/api/v1/chat/uploads/${file.filename}` };
  }

  // -------------------------------------------------------------------
  // GET /api/v1/chat/uploads/:filename
  // Serves temporary files for local visualization (before AI consumes it)
  // -------------------------------------------------------------------
  @Get("uploads/:filename")
  async getUploadedFile(@Param("filename") filename: string, @Res() res: Response) {
    return res.sendFile(filename, { root: "./uploads" });
  }

  // -------------------------------------------------------------------
  // GET /api/v1/chat/sessions
  // Return all sessions for the logged-in user
  // -------------------------------------------------------------------
  @Get("sessions")
  async getSessions(
    @Req() req: Request,
    @Query() query: PaginationOptionsDto
  ) {
    const user = (req as any).user;
    return this.chatService.getSessions(user.sub, query);
  }

  // -------------------------------------------------------------------
  // GET /api/v1/chat/sessions/:id
  // Return a specific session with all messages
  // -------------------------------------------------------------------
  @Get("sessions/:id")
  async getSession(@Param("id") id: string, @Req() req: Request) {
    const user = (req as any).user;
    return this.chatService.getSession(id, user.sub);
  }

  @Get("teams")
  async getTeams(@Req() req: Request) {
    const user = (req as any).user;
    return this.chatService.getAuthorizedTeams(user.sub, user.role);
  }
}
